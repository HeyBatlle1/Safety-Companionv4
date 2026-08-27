//! Runtime migration runner.
//!
//! Deliberately does NOT use sqlx's compile-time `migrate!` macro: this crate's
//! design is "runtime queries only, no compile-time DB dependency, builds
//! anywhere" (see `db::connect_from_env`). So migrations are plain `.sql` files
//! read and applied at runtime, in filename order, each recorded in a
//! `_sc_migrations` ledger so re-running is safe and idempotent.
//!
//! Usage:  `scd --migrate`   (applies every pending migration, then exits)
//!
//! A migration file is applied inside a transaction; if any statement fails the
//! whole file rolls back and the runner stops — a half-applied schema is never
//! left behind.

use sqlx::{PgPool, Row};
use std::path::{Path, PathBuf};

/// Directory holding the ordered `NNN_*.sql` migration files.
const MIGRATIONS_DIR: &str = "migrations";

/// One migration on disk: its version key (the filename) and SQL body.
struct Migration {
    name: String,
    sql: String,
}

/// Read every `*.sql` file in `migrations/`, sorted by filename so the numeric
/// prefixes (001_, 002_, ...) apply in order.
fn load_migrations(dir: &Path) -> anyhow::Result<Vec<Migration>> {
    let mut files: Vec<PathBuf> = std::fs::read_dir(dir)
        .map_err(|e| anyhow::anyhow!("cannot read {}: {e}", dir.display()))?
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.extension().map(|x| x == "sql").unwrap_or(false))
        .collect();
    files.sort();

    let mut out = Vec::with_capacity(files.len());
    for path in files {
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| anyhow::anyhow!("bad migration filename: {}", path.display()))?
            .to_string();
        let sql = std::fs::read_to_string(&path)
            .map_err(|e| anyhow::anyhow!("cannot read {}: {e}", path.display()))?;
        out.push(Migration { name, sql });
    }
    Ok(out)
}

/// Ensure the ledger table that records which migrations have been applied.
async fn ensure_ledger(pool: &PgPool) -> anyhow::Result<()> {
    sqlx::query(
        r#"create table if not exists _sc_migrations (
               name        text primary key,
               applied_at  timestamptz not null default now()
           )"#,
    )
    .execute(pool)
    .await?;
    Ok(())
}

/// The set of migration names already applied.
async fn applied_set(pool: &PgPool) -> anyhow::Result<std::collections::HashSet<String>> {
    let rows = sqlx::query("select name from _sc_migrations")
        .fetch_all(pool)
        .await?;
    Ok(rows
        .into_iter()
        .map(|r| r.get::<String, _>("name"))
        .collect())
}

/// Apply every pending migration in order. Idempotent: already-applied files
/// are skipped. Each file runs in its own transaction and is recorded only on
/// success, so a failure leaves the schema consistent up to the last good file.
///
/// Returns the number of migrations newly applied.
pub async fn run(pool: &PgPool) -> anyhow::Result<usize> {
    let dir = PathBuf::from(MIGRATIONS_DIR);
    let migrations = load_migrations(&dir)?;
    if migrations.is_empty() {
        tracing::warn!("no .sql files found in {}", dir.display());
        return Ok(0);
    }

    ensure_ledger(pool).await?;
    let done = applied_set(pool).await?;

    let mut applied = 0usize;
    for m in &migrations {
        if done.contains(&m.name) {
            tracing::info!(migration = %m.name, "already applied — skipping");
            continue;
        }

        tracing::info!(migration = %m.name, "applying");
        let mut tx = pool.begin().await?;

        // Execute the whole file. sqlx's raw_sql runs multiple statements
        // separated by ';'. If any statement errors, the tx is dropped
        // (rolled back) and we stop — never a half-applied file.
        //
        // AssertSqlSafe: the SQL comes from our own version-controlled migration
        // files on disk, never from user input — safe by construction.
        if let Err(e) = sqlx::raw_sql(sqlx::AssertSqlSafe(m.sql.as_str()))
            .execute(&mut *tx)
            .await
        {
            return Err(anyhow::anyhow!(
                "migration {} failed (rolled back): {e}",
                m.name
            ));
        }

        sqlx::query("insert into _sc_migrations (name) values ($1)")
            .bind(&m.name)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        tracing::info!(migration = %m.name, "applied ✓");
        applied += 1;
    }

    tracing::info!(applied, total = migrations.len(), "migrations complete");
    Ok(applied)
}
