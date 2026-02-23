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
    getMessages: (chatId: string, limit?: number, offsetId?: number) => ipcRenderer.invoke('telegram:getMessages', chatId, limit, offsetId),
    sendMessage: (chatId: string, text: string, replyTo?: number) => ipcRenderer.invoke('telegram:sendMessage', chatId, text, replyTo),
    editMessage: (chatId: string, messageId: number, text: string) => ipcRenderer.invoke('telegram:editMessage', chatId, messageId, text),
    deleteMessages: (chatId: string, messageIds: number[], revoke?: boolean) => ipcRenderer.invoke('telegram:deleteMessages', chatId, messageIds, revoke),
    getUserInfo: (userId: string) => ipcRenderer.invoke('telegram:getUserInfo', userId),
    markRead: (chatId: string) => ipcRenderer.invoke('telegram:markRead', chatId),
    getForumTopics: (chatId: string) => ipcRenderer.invoke('telegram:getForumTopics', chatId),
    getTopicMessages: (chatId: string, topicId: number, limit?: number) => ipcRenderer.invoke('telegram:getTopicMessages', chatId, topicId, limit),
    sendTopicMessage: (chatId: string, topicId: number, text: string) => ipcRenderer.invoke('telegram:sendTopicMessage', chatId, topicId, text),
    pickFile: (options?: { mediaOnly?: boolean }) => ipcRenderer.invoke('telegram:pickFile', options),
    sendFile: (chatId: string, filePath: string, caption?: string, replyTo?: number) => ipcRenderer.invoke('telegram:sendFile', chatId, filePath, caption, replyTo),
    sendPhoto: (chatId: string, base64Data: string, caption?: string, replyTo?: number) => ipcRenderer.invoke('telegram:sendPhoto', chatId, base64Data, caption, replyTo),
    searchMessages: (query: string, chatId?: string, limit?: number) => ipcRenderer.invoke('telegram:searchMessages', query, chatId, limit),
    setTyping: (chatId: string) => ipcRenderer.invoke('telegram:setTyping', chatId),
    setNotificationSettings: (settings: { mutedChats: string[] }) =>
      ipcRenderer.invoke('telegram:setNotificationSettings', settings),
    logout: () => ipcRenderer.invoke('telegram:logout'),
    getAccounts: () => ipcRenderer.invoke('telegram:getAccounts'),
    switchAccount: (accountId: string) => ipcRenderer.invoke('telegram:switchAccount', accountId),
    addAccount: () => ipcRenderer.invoke('telegram:addAccount'),
    removeAccount: (accountId: string) => ipcRenderer.invoke('telegram:removeAccount', accountId),
    cancelAddAccount: () => ipcRenderer.invoke('telegram:cancelAddAccount'),
    getDialogFilters: () => ipcRenderer.invoke('telegram:getDialogFilters'),
    getArchivedDialogs: (limit?: number) => ipcRenderer.invoke('telegram:getArchivedDialogs', limit),
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
