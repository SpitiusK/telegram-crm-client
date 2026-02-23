import { Api } from 'telegram/tl/index.js'
import { getClientForAccount } from '../ipc/telegram'
import { getDatabase } from '../database/index'
import { QdrantRAGClient, type ChunkPayload } from './qdrant-client'
import { OllamaEmbedder } from './ollama-client'
import { chunkMessages } from './chunker'
import type { TelegramMessage } from '../../src/types'
import crypto from 'crypto'

export interface IndexingProgress {
  totalChats: number
  indexedChats: number
  currentChat: string
  messagesProcessed: number
}

interface RagIndexedChatRow {
  id: number
  account_id: string
  chat_id: string
  last_message_id: number | null
  last_indexed_at: string | null
  chunk_count: number
}

// Active indexing jobs keyed by accountId
const activeJobs = new Map<string, AbortController>()

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function generateChunkId(accountId: string, chatId: string, startDate: number): string {
  const hash = crypto.createHash('md5').update(`${accountId}_${chatId}_${startDate}`).digest('hex')
  // Qdrant expects UUID-like string or unsigned integer; use hex string
  return hash
}

/**
 * Remove unpaired UTF-16 surrogates (same as telegram.ts sanitizeText).
 */
function sanitizeText(text: string): string {
  return text.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    '\uFFFD'
  )
}

export class RAGIndexer {
  private qdrant: QdrantRAGClient
  private ollama: OllamaEmbedder

  constructor(qdrant: QdrantRAGClient, ollama: OllamaEmbedder) {
    this.qdrant = qdrant
    this.ollama = ollama
  }

