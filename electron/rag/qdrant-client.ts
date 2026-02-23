import { QdrantClient } from '@qdrant/js-client-rest'

const VECTOR_SIZE = 768
const DISTANCE = 'Cosine' as const

export interface ChunkPayload {
  chatId: string
  chatTitle: string
  text: string
  startDate: number
  endDate: number
  messageIds: number[]
  senderNames: string[]
  messageCount: number
  isOutgoingOnly: boolean
}

export interface UpsertableChunk {
  id: string
  vector: number[]
  payload: ChunkPayload
}

export interface CollectionStats {
  pointCount: number
  status: string
}

export class QdrantRAGClient {
  private client: QdrantClient | null = null
  private url: string

  constructor(url = 'http://localhost:6333') {
    this.url = url
  }

  connect(): void {
    this.client = new QdrantClient({ url: this.url })
  }

  private getClient(): QdrantClient {
    if (!this.client) {
      throw new Error('Qdrant client not connected — call connect() first')
    }
    return this.client
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient()
      const result = await client.getCollections()
      return Array.isArray(result.collections)
    } catch {
      return false
    }
  }

  private collectionName(accountId: string): string {
    return `messages_account_${accountId}`
  }

  async ensureCollection(accountId: string): Promise<void> {
    const client = this.getClient()
    const name = this.collectionName(accountId)

    try {
      await client.getCollection(name)
    } catch {
      await client.createCollection(name, {
        vectors: {
          size: VECTOR_SIZE,
          distance: DISTANCE,
        },
      })
      // Create payload indexes for filtered search
      await client.createPayloadIndex(name, {
        field_name: 'chatId',
        field_schema: 'keyword',
      })
      await client.createPayloadIndex(name, {
        field_name: 'startDate',
        field_schema: 'integer',
      })
      await client.createPayloadIndex(name, {
        field_name: 'endDate',
        field_schema: 'integer',
      })
    }
  }

  async upsertChunks(accountId: string, chunks: UpsertableChunk[]): Promise<void> {
    if (chunks.length === 0) return
    const client = this.getClient()
    const name = this.collectionName(accountId)

    // Batch upsert in groups of 100
    const batchSize = 100
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      await client.upsert(name, {
        wait: true,
        points: batch.map((chunk) => ({
          id: chunk.id,
          vector: chunk.vector,
          payload: chunk.payload as unknown as Record<string, unknown>,
        })),
      })
    }
  }

  async search(
    accountId: string,
    vector: number[],
    filters?: {
      chatId?: string
      dateFrom?: number
      dateTo?: number
    },
    limit = 10,
  ): Promise<Array<{ score: number; payload: ChunkPayload }>> {
    const client = this.getClient()
    const name = this.collectionName(accountId)

    const must: Array<Record<string, unknown>> = []
    if (filters?.chatId) {
      must.push({ key: 'chatId', match: { value: filters.chatId } })
    }
    if (filters?.dateFrom) {
      must.push({ key: 'startDate', range: { gte: filters.dateFrom } })
    }
    if (filters?.dateTo) {
      must.push({ key: 'endDate', range: { lte: filters.dateTo } })
    }

    const results = await client.search(name, {
      vector,
      limit,
      with_payload: true,
      ...(must.length > 0 ? { filter: { must } } : {}),
    })

    return results.map((r) => ({
      score: r.score,
      payload: r.payload as unknown as ChunkPayload,
    }))
  }

  async deleteCollection(accountId: string): Promise<void> {
    const client = this.getClient()
    const name = this.collectionName(accountId)
    try {
      await client.deleteCollection(name)
    } catch {
      // Collection may not exist — ignore
    }
  }

  async getCollectionInfo(accountId: string): Promise<CollectionStats | null> {
    const client = this.getClient()
    const name = this.collectionName(accountId)
    try {
      const info = await client.getCollection(name)
      return {
        pointCount: info.points_count ?? 0,
        status: info.status,
      }
    } catch {
      return null
    }
  }
}
