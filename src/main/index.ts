import { app, BrowserWindow } from 'electron'
import path from 'path'
import { closeDatabase, initDatabase } from './database'
import { registerIpcHandlers } from './ipc'
import icon from '../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  initDatabase()
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Kasir',
    icon: icon,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Global Debug & Reload Shortcuts (works in both dev and production build)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Cmd+Option+I (macOS) or Ctrl+Shift+I (Windows) or F12 -> Toggle DevTools
    const isDevToolsShortcut =
      input.key === 'F12' ||
      (input.key.toLowerCase() === 'i' &&
        ((input.meta && input.alt) || (input.control && input.shift)))

    if (isDevToolsShortcut && input.type === 'keyDown') {
      mainWindow?.webContents.toggleDevTools()
      event.preventDefault()
    }

    // Cmd+R (macOS) or Ctrl+R (Windows) or F5 -> Reload Window
    const isReloadShortcut =
      input.key === 'F5' ||
      (input.key.toLowerCase() === 'r' && (input.meta || input.control))

    if (isReloadShortcut && input.type === 'keyDown') {
      mainWindow?.webContents.reload()
      event.preventDefault()
    }
  })

  // Log renderer crashes/hangs
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details)
  })

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('Main window is unresponsive')
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools({ mode: 'bottom' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Global Exception Handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in main process:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection in main process:', reason)
})

app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  closeDatabase()
})

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

