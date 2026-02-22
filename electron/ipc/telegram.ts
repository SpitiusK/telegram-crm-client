import { IpcMain, BrowserWindow } from 'electron'
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import { Api } from 'telegram/tl/index.js'
import { NewMessage } from 'telegram/events/index.js'
import QRCode from 'qrcode'
import { computeCheck } from 'telegram/Password'
import { getDatabase } from '../database/index'

const API_ID = 2040
const API_HASH = 'b18441a1ff607e10a989891a5462e627'

let client: TelegramClient | null = null
let sessionString = ''
let pendingPasswordResolve: ((password: string) => void) | null = null

function getClient(): TelegramClient {
  if (!client) {
    const session = new StringSession(sessionString)
    client = new TelegramClient(session, API_ID, API_HASH, {
      connectionRetries: 5,
      deviceModel: 'Desktop',
      systemVersion: 'Windows 10',
      appVersion: '5.12.1 x64',
      langCode: 'en',
      systemLangCode: 'en-US',
    })
  }
  return client
}

function sendToRenderer(event: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send('telegram:update', event, data)
  }
}

function setupEventHandlers(tc: TelegramClient): void {
  // New message handler
  tc.addEventHandler((event) => {
    const msg = event.message
    if (!msg) return

    sendToRenderer('newMessage', {
      id: msg.id,
      chatId: msg.chatId?.toString() ?? '',
      text: msg.message ?? '',
      date: msg.date ?? 0,
      out: msg.out ?? false,
      senderName: '',
      senderId: msg.senderId?.toString() ?? '',
    })
  }, new NewMessage({}))

  // Handle read history updates
  tc.addEventHandler((update) => {
    if (update instanceof Api.UpdateReadHistoryOutbox) {
      sendToRenderer('readHistory', {
        peerId: update.peer.toString(),
        maxId: update.maxId,
      })
    }
    if (update instanceof Api.UpdateReadHistoryInbox) {
      sendToRenderer('readHistoryInbox', {
        peerId: update.peer.toString(),
        maxId: update.maxId,
      })
    }
  })
}

function saveSession(): void {
  if (!client) return
  sessionString = (client.session as StringSession).save()
  try {
    const db = getDatabase()
    db.saveSession('telegram_session', sessionString)
  } catch (err) {
    console.error('[Telegram] Failed to save session:', err)
  }
}

function loadSession(): void {
  try {
    const db = getDatabase()
    const saved = db.getSession('telegram_session')
    if (saved) {
      sessionString = saved
    }
  } catch {
    // Database might not be ready yet
  }
}

export function setupTelegramIPC(ipcMain: IpcMain): void {
  // Load saved session on startup
  loadSession()

  ipcMain.handle('telegram:connect', async () => {
    const tc = getClient()
    await tc.connect()
    setupEventHandlers(tc)
    return true
  })

  ipcMain.handle('telegram:getQRUrl', async () => {
    const tc = getClient()
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
        .then(() => {
          saveSession()
          setupEventHandlers(tc)
          sendToRenderer('authorized', { session: sessionString })
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
    const tc = getClient()
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
    const tc = getClient()
    try {
      await tc.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash,
          phoneCode: code,
        })
      )
      saveSession()
      setupEventHandlers(tc)
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
    const tc = getClient()
    try {
      const passwordInfo = await tc.invoke(new Api.account.GetPassword())
      const srp = await computeCheck(passwordInfo, password)
      const result = await tc.invoke(
        new Api.auth.CheckPassword({
          password: srp,
        })
      )
      if (result) {
        saveSession()
        setupEventHandlers(tc)
        return true
      }
      return false
    } catch (err) {
      console.error('[Telegram] 2FA check failed:', err)
      return false
    }
  })

  ipcMain.handle('telegram:isAuthorized', async () => {
    const tc = getClient()
    try {
      await tc.connect()
      const authorized = await tc.checkAuthorization()
      if (authorized) {
        setupEventHandlers(tc)
      }
      return authorized
    } catch {
      return false
    }
  })

  ipcMain.handle('telegram:getMe', async () => {
    const tc = getClient()
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

  ipcMain.handle('telegram:getDialogs', async (_event, limit = 50) => {
    const tc = getClient()
    const dialogs = await tc.getDialogs({ limit })

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

  ipcMain.handle('telegram:getMessages', async (_event, chatId: string, limit = 50) => {
    const tc = getClient()
    const entity = await tc.getEntity(chatId)
    const messages = await tc.getMessages(entity, { limit })

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

        // Resolve media
        let media: { type: string; url?: string; fileName?: string; size?: number } | undefined
        if (m.media) {
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
              const isSticker = doc.attributes.some(
                (a) => a instanceof Api.DocumentAttributeSticker
              )
              const isVideo = doc.attributes.some(
                (a) => a instanceof Api.DocumentAttributeVideo
              )
              const isVoice = doc.attributes.some(
                (a) => a instanceof Api.DocumentAttributeAudio && (a as { voice?: boolean }).voice
              )

              if (isSticker) {
                media = { type: 'sticker' }
              } else if (isVoice) {
                media = { type: 'voice', size: Number(doc.size) }
              } else if (isVideo) {
                media = { type: 'video', fileName: fileNameAttr?.fileName, size: Number(doc.size) }
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

        return {
          id: m.id,
          chatId,
          text: m.message ?? '',
          date: m.date ?? 0,
          out: m.out ?? false,
          senderName,
          senderId: sid,
          replyToId: m.replyTo instanceof Api.MessageReplyHeader ? m.replyTo.replyToMsgId : undefined,
          media,
        }
      })
    )

    return result
  })

  ipcMain.handle('telegram:sendMessage', async (_event, chatId: string, text: string) => {
    const tc = getClient()
    const entity = await tc.getEntity(chatId)

    // Rate limiting: 1-2s delay
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000))

    const result = await tc.sendMessage(entity, { message: text })
    return {
      id: result.id,
      date: result.date ?? Math.floor(Date.now() / 1000),
    }
  })

  ipcMain.handle('telegram:getUserInfo', async (_event, userId: string) => {
    const tc = getClient()
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

  ipcMain.handle('telegram:markRead', async (_event, chatId: string) => {
    const tc = getClient()
    const entity = await tc.getEntity(chatId)
    await tc.markAsRead(entity)
  })

  ipcMain.handle('telegram:logout', async () => {
    const tc = getClient()
    try {
      await tc.invoke(new Api.auth.LogOut())
    } catch {
      // ignore
    }
    sessionString = ''
    client = null
    try {
      const db = getDatabase()
      db.saveSession('telegram_session', '')
    } catch {
      // ignore
    }
  })
}
