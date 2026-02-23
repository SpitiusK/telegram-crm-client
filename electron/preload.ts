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
    getMe: (accountId?: string) => ipcRenderer.invoke('telegram:getMe', accountId),
    getDialogs: (limit?: number, accountId?: string) => ipcRenderer.invoke('telegram:getDialogs', accountId, limit),
    getMessages: (chatId: string, limit?: number, offsetId?: number, accountId?: string) => ipcRenderer.invoke('telegram:getMessages', accountId, chatId, limit, offsetId),
    sendMessage: (chatId: string, text: string, replyTo?: number, accountId?: string) => ipcRenderer.invoke('telegram:sendMessage', accountId, chatId, text, replyTo),
    editMessage: (chatId: string, messageId: number, text: string, accountId?: string) => ipcRenderer.invoke('telegram:editMessage', accountId, chatId, messageId, text),
    deleteMessages: (chatId: string, messageIds: number[], revoke?: boolean, accountId?: string) => ipcRenderer.invoke('telegram:deleteMessages', accountId, chatId, messageIds, revoke),
    getUserInfo: (userId: string, accountId?: string) => ipcRenderer.invoke('telegram:getUserInfo', accountId, userId),
    markRead: (chatId: string, accountId?: string) => ipcRenderer.invoke('telegram:markRead', accountId, chatId),
    getForumTopics: (chatId: string, accountId?: string) => ipcRenderer.invoke('telegram:getForumTopics', accountId, chatId),
    getTopicMessages: (chatId: string, topicId: number, limit?: number, accountId?: string) => ipcRenderer.invoke('telegram:getTopicMessages', accountId, chatId, topicId, limit),
    sendTopicMessage: (chatId: string, topicId: number, text: string, accountId?: string) => ipcRenderer.invoke('telegram:sendTopicMessage', accountId, chatId, topicId, text),
    pickFile: (options?: { mediaOnly?: boolean }) => ipcRenderer.invoke('telegram:pickFile', options),
    sendFile: (chatId: string, filePath: string, caption?: string, replyTo?: number, accountId?: string) => ipcRenderer.invoke('telegram:sendFile', accountId, chatId, filePath, caption, replyTo),
    sendPhoto: (chatId: string, base64Data: string, caption?: string, replyTo?: number, accountId?: string) => ipcRenderer.invoke('telegram:sendPhoto', accountId, chatId, base64Data, caption, replyTo),
    searchMessages: (query: string, chatId?: string, limit?: number, accountId?: string) => ipcRenderer.invoke('telegram:searchMessages', accountId, query, chatId, limit),
    setTyping: (chatId: string, accountId?: string) => ipcRenderer.invoke('telegram:setTyping', accountId, chatId),
    setNotificationSettings: (settings: { mutedChats: string[] }) =>
      ipcRenderer.invoke('telegram:setNotificationSettings', settings),
    logout: () => ipcRenderer.invoke('telegram:logout'),
    getAccounts: () => ipcRenderer.invoke('telegram:getAccounts'),
    switchAccount: (accountId: string) => ipcRenderer.invoke('telegram:switchAccount', accountId),
    addAccount: () => ipcRenderer.invoke('telegram:addAccount'),
    removeAccount: (accountId: string) => ipcRenderer.invoke('telegram:removeAccount', accountId),
    cancelAddAccount: () => ipcRenderer.invoke('telegram:cancelAddAccount'),
    connectAll: () => ipcRenderer.invoke('telegram:connectAll'),
    getDialogFilters: (accountId?: string) => ipcRenderer.invoke('telegram:getDialogFilters', accountId),
    getArchivedDialogs: (limit?: number, accountId?: string) => ipcRenderer.invoke('telegram:getArchivedDialogs', accountId, limit),
    onNotificationClick: (callback: (chatId: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, eventName: string, data: unknown) => {
        if (eventName === 'notificationClick') {
          const { chatId } = data as { chatId: string }
          callback(chatId)
        }
      }
      ipcRenderer.on('telegram:update', handler)
      return () => {
        ipcRenderer.removeListener('telegram:update', handler)
      }
    },
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
