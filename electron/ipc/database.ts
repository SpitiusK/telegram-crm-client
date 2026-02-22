import { IpcMain, app } from 'electron'
import Database from 'better-sqlite3'
import path from 'path'

let db: Database.Database | null = null

function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'telegram-crm.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    initSchema(db)
  }
  return db
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      session_string TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      telegram_chat_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      chat_type TEXT NOT NULL DEFAULT 'user',
      unread_count INTEGER NOT NULL DEFAULT 0,
      last_message_at INTEGER,
      pinned INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      UNIQUE(account_id, telegram_chat_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER,
      chat_id TEXT,
      text TEXT,
      date INTEGER,
      out INTEGER,
      sender_name TEXT,
      sender_id TEXT,
      reply_to_id INTEGER,
      media_type TEXT,
      PRIMARY KEY (id, chat_id)
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id TEXT UNIQUE,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      username TEXT,
      phone TEXT,
      bitrix_contact_id TEXT
    );

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bitrix_deal_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      stage_id TEXT NOT NULL DEFAULT '',
      stage_name TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      contact_id INTEGER,
      assigned_user TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (contact_id) REFERENCES contacts(id)
    );

    CREATE TABLE IF NOT EXISTS deal_stage_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_id INTEGER NOT NULL,
      from_stage TEXT NOT NULL,
      to_stage TEXT NOT NULL,
      changed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      changed_by TEXT,
      FOREIGN KEY (deal_id) REFERENCES deals(id)
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS session_state (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_chats_account ON chats(account_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
    CREATE INDEX IF NOT EXISTS idx_contacts_tg ON contacts(telegram_user_id);
    CREATE INDEX IF NOT EXISTS idx_deals_bitrix ON deals(bitrix_deal_id);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_fts ON messages(text);
  `)
}

export function setupDatabaseIPC(ipcMain: IpcMain): void {
  ipcMain.handle('db:cacheMessages', async (_event, chatId: string, messages: Array<{
    id: number; chatId: string; text: string; date: number; out: boolean; senderName: string; senderId: string; replyToId?: number
  }>) => {
    const database = getDb()
    const insert = database.prepare(
      'INSERT OR REPLACE INTO messages (id, chat_id, text, date, out, sender_name, sender_id, reply_to_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const tx = database.transaction(() => {
      for (const m of messages) {
        insert.run(m.id, chatId, m.text, m.date, m.out ? 1 : 0, m.senderName, m.senderId, m.replyToId ?? null)
      }
    })
    tx()
  })

  ipcMain.handle('db:getCachedMessages', async (_event, chatId: string) => {
    const database = getDb()
    const rows = database
      .prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY date ASC LIMIT 200')
      .all(chatId) as Array<{ id: number; chat_id: string; text: string; date: number; out: number; sender_name: string; sender_id: string; reply_to_id: number | null }>

    return rows.map((r) => ({
      id: r.id,
      chatId: r.chat_id,
      text: r.text,
      date: r.date,
      out: r.out === 1,
      senderName: r.sender_name,
      senderId: r.sender_id,
      replyToId: r.reply_to_id ?? undefined,
    }))
  })

  ipcMain.handle('db:saveSession', async (_event, key: string, value: string) => {
    const database = getDb()
    database.prepare('INSERT OR REPLACE INTO session_state (key, value) VALUES (?, ?)').run(key, value)
  })

  ipcMain.handle('db:getSession', async (_event, key: string) => {
    const database = getDb()
    const row = database.prepare('SELECT value FROM session_state WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? null
  })
}
