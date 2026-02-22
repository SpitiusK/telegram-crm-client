import { create } from 'zustand'
import { crmAPI } from '../lib/crm-api'
import type { BitrixDeal, BitrixContact } from '../types'

interface CrmState {
  currentDeal: BitrixDeal | null
  currentContact: BitrixContact | null
  deals: BitrixDeal[]
  isLoading: boolean
  loadDeals: () => Promise<void>
  findDealByPhone: (phone: string) => Promise<void>
  loadDeal: (id: string) => Promise<void>
  updateDeal: (id: string, fields: Partial<BitrixDeal>) => Promise<void>
}

export const useCrmStore = create<CrmState>((set) => ({
  currentDeal: null,
  currentContact: null,
  deals: [],
  isLoading: false,

  loadDeals: async () => {
    set({ isLoading: true })
    try {
      const deals = await crmAPI.getDeals()
      set({ deals, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  findDealByPhone: async (phone: string) => {
    try {
      const deal = await crmAPI.findDealByPhone(phone)
      if (deal) {
        set({ currentDeal: deal })
        if (deal.CONTACT_ID) {
          const contact = await crmAPI.getContact(deal.CONTACT_ID)
          set({ currentContact: contact })
        }
      } else {
        set({ currentDeal: null, currentContact: null })
      }
    } catch {
      set({ currentDeal: null, currentContact: null })
    }
  },

  loadDeal: async (id: string) => {
    try {
      const deal = await crmAPI.getDeal(id)
      set({ currentDeal: deal })
    } catch { /* ignore */ }
  },

  updateDeal: async (id: string, fields: Partial<BitrixDeal>) => {
    await crmAPI.updateDeal(id, fields)
    const deal = await crmAPI.getDeal(id)
    set({ currentDeal: deal })
  },
}))
