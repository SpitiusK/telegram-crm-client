import { IpcMain, BrowserWindow, dialog, Notification } from 'electron'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import { Api } from 'telegram/tl/index.js'
import { NewMessage } from 'telegram/events/index.js'
import { CustomFile } from 'telegram/client/uploads'
import QRCode from 'qrcode'
import { computeCheck } from 'telegram/Password'
import { getDatabase } from '../database/index'

const API_ID = 2040
const API_HASH = 'b18441a1ff607e10a989891a5462e627'

const CLIENT_OPTIONS = {
  connectionRetries: 5,
  deviceModel: 'Desktop',
  systemVersion: 'Windows 10',
  appVersion: '5.12.1 x64',
  langCode: 'en',
  systemLangCode: 'en-US',
} as const

// Multi-account state: all authenticated clients keyed by account ID
const accounts = new Map<string, { client: TelegramClient; sessionString: string }>()
let activeAccountId: string | null = null
let legacyClient: TelegramClient | null = null

// Track which accounts already have event handlers registered (prevent duplicates)
const accountEventHandlers = new Set<string>()

// Auth state (temporary client used during login flows)
let authClient: TelegramClient | null = null
let pendingPasswordResolve: ((password: string) => void) | null = null
const mutedChats = new Set<string>()
let sessionSaveInterval: ReturnType<typeof setInterval> | null = null

function saveAccountSession(accountId: string): void {
  const entry = accounts.get(accountId)
  if (!entry) return
  try {
    const currentSession = (entry.client.session as StringSession).save()
    if (currentSession && currentSession !== entry.sessionString) {
      entry.sessionString = currentSession
      const db = getDatabase()
      db.saveSession(`account_session_${accountId}`, currentSession)
    }
  } catch { /* client may be disconnected */ }
}

export function saveAllSessions(): void {
  for (const [accountId] of accounts) {
    saveAccountSession(accountId)
  }
}

function createClient(session: string): TelegramClient {
  return new TelegramClient(new StringSession(session), API_ID, API_HASH, CLIENT_OPTIONS)
}

function getActiveClient(): TelegramClient {
  if (!activeAccountId) {
    throw new Error('No active Telegram account — not authenticated')
  }
  const entry = accounts.get(activeAccountId)
  if (!entry) {
    throw new Error('Active account not found in accounts map')
  }
  return entry.client
}

/** Resolve client for a specific account, falling back to active account for backward compat. */
function getClientForAccount(accountId?: string): TelegramClient {
  if (accountId) {
    const entry = accounts.get(accountId)
    if (!entry) {
      throw new Error(`No session for account ${accountId} — account not found or not connected`)
    }
    return entry.client
  }
  return getActiveClient()
}

function getAuthClient(): TelegramClient {
  if (authClient) return authClient
  authClient = createClient('')
  return authClient
}

interface AccountInfo {
  firstName: string
  lastName: string
  username: string
  phone: string
  avatar?: string
}

function loadAccountIds(): string[] {
  try {
    const db = getDatabase()
    const raw = db.getSession('account_ids')
    if (raw) return JSON.parse(raw) as string[]
  } catch { /* ignore */ }
  return []
}

function saveAccountIds(ids: string[]): void {
  const db = getDatabase()
  db.saveSession('account_ids', JSON.stringify(ids))
}

function getAccountInfo(accountId: string): AccountInfo | null {
  try {
    const db = getDatabase()
    const raw = db.getSession(`account_info_${accountId}`)
    if (raw) return JSON.parse(raw) as AccountInfo
  } catch { /* ignore */ }
  return null
}

function getAccountSession(accountId: string): string | null {
  const db = getDatabase()
  return db.getSession(`account_session_${accountId}`)
}

async function finalizeAuth(tc: TelegramClient): Promise<void> {
  const sessionStr = (tc.session as StringSession).save()
  const me = await tc.getMe()
  if (!(me instanceof Api.User)) throw new Error('Failed to get user info')

  const accountId = me.id.toString()

  // Download avatar (retry once after 2s on failure)
  let avatar: string | undefined
  try {
    const photo = await tc.downloadProfilePhoto(me)
    if (Buffer.isBuffer(photo) && photo.length > 0) {
      avatar = `data:image/jpeg;base64,${photo.toString('base64')}`
    }
  } catch { /* ignore */ }
  if (!avatar) {
    try {
      await new Promise((r) => setTimeout(r, 2000))
      const photo = await tc.downloadProfilePhoto(me)
      if (Buffer.isBuffer(photo) && photo.length > 0) {
        avatar = `data:image/jpeg;base64,${photo.toString('base64')}`
      }
    } catch { /* ignore retry */ }
  }

  const info: AccountInfo = {
    firstName: me.firstName ?? '',
    lastName: me.lastName ?? '',
    username: me.username ?? '',
    phone: me.phone ?? '',
    avatar,
  }

  // Save to DB
  const db = getDatabase()
  db.saveSession(`account_session_${accountId}`, sessionStr)
  db.saveSession(`account_info_${accountId}`, JSON.stringify(info))

  const ids = loadAccountIds()
  if (!ids.includes(accountId)) {
    ids.push(accountId)
    saveAccountIds(ids)
  }
  db.saveSession('active_account_id', accountId)

  // Add to accounts map and set as active
  accounts.set(accountId, { client: tc, sessionString: sessionStr })
  activeAccountId = accountId
  authClient = null

  setupEventHandlers(accountId, tc)
}

interface MappedEntity {
  type: 'bold' | 'italic' | 'code' | 'pre' | 'underline' | 'strike' | 'spoiler' | 'url' | 'textUrl' | 'mention' | 'hashtag'
  offset: number
  length: number
  url?: string
}

const entityTypeMap: Array<[unknown, MappedEntity['type']]> = [
  [Api.MessageEntityBold, 'bold'],
  [Api.MessageEntityItalic, 'italic'],
  [Api.MessageEntityCode, 'code'],
  [Api.MessageEntityPre, 'pre'],
  [Api.MessageEntityUnderline, 'underline'],
  [Api.MessageEntityStrike, 'strike'],
  [Api.MessageEntitySpoiler, 'spoiler'],
  [Api.MessageEntityUrl, 'url'],
  [Api.MessageEntityTextUrl, 'textUrl'],
  [Api.MessageEntityMention, 'mention'],
  [Api.MessageEntityHashtag, 'hashtag'],
]

function mapEntities(raw: Api.TypeMessageEntity[] | undefined): MappedEntity[] {
  if (!raw) return []
  const result: MappedEntity[] = []
  for (const e of raw) {
    for (const [cls, type] of entityTypeMap) {
      if (e instanceof (cls as new (...args: never[]) => unknown)) {
        const mapped: MappedEntity = { type, offset: e.offset, length: e.length }
        if (type === 'textUrl' && 'url' in e) {
          mapped.url = (e as Api.MessageEntityTextUrl).url
        }
        result.push(mapped)
        break
      }
    }
  }
  return result
}

function sendToRenderer(event: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send('telegram:update', event, data)
  }
}

