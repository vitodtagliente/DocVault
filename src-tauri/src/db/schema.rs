use rusqlite::{Connection, Result};
use std::path::Path;

/// Opens (or creates) the SQLite database at the given path,
/// runs all pending migrations and seeds system data.
pub fn open_and_migrate(db_path: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    // Enable WAL mode for better concurrent performance
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    run_migrations(&conn)?;
    Ok(conn)
}

fn run_migrations(conn: &Connection) -> Result<()> {
    // Create migration tracking table
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            name    TEXT NOT NULL UNIQUE,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );"
    )?;

    let migrations: &[(&str, &str)] = &[
        ("001_initial", include_str!("../../migrations/001_initial.sql")),
        ("002_add_ocr_text", include_str!("../../migrations/002_add_ocr_text.sql")),
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
