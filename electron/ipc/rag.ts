import { IpcMain, BrowserWindow } from 'electron'
import { QdrantRAGClient } from '../rag/qdrant-client'
import { OllamaEmbedder } from '../rag/ollama-client'
import { RAGIndexer } from '../rag/indexer'
import { searchMessages } from '../rag/search'
import { getDatabase } from '../database/index'

interface RagIndexedChatRow {
  account_id: string
  chat_id: string
  last_message_id: number | null
  last_indexed_at: string | null
  chunk_count: number
}

// Singleton RAG services
let qdrantClient: QdrantRAGClient | null = null
let ollamaClient: OllamaEmbedder | null = null
let ragIndexer: RAGIndexer | null = null

export function getQdrantClient(): QdrantRAGClient {
  if (!qdrantClient) {
    qdrantClient = new QdrantRAGClient()
    qdrantClient.connect()
  }
  return qdrantClient
}

export function getOllamaClient(): OllamaEmbedder {
  if (!ollamaClient) {
    ollamaClient = new OllamaEmbedder()
  }
  return ollamaClient
}

export function getRAGIndexer(): RAGIndexer {
  if (!ragIndexer) {
    ragIndexer = new RAGIndexer(getQdrantClient(), getOllamaClient())
  }
  return ragIndexer
}

function sendToRenderer(event: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send('rag:update', event, data)
  }
}

export function setupRagIPC(ipcMain: IpcMain): void {
  ipcMain.handle('rag:getStatus', async () => {
    const qdrant = getQdrantClient()
    const ollama = getOllamaClient()

    const [qdrantOk, ollamaOk] = await Promise.all([
      qdrant.healthCheck(),
      ollama.healthCheck(),
    ])

    let modelReady = false
    if (ollamaOk) {
      modelReady = await ollama.ensureModel()
    }

    return {
      qdrant: qdrantOk,
      ollama: ollamaOk,
      model: modelReady,
    }
  })

  ipcMain.handle('rag:startIndexing', async (_event, accountId: string) => {
    const indexer = getRAGIndexer()

    // Run indexing in background — don't await
    void indexer.indexAccount(accountId, (progress) => {
      sendToRenderer('indexingProgress', {
        accountId,
        ...progress,
      })
    }).then(() => {
      sendToRenderer('indexingComplete', { accountId })
    }).catch((err) => {
      sendToRenderer('indexingError', {
        accountId,
        error: (err as Error).message,
      })
    })
  })

  ipcMain.handle('rag:stopIndexing', async (_event, accountId: string) => {
    const indexer = getRAGIndexer()
    indexer.cancelIndexing(accountId)
  })

  ipcMain.handle(
    'rag:search',
    async (
      _event,
      query: string,
      accountId: string,
      filters?: { chatId?: string; dateFrom?: number; dateTo?: number; limit?: number },
    ) => {
      const qdrant = getQdrantClient()
      const ollama = getOllamaClient()

      return searchMessages(query, accountId, qdrant, ollama, filters)
    },
  )

  ipcMain.handle('rag:reindex', async (_event, accountId: string, chatId?: string) => {
    const indexer = getRAGIndexer()

    if (chatId) {
      await indexer.reindexChat(accountId, chatId)
    } else {
      // Full re-index: clear tracking and re-run
      const db = getDatabase()
      db.run('DELETE FROM rag_indexed_chats WHERE account_id = ?', accountId)

      const qdrant = getQdrantClient()
      await qdrant.deleteCollection(accountId)

      void indexer.indexAccount(accountId, (progress) => {
        sendToRenderer('indexingProgress', { accountId, ...progress })
      }).then(() => {
        sendToRenderer('indexingComplete', { accountId })
      }).catch((err) => {
        sendToRenderer('indexingError', {
          accountId,
          error: (err as Error).message,
        })
      })
    }
  })

  ipcMain.handle('rag:getIndexStats', async (_event, accountId: string) => {
    const db = getDatabase()
    const rows = db.queryAll<RagIndexedChatRow>(
      'SELECT * FROM rag_indexed_chats WHERE account_id = ?',
      accountId,
    )

    const totalChats = rows.length
    const totalChunks = rows.reduce((sum, r) => sum + r.chunk_count, 0)
    const lastIndexedAt = rows.reduce<string | null>((latest, r) => {
      if (!r.last_indexed_at) return latest
      if (!latest) return r.last_indexed_at
      return r.last_indexed_at > latest ? r.last_indexed_at : latest
    }, null)

    return { totalChats, totalChunks, lastIndexedAt }
  })
}