function setupEventHandlers(accountId: string, tc: TelegramClient): void {
  // Prevent duplicate handlers when called multiple times for the same account
  if (accountEventHandlers.has(accountId)) return
  accountEventHandlers.add(accountId)

  // New message handler
  tc.addEventHandler(async (event) => {
    const msg = event.message
    if (!msg) return

    const chatId = msg.chatId?.toString() ?? ''

    sendToRenderer('newMessage', {
      accountId,
      id: msg.id,
      chatId,
      text: msg.message ?? '',
      date: msg.date ?? 0,
      out: msg.out ?? false,
      senderName: '',
      senderId: msg.senderId?.toString() ?? '',
    })

    // Desktop notification for incoming messages when window is not focused
    if (!msg.out && chatId && !mutedChats.has(chatId)) {
      const focusedWin = BrowserWindow.getFocusedWindow()
      if (!focusedWin) {
        let senderName = ''
        try {
          if (msg.senderId) {
            const sender = await tc.getEntity(msg.senderId)
            if (sender instanceof Api.User) {
              senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ')
            } else if ('title' in sender) {
              senderName = (sender as { title: string }).title
            }
          }
        } catch {
          // ignore
        }

        const body = msg.message ?? ''
        const notification = new Notification({
          title: senderName || 'New Message',
          body: body.length > 100 ? body.slice(0, 100) + '...' : body,
          silent: false,
        })
        notification.on('click', () => {
          const wins = BrowserWindow.getAllWindows()
          const win = wins[0]
          if (win) {
            if (win.isMinimized()) win.restore()
            win.focus()
          }
          sendToRenderer('notificationClick', { accountId, chatId })
        })
        notification.show()
      }
    }
  }, new NewMessage({}))

  // Handle read history updates
  tc.addEventHandler((update) => {
    if (update instanceof Api.UpdateReadHistoryOutbox) {
      sendToRenderer('readHistory', {
        accountId,
        peerId: update.peer.toString(),
        maxId: update.maxId,
      })
    }
    if (update instanceof Api.UpdateReadHistoryInbox) {
      sendToRenderer('readHistoryInbox', {
        accountId,
        peerId: update.peer.toString(),
        maxId: update.maxId,
      })
    }
    // Typing indicator
    if (update instanceof Api.UpdateUserTyping) {
      sendToRenderer('typing', {
        accountId,
        chatId: update.userId.toString(),
        userId: update.userId.toString(),
      })
    }
    if (update instanceof Api.UpdateChatUserTyping) {
      sendToRenderer('typing', {
        accountId,
        chatId: update.chatId.toString(),
        userId: update.fromId?.toString() ?? '',
      })
    }
    if (update instanceof Api.UpdateChannelUserTyping) {
      sendToRenderer('typing', {
        accountId,
        chatId: update.channelId.toString(),
        userId: update.fromId?.toString() ?? '',
      })
    }
  })
}

function loadAllSessions(): void {
  try {
    const db = getDatabase()
    const ids = loadAccountIds()

    for (const id of ids) {
      const session = getAccountSession(id)
      if (session) {
        accounts.set(id, { client: createClient(session), sessionString: session })
      }
    }

    if (ids.length > 0) {
      activeAccountId = db.getSession('active_account_id') ?? ids[0] ?? null
      return
    }

    // Backward compat: migrate legacy single session
    const legacySession = db.getSession('telegram_session')
    if (legacySession) {
      legacyClient = createClient(legacySession)
    }
  } catch {
    // Database might not be ready yet
  }
}

