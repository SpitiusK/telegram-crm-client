import { QdrantRAGClient } from './qdrant-client'
import { OllamaEmbedder } from './ollama-client'
import type { RAGSearchResult } from '../../src/types'

export interface SearchFilters {
  chatId?: string
  dateFrom?: number
  dateTo?: number
  limit?: number
}

export async function searchMessages(
  query: string,
  accountId: string,
  qdrant: QdrantRAGClient,
  ollama: OllamaEmbedder,
  filters?: SearchFilters,
): Promise<RAGSearchResult[]> {
  const vector = await ollama.embed(query)

  const results = await qdrant.search(
    accountId,
    vector,
    {
      chatId: filters?.chatId,
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo,
    },
    filters?.limit ?? 10,
  )

  return results.map((r) => ({
    text: r.payload.text,
    score: r.score,
    chatId: r.payload.chatId,
    chatTitle: r.payload.chatTitle,
    startDate: r.payload.startDate,
    endDate: r.payload.endDate,
    messageIds: r.payload.messageIds,
  }))
}

export async function getContextForAI(
  accountId: string,
  chatId: string,
  recentMessages: Array<{ text: string; out: boolean; senderName: string }>,
  qdrant: QdrantRAGClient,
  ollama: OllamaEmbedder,
): Promise<string> {
  // Build a query from the last few messages of the conversation
  const queryText = recentMessages
    .slice(-5)
    .map((m) => m.text)
    .join(' ')

  if (!queryText.trim()) return ''

  try {
    const results = await searchMessages(queryText, accountId, qdrant, ollama, {
      limit: 5,
    })

    // Filter out results from the current chat (we already have those in context)
    const relevantResults = results.filter((r) => r.chatId !== chatId)

    if (relevantResults.length === 0) return ''

    const contextBlocks = relevantResults.map((r) => {
      const startDate = new Date(r.startDate * 1000).toLocaleDateString('ru-RU')
      const endDate = new Date(r.endDate * 1000).toLocaleDateString('ru-RU')
      const dateRange = startDate === endDate ? startDate : `${startDate} - ${endDate}`
      return `[${r.chatTitle}, ${dateRange}]\n${r.text}`
    })

    return `\n\nRelevant Past Conversations:\n${contextBlocks.join('\n\n')}`
  } catch (err) {
    console.error('[RAG] getContextForAI error:', err)
    return ''
  }
}
