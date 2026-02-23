import type BetterSqlite3 from 'better-sqlite3'

export function up(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rag_indexed_chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      last_message_id INTEGER,
      last_indexed_at TEXT,
      chunk_count INTEGER DEFAULT 0,
      UNIQUE(account_id, chat_id)
    );

    CREATE INDEX IF NOT EXISTS idx_rag_indexed_account ON rag_indexed_chats(account_id);
  `)
}

export function down(db: BetterSqlite3.Database): void {
  db.exec(`
    DROP TABLE IF EXISTS rag_indexed_chats;
  `)
}