export function setupTelegramIPC(ipcMain: IpcMain): void {
  // Load saved accounts on startup
  loadAllSessions()

  ipcMain.handle('telegram:connect', async () => {
    const tc = getAuthClient()
    await tc.connect()
    return true
  })

  ipcMain.handle('telegram:getQRUrl', async () => {
    const tc = getAuthClient()
    await tc.connect()

    return new Promise<string>((resolve, _reject) => {
      tc.signInUserWithQrCode(
        { apiId: API_ID, apiHash: API_HASH },
        {
          qrCode: async (code) => {
            const url = `tg://login?token=${code.token.toString('base64url')}`
            const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2 })
            sendToRenderer('qrCode', dataUrl)
            resolve(dataUrl)
          },
          onError: async (err) => {
            console.error('[Telegram] QR error:', err)
            return true
          },
          password: async () => {
            sendToRenderer('2fa_required', {})
            return new Promise<string>((resolvePassword) => {
              pendingPasswordResolve = resolvePassword
            })
          },
        }
      )
        .then(async () => {
          await finalizeAuth(tc)
          sendToRenderer('authorized', {})
        })
        .catch((err) => {
          console.error('[Telegram] QR login failed:', err)
          sendToRenderer('auth_error', { message: String(err) })
        })
    })
  })

  // 2FA password submission
  ipcMain.handle('telegram:submit2FA', async (_event, password: string) => {
    if (pendingPasswordResolve) {
      pendingPasswordResolve(password)
      pendingPasswordResolve = null
      return true
    }
    return false
  })

  ipcMain.handle('telegram:loginWithPhone', async (_event, phone: string) => {
    const tc = getAuthClient()
    await tc.connect()
    const result = await tc.invoke(
      new Api.auth.SendCode({
        phoneNumber: phone,
        apiId: API_ID,
        apiHash: API_HASH,
        settings: new Api.CodeSettings({}),
      })
    )
    if ('phoneCodeHash' in result) {
      return { phoneCodeHash: (result as { phoneCodeHash: string }).phoneCodeHash }
    }
    throw new Error('Unexpected auth response')
  })

  ipcMain.handle('telegram:verifyCode', async (_event, phone: string, code: string, phoneCodeHash: string) => {
    const tc = getAuthClient()
    try {
      await tc.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash,
          phoneCode: code,
        })
      )
      await finalizeAuth(tc)
      return { success: true, needs2FA: false }
    } catch (err) {
      // Check if 2FA is required
      if (err instanceof Error && err.message.includes('SESSION_PASSWORD_NEEDED')) {
        return { success: false, needs2FA: true }
      }
      return { success: false, needs2FA: false, error: String(err) }
    }
  })

  ipcMain.handle('telegram:checkPassword', async (_event, password: string) => {
    const tc = getAuthClient()
    try {
      const passwordInfo = await tc.invoke(new Api.account.GetPassword())
      const srp = await computeCheck(passwordInfo, password)
      const result = await tc.invoke(
        new Api.auth.CheckPassword({
          password: srp,
        })
      )
      if (result) {
        await finalizeAuth(tc)
        return true
      }
      return false
    } catch (err) {
      console.error('[Telegram] 2FA check failed:', err)
      return false
    }
  })

  ipcMain.handle('telegram:isAuthorized', async () => {
    try {
      // Try active account from map
      if (activeAccountId) {
        const entry = accounts.get(activeAccountId)
        if (entry) {
          await entry.client.connect()
          const authorized = await entry.client.checkAuthorization()
          if (authorized) {
            setupEventHandlers(activeAccountId, entry.client)
          }
          return authorized
        }
      }

      // Legacy migration: single session not yet in map
      if (legacyClient) {
        await legacyClient.connect()
        const authorized = await legacyClient.checkAuthorization()
        if (authorized) {
          const me = await legacyClient.getMe()
          if (me instanceof Api.User) {
            const accountId = me.id.toString()
            const sessionStr = (legacyClient.session as StringSession).save()
            const db = getDatabase()
            const info: AccountInfo = {
              firstName: me.firstName ?? '',
              lastName: me.lastName ?? '',
              username: me.username ?? '',
              phone: me.phone ?? '',
            }
            db.saveSession(`account_session_${accountId}`, sessionStr)
            db.saveSession(`account_info_${accountId}`, JSON.stringify(info))
            saveAccountIds([accountId])
            db.saveSession('active_account_id', accountId)

            accounts.set(accountId, { client: legacyClient, sessionString: sessionStr })
            activeAccountId = accountId
            setupEventHandlers(accountId, legacyClient)
            legacyClient = null
          }
        }
        return authorized
      }

      return false
    } catch {
      return false
    }
  })

  ipcMain.handle('telegram:getMe', async (_event, accountId?: string) => {
    // During auth, use the auth client; otherwise use specified/active account
    const tc = authClient ?? getClientForAccount(accountId)
    const me = await tc.getMe()
    if (me instanceof Api.User) {
      return {
        id: me.id.toString(),
        firstName: me.firstName ?? '',
        lastName: me.lastName ?? '',
        username: me.username ?? '',
        phone: me.phone ?? '',
      }
    }
    return null
  })

  // ─── Multi-account handlers ───

  ipcMain.handle('telegram:getAccounts', async () => {
    const ids = loadAccountIds()
    const results: Array<{ id: string; firstName: string; lastName: string; username: string; phone: string; avatar?: string }> = []

    for (const id of ids) {
      // Try cached info first
      const cached = getAccountInfo(id)
      if (cached) {
        // If cached info has no avatar but client is connected, try re-downloading
        if (!cached.avatar) {
          const entry = accounts.get(id)
          if (entry) {
            try {
              const me = await entry.client.getMe()
              if (me instanceof Api.User) {
                const photo = await entry.client.downloadProfilePhoto(me)
                if (Buffer.isBuffer(photo) && photo.length > 0) {
                  cached.avatar = `data:image/jpeg;base64,${photo.toString('base64')}`
                  const db = getDatabase()
                  db.saveSession(`account_info_${id}`, JSON.stringify(cached))
                }
              }
            } catch { /* ignore avatar re-download */ }
          }
        }
        results.push({
          id,
          firstName: cached.firstName,
          lastName: cached.lastName ?? '',
          username: cached.username,
          phone: cached.phone,
          avatar: cached.avatar,
        })
        continue
      }

      // No cache — connect and get info
      const entry = accounts.get(id)
      if (entry) {
        try {
          await entry.client.connect()
          const me = await entry.client.getMe()
          if (me instanceof Api.User) {
            const info: AccountInfo = {
              firstName: me.firstName ?? '',
              lastName: me.lastName ?? '',
              username: me.username ?? '',
              phone: me.phone ?? '',
            }
            const db = getDatabase()
            db.saveSession(`account_info_${id}`, JSON.stringify(info))
            results.push({ id, ...info })
            continue
          }
        } catch { /* fall through to fallback */ }
      }

      results.push({ id, firstName: '', lastName: '', username: '', phone: '' })
    }

    return results
  })

  ipcMain.handle('telegram:switchAccount', async (_event, accountId: string) => {
    if (accountId === activeAccountId) return true

    const entry = accounts.get(accountId)
    if (!entry) throw new Error(`No session for account ${accountId}`)

    // Save current account's session before switching (auth keys may have rotated)
    if (activeAccountId) {
      saveAccountSession(activeAccountId)
    }

    // Connect if needed, don't disconnect others
    try {
      await entry.client.connect()
      await entry.client.getMe()
    } catch (err: unknown) {
      const isAuth401 =
        (err instanceof Error && 'code' in err && (err as { code: unknown }).code === 401) ||
        (err instanceof Error && /AUTH_KEY_UNREGISTERED/i.test(err.message))

      if (isAuth401) {
        const info = getAccountInfo(accountId)
        const db = getDatabase()
        db.saveSession(`account_session_${accountId}`, '')
        accounts.delete(accountId)

        const windows = BrowserWindow.getAllWindows()
        for (const win of windows) {
          win.webContents.send('telegram:accountAuthRequired', {
            accountId,
            phoneNumber: info?.phone ?? '',
          })
        }

        return { error: 'AUTH_KEY_UNREGISTERED', accountId }
      }

      throw err
    }

    activeAccountId = accountId

    const db = getDatabase()
    db.saveSession('active_account_id', accountId)

    setupEventHandlers(accountId, entry.client)
    return true
  })

  ipcMain.handle('telegram:addAccount', async () => {
    // Create fresh auth client for new account login
    authClient = createClient('')
  })

  ipcMain.handle('telegram:removeAccount', async (_event, accountId: string) => {
    const db = getDatabase()
    const entry = accounts.get(accountId)

    // Disconnect and remove from map
    if (entry) {
      try { await entry.client.invoke(new Api.auth.LogOut()) } catch { /* ignore */ }
      try { await entry.client.disconnect() } catch { /* ignore */ }
      accounts.delete(accountId)
    }

    // Remove from DB
    db.saveSession(`account_session_${accountId}`, '')
    db.saveSession(`account_info_${accountId}`, '')
    const ids = loadAccountIds().filter((id) => id !== accountId)
    saveAccountIds(ids)

    // Clean up event handler tracking for removed account
    accountEventHandlers.delete(accountId)

    // If removed the active account, switch to another
    if (accountId === activeAccountId) {
      activeAccountId = null
      if (ids.length > 0) {
        const nextId = ids[0]!
        const nextEntry = accounts.get(nextId)
        if (nextEntry) {
          await nextEntry.client.connect()
          activeAccountId = nextId
          db.saveSession('active_account_id', nextId)
          setupEventHandlers(nextId, nextEntry.client)
        }
      } else {
        db.saveSession('active_account_id', '')
      }
    }
  })

  ipcMain.handle('telegram:cancelAddAccount', async () => {
    if (authClient) {
      try { await authClient.disconnect() } catch { /* ignore */ }
      authClient = null
    }
  })

  ipcMain.handle('telegram:getDialogFilters', async (_event, accountId?: string) => {
    const tc = getClientForAccount(accountId)

    const result = await tc.invoke(new Api.messages.GetDialogFilters())

    interface RawDialogFilter {
      id: number
      title: string
      emoticon?: string
      includePeers: unknown[]
    }

    function extractPeerId(peer: unknown): string | null {
      if (peer instanceof Api.InputPeerUser) return peer.userId.toString()
      if (peer instanceof Api.InputPeerChat) return (-peer.chatId.valueOf()).toString()
      if (peer instanceof Api.InputPeerChannel) return (-1000000000000 - peer.channelId.valueOf()).toString()
      return null
    }

    const filters = (result as unknown as { filters: unknown[] }).filters ?? ((result as unknown) as unknown[])
    return (filters as unknown[])
      .filter((f): f is RawDialogFilter => {
        // Duck-type check: user-created filters have id, title, and includePeers
        // This handles both Api.DialogFilter and Api.DialogFilterChatlist (shared folders)
        const obj = f as Record<string, unknown>
        return typeof obj.id === 'number' && typeof obj.title === 'string' && 'includePeers' in obj
      })
      .map((f) => ({
        id: f.id,
        title: f.title,
        emoji: f.emoticon ?? undefined,
        includePeers: f.includePeers.map(extractPeerId).filter((id): id is string => id !== null),
      }))
  })

  ipcMain.handle('telegram:getArchivedDialogs', async (_event, accountId?: string, limit = 50) => {
    const tc = getClientForAccount(accountId)
    const dialogs = await tc.getDialogs({ folder: 1, limit })

    const me = await tc.getMe()
    const myId = me instanceof Api.User ? me.id.toString() : ''

    const dialogData = dialogs.map((d) => {
      const entity = d.entity
      const entityId = d.id?.toString() ?? ''
      const isSavedMessages = myId !== '' && entityId === myId
      const isGroup = d.isGroup
      const isChannel = d.isChannel
      const username =
        entity instanceof Api.User || entity instanceof Api.Channel
          ? (entity.username ?? undefined)
          : undefined

      const isForum = entity instanceof Api.Channel &&
        (entity as unknown as { forum?: boolean }).forum === true

      return {
        id: entityId,
        title: isSavedMessages ? 'Saved Messages' : (d.title ?? ''),
        unreadCount: d.unreadCount ?? 0,
        lastMessage: d.message?.message ?? '',
        lastMessageDate: d.message?.date ?? 0,
        isUser: d.isUser,
        isSavedMessages,
        isGroup,
        isChannel,
        isForum,
        username,
        phone:
          entity && 'phone' in entity
            ? (entity as { phone?: string }).phone
            : undefined,
        avatar: undefined as string | undefined,
      }
    })

    // Download avatars for first 20 dialogs (rate-limit safe)
    const avatarLimit = Math.min(dialogData.length, 20)
    const avatarPromises = dialogs.slice(0, avatarLimit).map(async (d, i) => {
      try {
        if (!d.entity) return
        const photo = await tc.downloadProfilePhoto(d.entity)
        if (Buffer.isBuffer(photo) && photo.length > 0) {
          const entry = dialogData[i]
          if (entry) {
            entry.avatar = `data:image/jpeg;base64,${photo.toString('base64')}`
          }
        }
      } catch {
        // Skip avatar on error
      }
    })
    await Promise.allSettled(avatarPromises)

    return dialogData
  })

  ipcMain.handle('telegram:getDialogs', async (_event, accountId?: string, limit = 50) => {
    const tc = getClientForAccount(accountId)
    const dialogs = await tc.getDialogs({ folder: 0, limit })

    // Get current user for Saved Messages detection
    const me = await tc.getMe()
    const myId = me instanceof Api.User ? me.id.toString() : ''

    const dialogData = dialogs.map((d) => {
      const entity = d.entity
      const entityId = d.id?.toString() ?? ''
      const isSavedMessages = myId !== '' && entityId === myId
      const isGroup = d.isGroup
      const isChannel = d.isChannel
      const username =
        entity instanceof Api.User || entity instanceof Api.Channel
          ? (entity.username ?? undefined)
          : undefined

      const isForum = entity instanceof Api.Channel &&
        (entity as unknown as { forum?: boolean }).forum === true

      return {
        id: entityId,
        title: isSavedMessages ? 'Saved Messages' : (d.title ?? ''),
        unreadCount: d.unreadCount ?? 0,
        lastMessage: d.message?.message ?? '',
        lastMessageDate: d.message?.date ?? 0,
        isUser: d.isUser,
        isSavedMessages,
        isGroup,
        isChannel,
        isForum,
        username,
        phone:
          entity && 'phone' in entity
            ? (entity as { phone?: string }).phone
            : undefined,
        avatar: undefined as string | undefined,
      }
    })

    // Download avatars for first 20 dialogs (rate-limit safe)
    const avatarLimit = Math.min(dialogData.length, 20)
    const avatarPromises = dialogs.slice(0, avatarLimit).map(async (d, i) => {
      try {
        if (!d.entity) return
        const photo = await tc.downloadProfilePhoto(d.entity)
        if (Buffer.isBuffer(photo) && photo.length > 0) {
          const entry = dialogData[i]
          if (entry) {
            entry.avatar = `data:image/jpeg;base64,${photo.toString('base64')}`
          }
        }
      } catch {
        // Skip avatar on error
      }
    })
    await Promise.allSettled(avatarPromises)

    return dialogData
  })

  ipcMain.handle('telegram:getMessages', async (_event, accountId: string | undefined, chatId: string, limit = 50, offsetId?: number) => {
    const tc = getClientForAccount(accountId)
    const entity = await tc.getEntity(chatId)
    const messages = await tc.getMessages(entity, { limit, ...(offsetId ? { offsetId } : {}) })

    // Collect sender info for display names
    const senderCache = new Map<string, string>()

    const result = await Promise.all(
      messages.map(async (m) => {
        // Resolve sender name
        let senderName = ''
        const sid = m.senderId?.toString() ?? ''
        if (sid) {
          if (senderCache.has(sid)) {
            senderName = senderCache.get(sid) ?? ''
          } else {
            try {
              const sender = await tc.getEntity(m.senderId!)
              if (sender instanceof Api.User) {
                senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ')
              } else if ('title' in sender) {
                senderName = (sender as { title: string }).title
              }
              senderCache.set(sid, senderName)
            } catch {
              // ignore
            }
          }
        }

        // Resolve link preview
        let linkPreview: { url: string; title?: string; description?: string; siteName?: string; photo?: string } | undefined
        if (m.media instanceof Api.MessageMediaWebPage && m.media.webpage instanceof Api.WebPage) {
          const wp = m.media.webpage
          linkPreview = {
            url: wp.url,
            title: wp.title ?? undefined,
            description: wp.description ?? undefined,
            siteName: wp.siteName ?? undefined,
          }
          if (wp.photo && wp.photo instanceof Api.Photo) {
            try {
              const photoBuf = await tc.downloadMedia(new Api.MessageMediaPhoto({ photo: wp.photo }), {})
              if (Buffer.isBuffer(photoBuf) && photoBuf.length > 0) {
                linkPreview.photo = `data:image/jpeg;base64,${photoBuf.toString('base64')}`
              }
            } catch {
              // skip photo on error
            }
          }
        }

        // Resolve media
        let media: {
          type: string; url?: string; fileName?: string; size?: number
          duration?: number; width?: number; height?: number; mimeType?: string; waveform?: number[]
        } | undefined
        if (m.media && !(m.media instanceof Api.MessageMediaWebPage)) {
          if (m.media instanceof Api.MessageMediaPhoto) {
            try {
              const buf = await tc.downloadMedia(m.media, {})
              if (Buffer.isBuffer(buf) && buf.length > 0) {
                media = {
                  type: 'photo',
                  url: `data:image/jpeg;base64,${buf.toString('base64')}`,
                }
              }
            } catch {
              media = { type: 'photo' }
            }
          } else if (m.media instanceof Api.MessageMediaDocument) {
            const doc = m.media.document
            if (doc instanceof Api.Document) {
              const fileNameAttr = doc.attributes.find(
                (a): a is Api.DocumentAttributeFilename => a instanceof Api.DocumentAttributeFilename
              )
              const stickerAttr = doc.attributes.find(
                (a) => a instanceof Api.DocumentAttributeSticker
              )
              const videoAttr = doc.attributes.find(
                (a): a is Api.DocumentAttributeVideo => a instanceof Api.DocumentAttributeVideo
              )
              const audioAttr = doc.attributes.find(
                (a): a is Api.DocumentAttributeAudio => a instanceof Api.DocumentAttributeAudio
              )
              const imageSizeAttr = doc.attributes.find(
                (a): a is Api.DocumentAttributeImageSize => a instanceof Api.DocumentAttributeImageSize
              )
              const hasAnimated = doc.attributes.some(
                (a) => a instanceof Api.DocumentAttributeAnimated
              )
              const isVoice = audioAttr && (audioAttr as unknown as { voice?: boolean }).voice === true
              const isRoundVideo = videoAttr && (videoAttr as unknown as { roundMessage?: boolean }).roundMessage === true

              if (stickerAttr) {
                // Sticker: download image, get dimensions and mimeType
                const w = imageSizeAttr?.w ?? videoAttr?.w
                const h = imageSizeAttr?.h ?? videoAttr?.h
                try {
                  const buf = await tc.downloadMedia(m.media, {})
                  if (Buffer.isBuffer(buf) && buf.length > 0) {
                    const mime = doc.mimeType || 'image/webp'
                    media = {
                      type: 'sticker',
                      url: `data:${mime};base64,${buf.toString('base64')}`,
                      mimeType: doc.mimeType,
                      width: w,
                      height: h,
                    }
                  } else {
                    media = { type: 'sticker', mimeType: doc.mimeType, width: w, height: h }
                  }
                } catch {
                  media = { type: 'sticker', mimeType: doc.mimeType, width: w, height: h }
                }
              } else if (isRoundVideo && videoAttr) {
                // Video note (round video): download thumbnail
                try {
                  const buf = await tc.downloadMedia(m.media, {})
                  if (Buffer.isBuffer(buf) && buf.length > 0) {
                    media = {
                      type: 'videoNote',
                      url: `data:video/mp4;base64,${buf.toString('base64')}`,
                      duration: videoAttr.duration,
                      width: videoAttr.w,
                      height: videoAttr.h,
                    }
                  } else {
                    media = { type: 'videoNote', duration: videoAttr.duration, width: videoAttr.w, height: videoAttr.h }
                  }
                } catch {
                  media = { type: 'videoNote', duration: videoAttr.duration, width: videoAttr.w, height: videoAttr.h }
                }
              } else if (isVoice && audioAttr) {
                // Voice message: extract duration and waveform
                let waveform: number[] | undefined
                const rawWaveform = (audioAttr as unknown as { waveform?: Buffer }).waveform
                if (Buffer.isBuffer(rawWaveform) && rawWaveform.length > 0) {
                  // Decode waveform: each byte is a value 0-31, sample down to ~50 bars
                  const allValues: number[] = []
                  for (let i = 0; i < rawWaveform.length; i++) {
                    allValues.push(rawWaveform[i]! & 0x1f)
                  }
                  const targetBars = 50
                  if (allValues.length <= targetBars) {
                    waveform = allValues
                  } else {
                    waveform = []
                    const step = allValues.length / targetBars
                    for (let i = 0; i < targetBars; i++) {
                      waveform.push(allValues[Math.floor(i * step)]!)
                    }
                  }
                }
                media = {
                  type: 'voice',
                  size: Number(doc.size),
                  duration: audioAttr.duration,
                  waveform,
                }
              } else if (hasAnimated || (doc.mimeType === 'video/mp4' && !videoAttr?.duration) || doc.mimeType === 'image/gif') {
                // GIF: animated document or mp4 without long duration
                const w = videoAttr?.w
                const h = videoAttr?.h
                try {
                  const buf = await tc.downloadMedia(m.media, {})
                  if (Buffer.isBuffer(buf) && buf.length > 0) {
                    const mime = doc.mimeType || 'video/mp4'
                    media = {
                      type: 'gif',
                      url: `data:${mime};base64,${buf.toString('base64')}`,
                      width: w,
                      height: h,
                      mimeType: doc.mimeType,
                    }
                  } else {
                    media = { type: 'gif', width: w, height: h, mimeType: doc.mimeType }
                  }
                } catch {
                  media = { type: 'gif', width: w, height: h, mimeType: doc.mimeType }
                }
              } else if (videoAttr) {
                media = { type: 'video', fileName: fileNameAttr?.fileName, size: Number(doc.size), duration: videoAttr.duration, width: videoAttr.w, height: videoAttr.h }
              } else {
                media = {
                  type: 'document',
                  fileName: fileNameAttr?.fileName ?? 'file',
                  size: Number(doc.size),
                }
              }
            }
          }
        }

        // Map entities
        const entities = mapEntities(m.entities)

        // Edited flag
        const isEdited = m.editDate !== undefined && m.editDate > 0

        // Forwarded from
        let forwardedFrom: string | undefined
        if (m.fwdFrom) {
          if (m.fwdFrom.fromName) {
            forwardedFrom = m.fwdFrom.fromName
          } else if (m.fwdFrom.fromId) {
            try {
              const fwdEntity = await tc.getEntity(m.fwdFrom.fromId)
              if (fwdEntity instanceof Api.User) {
                forwardedFrom = [fwdEntity.firstName, fwdEntity.lastName].filter(Boolean).join(' ')
              } else if ('title' in fwdEntity) {
                forwardedFrom = (fwdEntity as { title: string }).title
              }
            } catch {
              // ignore
            }
          }
        }

        // Reply preview
        let replyToMessage: { id: number; text: string; senderName: string } | undefined
        const replyToMsgId = m.replyTo instanceof Api.MessageReplyHeader ? m.replyTo.replyToMsgId : undefined
        if (replyToMsgId) {
          try {
            const [replied] = await tc.getMessages(entity, { ids: [replyToMsgId] })
            if (replied && replied instanceof Api.Message) {
              let replySenderName = ''
              const replySid = replied.senderId?.toString() ?? ''
              if (replySid) {
                if (senderCache.has(replySid)) {
                  replySenderName = senderCache.get(replySid) ?? ''
                } else {
                  try {
                    const replySender = await tc.getEntity(replied.senderId!)
                    if (replySender instanceof Api.User) {
                      replySenderName = [replySender.firstName, replySender.lastName].filter(Boolean).join(' ')
                    } else if ('title' in replySender) {
                      replySenderName = (replySender as { title: string }).title
                    }
                    senderCache.set(replySid, replySenderName)
                  } catch {
                    // ignore
                  }
                }
              }
              replyToMessage = {
                id: replied.id,
                text: replied.message ?? '',
                senderName: replySenderName,
              }
            }
          } catch {
            // skip reply preview if fetch fails
          }
        }

        return {
          id: m.id,
          chatId,
          text: m.message ?? '',
          date: m.date ?? 0,
          out: m.out ?? false,
          senderName,
          senderId: sid,
          replyToId: replyToMsgId,
          media,
          entities: entities.length > 0 ? entities : undefined,
          replyToMessage,
          forwardedFrom,
          isEdited: isEdited || undefined,
          linkPreview,
        }
      })
    )

    return result
  })

  ipcMain.handle('telegram:sendMessage', async (_event, accountId: string | undefined, chatId: string, text: string, replyTo?: number) => {
    const tc = getClientForAccount(accountId)
    const entity = await tc.getEntity(chatId)

    // Rate limiting: 1-2s delay
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000))

    const result = await tc.sendMessage(entity, {
      message: text,
      ...(replyTo ? { replyTo } : {}),
    })
    return {
      id: result.id,
      date: result.date ?? Math.floor(Date.now() / 1000),
    }
  })

  ipcMain.handle('telegram:editMessage', async (_event, accountId: string | undefined, chatId: string, messageId: number, text: string) => {
    const tc = getClientForAccount(accountId)
    const entity = await tc.getEntity(chatId)

    await tc.editMessage(entity, { message: messageId, text })
  })

  ipcMain.handle('telegram:deleteMessages', async (_event, accountId: string | undefined, chatId: string, messageIds: number[], revoke?: boolean) => {
    const tc = getClientForAccount(accountId)
    const entity = await tc.getEntity(chatId)

    await tc.deleteMessages(entity, messageIds, { revoke: revoke ?? true })
  })

  ipcMain.handle('telegram:getUserInfo', async (_event, accountId: string | undefined, userId: string) => {
    const tc = getClientForAccount(accountId)
    try {
      const entity = await tc.getEntity(userId)
      if (entity instanceof Api.User) {
        let avatar: string | undefined
        try {
          const photo = await tc.downloadProfilePhoto(entity)
          if (Buffer.isBuffer(photo) && photo.length > 0) {
            avatar = `data:image/jpeg;base64,${photo.toString('base64')}`
          }
        } catch { /* ignore */ }

        return {
          id: entity.id.toString(),
          firstName: entity.firstName ?? '',
          lastName: entity.lastName ?? '',
          username: entity.username ?? '',
          phone: entity.phone ?? '',
          bio: '',  // would need GetFullUser for bio
          avatar,
          isBot: entity.bot ?? false,
          lastSeen: entity.status instanceof Api.UserStatusRecently ? 'recently'
            : entity.status instanceof Api.UserStatusOnline ? 'online'
            : entity.status instanceof Api.UserStatusOffline ? new Date((entity.status as Api.UserStatusOffline).wasOnline * 1000).toISOString()
            : 'unknown',
        }
      }
      if (entity instanceof Api.Channel || entity instanceof Api.Chat) {
        return {
          id: entity.id.toString(),
          firstName: (entity as { title: string }).title,
          lastName: '',
          username: entity instanceof Api.Channel ? (entity.username ?? '') : '',
          phone: '',
          bio: '',
          avatar: undefined,
          isBot: false,
          lastSeen: '',
        }
      }
      return null
    } catch {
      return null
    }
  })

  ipcMain.handle('telegram:getForumTopics', async (_event, accountId: string | undefined, chatId: string) => {
    const tc = getClientForAccount(accountId)
    const inputEntity = await tc.getInputEntity(chatId)
    if (!(inputEntity instanceof Api.InputPeerChannel)) {
      return []
    }

    const channel = new Api.InputChannel({
      channelId: inputEntity.channelId,
      accessHash: inputEntity.accessHash,
    })

    const result = await tc.invoke(
      new Api.channels.GetForumTopics({
        channel,
        limit: 100,
        offsetDate: 0,
        offsetId: 0,
        offsetTopic: 0,
      })
    )

    interface RawForumTopic {
      id: number
      title: string
      iconColor?: number
      iconEmojiId?: { toString(): string }
      unreadCount?: number
      closed?: boolean
      pinned?: boolean
      hidden?: boolean
    }

    return (result.topics as unknown as RawForumTopic[])
      .filter((t): t is RawForumTopic => 'title' in t)
      .map((t) => {
        // Find last message for this topic
        const topicMsg = result.messages.find((m) => {
          if (m instanceof Api.Message) {
            if (t.id === 1) {
              // General topic: messages with no replyTo
              return !(m.replyTo instanceof Api.MessageReplyHeader) ||
                m.replyTo.replyToTopId === undefined
            }
            return m.replyTo instanceof Api.MessageReplyHeader &&
              (m.replyTo.replyToTopId === t.id || m.replyTo.replyToMsgId === t.id)
          }
          return false
        })

        return {
          id: t.id,
          title: t.title,
          iconColor: t.iconColor ?? 0,
          iconEmojiId: t.iconEmojiId?.toString(),
          unreadCount: t.unreadCount ?? 0,
          lastMessage: topicMsg instanceof Api.Message ? (topicMsg.message ?? '') : undefined,
          lastMessageDate: topicMsg instanceof Api.Message ? topicMsg.date : undefined,
          closed: t.closed ?? false,
          pinned: t.pinned ?? false,
          hidden: t.hidden ?? false,
        }
      })
  })

  ipcMain.handle('telegram:getTopicMessages', async (_event, accountId: string | undefined, chatId: string, topicId: number, limit = 50) => {
    const tc = getClientForAccount(accountId)
    const entity = await tc.getEntity(chatId)
    const messages = await tc.getMessages(entity, { limit: limit * 2 })

    // Filter messages belonging to this topic
    const topicMessages = messages.filter((m) => {
      if (topicId === 1) {
        // General topic: messages with no replyTo or no topId
        if (!(m.replyTo instanceof Api.MessageReplyHeader)) return true
        return m.replyTo.replyToTopId === undefined
      }
      // Other topics: replyToTopId or replyToMsgId matches topicId
      if (m.replyTo instanceof Api.MessageReplyHeader) {
        return m.replyTo.replyToTopId === topicId || m.replyTo.replyToMsgId === topicId
      }
      return false
    }).slice(0, limit)

    const senderCache = new Map<string, string>()

    return Promise.all(
      topicMessages.map(async (m) => {
        let senderName = ''
        const sid = m.senderId?.toString() ?? ''
        if (sid) {
          if (senderCache.has(sid)) {
            senderName = senderCache.get(sid) ?? ''
          } else {
            try {
              const sender = await tc.getEntity(m.senderId!)
              if (sender instanceof Api.User) {
                senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ')
              } else if ('title' in sender) {
                senderName = (sender as { title: string }).title
              }
              senderCache.set(sid, senderName)
            } catch {
              // ignore
            }
          }
        }

        // Map entities
        const entities = mapEntities(m.entities)

        // Edited flag
        const isEdited = m.editDate !== undefined && m.editDate > 0

        // Forwarded from
        let forwardedFrom: string | undefined
        if (m.fwdFrom) {
          if (m.fwdFrom.fromName) {
            forwardedFrom = m.fwdFrom.fromName
          } else if (m.fwdFrom.fromId) {
            try {
              const fwdEntity = await tc.getEntity(m.fwdFrom.fromId)
              if (fwdEntity instanceof Api.User) {
                forwardedFrom = [fwdEntity.firstName, fwdEntity.lastName].filter(Boolean).join(' ')
              } else if ('title' in fwdEntity) {
                forwardedFrom = (fwdEntity as { title: string }).title
              }
            } catch {
              // ignore
            }
          }
        }

        // Reply preview
        let replyToMessage: { id: number; text: string; senderName: string } | undefined
        const replyToMsgId = m.replyTo instanceof Api.MessageReplyHeader ? m.replyTo.replyToMsgId : undefined
        if (replyToMsgId) {
          try {
            const [replied] = await tc.getMessages(entity, { ids: [replyToMsgId] })
            if (replied && replied instanceof Api.Message) {
              let replySenderName = ''
              const replySid = replied.senderId?.toString() ?? ''
              if (replySid) {
                if (senderCache.has(replySid)) {
                  replySenderName = senderCache.get(replySid) ?? ''
                } else {
                  try {
                    const replySender = await tc.getEntity(replied.senderId!)
                    if (replySender instanceof Api.User) {
                      replySenderName = [replySender.firstName, replySender.lastName].filter(Boolean).join(' ')
                    } else if ('title' in replySender) {
                      replySenderName = (replySender as { title: string }).title
                    }
                    senderCache.set(replySid, replySenderName)
                  } catch {
                    // ignore
                  }
                }
              }
              replyToMessage = {
                id: replied.id,
                text: replied.message ?? '',
                senderName: replySenderName,
              }
            }
          } catch {
            // skip reply preview if fetch fails
          }
        }

        return {
          id: m.id,
          chatId,
          text: m.message ?? '',
          date: m.date ?? 0,
          out: m.out ?? false,
          senderName,
          senderId: sid,
          replyToId: replyToMsgId,
          entities: entities.length > 0 ? entities : undefined,
          replyToMessage,
          forwardedFrom,
          isEdited: isEdited || undefined,
        }
      })
    )
  })

  ipcMain.handle('telegram:sendTopicMessage', async (_event, accountId: string | undefined, chatId: string, topicId: number, text: string) => {
    const tc = getClientForAccount(accountId)
    const entity = await tc.getEntity(chatId)

    // Rate limiting: 1-2s delay
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000))

    const result = await tc.sendMessage(entity, {
      message: text,
      replyTo: topicId,
    })
    return {
      id: result.id,
      date: result.date ?? Math.floor(Date.now() / 1000),
    }
  })

  ipcMain.handle('telegram:pickFile', async (_event, options?: { mediaOnly?: boolean }) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const filters = options?.mediaOnly
      ? [
          { name: 'Media', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'mp4', 'mov', 'avi', 'webm', 'mkv'] },
          { name: 'All Files', extensions: ['*'] },
        ]
      : []

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      ...(filters.length > 0 ? { filters } : {}),
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0] ?? null
  })

  ipcMain.handle('telegram:sendFile', async (_event, accountId: string | undefined, chatId: string, filePath: string, caption?: string, replyTo?: number) => {
    const tc = getClientForAccount(accountId)
    const entity = await tc.getEntity(chatId)

    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000))

    const result = await tc.sendFile(entity, {
      file: filePath,
      caption: caption ?? '',
      ...(replyTo ? { replyTo } : {}),
    })
    return {
      id: result.id,
      date: result.date ?? Math.floor(Date.now() / 1000),
    }
  })

  ipcMain.handle('telegram:sendPhoto', async (_event, accountId: string | undefined, chatId: string, base64Data: string, caption?: string, replyTo?: number) => {
    const tc = getClientForAccount(accountId)
    const entity = await tc.getEntity(chatId)

    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000))

    const buffer = Buffer.from(base64Data, 'base64')
    const file = new CustomFile('photo.jpg', buffer.length, '', buffer)

    const result = await tc.sendFile(entity, {
      file,
      caption: caption ?? '',
      forceDocument: false,
      ...(replyTo ? { replyTo } : {}),
    })
    return {
      id: result.id,
      date: result.date ?? Math.floor(Date.now() / 1000),
    }
  })

  ipcMain.handle('telegram:searchMessages', async (_event, accountId: string | undefined, query: string, chatId?: string, limit = 20) => {
    const tc = getClientForAccount(accountId)

    if (chatId) {
      // Search within a specific chat
      const entity = await tc.getEntity(chatId)
      const messages = await tc.getMessages(entity, { search: query, limit })

      const senderCache = new Map<string, string>()
      return Promise.all(
        messages.map(async (m) => {
          let senderName = ''
          const sid = m.senderId?.toString() ?? ''
          if (sid) {
            if (senderCache.has(sid)) {
              senderName = senderCache.get(sid) ?? ''
            } else {
              try {
                const sender = await tc.getEntity(m.senderId!)
                if (sender instanceof Api.User) {
                  senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ')
                } else if ('title' in sender) {
                  senderName = (sender as { title: string }).title
                }
                senderCache.set(sid, senderName)
              } catch {
                // ignore
              }
            }
          }
          return {
            id: m.id,
            chatId,
            text: m.message ?? '',
            date: m.date ?? 0,
            out: m.out ?? false,
            senderName,
            senderId: sid,
          }
        })
      )
    } else {
      // Global search across all chats
      const result = await tc.invoke(
        new Api.messages.SearchGlobal({
          q: query,
          filter: new Api.InputMessagesFilterEmpty(),
          minDate: 0,
          maxDate: 0,
          offsetRate: 0,
          offsetPeer: new Api.InputPeerEmpty(),
          offsetId: 0,
          limit,
        })
      )

      const senderCache = new Map<string, string>()
      const peerCache = new Map<string, string>()

      // Build peer name cache from chats/users in result
      if ('users' in result && Array.isArray(result.users)) {
        for (const u of result.users) {
          if (u instanceof Api.User) {
            peerCache.set(u.id.toString(), [u.firstName, u.lastName].filter(Boolean).join(' '))
          }
        }
      }
      if ('chats' in result && Array.isArray(result.chats)) {
        for (const c of result.chats) {
          if ('title' in c) {
            peerCache.set((c as { id: { toString(): string } }).id.toString(), (c as { title: string }).title)
          }
        }
      }

      const messages = 'messages' in result ? (result.messages as Api.Message[]) : []
      return Promise.all(
        messages
          .filter((m): m is Api.Message => m instanceof Api.Message)
          .map(async (m) => {
            const msgChatId = m.peerId ? (
              m.peerId instanceof Api.PeerUser ? m.peerId.userId.toString() :
              m.peerId instanceof Api.PeerChat ? m.peerId.chatId.toString() :
              m.peerId instanceof Api.PeerChannel ? m.peerId.channelId.toString() : ''
            ) : ''

            let senderName = ''
            const sid = m.senderId?.toString() ?? ''
            if (sid) {
              if (senderCache.has(sid)) {
                senderName = senderCache.get(sid) ?? ''
              } else if (peerCache.has(sid)) {
                senderName = peerCache.get(sid) ?? ''
                senderCache.set(sid, senderName)
              } else {
                try {
                  const sender = await tc.getEntity(m.senderId!)
                  if (sender instanceof Api.User) {
                    senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ')
                  } else if ('title' in sender) {
                    senderName = (sender as { title: string }).title
                  }
                  senderCache.set(sid, senderName)
                } catch {
                  // ignore
                }
              }
            }

            const chatTitle = peerCache.get(msgChatId) ?? ''

            return {
              id: m.id,
              chatId: msgChatId,
              chatTitle,
              text: m.message ?? '',
              date: m.date ?? 0,
              out: m.out ?? false,
              senderName,
              senderId: sid,
            }
          })
      )
    }
  })

  ipcMain.handle('telegram:getSharedMediaCounts', async (_event, accountId: string | undefined, chatId: string) => {
    const tc = getClientForAccount(accountId)
    const entity = await tc.getInputEntity(chatId)

    const filters = [
      new Api.InputMessagesFilterPhotos(),
      new Api.InputMessagesFilterVideo(),
      new Api.InputMessagesFilterUrl(),
      new Api.InputMessagesFilterVoice(),
      new Api.InputMessagesFilterDocument(),
    ]

    const result = await tc.invoke(
      new Api.messages.GetSearchCounters({
        peer: entity,
        filters,
      })
    )

    const counts = result as unknown as Array<{ count: number }>
    return {
      photos: counts[0]?.count ?? 0,
      videos: counts[1]?.count ?? 0,
      links: counts[2]?.count ?? 0,
      voice: counts[3]?.count ?? 0,
      documents: counts[4]?.count ?? 0,
    }
  })

  ipcMain.handle('telegram:getSharedMedia', async (_event, accountId: string | undefined, chatId: string, filter: string, limit = 20, addOffset = 0) => {
    const tc = getClientForAccount(accountId)
    const entity = await tc.getEntity(chatId)

    const filterMap: Record<string, Api.TypeMessagesFilter> = {
      photos: new Api.InputMessagesFilterPhotos(),
      videos: new Api.InputMessagesFilterVideo(),
      links: new Api.InputMessagesFilterUrl(),
      voice: new Api.InputMessagesFilterVoice(),
      documents: new Api.InputMessagesFilterDocument(),
    }

    const msgFilter = filterMap[filter]
    if (!msgFilter) throw new Error(`Unknown media filter: ${filter}`)

    const messages = await tc.getMessages(entity, { limit, addOffset, filter: msgFilter })

    const items: Array<{
      id: number; date: number; type: string
      thumbnail?: string; url?: string
      linkTitle?: string; linkDescription?: string; linkSiteName?: string
      fileName?: string; size?: number; duration?: number; mimeType?: string
    }> = []

    for (const m of messages) {
      if (!(m instanceof Api.Message)) continue

      if (filter === 'photos') {
        if (m.media instanceof Api.MessageMediaPhoto) {
          let thumbnail: string | undefined
          try {
            const buf = await tc.downloadMedia(m.media, {})
            if (Buffer.isBuffer(buf) && buf.length > 0) {
              thumbnail = `data:image/jpeg;base64,${buf.toString('base64')}`
            }
          } catch { /* skip */ }
          items.push({ id: m.id, date: m.date ?? 0, type: 'photos', thumbnail })
        }
      } else if (filter === 'videos') {
        if (m.media instanceof Api.MessageMediaDocument) {
          const doc = m.media.document
          if (doc instanceof Api.Document) {
            const videoAttr = doc.attributes.find(
              (a): a is Api.DocumentAttributeVideo => a instanceof Api.DocumentAttributeVideo
            )
            let thumbnail: string | undefined
            try {
              // Download thumbnail only (thumb index 0)
              if (doc.thumbs && doc.thumbs.length > 0) {
                const buf = await tc.downloadMedia(m.media, { thumb: 0 })
                if (Buffer.isBuffer(buf) && buf.length > 0) {
                  thumbnail = `data:image/jpeg;base64,${buf.toString('base64')}`
                }
              }
            } catch { /* skip thumbnail */ }
            items.push({
              id: m.id, date: m.date ?? 0, type: 'videos', thumbnail,
              duration: videoAttr?.duration,
              size: Number(doc.size),
              mimeType: doc.mimeType,
            })
          }
        }
      } else if (filter === 'links') {
        // Extract URL from web page or message entities
        let url: string | undefined
        let linkTitle: string | undefined
        let linkDescription: string | undefined
        let linkSiteName: string | undefined

        if (m.media instanceof Api.MessageMediaWebPage && m.media.webpage instanceof Api.WebPage) {
          const wp = m.media.webpage
          url = wp.url
          linkTitle = wp.title ?? undefined
          linkDescription = wp.description ?? undefined
          linkSiteName = wp.siteName ?? undefined
        } else if (m.entities) {
          for (const e of m.entities) {
            if (e instanceof Api.MessageEntityUrl) {
              url = (m.message ?? '').slice(e.offset, e.offset + e.length)
              break
            }
            if (e instanceof Api.MessageEntityTextUrl) {
              url = e.url
              break
            }
          }
        }
        if (url) {
          items.push({ id: m.id, date: m.date ?? 0, type: 'links', url, linkTitle, linkDescription, linkSiteName })
        }
      } else if (filter === 'voice') {
        if (m.media instanceof Api.MessageMediaDocument) {
          const doc = m.media.document
          if (doc instanceof Api.Document) {
            const audioAttr = doc.attributes.find(
              (a): a is Api.DocumentAttributeAudio => a instanceof Api.DocumentAttributeAudio
            )
            items.push({
              id: m.id, date: m.date ?? 0, type: 'voice',
              duration: audioAttr?.duration,
              size: Number(doc.size),
            })
          }
        }
      } else if (filter === 'documents') {
        if (m.media instanceof Api.MessageMediaDocument) {
          const doc = m.media.document
          if (doc instanceof Api.Document) {
            const fileNameAttr = doc.attributes.find(
              (a): a is Api.DocumentAttributeFilename => a instanceof Api.DocumentAttributeFilename
            )
            items.push({
              id: m.id, date: m.date ?? 0, type: 'documents',
              fileName: fileNameAttr?.fileName ?? 'file',
              size: Number(doc.size),
              mimeType: doc.mimeType,
            })
          }
        }
      }
    }

    return items
  })

  ipcMain.handle('telegram:setTyping', async (_event, accountId: string | undefined, chatId: string) => {
    const tc = getClientForAccount(accountId)
    const entity = await tc.getInputEntity(chatId)
    await tc.invoke(
      new Api.messages.SetTyping({
        peer: entity,
        action: new Api.SendMessageTypingAction(),
      })
    )
  })

  ipcMain.handle('telegram:markRead', async (_event, accountId: string | undefined, chatId: string) => {
    const tc = getClientForAccount(accountId)
    const entity = await tc.getEntity(chatId)
    await tc.markAsRead(entity)
  })

  ipcMain.handle('telegram:setNotificationSettings', (_event, settings: { mutedChats: string[] }) => {
    mutedChats.clear()
    for (const id of settings.mutedChats) {
      mutedChats.add(id)
    }
  })

  ipcMain.handle('telegram:logout', async (_event, targetAccountId?: string) => {
    const logoutId = targetAccountId ?? activeAccountId
    if (!logoutId) return

    const entry = accounts.get(logoutId)
    if (entry) {
      try { await entry.client.invoke(new Api.auth.LogOut()) } catch { /* ignore */ }
      try { await entry.client.disconnect() } catch { /* ignore */ }
      accounts.delete(logoutId)
    }
    accountEventHandlers.delete(logoutId)

    // Remove account from stored accounts
    const db = getDatabase()
    db.saveSession(`account_session_${logoutId}`, '')
    db.saveSession(`account_info_${logoutId}`, '')
    const ids = loadAccountIds().filter((id) => id !== logoutId)
    saveAccountIds(ids)

    // If we logged out the active account, switch to another
    if (logoutId === activeAccountId) {
      activeAccountId = null
      if (ids.length > 0) {
        const nextId = ids[0]!
        const nextEntry = accounts.get(nextId)
        if (nextEntry) {
          await nextEntry.client.connect()
          activeAccountId = nextId
          db.saveSession('active_account_id', nextId)
          setupEventHandlers(nextId, nextEntry.client)
        }
      } else {
        db.saveSession('active_account_id', '')
      }
    }

    // Legacy cleanup
    try {
      db.saveSession('telegram_session', '')
    } catch { /* ignore */ }
  })

  // Connect ALL stored accounts (for simultaneous multi-account)
  ipcMain.handle('telegram:connectAll', async () => {
    const ids = loadAccountIds()
    const results: Array<{ accountId: string; connected: boolean; error?: string }> = []

    for (const id of ids) {
      const entry = accounts.get(id)
      if (!entry) {
        results.push({ accountId: id, connected: false, error: 'No session found' })
        continue
      }
      try {
        await entry.client.connect()
        setupEventHandlers(id, entry.client)
        results.push({ accountId: id, connected: true })
      } catch (err) {
        console.error(`[Telegram] Failed to connect account ${id}:`, err)
        results.push({ accountId: id, connected: false, error: String(err) })
      }
      // Stagger connections to avoid burst
      await new Promise((r) => setTimeout(r, 500))
    }

    return results
  })

  // Periodic session save — catches auth key rotations during normal use (saves ALL accounts)
  if (sessionSaveInterval) clearInterval(sessionSaveInterval)
  sessionSaveInterval = setInterval(() => {
    saveAllSessions()
  }, 60_000)
}
