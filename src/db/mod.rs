//! Database access. Postgres (Supabase) via sqlx, runtime queries only —
//! no compile-time DB dependency, builds anywhere.

pub mod migrate;

use crate::domain::IndustryBaseline;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::PgPool;
use std::str::FromStr;

pub async fn connect_from_env() -> anyhow::Result<PgPool> {
    let url = std::env::var("DATABASE_URL")
        .map_err(|_| anyhow::anyhow!("DATABASE_URL not set"))?;
    // Statement caching is disabled so the engine works identically behind
    // Supabase's transaction-mode pooler (PgBouncer, port 6543), session mode,
    // or a direct connection. Customers will paste whichever string they find;
    // the engine should not care.
    let opts = PgConnectOptions::from_str(&url)?.statement_cache_capacity(0);
    let pool = PgPoolOptions::new()
        .max_connections(8)
        .acquire_timeout(std::time::Duration::from_secs(10))
        .connect_with(opts)
        .await?;
    Ok(pool)
}

/// Look up the most recent BLS/OSHA baseline for a NAICS code.
pub async fn baseline_for(pool: &PgPool, naics: &str) -> anyhow::Result<Option<IndustryBaseline>> {
    let row: Option<(String, String, i32, f64, Option<i64>, String)> = sqlx::query_as(
        r#"select naics_code, industry_name, year, injury_rate_per_100, total_cases, data_source
           from sc_industry_baselines
           where naics_code = $1
           order by year desc
           limit 1"#,
    )
    .bind(naics)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|(naics_code, industry_name, year, injury_rate_per_100, total_cases, data_source)| {
        IndustryBaseline { naics_code, industry_name, year, injury_rate_per_100, total_cases, data_source }
    }))
}
