import { create } from 'zustand'
import { ragAPI } from '../lib/rag-api'
import type { RAGSearchResult } from '../types'

interface AccountIndexingStatus {
  isIndexing: boolean
  progress: number
  currentChat: string
  totalChats: number
  indexedChats: number
  error?: string
}

const DEFAULT_STATUS: AccountIndexingStatus = {
  isIndexing: false,
  progress: 0,
  currentChat: '',
  totalChats: 0,
  indexedChats: 0,
}

interface RagState {
  qdrantConnected: boolean
  ollamaConnected: boolean
  modelReady: boolean
  indexingStatus: Record<string, AccountIndexingStatus>
  searchResults: RAGSearchResult[]
  isSearching: boolean
  // Actions
  checkHealth: () => Promise<void>
  startIndexing: (accountId: string) => Promise<void>
  stopIndexing: (accountId: string) => void
  search: (query: string, accountId: string, filters?: { chatId?: string; dateFrom?: number; dateTo?: number; limit?: number }) => Promise<void>
  updateIndexingProgress: (accountId: string, progress: Partial<AccountIndexingStatus>) => void
  clearSearchResults: () => void
}

export const useRagStore = create<RagState>((set, get) => ({
  qdrantConnected: false,
  ollamaConnected: false,
  modelReady: false,
  indexingStatus: {},
  searchResults: [],
  isSearching: false,

  checkHealth: async () => {
    try {
      const status = await ragAPI.getStatus()
      set({
        qdrantConnected: status.qdrant,
        ollamaConnected: status.ollama,
        modelReady: status.model,
      })
    } catch {
      set({ qdrantConnected: false, ollamaConnected: false, modelReady: false })
    }
  },

  startIndexing: async (accountId: string) => {
    const current = get().indexingStatus
    set({
      indexingStatus: {
        ...current,
        [accountId]: {
          ...DEFAULT_STATUS,
          isIndexing: true,
        },
      },
    })

    try {
      await ragAPI.startIndexing(accountId)
    } catch (err) {
      const updated = get().indexingStatus
      const existing = updated[accountId] ?? DEFAULT_STATUS
      set({
        indexingStatus: {
          ...updated,
          [accountId]: {
            ...existing,
            isIndexing: false,
            error: (err as Error).message,
          },
        },
      })
    }
  },

  stopIndexing: (accountId: string) => {
    void ragAPI.stopIndexing(accountId)
    const current = get().indexingStatus
    const existing = current[accountId] ?? DEFAULT_STATUS
    set({
      indexingStatus: {
        ...current,
        [accountId]: {
          ...existing,
          isIndexing: false,
        },
      },
    })
  },

  search: async (query, accountId, filters) => {
    set({ isSearching: true })
    try {
      const results = await ragAPI.search(query, accountId, filters)
      set({ searchResults: results, isSearching: false })
    } catch {
      set({ searchResults: [], isSearching: false })
    }
  },

  updateIndexingProgress: (accountId, progress) => {
    const current = get().indexingStatus
    const existing = current[accountId] ?? { ...DEFAULT_STATUS, isIndexing: true }
    set({
      indexingStatus: {
        ...current,
        [accountId]: { ...existing, ...progress },
      },
    })
  },

  clearSearchResults: () => {
    set({ searchResults: [], isSearching: false })
  },
}))
