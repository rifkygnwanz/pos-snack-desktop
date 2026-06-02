import { contextBridge, ipcRenderer } from 'electron'
import type { ProdukInput, PaketInput, SaveTransaksiInput, TransaksiFilter } from '../shared/types'

const api = {
  produk: {
    list: (search?: string) => ipcRenderer.invoke('produk:list', search),
    get: (id: number) => ipcRenderer.invoke('produk:get', id),
    create: (data: ProdukInput) => ipcRenderer.invoke('produk:create', data),
    update: (id: number, data: ProdukInput) => ipcRenderer.invoke('produk:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('produk:delete', id),
    exportCsv: () => ipcRenderer.invoke('produk:exportCsv'),
    importCsv: (csv: string) => ipcRenderer.invoke('produk:importCsv', csv)
  },
  paket: {
    list: (search?: string) => ipcRenderer.invoke('paket:list', search),
    get: (id: number) => ipcRenderer.invoke('paket:get', id),
    create: (data: PaketInput) => ipcRenderer.invoke('paket:create', data),
    update: (id: number, data: PaketInput) => ipcRenderer.invoke('paket:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('paket:delete', id),
    exportCsv: () => ipcRenderer.invoke('paket:exportCsv'),
    importCsv: (csv: string) => ipcRenderer.invoke('paket:importCsv', csv)
  },
  transaksi: {
    save: (input: SaveTransaksiInput) => ipcRenderer.invoke('transaksi:save', input),
    list: (filter?: TransaksiFilter) => ipcRenderer.invoke('transaksi:list', filter),
    get: (id: number) => ipcRenderer.invoke('transaksi:get', id),
    getLast: () => ipcRenderer.invoke('transaksi:getLast'),
    getLastReceipt: () => ipcRenderer.invoke('transaksi:getLastReceipt'),
    getReceipt: (id: number) => ipcRenderer.invoke('transaksi:getReceipt', id),
    delete: (id: number) => ipcRenderer.invoke('transaksi:delete', id),
    print: (text: string) => ipcRenderer.invoke('transaksi:print', text)
  },
  laporan: {
    getSummary: (dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('laporan:getSummary', dateFrom, dateTo),
    getProdukProfit: (dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('laporan:getProdukProfit', dateFrom, dateTo),
    getItemTransactions: (itemId: number, tipe: 'produk' | 'paket', dateFrom?: string, dateTo?: string) => 
      ipcRenderer.invoke('laporan:getItemTransactions', itemId, tipe, dateFrom, dateTo)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    openBackupFolder: () => ipcRenderer.invoke('settings:openBackupFolder'),
    clearDatabase: () => ipcRenderer.invoke('settings:clearDatabase'),
    getStoreConfig: () => ipcRenderer.invoke('settings:getStoreConfig'),
    updateStoreConfig: (namaToko: string, adminPassword?: string, alamatToko?: string, warnaPrimary?: string, selectedPrinter?: string) => 
      ipcRenderer.invoke('settings:updateStoreConfig', namaToko, adminPassword, alamatToko, warnaPrimary, selectedPrinter),
    getPrinters: () => ipcRenderer.invoke('settings:getPrinters'),
    exportData: () => ipcRenderer.invoke('settings:exportData'),
    importData: () => ipcRenderer.invoke('settings:importData')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type PreloadAPI = typeof api
