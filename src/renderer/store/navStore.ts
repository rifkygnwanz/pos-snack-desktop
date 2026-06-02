import { create } from 'zustand'
import { applyThemeColor } from '../utils/theme'

export type Page = 'kasir' | 'produk' | 'paket' | 'riwayat' | 'laporan' | 'pengaturan'

interface NavState {
  page: Page
  produkFormMode: 'list' | 'add' | 'edit'
  editingProdukId: number | null
  storeName: string
  alamatToko: string
  warnaPrimary: string
  setPage: (page: Page) => void
  openAddProduk: () => void
  openEditProduk: (id: number) => void
  closeProdukForm: () => void
  loadStoreConfig: () => Promise<void>
  setStoreConfig: (config: { storeName: string; alamatToko: string; warnaPrimary: string }) => void
}

export const useNavStore = create<NavState>((set) => ({
  page: 'kasir',
  produkFormMode: 'list',
  editingProdukId: null,
  storeName: 'TOKO SNACK',
  alamatToko: '',
  warnaPrimary: '#ea580c',
  setPage: (page) => set({ page, produkFormMode: 'list', editingProdukId: null }),
  openAddProduk: () => set({ page: 'produk', produkFormMode: 'add', editingProdukId: null }),
  openEditProduk: (id) => set({ page: 'produk', produkFormMode: 'edit', editingProdukId: id }),
  closeProdukForm: () => set({ produkFormMode: 'list', editingProdukId: null }),
  loadStoreConfig: async () => {
    try {
      const config = await window.api.settings.getStoreConfig()
      if (config) {
        const storeName = config.namaToko || 'TOKO SNACK'
        const alamatToko = config.alamatToko || ''
        const warnaPrimary = config.warnaPrimary || '#ea580c'
        set({ storeName, alamatToko, warnaPrimary })
        applyThemeColor(warnaPrimary)
      }
    } catch (err) {
      // Ignore if load fails
    }
  },
  setStoreConfig: (config) => {
    set({
      storeName: config.storeName,
      alamatToko: config.alamatToko,
      warnaPrimary: config.warnaPrimary
    })
    applyThemeColor(config.warnaPrimary)
  }
}))
