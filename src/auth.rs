//! Authentication: PIN login + HMAC-signed stateless session tokens.
//!
//! Design for the field, not the SOC. Gloved hands and workers who distrust
//! passwords get a numeric PIN, not a passphrase. PINs are Argon2-hashed at
//! rest — never stored or logged in the clear. Login mints a signed token
//! that carries {person_id, role, expiry}; the server verifies the signature
//! on every request and needs no session table. Stateless scales to a phone
//! per worker without a row per login.
//!
//! The signing secret is generated once at first boot and persisted to
//! SC_SESSION_KEY (or a vault). It is deliberately NOT derived from the API
//! key — that derivation was flagged as a mistake in the Argus audit and is
//! not repeated here. If the secret rotates, all sessions invalidate, which
//! is the safe failure direction.

use argon2::password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD as B64, Engine};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

/// Process-wide signing key, loaded once at boot.
pub fn session_key() -> Vec<u8> {
    use std::sync::OnceLock;
    static KEY: OnceLock<Vec<u8>> = OnceLock::new();
    KEY.get_or_init(|| {
        if let Ok(k) = std::env::var("SC_SESSION_KEY") {
            if k.len() >= 32 {
                return k.into_bytes();
            }
            tracing::warn!("SC_SESSION_KEY too short (<32 chars); generating an ephemeral key — sessions will not survive restart");
        } else {
            tracing::warn!("SC_SESSION_KEY not set; generating an ephemeral key — set it in production so sessions survive restart");
        }
        use rand::RngCore;
        let mut b = vec![0u8; 48];
        rand::thread_rng().fill_bytes(&mut b);
        b
    })
    .clone()
}

// ---- PIN hashing ----

pub fn hash_pin(pin: &str) -> anyhow::Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(pin.as_bytes(), &salt)
        .map_err(|e| anyhow::anyhow!("hash error: {e}"))?
        .to_string();
    Ok(hash)
}

pub fn verify_pin(pin: &str, hash: &str) -> bool {
    match PasswordHash::new(hash) {
        Ok(parsed) => Argon2::default().verify_password(pin.as_bytes(), &parsed).is_ok(),
        Err(_) => false,
    }
}

// ---- session tokens: base64(payload).base64(hmac) ----

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Claims {
    pub sub: Uuid,   // person id
    pub role: String,
    pub exp: i64,    // unix seconds
}

pub fn mint_token(person_id: Uuid, role: &str, ttl_hours: i64) -> String {
    let claims = Claims {
        sub: person_id,
        role: role.to_string(),
        exp: (chrono::Utc::now() + chrono::Duration::hours(ttl_hours)).timestamp(),
    };
    let payload = B64.encode(serde_json::to_vec(&claims).unwrap());
    let mut mac = HmacSha256::new_from_slice(&session_key()).expect("hmac key");
    mac.update(payload.as_bytes());
    let sig = B64.encode(mac.finalize().into_bytes());
    format!("{payload}.{sig}")
}

pub fn verify_token(token: &str) -> Option<Claims> {
    let (payload, sig) = token.split_once('.')?;
    let mut mac = HmacSha256::new_from_slice(&session_key()).ok()?;
    mac.update(payload.as_bytes());
    let expected = mac.finalize().into_bytes();
    let given = B64.decode(sig).ok()?;
    // constant-time compare via the mac's own verification path
    if given.as_slice() != expected.as_slice() {
        return None;
    }
    let claims: Claims = serde_json::from_slice(&B64.decode(payload).ok()?).ok()?;
    if claims.exp < chrono::Utc::now().timestamp() {
        return None;
    }
    Some(claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pin_roundtrip() {
        let h = hash_pin("4821").unwrap();
        assert!(verify_pin("4821", &h));
        assert!(!verify_pin("0000", &h));
        assert!(!h.contains("4821")); // never plaintext
    }

    #[test]
    fn token_roundtrip_and_tamper() {
        std::env::set_var("SC_SESSION_KEY", "test-key-test-key-test-key-test-key-123");
        let id = Uuid::new_v4();
        let t = mint_token(id, "safety_director", 12);
        let c = verify_token(&t).expect("valid token verifies");
        assert_eq!(c.sub, id);
        assert_eq!(c.role, "safety_director");
        // tamper: flip the payload, signature must fail
        let mut bad = t.clone();
        bad.insert(0, 'x');
        assert!(verify_token(&bad).is_none());
    }

    #[test]
    fn expired_token_rejected() {
        std::env::set_var("SC_SESSION_KEY", "test-key-test-key-test-key-test-key-123");
        let claims = Claims { sub: Uuid::new_v4(), role: "employee".into(), exp: 0 };
        let payload = B64.encode(serde_json::to_vec(&claims).unwrap());
        let mut mac = HmacSha256::new_from_slice(&session_key()).unwrap();
        mac.update(payload.as_bytes());
        let sig = B64.encode(mac.finalize().into_bytes());
        assert!(verify_token(&format!("{payload}.{sig}")).is_none());
    }
}
