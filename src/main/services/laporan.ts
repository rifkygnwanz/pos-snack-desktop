import { getDatabase } from '../database'
import type { LaporanSummary, LaporanProdukProfit } from '../../shared/types'

function getWeightInGrams(beratStr: string | null | undefined): number {
  if (!beratStr) return 0
  const clean = beratStr.trim().toLowerCase()
  const match = clean.match(/^([\d.,]+)\s*(kg|gr|g)?$/)
  if (!match) return 0
  const val = parseFloat(match[1].replace(/,/g, '.'))
  const unit = match[2] || 'gr'
  if (unit === 'kg') return val * 1000
  return val // gr or g
}

function isMainPackaging(kemasanLabel: string, labelKemasanJson: string | null | undefined): boolean {
  let mainLabel = 'Bal'
  if (labelKemasanJson) {
    try {
      const labels = JSON.parse(labelKemasanJson)
      if (labels.jual) {
        mainLabel = labels.jual
      }
    } catch (e) {
      // ignore
    }
  }
  const cleanLabel = kemasanLabel.trim().toLowerCase()
  return cleanLabel === mainLabel.toLowerCase() || 
         cleanLabel === 'bal' || 
         cleanLabel === 'dus' || 
         cleanLabel === 'satuan'
}

function getItemWeightInGrams(kemasanLabel: string, labelKemasanJson: string | null | undefined): number {
  const cleanLabel = kemasanLabel.trim().toLowerCase()

  if (labelKemasanJson) {
    try {
      const labels = JSON.parse(labelKemasanJson) as Record<string, string>
      
      // Case 1: kemasanLabel is the key (e.g. '100gr')
      if (labels[cleanLabel]) {
        const parsed = getWeightInGrams(labels[cleanLabel])
        if (parsed > 0) return parsed
      }
      
      // Case 2: kemasanLabel is the custom label value itself (e.g. '85gr')
      for (const [key, val] of Object.entries(labels)) {
        if (val && val.trim().toLowerCase() === cleanLabel) {
          const parsed = getWeightInGrams(val)
          if (parsed > 0) return parsed
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const parsedDirect = getWeightInGrams(kemasanLabel)
  if (parsedDirect > 0) return parsedDirect

  if (cleanLabel.includes('100gr') || cleanLabel.includes('100g')) return 100
  if (cleanLabel.includes('200gr') || cleanLabel.includes('200g')) return 200
  if (cleanLabel.includes('250gr') || cleanLabel.includes('250g')) return 250
  if (cleanLabel.includes('500gr') || cleanLabel.includes('500g')) return 500
  if (cleanLabel.includes('1kg') || cleanLabel.includes('1 kg')) return 1000
  return 0
}

export function getLaporanSummary(dateFrom?: string, dateTo?: string): LaporanSummary {
  const db = getDatabase()
  const conditions: string[] = ['1=1']
  const params: unknown[] = []

  if (dateFrom) {
    conditions.push('date(t.tanggal) >= date(?)')
    params.push(dateFrom)
  }
  if (dateTo) {
    conditions.push('date(t.tanggal) <= date(?)')
    params.push(dateTo)
  }

  const query = `
    SELECT 
      d.produk_id,
      d.paket_id,
      d.kemasan,
      d.harga_satuan,
      d.qty,
      d.diskon_item,
      d.subtotal,
      t.id as transaksi_id,
      t.tanggal,
      p.harga_modal as prod_harga_modal,
      p.berat_produk as prod_berat_produk,
      p.label_kemasan as prod_label_kemasan,
      pk.harga_modal as pak_harga_modal
    FROM detail_transaksi d
    JOIN transaksi t ON d.transaksi_id = t.id
    LEFT JOIN produk p ON d.produk_id = p.id
    LEFT JOIN paket pk ON d.paket_id = pk.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY t.tanggal ASC
  `

  const rows = db.prepare(query).all(...params) as any[]

  let totalPenjualan = 0
  let totalModal = 0
  let totalDiskon = 0
  const transaksisSeen = new Set<number>()

  const dailyMap: Record<string, { penjualan: number; keuntungan: number }> = {}
  const typeMap: Record<'produk' | 'paket', { total: number; qty: number }> = {
    produk: { total: 0, qty: 0 },
    paket: { total: 0, qty: 0 }
  }

  for (const row of rows) {
    transaksisSeen.add(row.transaksi_id)

    // Calculate item cost (HPP / modal)
    let itemCost = 0
    const isPaket = row.paket_id != null
    if (isPaket) {
      const modal = row.pak_harga_modal ?? 0
      itemCost = modal * row.qty
    } else {
      const prodModal = row.prod_harga_modal
      const totalWeight = getWeightInGrams(row.prod_berat_produk)
      if (isMainPackaging(row.kemasan, row.prod_label_kemasan)) {
        itemCost = (prodModal ?? 0) * row.qty
      } else {
        const itemWeight = getItemWeightInGrams(row.kemasan, row.prod_label_kemasan)
        if (totalWeight > 0 && prodModal != null) {
          itemCost = Math.round((prodModal / totalWeight) * itemWeight) * row.qty
        } else {
          itemCost = 0
        }
      }
    }

    const itemOmset = row.subtotal
    const itemProfit = itemOmset - itemCost
    const itemDiskon = row.diskon_item * row.qty

    totalPenjualan += itemOmset
    totalModal += itemCost
    totalDiskon += itemDiskon

    const dateStr = row.tanggal.split(' ')[0] // Extract YYYY-MM-DD
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { penjualan: 0, keuntungan: 0 }
    }
    dailyMap[dateStr].penjualan += itemOmset
    dailyMap[dateStr].keuntungan += itemProfit

    const tipe = isPaket ? 'paket' : 'produk'
    typeMap[tipe].total += itemOmset
    typeMap[tipe].qty += row.qty
  }

  const penjualanHarian = Object.entries(dailyMap)
    .map(([tanggal, data]) => ({
      tanggal,
      penjualan: data.penjualan,
      keuntungan: data.keuntungan
    }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))

  const proporsiPenjualan = Object.entries(typeMap).map(([tipe, data]) => ({
    tipe: tipe as 'produk' | 'paket',
    total: data.total,
    qty: data.qty
  }))

  return {
    totalPenjualan,
    totalModal,
    totalKeuntungan: totalPenjualan - totalModal,
    totalTransaksi: transaksisSeen.size,
    totalDiskon,
    penjualanHarian,
    proporsiPenjualan
  }
}

export function getLaporanProdukProfit(dateFrom?: string, dateTo?: string): LaporanProdukProfit[] {
  const db = getDatabase()
  const conditions: string[] = ['1=1']
  const params: unknown[] = []

  if (dateFrom) {
    conditions.push('date(t.tanggal) >= date(?)')
    params.push(dateFrom)
  }
  if (dateTo) {
    conditions.push('date(t.tanggal) <= date(?)')
    params.push(dateTo)
  }

  const query = `
    SELECT 
      d.produk_id,
      d.paket_id,
      d.nama_snapshot,
      d.kemasan,
      d.harga_satuan,
      d.qty,
      d.diskon_item,
      d.subtotal,
      t.tanggal,
      p.harga_modal as prod_harga_modal,
      p.berat_produk as prod_berat_produk,
      p.label_kemasan as prod_label_kemasan,
      pk.harga_modal as pak_harga_modal
    FROM detail_transaksi d
    JOIN transaksi t ON d.transaksi_id = t.id
    LEFT JOIN produk p ON d.produk_id = p.id
    LEFT JOIN paket pk ON d.paket_id = pk.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY t.tanggal ASC
  `

  const rows = db.prepare(query).all(...params) as any[]
  const productProfitMap: Record<string, LaporanProdukProfit> = {}

  for (const row of rows) {
    const isPaket = row.paket_id != null
    const key = isPaket ? `paket-${row.paket_id}` : `produk-${row.produk_id}`

    // Calculate cost
    let itemCost = 0
    if (isPaket) {
      const modal = row.pak_harga_modal ?? 0
      itemCost = modal * row.qty
    } else {
      const prodModal = row.prod_harga_modal
      const totalWeight = getWeightInGrams(row.prod_berat_produk)
      if (isMainPackaging(row.kemasan, row.prod_label_kemasan)) {
        itemCost = (prodModal ?? 0) * row.qty
      } else {
        const itemWeight = getItemWeightInGrams(row.kemasan, row.prod_label_kemasan)
        if (totalWeight > 0 && prodModal != null) {
          itemCost = Math.round((prodModal / totalWeight) * itemWeight) * row.qty
        } else {
          itemCost = 0
        }
      }
    }

    const itemOmset = row.subtotal
    const itemProfit = itemOmset - itemCost
    const tipe = isPaket ? 'paket' : 'produk'

    if (!productProfitMap[key]) {
      productProfitMap[key] = {
        id: isPaket ? row.paket_id : row.produk_id,
        nama: row.nama_snapshot,
        tipe,
        berat_produk: isPaket ? null : row.prod_berat_produk,
        harga_modal_base: isPaket ? row.pak_harga_modal : row.prod_harga_modal,
        qty_terjual: 0,
        total_omset: 0,
        total_modal: 0,
        total_profit: 0,
        detail_kemasan: {}
      }
    }

    const prof = productProfitMap[key]
    prof.qty_terjual += row.qty
    prof.total_omset += itemOmset
    prof.total_modal += itemCost
    prof.total_profit += itemProfit

    // Aggregate detail kemasan
    const kemasanKey = row.kemasan
    let kemasanLabel = row.kemasan
    if (!isPaket) {
      if (row.prod_label_kemasan) {
        try {
          const labels = JSON.parse(row.prod_label_kemasan)
          if (labels[row.kemasan]) {
            kemasanLabel = labels[row.kemasan]
          }
        } catch (e) {
          // ignore
        }
      }
      if (kemasanLabel === 'jual') kemasanLabel = 'Bal'
    } else {
      kemasanLabel = 'paket'
    }

    if (!prof.detail_kemasan[kemasanKey]) {
      prof.detail_kemasan[kemasanKey] = {
        qty: 0,
        subtotal: 0,
        label: kemasanLabel
      }
    }
    prof.detail_kemasan[kemasanKey].qty += row.qty
    prof.detail_kemasan[kemasanKey].subtotal += itemOmset
  }

  return Object.values(productProfitMap).sort((a, b) => b.total_profit - a.total_profit)
}

export function getLaporanItemTransactions(
  itemId: number,
  tipe: 'produk' | 'paket',
  dateFrom?: string,
  dateTo?: string
): any[] {
  const db = getDatabase()
  const conditions: string[] = ['1=1']
  const params: unknown[] = []

  if (tipe === 'produk') {
    conditions.push('d.produk_id = ?')
  } else {
    conditions.push('d.paket_id = ?')
  }
  params.push(itemId)

  if (dateFrom) {
    conditions.push('date(t.tanggal) >= date(?)')
    params.push(dateFrom)
  }
  if (dateTo) {
    conditions.push('date(t.tanggal) <= date(?)')
    params.push(dateTo)
  }

  const query = `
    SELECT 
      t.nomor_trx,
      t.tanggal,
      d.kemasan,
      d.harga_satuan,
      d.qty,
      d.diskon_item,
      d.subtotal,
      p.harga_modal as prod_harga_modal,
      p.berat_produk as prod_berat_produk,
      p.label_kemasan as prod_label_kemasan,
      pk.harga_modal as pak_harga_modal
    FROM detail_transaksi d
    JOIN transaksi t ON d.transaksi_id = t.id
    LEFT JOIN produk p ON d.produk_id = p.id
    LEFT JOIN paket pk ON d.paket_id = pk.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY t.tanggal DESC
  `

  const rows = db.prepare(query).all(...params) as any[]
  return rows.map((row) => {
    let itemCost = 0
    const isPaket = tipe === 'paket'
    if (isPaket) {
      const modal = row.pak_harga_modal ?? 0
      itemCost = modal * row.qty
    } else {
      const prodModal = row.prod_harga_modal
      const totalWeight = getWeightInGrams(row.prod_berat_produk)
      if (isMainPackaging(row.kemasan, row.prod_label_kemasan)) {
        itemCost = (prodModal ?? 0) * row.qty
      } else {
        const itemWeight = getItemWeightInGrams(row.kemasan, row.prod_label_kemasan)
        if (totalWeight > 0 && prodModal != null) {
          itemCost = Math.round((prodModal / totalWeight) * itemWeight) * row.qty
        } else {
          itemCost = 0
        }
      }
    }

    // Resolve kemasan label for produk
    let kemasanLabel = row.kemasan
    if (!isPaket) {
      if (row.prod_label_kemasan) {
        try {
          const labels = JSON.parse(row.prod_label_kemasan)
          if (labels[row.kemasan]) {
            kemasanLabel = labels[row.kemasan]
          }
        } catch (e) {
          // ignore
        }
      }
      if (kemasanLabel === 'jual') kemasanLabel = 'Bal'
    } else {
      kemasanLabel = 'paket'
    }

    return {
      nomor_trx: row.nomor_trx,
      tanggal: row.tanggal,
      kemasan: kemasanLabel,
      qty: row.qty,
      harga_satuan: row.harga_satuan,
      subtotal: row.subtotal,
      total_modal: itemCost,
      total_profit: row.subtotal - itemCost
    }
  })
}

