import type { Paket, PaketInput } from '../../shared/types'
import { getDatabase } from '../database'

function rowToPaket(row: Record<string, unknown>): Paket {
  return {
    id: row.id as number,
    nama_paket: row.nama_paket as string,
    harga_modal: row.harga_modal as number,
    harga_jual: row.harga_jual as number,
    deleted: row.deleted as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}

export function listPaket(search?: string): Paket[] {
  const db = getDatabase()
  let rows: Record<string, unknown>[]

  if (search?.trim()) {
    const q = `%${search.trim()}%`
    rows = db
      .prepare(
        `SELECT * FROM paket WHERE deleted = 0 AND (nama_paket LIKE ? OR CAST(id AS TEXT) LIKE ?) ORDER BY nama_paket ASC`
      )
      .all(q, q) as Record<string, unknown>[]
  } else {
    rows = db
      .prepare('SELECT * FROM paket WHERE deleted = 0 ORDER BY nama_paket ASC')
      .all() as Record<string, unknown>[]
  }

  return rows.map(rowToPaket)
}

export function getPaket(id: number): Paket | null {
  const row = getDatabase()
    .prepare('SELECT * FROM paket WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined
  return row ? rowToPaket(row) : null
}

export function createPaket(data: PaketInput): Paket {
  data.nama_paket = (data.nama_paket || '').trim().toUpperCase()
  validatePaketInput(data)
  const db = getDatabase()
  const result = db
    .prepare(
      `INSERT INTO paket (nama_paket, harga_modal, harga_jual, updated_at)
       VALUES (@nama_paket, @harga_modal, @harga_jual, datetime('now', 'localtime'))`
    )
    .run(data)

  return getPaket(Number(result.lastInsertRowid))!
}

export function updatePaket(id: number, data: PaketInput): Paket {
  data.nama_paket = (data.nama_paket || '').trim().toUpperCase()
  validatePaketInput(data)
  getDatabase()
    .prepare(
      `UPDATE paket SET nama_paket=@nama_paket, harga_modal=@harga_modal, harga_jual=@harga_jual, updated_at=datetime('now', 'localtime')
       WHERE id=@id`
    )
    .run({ ...data, id })

  return getPaket(id)!
}

export function deletePaket(id: number): void {
  const db = getDatabase()
  const used = db
    .prepare('SELECT COUNT(*) as c FROM detail_transaksi WHERE paket_id = ?')
    .get(id) as { c: number }

  if (used.c > 0) {
    db.prepare(
      `UPDATE paket SET deleted = 1, updated_at = datetime('now', 'localtime') WHERE id = ?`
    ).run(id)
  } else {
    db.prepare('DELETE FROM paket WHERE id = ?').run(id)
  }
}

function validatePaketInput(data: PaketInput): void {
  if (!data.nama_paket?.trim()) {
    throw new Error('Nama paket wajib diisi')
  }
  if (data.harga_modal == null || data.harga_modal < 0) {
    throw new Error('Harga modal tidak valid')
  }
  if (data.harga_jual == null || data.harga_jual < 0) {
    throw new Error('Harga jual tidak valid')
  }
}

export function exportPaketCsv(): string {
  const paket = listPaket()
  const header = 'No,Nama Paket,Harga Modal,Harga Jual'
  const rows = paket.map((p, idx) =>
    [
      idx + 1,
      `"${p.nama_paket.replace(/"/g, '""')}"`,
      p.harga_modal,
      p.harga_jual
    ].join(',')
  )
  return [header, ...rows].join('\n')
}

export function importPaketCsv(csv: string): number {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) return 0

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const nameIdx = headers.indexOf('nama paket')
  const modalIdx = headers.indexOf('harga modal') !== -1 ? headers.indexOf('harga modal') : headers.indexOf('harga beli')
  const jualIdx = headers.indexOf('harga jual')

  const db = getDatabase()
  const insert = db.prepare(`
    INSERT INTO paket (nama_paket, harga_modal, harga_jual, updated_at)
    VALUES (@nama_paket, @harga_modal, @harga_jual, datetime('now', 'localtime'))
  `)

  let count = 0
  const tx = db.transaction(() => {
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i])
      if (cols.length < 2 || nameIdx === -1 || !cols[nameIdx]?.trim()) continue

      const hargaModal = modalIdx !== -1 ? parseOptionalInt(cols[modalIdx]) : 0
      const hargaJual = jualIdx !== -1 ? parseOptionalInt(cols[jualIdx]) : 0

      insert.run({
        nama_paket: cols[nameIdx].replace(/^"|"$/g, '').replace(/""/g, '"').trim().toUpperCase(),
        harga_modal: hargaModal,
        harga_jual: hargaJual
      })
      count++
    }
  })
  tx()
  return count
}

function parseOptionalInt(val: string | undefined): number {
  if (!val?.trim()) return 0
  const n = parseInt(val.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}
