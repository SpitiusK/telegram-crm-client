import BetterSqlite3 from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import type {
  AccountRow,
  ActivityLogRow,
  SettingRow,
  CachedMessageRow,
  SessionStateRow,
} from '../domain/types'
import { up as migration001Up } from './migrations/001_initial'

let instance: AppDatabase | null = null

export class AppDatabase {
  private db: BetterSqlite3.Database

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? path.join(app.getPath('userData'), 'telegram-crm.db')
    this.db = new BetterSqlite3(resolvedPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
  }

  init(): void {
    this.migrate()
  }

  migrate(): void {
    // Create migrations tracking table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    const applied = this.db
      .prepare('SELECT name FROM _migrations')
      .all() as Array<{ name: string }>
    const appliedNames = new Set(applied.map((r) => r.name))

    const migrations = [
      { name: '001_initial', up: migration001Up },
    ]

    for (const migration of migrations) {
      if (!appliedNames.has(migration.name)) {
        this.db.transaction(() => {
          migration.up(this.db)
          this.db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migration.name)
        })()
        console.log(`[Database] Applied migration: ${migration.name}`)
      }
    }
  }

  // ─── Query Helpers ───

  queryAll<T>(sql: string, ...params: unknown[]): T[] {
    return this.db.prepare(sql).all(...params) as T[]
  }

  queryOne<T>(sql: string, ...params: unknown[]): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined
  }

  run(sql: string, ...params: unknown[]): BetterSqlite3.RunResult {
    return this.db.prepare(sql).run(...params)
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)()
  }

  // ─── Settings ───

  getSetting(key: string): string | null {
    const row = this.queryOne<SettingRow>('SELECT value FROM settings WHERE key = ?', key)
    return row?.value ?? null
  }

  saveSetting(key: string, value: string): void {
    this.run(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      key,
      value,
    )
  }

  // ─── Activity Log ───

  logActivity(accountId: number, actionType: string, entityType: string, entityId: string, detailsJson: string): void {
    this.run(
      'INSERT INTO activity_log (account_id, action_type, entity_type, entity_id, details_json) VALUES (?, ?, ?, ?, ?)',
      accountId,
      actionType,
      entityType,
      entityId,
      detailsJson,
    )
  }

  getActivityLog(accountId?: number, limit = 50, offset = 0): ActivityLogRow[] {
    if (accountId !== undefined) {
      return this.queryAll<ActivityLogRow>(
        'SELECT * FROM activity_log WHERE account_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        accountId,
        limit,
        offset,
      )
    }
    return this.queryAll<ActivityLogRow>(
      'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ? OFFSET ?',
      limit,
      offset,
    )
  }

  // ─── Accounts ───

  getAccounts(): AccountRow[] {
    return this.queryAll<AccountRow>('SELECT * FROM accounts WHERE is_active = 1')
  }

  getAccount(id: number): AccountRow | undefined {
    return this.queryOne<AccountRow>('SELECT * FROM accounts WHERE id = ?', id)
  }

  upsertAccount(phone: string, name: string, sessionString: string): number {
    const result = this.run(
      `INSERT INTO accounts (phone, name, session_string) VALUES (?, ?, ?)
       ON CONFLICT(phone) DO UPDATE SET name = excluded.name, session_string = excluded.session_string`,
      phone,
      name,
      sessionString,
    )
    return Number(result.lastInsertRowid)
  }

  // ─── Legacy message cache ───

  cacheMessages(chatId: string, messages: Array<{
    id: number; text: string; date: number; out: boolean; senderName: string; senderId: string; replyToId?: number
  }>): void {
    const insert = this.db.prepare(
      'INSERT OR REPLACE INTO cached_messages (id, chat_id, text, date, out, sender_name, sender_id, reply_to_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    this.transaction(() => {
      for (const m of messages) {
        insert.run(m.id, chatId, m.text, m.date, m.out ? 1 : 0, m.senderName, m.senderId, m.replyToId ?? null)
      }
    })
  }

  getCachedMessages(chatId: string): CachedMessageRow[] {
    return this.queryAll<CachedMessageRow>(
      'SELECT * FROM cached_messages WHERE chat_id = ? ORDER BY date ASC LIMIT 200',
      chatId,
    )
  }

  saveSession(key: string, value: string): void {
    this.run('INSERT OR REPLACE INTO session_state (key, value) VALUES (?, ?)', key, value)
  }

  getSession(key: string): string | null {
    const row = this.queryOne<SessionStateRow>('SELECT value FROM session_state WHERE key = ?', key)
    return row?.value ?? null
  }

  close(): void {
    this.db.close()
  }
}

// ─── Singleton access ───

export function getDatabase(): AppDatabase {
  if (!instance) {
    instance = new AppDatabase()
    instance.init()
  }
  return instance
}
