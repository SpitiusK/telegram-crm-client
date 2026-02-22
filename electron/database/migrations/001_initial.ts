import type BetterSqlite3 from 'better-sqlite3'

export function up(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      session_string TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      telegram_chat_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'user',
      unread_count INTEGER NOT NULL DEFAULT 0,
      last_message_at TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      UNIQUE(account_id, telegram_chat_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL REFERENCES chats(id),
      telegram_msg_id INTEGER NOT NULL,
      sender_id TEXT NOT NULL DEFAULT '',
      sender_name TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      date INTEGER NOT NULL DEFAULT 0,
      is_outgoing INTEGER NOT NULL DEFAULT 0,
      reply_to_msg_id INTEGER,
      media_type TEXT,
      UNIQUE(chat_id, telegram_msg_id)
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      username TEXT,
      phone TEXT,
      bitrix_contact_id TEXT
    );

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bitrix_deal_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      stage_id TEXT NOT NULL DEFAULT '',
      stage_name TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      contact_id INTEGER REFERENCES contacts(id),
      assigned_user TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deal_stage_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_id INTEGER NOT NULL REFERENCES deals(id),
      from_stage TEXT NOT NULL DEFAULT '',
      to_stage TEXT NOT NULL DEFAULT '',
      changed_at TEXT NOT NULL DEFAULT (datetime('now')),
      changed_by TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL DEFAULT '',
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Legacy tables kept for backward compat
    CREATE TABLE IF NOT EXISTS cached_messages (
      id INTEGER,
      chat_id TEXT,
      text TEXT,
      date INTEGER,
      out INTEGER,
      sender_name TEXT,
      sender_id TEXT,
      reply_to_id INTEGER,
      PRIMARY KEY (id, chat_id)
    );

    CREATE TABLE IF NOT EXISTS session_state (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_chats_account ON chats(account_id);
    CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_cached ON cached_messages(chat_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
    CREATE INDEX IF NOT EXISTS idx_activity_account ON activity_log(account_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_deal_history ON deal_stage_history(deal_id, changed_at DESC);
  `)
}

export function down(db: BetterSqlite3.Database): void {
  db.exec(`
    DROP TABLE IF EXISTS deal_stage_history;
    DROP TABLE IF EXISTS activity_log;
    DROP TABLE IF EXISTS deals;
    DROP TABLE IF EXISTS contacts;
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS chats;
    DROP TABLE IF EXISTS accounts;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS cached_messages;
    DROP TABLE IF EXISTS session_state;
  `)
}