  async indexAccount(
    accountId: string,
    onProgress?: (progress: IndexingProgress) => void,
  ): Promise<void> {
    // Cancel existing job for this account
    const existing = activeJobs.get(accountId)
    if (existing) existing.abort()

    const controller = new AbortController()
    activeJobs.set(accountId, controller)

    try {
      await this.qdrant.ensureCollection(accountId)

      const tc = getClientForAccount(accountId)
      const me = await tc.getMe()
      const myId = me instanceof Api.User ? me.id.toString() : ''

      // Fetch all dialogs to find 1:1 user chats
      const dialogs = await tc.getDialogs({ folder: 0, limit: 500 })
      const userDialogs = dialogs.filter((d) => {
        if (!d.isUser) return false
        const entityId = d.id?.toString() ?? ''
        if (myId !== '' && entityId === myId) return false // Saved Messages
        const entity = d.entity
        if (entity instanceof Api.User && entity.bot) return false // Bots
        return true
      })

      const totalChats = userDialogs.length
      let indexedChats = 0
      let messagesProcessed = 0

      for (const dialog of userDialogs) {
        if (controller.signal.aborted) break

        const chatId = dialog.id?.toString() ?? ''
        const chatTitle = sanitizeText(dialog.title ?? '')

        onProgress?.({
          totalChats,
          indexedChats,
          currentChat: chatTitle,
          messagesProcessed,
        })

        // Check if already indexed and what the last message was
        const db = getDatabase()
        const tracked = db.queryOne<RagIndexedChatRow>(
          'SELECT * FROM rag_indexed_chats WHERE account_id = ? AND chat_id = ?',
          accountId,
          chatId,
        )

        // Fetch messages from Telegram (paginated)
        const allMessages: TelegramMessage[] = []
        let offsetId: number | undefined
        let hasMore = true
        const minId = tracked?.last_message_id ?? 0

        while (hasMore && !controller.signal.aborted) {
          const entity = await tc.getEntity(chatId)
          const batch = await tc.getMessages(entity, {
            limit: 50,
            ...(offsetId ? { offsetId } : {}),
            ...(minId > 0 ? { minId } : {}),
          })

          if (batch.length === 0) {
            hasMore = false
            break
          }

          for (const msg of batch) {
            if (msg.id <= minId) {
              hasMore = false
              break
            }

            allMessages.push({
              id: msg.id,
              chatId,
              accountId,
              text: sanitizeText(msg.message ?? ''),
              date: msg.date ?? 0,
              out: msg.out ?? false,
              senderName: await this.getSenderName(tc, msg),
              senderId: msg.senderId?.toString() ?? '',
            })
          }

          if (batch.length < 50) {
            hasMore = false
          } else {
            const lastMsg = batch[batch.length - 1]
            offsetId = lastMsg ? lastMsg.id : undefined
          }

          // Anti-ban delay between paginated fetches
          await sleep(1000 + Math.random() * 1000)
        }

        if (allMessages.length === 0) {
          indexedChats++
          continue
        }

        // Chunk messages
        const chunks = chunkMessages(allMessages, chatId, chatTitle)

        if (chunks.length > 0) {
          // Embed all chunks
          const texts = chunks.map((c) => c.text)
          const embeddings = await this.ollama.embedBatch(texts)

          // Build upsertable chunks, skip any with missing embeddings
          const upsertable: Array<{ id: string; vector: number[]; payload: ChunkPayload }> = []
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]
            const vector = embeddings[i]
            if (!chunk || !vector) continue
            upsertable.push({
              id: generateChunkId(accountId, chatId, chunk.startDate),
              vector,
              payload: {
                chatId: chunk.chatId,
                chatTitle: chunk.chatTitle,
                text: chunk.text,
                startDate: chunk.startDate,
                endDate: chunk.endDate,
                messageIds: chunk.messageIds,
                senderNames: chunk.senderNames,
                messageCount: chunk.messageCount,
                isOutgoingOnly: chunk.isOutgoingOnly,
              },
            })
          }

          await this.qdrant.upsertChunks(accountId, upsertable)
        }

        // Update tracking in SQLite
        const maxMsgId = Math.max(...allMessages.map((m) => m.id))
        const db2 = getDatabase()
        db2.run(
          `INSERT INTO rag_indexed_chats (account_id, chat_id, last_message_id, last_indexed_at, chunk_count)
           VALUES (?, ?, ?, datetime('now'), ?)
           ON CONFLICT(account_id, chat_id)
           DO UPDATE SET last_message_id = MAX(rag_indexed_chats.last_message_id, excluded.last_message_id),
                         last_indexed_at = excluded.last_indexed_at,
                         chunk_count = rag_indexed_chats.chunk_count + excluded.chunk_count`,
          accountId,
          chatId,
          maxMsgId,
          chunks.length,
        )

        messagesProcessed += allMessages.length
        indexedChats++

        onProgress?.({
          totalChats,
          indexedChats,
          currentChat: chatTitle,
          messagesProcessed,
        })

        // Small delay between chats
        await sleep(500)
      }
    } finally {
      activeJobs.delete(accountId)
    }
  }

  async indexNewMessages(
    accountId: string,
    chatId: string,
    messages: TelegramMessage[],
    chatTitle: string,
  ): Promise<void> {
    if (messages.length === 0) return

    try {
      await this.qdrant.ensureCollection(accountId)

      const chunks = chunkMessages(messages, chatId, chatTitle)
      if (chunks.length === 0) return

      const texts = chunks.map((c) => c.text)
      const embeddings = await this.ollama.embedBatch(texts)

      const upsertable: Array<{ id: string; vector: number[]; payload: ChunkPayload }> = []
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const vector = embeddings[i]
        if (!chunk || !vector) continue
        upsertable.push({
          id: generateChunkId(accountId, chatId, chunk.startDate),
          vector,
          payload: {
            chatId: chunk.chatId,
            chatTitle: chunk.chatTitle,
            text: chunk.text,
            startDate: chunk.startDate,
            endDate: chunk.endDate,
            messageIds: chunk.messageIds,
            senderNames: chunk.senderNames,
            messageCount: chunk.messageCount,
            isOutgoingOnly: chunk.isOutgoingOnly,
          },
        })
      }

      await this.qdrant.upsertChunks(accountId, upsertable)

      // Update tracking
      const maxMsgId = Math.max(...messages.map((m) => m.id))
      const db = getDatabase()
      db.run(
        `INSERT INTO rag_indexed_chats (account_id, chat_id, last_message_id, last_indexed_at, chunk_count)
         VALUES (?, ?, ?, datetime('now'), ?)
         ON CONFLICT(account_id, chat_id)
         DO UPDATE SET last_message_id = MAX(rag_indexed_chats.last_message_id, excluded.last_message_id),
                       last_indexed_at = excluded.last_indexed_at,
                       chunk_count = rag_indexed_chats.chunk_count + excluded.chunk_count`,
        accountId,
        chatId,
        maxMsgId,
        chunks.length,
      )
    } catch (err) {
      console.error(`[RAG] Incremental index error for chat ${chatId}:`, err)
    }
  }

  async reindexChat(accountId: string, chatId: string): Promise<void> {
    // Delete existing data for this chat from Qdrant (by filter isn't easy, so we track)
    // For simplicity, we remove the tracking and re-run indexAccount for this chat
    const db = getDatabase()
    db.run(
      'DELETE FROM rag_indexed_chats WHERE account_id = ? AND chat_id = ?',
      accountId,
      chatId,
    )

    // Re-index the full account (only this chat will have no tracking)
    await this.indexAccount(accountId)
  }

  cancelIndexing(accountId: string): void {
    const controller = activeJobs.get(accountId)
    if (controller) {
      controller.abort()
      activeJobs.delete(accountId)
    }
  }

  isIndexing(accountId: string): boolean {
    return activeJobs.has(accountId)
  }

  private async getSenderName(
    tc: import('telegram').TelegramClient,
    msg: Api.Message,
  ): Promise<string> {
    try {
      if (msg.senderId) {
        const sender = await tc.getEntity(msg.senderId)
        if (sender instanceof Api.User) {
          return [sender.firstName, sender.lastName].filter(Boolean).join(' ')
        }
      }
    } catch {
      // ignore
    }
    return msg.out ? 'Operator' : 'Unknown'
  }
}
