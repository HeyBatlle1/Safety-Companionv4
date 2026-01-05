## 2025-02-18 - [Security] Configurable JWT Audience Verification
**Vulnerability:** The backend was hardcoded to disable audience verification (`verify_aud=False`) for Clerk JWTs, and the JWKS URL was also hardcoded.
**Learning:** Disabling audience verification allows tokens issued for other applications (sharing the same issuer) to be accepted, leading to potential "confused deputy" attacks. Hardcoded URLs make it difficult to rotate keys or change environments securely.
**Prevention:** Always verify the `aud` claim in JWTs. Move security-critical configuration (URLs, audiences) to environment variables rather than hardcoding them in source.
