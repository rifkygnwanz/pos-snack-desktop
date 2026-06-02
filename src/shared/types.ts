export type Kemasan = 'jual' | '100gr' | '200gr' | '250gr' | '500gr' | '1kg'

export const KEMASAN_LABELS: Record<Kemasan, string> = {
  jual: 'Bal',
  '100gr': '100gr',
  '200gr': '200gr',
  '250gr': '250gr',
  '500gr': '500gr',
  '1kg': '1kg'
}

export const KEMASAN_FIELDS: Record<Kemasan, keyof Produk> = {
  jual: 'harga_jual',
  '100gr': 'harga_100gr',
  '200gr': 'harga_200gr',
  '250gr': 'harga_250gr',
  '500gr': 'harga_500gr',
  '1kg': 'harga_1kg'
}

export interface Produk {
  id: number
  nama_menu: string
  harga_modal: number | null
  harga_jual: number | null
  harga_100gr: number | null
  harga_200gr: number | null
  harga_250gr: number | null
  harga_500gr: number | null
  harga_1kg: number | null
  berat_produk: string | null
  main_eceran: Kemasan | null
  label_kemasan: string | null
  deleted: number
  created_at: string
  updated_at: string
}

export type ProdukInput = Omit<Produk, 'id' | 'deleted' | 'created_at' | 'updated_at'>

export interface Paket {
  id: number
  nama_paket: string
  harga_modal: number
  harga_jual: number
  deleted: number
  created_at: string
  updated_at: string
}

export type PaketInput = Omit<Paket, 'id' | 'deleted' | 'created_at' | 'updated_at'>

export interface Transaksi {
  id: number
  nomor_trx: string
  tanggal: string
  total: number
  diskon: number
  total_bayar: number
  bayar: number
  kembali: number
  item_count?: number
}

export interface DetailTransaksi {
  id: number
  transaksi_id: number
  produk_id: number | null
  paket_id: number | null
  nama_snapshot: string
  kemasan: string
  harga_satuan: number
  qty: number
  diskon_item: number
  subtotal: number
}

export interface CartItem {
  key: string
  produk_id: number | null
  paket_id: number | null
  nama: string
  kemasan: string
  harga_satuan: number
  qty: number
  diskon_item: number
}

export interface SaveTransaksiInput {
  items: CartItem[]
  bayar: number
  cetak?: boolean
}

export interface TransaksiFilter {
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface AppSettings {
  backupPath: string
}

export interface LaporanSummary {
  totalPenjualan: number
  totalModal: number
  totalKeuntungan: number
  totalTransaksi: number
  totalDiskon: number
  penjualanHarian: { tanggal: string; penjualan: number; keuntungan: number }[]
  proporsiPenjualan: { tipe: 'produk' | 'paket'; total: number; qty: number }[]
}

export interface LaporanProdukProfit {
  id: number | null
  nama: string
  tipe: 'produk' | 'paket'
  berat_produk: string | null
  harga_modal_base: number | null
  qty_terjual: number
  total_omset: number
  total_modal: number
  total_profit: number
  detail_kemasan: Record<string, { qty: number; subtotal: number; label: string }>
}

export interface LaporanItemTransaction {
  nomor_trx: string
  tanggal: string
  kemasan: string
  qty: number
  harga_satuan: number
  subtotal: number
  total_modal: number
  total_profit: number
}

export interface PosAPI {
  produk: {
    list: (search?: string) => Promise<Produk[]>
    get: (id: number) => Promise<Produk | null>
    create: (data: ProdukInput) => Promise<Produk>
    update: (id: number, data: ProdukInput) => Promise<Produk>
    delete: (id: number) => Promise<void>
    exportCsv: () => Promise<string>
    importCsv: (csv: string) => Promise<number>
  }
  paket: {
    list: (search?: string) => Promise<Paket[]>
    get: (id: number) => Promise<Paket | null>
    create: (data: PaketInput) => Promise<Paket>
    update: (id: number, data: PaketInput) => Promise<Paket>
    delete: (id: number) => Promise<void>
    exportCsv: () => Promise<string>
    importCsv: (csv: string) => Promise<number>
  }
  transaksi: {
    save: (input: SaveTransaksiInput) => Promise<{ transaksi: Transaksi; receipt: string }>
    list: (filter?: TransaksiFilter) => Promise<Transaksi[]>
    get: (id: number) => Promise<{ transaksi: Transaksi; details: DetailTransaksi[] } | null>
    getLast: () => Promise<{ transaksi: Transaksi; details: DetailTransaksi[] } | null>
    getLastReceipt: () => Promise<string | null>
    getReceipt: (id: number) => Promise<string | null>
    delete: (id: number) => Promise<void>
    print: (text: string) => Promise<boolean>
  }
  laporan: {
    getSummary: (dateFrom?: string, dateTo?: string) => Promise<LaporanSummary>
    getProdukProfit: (dateFrom?: string, dateTo?: string) => Promise<LaporanProdukProfit[]>
    getItemTransactions: (itemId: number, tipe: 'produk' | 'paket', dateFrom?: string, dateTo?: string) => Promise<LaporanItemTransaction[]>
  }
  settings: {
    get: () => Promise<AppSettings>
    openBackupFolder: () => Promise<void>
    clearDatabase: () => Promise<void>
    getStoreConfig: () => Promise<{ namaToko: string; adminPassword?: string; alamatToko?: string; warnaPrimary?: string; selectedPrinter?: string }>
    updateStoreConfig: (namaToko: string, adminPassword?: string, alamatToko?: string, warnaPrimary?: string, selectedPrinter?: string) => Promise<void>
    getPrinters: () => Promise<Array<{ name: string; displayName: string; isDefault: boolean }>>
    exportData: () => Promise<boolean>
    importData: () => Promise<boolean>
  }
}

declare global {
  interface Window {
    api: PosAPI
  }
}

export {}
