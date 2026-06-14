use rusqlite::{Connection, Result};
use std::path::Path;

/// Opens (or creates) the SQLite database at the given path,
/// applies a pending deferred-restore if one exists, then runs all migrations.
pub fn open_and_migrate(db_path: &Path) -> Result<Connection> {
    // If a restore file is waiting, swap it in before opening
    let restore_path = db_path.with_extension("db.restore");
    if restore_path.exists() {
        // Best-effort rename; if it fails we proceed with the existing DB
        let _ = std::fs::rename(&restore_path, db_path);
    }

    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    run_migrations(&conn)?;
    Ok(conn)
}

fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL UNIQUE,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );"
    )?;

    let migrations: &[(&str, &str)] = &[
        ("001_initial",           include_str!("../../migrations/001_initial.sql")),
        ("002_add_ocr_text",      include_str!("../../migrations/002_add_ocr_text.sql")),
        ("003_fts5_and_drive",    include_str!("../../migrations/003_fts5_and_drive.sql")),
        ("004_add_subcategories",        include_str!("../../migrations/004_add_subcategories.sql")),
        ("005_group_default_categories", include_str!("../../migrations/005_group_default_categories.sql")),
    ];

    for (name, sql) in migrations {
        let already_applied: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM _migrations WHERE name = ?1",
                rusqlite::params![name],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0) > 0;

        if !already_applied {
            conn.execute_batch(sql)?;
            conn.execute(
                "INSERT INTO _migrations (name) VALUES (?1)",
                rusqlite::params![name],
            )?;
        }
    }

    Ok(())
}

