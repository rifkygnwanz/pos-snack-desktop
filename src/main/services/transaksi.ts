import type { CartItem, DetailTransaksi, SaveTransaksiInput, Transaksi, TransaksiFilter } from '../../shared/types'
import { backupDatabase } from '../backup'
import { getDatabase, getPengaturan } from '../database'
import { generateReceipt, printReceipt } from '../receipt'

function rowToTransaksi(row: Record<string, unknown>): Transaksi {
  return {
    id: row.id as number,
    nomor_trx: row.nomor_trx as string,
    tanggal: row.tanggal as string,
    total: row.total as number,
    diskon: row.diskon as number,
    total_bayar: row.total_bayar as number,
    bayar: row.bayar as number,
    kembali: row.kembali as number,
    item_count: row.item_count as number | undefined
  }
}

function rowToDetail(row: Record<string, unknown>): DetailTransaksi {
  return {
    id: row.id as number,
    transaksi_id: row.transaksi_id as number,
    produk_id: row.produk_id as number | null,
    paket_id: row.paket_id as number | null,
    nama_snapshot: row.nama_snapshot as string,
    kemasan: row.kemasan as string,
    harga_satuan: row.harga_satuan as number,
    qty: row.qty as number,
    diskon_item: row.diskon_item as number,
    subtotal: row.subtotal as number
  }
}

function generateNomorTrx(db: ReturnType<typeof getDatabase>): string {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const prefix = `TRX-${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}`
  const timeStr = `${pad(today.getHours())}${pad(today.getMinutes())}${pad(today.getSeconds())}`

  const candidate = `${prefix}-${timeStr}`
  let finalNomorTrx = candidate
  let count = 0

  while (true) {
    const exists = db
      .prepare(`SELECT 1 FROM transaksi WHERE nomor_trx = ?`)
      .get(finalNomorTrx)
    if (!exists) {
      break
    }
    count++
    finalNomorTrx = `${candidate}-${count}`
  }

  return finalNomorTrx
}

function validateItems(items: CartItem[]): void {
  if (!items.length) throw new Error('Keranjang masih kosong')
  for (const item of items) {
    if (item.diskon_item > item.harga_satuan) {
      throw new Error(`Diskon melebihi harga satuan untuk ${item.nama}`)
    }
    if (item.qty < 1) throw new Error('Qty minimal 1')
  }
}

export function saveTransaksi(input: SaveTransaksiInput): { transaksi: Transaksi; receipt: string; details: DetailTransaksi[] } {
  validateItems(input.items)

  const total = input.items.reduce((s, i) => s + i.harga_satuan * i.qty, 0)
  const diskon = input.items.reduce((s, i) => s + i.diskon_item * i.qty, 0)
  const totalBayar = input.items.reduce((s, i) => s + (i.harga_satuan - i.diskon_item) * i.qty, 0)

  if (input.bayar < totalBayar) throw new Error('Nominal bayar kurang dari total bayar')

  const kembali = input.bayar - totalBayar
  const db = getDatabase()
  const nomorTrx = generateNomorTrx(db)

  const insertTrx = db.prepare(`
    INSERT INTO transaksi (nomor_trx, total, diskon, total_bayar, bayar, kembali)
    VALUES (@nomor_trx, @total, @diskon, @total_bayar, @bayar, @kembali)
  `)

  const insertDetail = db.prepare(`
    INSERT INTO detail_transaksi (transaksi_id, produk_id, paket_id, nama_snapshot, kemasan, harga_satuan, qty, diskon_item, subtotal)
    VALUES (@transaksi_id, @produk_id, @paket_id, @nama_snapshot, @kemasan, @harga_satuan, @qty, @diskon_item, @subtotal)
  `)

  const tx = db.transaction(() => {
    const result = insertTrx.run({
      nomor_trx: nomorTrx,
      total,
      diskon,
      total_bayar: totalBayar,
      bayar: input.bayar,
      kembali
    })

    const transaksiId = Number(result.lastInsertRowid)

    for (const item of input.items) {
      insertDetail.run({
        transaksi_id: transaksiId,
        produk_id: item.produk_id,
        paket_id: item.paket_id !== undefined ? item.paket_id : null,
        nama_snapshot: item.nama,
        kemasan: item.kemasan,
        harga_satuan: item.harga_satuan,
        qty: item.qty,
        diskon_item: item.diskon_item,
        subtotal: (item.harga_satuan - item.diskon_item) * item.qty
      })
    }

    return transaksiId
  })

  const transaksiId = tx()
  backupDatabase()

  const transaksi = getTransaksi(transaksiId)!
  const details = getDetailTransaksi(transaksiId)
  const storeName = getPengaturan('nama_toko', 'TOKO SNACK')
  const alamat = getPengaturan('alamat_toko', '')
  const receipt = generateReceipt(transaksi, details, storeName, alamat)
  if (input.cetak !== false) {
    printReceipt(receipt)
  }

  return { transaksi, receipt, details }
}

