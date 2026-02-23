import type { RAGStatus, RAGSearchResult, RAGIndexStats } from '../types'

const api = () => window.electronAPI.rag

export const ragAPI = {
  getStatus: (): Promise<RAGStatus> => api().getStatus(),
  startIndexing: (accountId: string): Promise<void> => api().startIndexing(accountId),
  stopIndexing: (accountId: string): Promise<void> => api().stopIndexing(accountId),
  search: (
    query: string,
    accountId: string,
    filters?: { chatId?: string; dateFrom?: number; dateTo?: number; limit?: number },
  ): Promise<RAGSearchResult[]> => api().search(query, accountId, filters),
  reindex: (accountId: string, chatId?: string): Promise<void> => api().reindex(accountId, chatId),
  getIndexStats: (accountId: string): Promise<RAGIndexStats> => api().getIndexStats(accountId),
}
