import { ipcMain, shell, dialog } from 'electron'
import fs from 'fs'
import type { ProdukInput, PaketInput, SaveTransaksiInput, TransaksiFilter } from '../shared/types'
import { getBackupDir, clearDatabase, getPengaturan, setPengaturan, exportDatabaseData, importDatabaseData } from './database'
import { getMainWindow } from './index'
import * as produkService from './services/produk'
import * as paketService from './services/paket'
import * as transaksiService from './services/transaksi'
import * as laporanService from './services/laporan'
import { printReceipt } from './receipt'

export function registerIpcHandlers(): void {
  ipcMain.handle('produk:list', (_e, search?: string) => produkService.listProduk(search))
  ipcMain.handle('produk:get', (_e, id: number) => produkService.getProduk(id))
  ipcMain.handle('produk:create', (_e, data: ProdukInput) => produkService.createProduk(data))
  ipcMain.handle('produk:update', (_e, id: number, data: ProdukInput) => produkService.updateProduk(id, data))
  ipcMain.handle('produk:delete', (_e, id: number) => produkService.deleteProduk(id))
  ipcMain.handle('produk:exportCsv', () => produkService.exportProdukCsv())
  ipcMain.handle('produk:importCsv', (_e, csv: string) => produkService.importProdukCsv(csv))

  ipcMain.handle('paket:list', (_e, search?: string) => paketService.listPaket(search))
  ipcMain.handle('paket:get', (_e, id: number) => paketService.getPaket(id))
  ipcMain.handle('paket:create', (_e, data: PaketInput) => paketService.createPaket(data))
  ipcMain.handle('paket:update', (_e, id: number, data: PaketInput) => paketService.updatePaket(id, data))
  ipcMain.handle('paket:delete', (_e, id: number) => paketService.deletePaket(id))
  ipcMain.handle('paket:exportCsv', () => paketService.exportPaketCsv())
  ipcMain.handle('paket:importCsv', (_e, csv: string) => paketService.importPaketCsv(csv))

  ipcMain.handle('transaksi:save', (_e, input: SaveTransaksiInput) => {
    const { transaksi, receipt } = transaksiService.saveTransaksi(input)
    return { transaksi, receipt }
  })
  ipcMain.handle('transaksi:list', (_e, filter?: TransaksiFilter) => transaksiService.listTransaksi(filter))
  ipcMain.handle('transaksi:get', (_e, id: number) => transaksiService.getTransaksiWithDetails(id))
  ipcMain.handle('transaksi:getLast', () => transaksiService.getLastTransaksi())
  ipcMain.handle('transaksi:getLastReceipt', () => transaksiService.getLastReceipt())
  ipcMain.handle('transaksi:getReceipt', (_e, id: number) => transaksiService.getReceipt(id))
  ipcMain.handle('transaksi:delete', (_e, id: number) => transaksiService.deleteTransaksi(id))
  ipcMain.handle('transaksi:print', (_e, text: string) => printReceipt(text))

  ipcMain.handle('laporan:getSummary', (_e, dateFrom?: string, dateTo?: string) => laporanService.getLaporanSummary(dateFrom, dateTo))
  ipcMain.handle('laporan:getProdukProfit', (_e, dateFrom?: string, dateTo?: string) => laporanService.getLaporanProdukProfit(dateFrom, dateTo))
  ipcMain.handle('laporan:getItemTransactions', (_e, itemId: number, tipe: 'produk' | 'paket', dateFrom?: string, dateTo?: string) => 
    laporanService.getLaporanItemTransactions(itemId, tipe, dateFrom, dateTo)
  )

  ipcMain.handle('settings:get', () => ({ backupPath: getBackupDir() }))
  ipcMain.handle('settings:openBackupFolder', () => shell.openPath(getBackupDir()))
  ipcMain.handle('settings:clearDatabase', () => clearDatabase())
  ipcMain.handle('settings:getStoreConfig', () => ({
    namaToko: getPengaturan('nama_toko', 'TOKO SNACK'),
    adminPassword: getPengaturan('admin_password', 'admin'),
    alamatToko: getPengaturan('alamat_toko', ''),
    warnaPrimary: getPengaturan('warna_primary', '#ea580c'),
    selectedPrinter: getPengaturan('selected_printer', '')
  }))
  ipcMain.handle('settings:updateStoreConfig', (_e, namaToko: string, adminPassword?: string, alamatToko?: string, warnaPrimary?: string, selectedPrinter?: string) => {
    setPengaturan('nama_toko', namaToko.trim())
    if (adminPassword !== undefined) {
      setPengaturan('admin_password', adminPassword)
    }
    if (alamatToko !== undefined) {
      setPengaturan('alamat_toko', alamatToko.trim())
    }
    if (warnaPrimary !== undefined) {
      setPengaturan('warna_primary', warnaPrimary.trim())
    }
    if (selectedPrinter !== undefined) {
      setPengaturan('selected_printer', selectedPrinter.trim())
    }
  })
  ipcMain.handle('settings:getPrinters', async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return []
    try {
      return await mainWindow.webContents.getPrintersAsync()
    } catch (err) {
      console.error('Gagal mendapatkan list printer:', err)
      return []
    }
  })

  ipcMain.handle('settings:exportData', async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return false

    const rawNamaToko = getPengaturan('nama_toko', 'toko').toLowerCase().trim()
    const cleanNamaToko = rawNamaToko.replace(/[^a-z0-9]+/g, '_')
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '')
    const defaultFilename = `${cleanNamaToko}_global_${dateStr}_${timeStr}.json`

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Ekspor Data (Backup)',
      defaultPath: defaultFilename,
      filters: [{ name: 'JSON Backup', extensions: ['json'] }]
    })

    if (canceled || !filePath) return false

    try {
      const dataStr = exportDatabaseData()
      fs.writeFileSync(filePath, dataStr, 'utf-8')
      return true
    } catch (err) {
      console.error('Gagal mengekspor data:', err)
      throw new Error(err instanceof Error ? err.message : 'Gagal mengekspor data')
    }
  })

  ipcMain.handle('settings:importData', async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return false

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Impor Data (Restore)',
      properties: ['openFile'],
      filters: [{ name: 'JSON Backup', extensions: ['json'] }]
    })

    if (canceled || filePaths.length === 0) return false

    try {
      const filePath = filePaths[0]
      const jsonContent = fs.readFileSync(filePath, 'utf-8')
      importDatabaseData(jsonContent)
      return true
    } catch (err) {
      console.error('Gagal mengimpor data:', err)
      throw new Error(err instanceof Error ? err.message : 'Gagal mengimpor data')
    }
  })
}
