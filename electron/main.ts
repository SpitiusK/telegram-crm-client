import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { setupTelegramIPC, saveAllSessions } from './ipc/telegram'
import { setupCrmIPC } from './ipc/crm'
import { setupClaudeIPC } from './ipc/claude'
import { setupDatabaseIPC } from './ipc/database'
import { AppDatabase } from './database/index'

let mainWindow: BrowserWindow | null = null
let database: AppDatabase | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Telegram CRM Client',
    backgroundColor: '#17212b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Show when ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function initDatabase(): void {
  try {
    database = new AppDatabase()
    database.init()
    console.warn('[Main] Database initialized successfully')
  } catch (err) {
    console.error('[Main] Database initialization failed:', err)
  }
}

function registerIPC(): void {
  setupTelegramIPC(ipcMain)
  setupCrmIPC(ipcMain)
  setupClaudeIPC(ipcMain)
  setupDatabaseIPC(ipcMain)
}

app.whenReady().then(() => {
  initDatabase()
  registerIPC()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}).catch((err) => {
  console.error('[Main] App initialization failed:', err)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    database?.close()
    app.quit()
  }
})

app.on('before-quit', () => {
  saveAllSessions()
  database?.close()
})

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught exception:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled rejection:', reason)
})