export function listTransaksi(filter: TransaksiFilter = {}): Transaksi[] {
  const db = getDatabase()
  const conditions: string[] = ['1=1']
  const params: unknown[] = []

  if (filter.search?.trim()) {
    conditions.push('t.nomor_trx LIKE ?')
    params.push(`%${filter.search.trim()}%`)
  }
  if (filter.dateFrom) {
    conditions.push('date(t.tanggal) >= date(?)')
    params.push(filter.dateFrom)
  }
  if (filter.dateTo) {
    conditions.push('date(t.tanggal) <= date(?)')
    params.push(filter.dateTo)
  }

  const rows = db
    .prepare(
      `SELECT t.*, COUNT(d.id) as item_count
       FROM transaksi t
       LEFT JOIN detail_transaksi d ON d.transaksi_id = t.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY t.id
       ORDER BY t.tanggal DESC`
    )
    .all(...params) as Record<string, unknown>[]

  return rows.map(rowToTransaksi)
}

export function getTransaksi(id: number): Transaksi | null {
  const row = getDatabase().prepare('SELECT * FROM transaksi WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToTransaksi(row) : null
}

export function getDetailTransaksi(transaksiId: number): DetailTransaksi[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM detail_transaksi WHERE transaksi_id = ? ORDER BY id ASC')
    .all(transaksiId) as Record<string, unknown>[]
  return rows.map(rowToDetail)
}

export function getTransaksiWithDetails(id: number): { transaksi: Transaksi; details: DetailTransaksi[] } | null {
  const transaksi = getTransaksi(id)
  if (!transaksi) return null
  return { transaksi, details: getDetailTransaksi(id) }
}

export function getLastTransaksi(): { transaksi: Transaksi; details: DetailTransaksi[] } | null {
  const row = getDatabase()
    .prepare('SELECT id FROM transaksi ORDER BY id DESC LIMIT 1')
    .get() as { id: number } | undefined
  if (!row) return null
  return getTransaksiWithDetails(row.id)
}

export function getLastReceipt(): string | null {
  const last = getLastTransaksi()
  if (!last) return null
  const storeName = getPengaturan('nama_toko', 'TOKO SNACK')
  const alamat = getPengaturan('alamat_toko', '')
  return generateReceipt(last.transaksi, last.details, storeName, alamat)
}

export function getReceipt(id: number): string | null {
  const data = getTransaksiWithDetails(id)
  if (!data) return null
  const storeName = getPengaturan('nama_toko', 'TOKO SNACK')
  const alamat = getPengaturan('alamat_toko', '')
  return generateReceipt(data.transaksi, data.details, storeName, alamat)
}

export function deleteTransaksi(id: number): void {
  const db = getDatabase()
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM detail_transaksi WHERE transaksi_id = ?').run(id)
    db.prepare('DELETE FROM transaksi WHERE id = ?').run(id)
  })
  tx()
}
