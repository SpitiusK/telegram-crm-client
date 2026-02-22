import { contextBridge, ipcRenderer } from 'electron'

const api = {
  telegram: {
    connect: () => ipcRenderer.invoke('telegram:connect'),
    getQRUrl: () => ipcRenderer.invoke('telegram:getQRUrl'),
    loginWithPhone: (phone: string) => ipcRenderer.invoke('telegram:loginWithPhone', phone),
    verifyCode: (phone: string, code: string, phoneCodeHash: string) =>
      ipcRenderer.invoke('telegram:verifyCode', phone, code, phoneCodeHash),
    submit2FA: (password: string) => ipcRenderer.invoke('telegram:submit2FA', password),
    checkPassword: (password: string) => ipcRenderer.invoke('telegram:checkPassword', password),
    isAuthorized: () => ipcRenderer.invoke('telegram:isAuthorized'),
    getMe: () => ipcRenderer.invoke('telegram:getMe'),
    getDialogs: (limit?: number) => ipcRenderer.invoke('telegram:getDialogs', limit),
    getMessages: (chatId: string, limit?: number) => ipcRenderer.invoke('telegram:getMessages', chatId, limit),
    sendMessage: (chatId: string, text: string) => ipcRenderer.invoke('telegram:sendMessage', chatId, text),
    getUserInfo: (userId: string) => ipcRenderer.invoke('telegram:getUserInfo', userId),
    markRead: (chatId: string) => ipcRenderer.invoke('telegram:markRead', chatId),
    logout: () => ipcRenderer.invoke('telegram:logout'),
    onUpdate: (callback: (event: string, data: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, eventName: string, data: unknown) => {
        callback(eventName, data)
      }
      ipcRenderer.on('telegram:update', handler)
      return () => {
        ipcRenderer.removeListener('telegram:update', handler)
      }
    },
  },
  crm: {
    getDeal: (id: string) => ipcRenderer.invoke('crm:getDeal', id),
    getDeals: (filter?: Record<string, string>) => ipcRenderer.invoke('crm:getDeals', filter),
    getContact: (id: string) => ipcRenderer.invoke('crm:getContact', id),
    updateDeal: (id: string, fields: Record<string, string>) => ipcRenderer.invoke('crm:updateDeal', id, fields),
    findDealByPhone: (phone: string) => ipcRenderer.invoke('crm:findDealByPhone', phone),
  },
  claude: {
    generateMessage: (context: string, history: unknown[], dealInfo?: unknown) =>
      ipcRenderer.invoke('claude:generateMessage', context, history, dealInfo),
  },
  db: {
    cacheMessages: (chatId: string, messages: unknown[]) => ipcRenderer.invoke('db:cacheMessages', chatId, messages),
    getCachedMessages: (chatId: string) => ipcRenderer.invoke('db:getCachedMessages', chatId),
    saveSession: (key: string, value: string) => ipcRenderer.invoke('db:saveSession', key, value),
    getSession: (key: string) => ipcRenderer.invoke('db:getSession', key),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
