import { useState, useEffect, useMemo, useCallback } from 'react'
import { formatRupiah } from '@shared/utils'
import type { LaporanSummary, LaporanProdukProfit } from '@shared/types'

export default function LaporanPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [summary, setSummary] = useState<LaporanSummary | null>(null)
  const [produkProfit, setProdukProfit] = useState<LaporanProdukProfit[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortCol, setSortCol] = useState<'nama' | 'total_omset' | 'total_profit'>('total_profit')
  const [sortAsc, setSortAsc] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeRange, setActiveRange] = useState<'today' | 'yesterday' | '3days' | 'week' | 'month' | 'all' | 'custom'>('all')

  const [selectedItem, setSelectedItem] = useState<LaporanProdukProfit | null>(null)
  const [itemTxList, setItemTxList] = useState<any[]>([])
  const [loadingItemTx, setLoadingItemTx] = useState(false)

  const openItemDetail = async (p: LaporanProdukProfit) => {
    if (p.id == null) return
    setSelectedItem(p)
    setLoadingItemTx(true)
    try {
      const from = dateFrom || undefined
      const to = dateTo || undefined
      const logs = await window.api.laporan.getItemTransactions(p.id, p.tipe, from, to)
      setItemTxList(logs)
    } catch (err) {
      console.error('Gagal mengambil rincian detail transaksi item:', err)
    } finally {
      setLoadingItemTx(false)
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const from = dateFrom || undefined
      const to = dateTo || undefined
      const [sumRes, profitRes] = await Promise.all([
        window.api.laporan.getSummary(from, to),
        window.api.laporan.getProdukProfit(from, to)
      ])
      setSummary(sumRes)
      setProdukProfit(profitRes)
    } catch (err) {
      console.error('Gagal memuat data laporan:', err)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])
  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo, loadData])

  const setQuickRange = (range: 'today' | 'yesterday' | '3days' | 'week' | 'month' | 'all') => {
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

    setActiveRange(range)

    if (range === 'today') {
      setDateFrom(formatDate(today))
      setDateTo(formatDate(today))
    } else if (range === 'yesterday') {
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)
      setDateFrom(formatDate(yesterday))
      setDateTo(formatDate(yesterday))
    } else if (range === '3days') {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(today.getDate() - 2)
      setDateFrom(formatDate(threeDaysAgo))
      setDateTo(formatDate(today))
    } else if (range === 'week') {
      const lastWeek = new Date()
      lastWeek.setDate(today.getDate() - 6)
      setDateFrom(formatDate(lastWeek))
      setDateTo(formatDate(today))
    } else if (range === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      setDateFrom(formatDate(firstDay))
      setDateTo(formatDate(today))
    } else if (range === 'all') {
      setDateFrom('')
      setDateTo('')
    }
  }

  const toggleSort = (col: 'nama' | 'total_omset' | 'total_profit') => {
    if (sortCol === col) {
      setSortAsc(!sortAsc)
    } else {
      setSortCol(col)
      setSortAsc(false)
    }
  }

  const filteredProfit = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    let list = [...produkProfit]

    if (q) {
      list = list.filter((p) => p.nama.toLowerCase().includes(q))
    }

    return list.sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''

      if (sortCol === 'nama') {
        av = a.nama
        bv = b.nama
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      } else if (sortCol === 'total_omset') {
        av = a.total_omset
        bv = b.total_omset
      } else if (sortCol === 'total_profit') {
        av = a.total_profit
        bv = b.total_profit
      }

      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [produkProfit, searchQuery, sortCol, sortAsc])

  // Chart calculation
  const chartHeight = 220
  const maxChartValue = useMemo(() => {
    if (!summary || !summary.penjualanHarian.length) return 1000
    const vals = summary.penjualanHarian.map((d) => Math.max(d.penjualan, d.keuntungan))
    return Math.max(...vals, 1000)
  }, [summary])

  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-hidden">
      {/* Date Filter Panel (Sticky at top) */}
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-4 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Laporan Keuangan</h2>
          <span className="text-xs font-bold text-slate-400 select-none">| Ringkasan Penjualan & Keuntungan</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Periode:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setActiveRange('custom')
              }}
              className="input-field max-w-[140px] text-xs font-semibold py-1.5"
            />
            <span className="text-xs font-bold text-slate-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setActiveRange('custom')
              }}
              className="input-field max-w-[140px] text-xs font-semibold py-1.5"
            />
          </div>
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 select-none flex-wrap gap-y-1">
            <button
              onClick={() => setQuickRange('all')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                activeRange === 'all'
                  ? 'bg-snack-600 text-white shadow-sm'
                  : 'hover:bg-white hover:shadow-sm text-slate-600'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setQuickRange('today')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                activeRange === 'today'
                  ? 'bg-snack-600 text-white shadow-sm'
                  : 'hover:bg-white hover:shadow-sm text-slate-600'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setQuickRange('yesterday')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                activeRange === 'yesterday'
                  ? 'bg-snack-600 text-white shadow-sm'
                  : 'hover:bg-white hover:shadow-sm text-slate-600'
              }`}
            >
              Kemarin
            </button>
            <button
              onClick={() => setQuickRange('3days')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                activeRange === '3days'
                  ? 'bg-snack-600 text-white shadow-sm'
                  : 'hover:bg-white hover:shadow-sm text-slate-600'
              }`}
            >
              3 Hari
            </button>
            <button
              onClick={() => setQuickRange('week')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                activeRange === 'week'
                  ? 'bg-snack-600 text-white shadow-sm'
                  : 'hover:bg-white hover:shadow-sm text-slate-600'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setQuickRange('month')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                activeRange === 'month'
                  ? 'bg-snack-600 text-white shadow-sm'
                  : 'hover:bg-white hover:shadow-sm text-slate-600'
              }`}
            >
              Bulan Ini
            </button>
          </div>
          <button
            onClick={loadData}
            className="btn-primary py-1.5 text-xs px-3"
            disabled={loading}
          >
            {loading ? 'Memuat...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Scrollable Content Wrapper (Single scroll area) */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="panel bg-gradient-to-tr from-snack-500/10 to-snack-500/5 border-l-4 border-l-snack-600 p-4 space-y-1 relative overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-snack-700 tracking-wider">Total Penjualan</span>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {summary ? formatRupiah(summary.totalPenjualan) : 'Rp 0'}
            </h3>
            <p className="text-[10px] font-semibold text-slate-400">Total uang diterima dari pelanggan</p>
            <div className="absolute right-3 bottom-2 text-snack-500/15 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>

          <div className="panel bg-gradient-to-tr from-slate-500/10 to-slate-500/5 border-l-4 border-l-slate-500 p-4 space-y-1 relative overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Total Modal</span>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {summary ? formatRupiah(summary.totalModal) : 'Rp 0'}
            </h3>
            <p className="text-[10px] font-semibold text-slate-400">Modal dari barang yang terjual</p>
            <div className="absolute right-3 bottom-2 text-slate-500/15 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            </div>
          </div>

          {(() => {
            const isLoss = summary && summary.totalKeuntungan < 0;
            return (
              <div className={`panel bg-gradient-to-tr border-l-4 p-4 space-y-1 relative overflow-hidden ${
                isLoss 
                  ? 'from-red-500/10 to-red-500/5 border-l-red-500' 
                  : 'from-emerald-500/10 to-emerald-500/5 border-l-emerald-600'
              }`}>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isLoss ? 'text-red-700' : 'text-emerald-700'}`}>
                  {isLoss ? 'Total Rugi Bersih' : 'Total Untung Bersih'}
                </span>
                <h3 className={`text-xl font-extrabold tracking-tight ${isLoss ? 'text-red-800' : 'text-emerald-800'}`}>
                  {summary ? formatRupiah(summary.totalKeuntungan) : 'Rp 0'}
                </h3>
                <p className="text-[10px] font-semibold text-slate-400">Uang untung bersih (Penjualan dikurangi Modal)</p>
                <div className={`absolute right-3 bottom-2 pointer-events-none ${isLoss ? 'text-red-500/15' : 'text-emerald-500/15'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path><circle cx="12" cy="12" r="10" strokeWidth="1" stroke="transparent" fill="none"></circle><path d="M22 12A10 10 0 0 1 12 22M2 12A10 10 0 0 1 12 2" strokeWidth="1"></path></svg>
                </div>
              </div>
            );
          })()}

          <div className="panel bg-gradient-to-tr from-indigo-500/10 to-indigo-500/5 border-l-4 border-l-indigo-600 p-4 space-y-1 relative overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">Jumlah Transaksi</span>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {summary ? summary.totalTransaksi : 0} Transaksi
            </h3>
            <p className="text-[10px] font-semibold text-slate-400">Total nota transaksi penjualan</p>
            <div className="absolute right-3 bottom-2 text-indigo-500/15 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="panel p-4 col-span-2 space-y-3 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Grafik Penjualan Harian</h3>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                  <span className="inline-block w-2.5 height-2.5 h-2.5 rounded bg-snack-500"></span> Penjualan
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                  <span className="inline-block w-2.5 height-2.5 h-2.5 rounded bg-emerald-500"></span> Keuntungan
                </span>
              </div>
            </div>

            <div className="flex-1 flex items-end justify-center border-b border-slate-100 pb-2 relative">
              {(!summary || !summary.penjualanHarian.length) ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-400">
                  Tidak ada data transaksi untuk ditampilkan
                </div>
              ) : (
                <div className="w-full h-full flex items-end gap-1.5 overflow-x-auto pt-4">
                  {summary.penjualanHarian.map((day) => {
                    const pHeight = Math.max(2, (day.penjualan / maxChartValue) * chartHeight)
                    const kHeight = Math.max(2, (day.keuntungan / maxChartValue) * chartHeight)
                    const dayNum = day.tanggal.split('-')[2]

                    return (
                      <div key={day.tanggal} className="flex-1 flex flex-col items-center min-w-[28px] max-w-[50px] group cursor-pointer">
                        <div className="opacity-0 group-hover:opacity-100 absolute bg-slate-900 text-white rounded-lg p-2 text-[10px] bottom-full mb-1 flex flex-col gap-0.5 pointer-events-none transition z-10 shadow-lg border border-slate-700">
                          <span className="font-bold border-b border-slate-700 pb-0.5 mb-0.5">{day.tanggal}</span>
                          <span>Penjualan: {formatRupiah(day.penjualan)}</span>
                          <span className={day.keuntungan < 0 ? "text-rose-400 font-semibold" : "text-emerald-400"}>
                            {day.keuntungan < 0 ? 'Rugi' : 'Untung'}: {formatRupiah(day.keuntungan)}
                          </span>
                        </div>
                        <div className="w-full flex items-end justify-center gap-0.5 h-[220px]">
                          <div style={{ height: `${pHeight}px` }} className="w-1/2 rounded-t bg-snack-500 hover:bg-snack-600 transition" />
                          <div
                            style={{ height: `${kHeight}px` }}
                            className={`w-1/2 rounded-t transition ${
                              day.keuntungan < 0
                                ? 'bg-rose-500 hover:bg-rose-600'
                                : 'bg-emerald-500 hover:bg-emerald-600'
                            }`}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 mt-1 select-none">{dayNum}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="panel p-4 flex flex-col min-h-[300px] justify-between">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">Perbandingan Barang & Paket</h3>
            
            {(!summary || summary.totalPenjualan === 0) ? (
              <div className="flex-1 flex items-center justify-center text-xs font-semibold text-slate-400">
                Tidak ada data penjualan
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-around py-4">
                {summary.proporsiPenjualan.map((prop) => {
                  const percentage = summary.totalPenjualan > 0 
                    ? Math.round((prop.total / summary.totalPenjualan) * 100) 
                    : 0
                  
                  const isProduk = prop.tipe === 'produk'
                  const themeColor = isProduk ? 'bg-snack-500' : 'bg-indigo-500'
                  const textColor = isProduk ? 'text-snack-700' : 'text-indigo-700'
                  const badgeBg = isProduk ? 'bg-snack-50' : 'bg-indigo-50'
                  const badgeBorder = isProduk ? 'border-snack-100' : 'border-indigo-100'

                  return (
                    <div key={prop.tipe} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-3 h-3 rounded-full ${themeColor}`} />
                          <span className="text-sm font-extrabold text-slate-800">{isProduk ? 'Barang' : 'Paket'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-slate-500">{prop.qty} pcs terjual</span>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div
                          style={{ width: `${percentage}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${themeColor}`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">{percentage}% dari total penjualan</span>
                        <span className={`px-2 py-0.5 rounded-md border ${badgeBg} ${textColor} ${badgeBorder}`}>
                          {formatRupiah(prop.total)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="panel flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Detail Keuntungan Per Barang</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Rincian penjualan, modal, dan untung tiap barang</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Cari nama barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field max-w-xs text-xs py-1.5"
              />
            </div>
          </div>

          <div className="border border-slate-100 rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 bg-slate-50 text-xs font-bold uppercase text-slate-500 select-none">
                <tr className="border-b border-slate-100">
                  <th className="px-3 py-2 text-center w-12">No</th>
                  <th onClick={() => toggleSort('nama')} className="px-3 py-2 cursor-pointer hover:bg-slate-100">
                    Nama Barang {sortCol === 'nama' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-3 py-2 text-center w-24">Jenis</th>
                  <th className="px-3 py-2 text-center w-24">Jumlah Terjual</th>
                  <th onClick={() => toggleSort('total_omset')} className="px-3 py-2 cursor-pointer hover:bg-slate-100 text-right w-36">
                    Penjualan {sortCol === 'total_omset' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-3 py-2 text-right w-36">Total Modal</th>
                  <th onClick={() => toggleSort('total_profit')} className="px-3 py-2 cursor-pointer hover:bg-slate-100 text-right w-36 text-emerald-700">
                    Untung Bersih {sortCol === 'total_profit' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-3 py-2">Rincian Kemasan</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfit.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-xs font-medium text-slate-400">
                      Tidak ada data rincian profit untuk periode ini
                    </td>
                  </tr>
                ) : (
                  filteredProfit.map((p, idx) => {
                    const isProduk = p.tipe === 'produk'
                    const typeBadge = isProduk ? 'bg-snack-50 text-snack-700 border-snack-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    return (
                      <tr 
                        key={`${p.tipe}-${p.id}`} 
                        onClick={() => openItemDetail(p)}
                        className="border-t border-slate-100 hover:bg-snack-50/70 cursor-pointer select-none transition"
                        title="Klik untuk melihat rincian riwayat transaksi barang ini"
                      >
                        <td className="px-3 py-2.5 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-800">
                          {p.nama}
                          {!isProduk && p.harga_modal_base != null && <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">Modal: {formatRupiah(p.harga_modal_base)}</span>}
                          {isProduk && p.berat_produk && <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">Berat Bal: {p.berat_produk} • Modal Bal: {p.harga_modal_base ? formatRupiah(p.harga_modal_base) : '—'}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center"><span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${typeBadge} uppercase tracking-wide`}>{isProduk ? 'Barang' : 'Paket'}</span></td>
                        <td className="px-3 py-2.5 text-center font-bold text-slate-700">{p.qty_terjual} pcs</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{formatRupiah(p.total_omset)}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{formatRupiah(p.total_modal)}</td>
                        <td className={`px-3 py-2.5 text-right font-bold transition-colors ${p.total_profit < 0 ? 'text-rose-600 bg-rose-50/35 font-extrabold' : 'text-emerald-600'}`}>
                          {formatRupiah(p.total_profit)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {Object.values(p.detail_kemasan).map((kem) => (
                              <span key={kem.label} className="inline-flex items-center bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-lg select-none" title={`Total omset: ${formatRupiah(kem.subtotal)}`}>
                                {kem.label}: <strong className="ml-1 text-slate-800 font-extrabold">{kem.qty}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Detail Transaksi Produk / Paket */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 select-none">
              <div>
                <span className={`px-2 py-0.5 text-[10px] font-black rounded border uppercase tracking-wider ${
                  selectedItem.tipe === 'produk' 
                    ? 'bg-snack-50 text-snack-700 border-snack-100' 
                    : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                }`}>
                  {selectedItem.tipe === 'produk' ? 'Barang' : 'Paket'}
                </span>
                <h3 className="text-lg font-extrabold text-slate-800 mt-1">
                  Riwayat Penjualan: {selectedItem.nama}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedItem(null)
                  setItemTxList([])
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Summary Stats Inside Modal */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Jumlah Terjual</span>
                  <span className="text-base font-extrabold text-slate-800">{selectedItem.qty_terjual} pcs</span>
                </div>
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Penjualan</span>
                  <span className="text-base font-extrabold text-snack-600">{formatRupiah(selectedItem.total_omset)}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Modal</span>
                  <span className="text-base font-extrabold text-slate-600">{formatRupiah(selectedItem.total_modal)}</span>
                </div>
                <div className={`border rounded-xl p-3 text-center ${
                  selectedItem.total_profit < 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <span className={`text-[10px] font-bold block uppercase ${
                    selectedItem.total_profit < 0 ? 'text-rose-500' : 'text-emerald-600'
                  }`}>
                    {selectedItem.total_profit < 0 ? 'Total Rugi' : 'Untung Bersih'}
                  </span>
                  <span className={`text-base font-black ${
                    selectedItem.total_profit < 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}>
                    {formatRupiah(selectedItem.total_profit)}
                  </span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="border border-slate-100 rounded-xl overflow-x-auto min-h-[200px]">
                {loadingItemTx ? (
                  <div className="flex items-center justify-center p-12 text-xs font-semibold text-slate-400 animate-pulse">
                    Memuat rincian transaksi...
                  </div>
                ) : itemTxList.length === 0 ? (
                  <div className="flex items-center justify-center p-12 text-xs font-semibold text-slate-400">
                    Tidak ada transaksi untuk barang ini dalam periode terpilih.
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 bg-slate-50 text-xs font-bold uppercase text-slate-500 select-none border-b border-slate-100">
                      <tr>
                        <th className="px-3 py-2.5">Tanggal</th>
                        <th className="px-3 py-2.5">Nomor TRX</th>
                        <th className="px-3 py-2.5 text-center">Kemasan</th>
                        <th className="px-3 py-2.5 text-center">Qty</th>
                        <th className="px-3 py-2.5 text-right">Harga Satuan</th>
                        <th className="px-3 py-2.5 text-right">Total Jual</th>
                        <th className="px-3 py-2.5 text-right">Modal</th>
                        <th className="px-3 py-2.5 text-right">Untung Bersih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemTxList.map((tx, index) => {
                        const isLoss = tx.total_profit < 0;
                        return (
                          <tr key={index} className="border-t border-slate-100 hover:bg-slate-50/50">
                            <td className="px-3 py-2.5 text-slate-500 font-medium text-xs">
                              {tx.tanggal}
                            </td>
                            <td className="px-3 py-2.5 font-bold text-slate-700 text-xs">
                              {tx.nomor_trx}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-block bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {tx.kemasan}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-700 text-xs">
                              {tx.qty} pcs
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-slate-600 text-xs">
                              {formatRupiah(tx.harga_satuan)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-800 text-xs">
                              {formatRupiah(tx.subtotal)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-500 text-xs">
                              {formatRupiah(tx.total_modal)}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-extrabold text-xs ${
                              isLoss ? 'text-rose-600 bg-rose-50/20' : 'text-emerald-600'
                            }`}>
                              {formatRupiah(tx.total_profit)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null)
                  setItemTxList([])
                }}
                className="btn-secondary py-1.5 px-4 text-xs font-bold"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
