import type { BitrixDeal, BitrixContact } from '../types'

const api = () => window.electronAPI.crm

export const crmAPI = {
  getDeal: (id: string): Promise<BitrixDeal> => api().getDeal(id),
  getDeals: (filter?: Record<string, string>): Promise<BitrixDeal[]> => api().getDeals(filter),
  getContact: (id: string): Promise<BitrixContact> => api().getContact(id),
  updateDeal: (id: string, fields: Partial<BitrixDeal>) => api().updateDeal(id, fields as Record<string, string>),
  findDealByPhone: (phone: string): Promise<BitrixDeal | null> => api().findDealByPhone(phone),
}
