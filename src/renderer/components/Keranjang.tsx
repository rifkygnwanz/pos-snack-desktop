import { useEffect, useState } from 'react'
import { KEMASAN_LABELS } from '@shared/types'
import type { Kemasan } from '@shared/types'
import { calcCartTotals, calcSubtotal, formatRupiah } from '@shared/utils'
import { useKasirStore } from '../store/kasirStore'

export default function Keranjang() {
  const [isEditing, setIsEditing] = useState(false)
  const items = useKasirStore((s) => s.items)
  const selectedKey = useKasirStore((s) => s.selectedKey)
  const selectItem = useKasirStore((s) => s.selectItem)
  const updateQty = useKasirStore((s) => s.updateQty)
  const updateDiskon = useKasirStore((s) => s.updateDiskon)
  const removeItem = useKasirStore((s) => s.removeItem)
  const totals = calcCartTotals(items)

  useEffect(() => {
    if (items.length === 0) {
      setIsEditing(false)
    }
  }, [items.length])

  return (
    <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Keranjang</h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`rounded px-2.5 py-1 text-xs font-semibold border transition ${
              isEditing
                ? 'bg-snack-600 border-snack-600 text-white hover:bg-snack-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isEditing ? 'Selesai' : 'Edit'}
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Produk</th>
              <th className="px-3 py-2">Kemasan</th>
              <th className="px-3 py-2 w-16">Qty</th>
              <th className="px-3 py-2">Harga</th>
              <th className="px-3 py-2">Diskon</th>
              <th className="px-3 py-2 text-right">Subtotal</th>
              {isEditing && <th className="px-3 py-2 w-12 text-center">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={isEditing ? 7 : 6} className="px-3 py-8 text-center text-slate-400">
                  Keranjang kosong — cari produk di atas
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const subtotal = calcSubtotal(item.harga_satuan, item.qty, item.diskon_item)
                const diskonError = item.diskon_item > item.harga_satuan
                const selected = item.key === selectedKey
                return (
                  <tr
                    key={item.key}
                    onClick={() => selectItem(item.key)}
                    className={`cursor-pointer border-t border-slate-100 ${selected ? 'bg-snack-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-3 py-2 font-medium">{item.nama}</td>
                    <td className="px-3 py-2">{KEMASAN_LABELS[item.kemasan as Kemasan] ?? item.kemasan}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={item.qty === 0 ? '' : item.qty}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10)
                          updateQty(item.key, isNaN(val) ? 0 : val)
                        }}
                        onBlur={() => {
                          if (item.qty < 1) {
                            updateQty(item.key, 1)
                          }
                        }}
                        className="input-field w-16 py-1 text-center"
                      />
                    </td>
                    <td className="px-3 py-2">{formatRupiah(item.harga_satuan)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.diskon_item || ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '')
                          updateDiskon(item.key, val ? parseInt(val, 10) : 0)
                        }}
                        placeholder="0"
                        className={`input-field w-24 py-1 ${diskonError ? 'input-error' : ''}`}
                      />
                      {diskonError && <p className="text-xs text-red-500">Melebihi harga</p>}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">{formatRupiah(subtotal)}</td>
                    {isEditing && (
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="text-red-500 hover:text-red-700 focus:outline-none"
                          title="Hapus tanpa validasi"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                <td colSpan={isEditing ? 6 : 5} className="px-3 py-3 text-right uppercase">
                  Total Bayar
                </td>
                <td className="px-3 py-3 text-right text-lg text-snack-700">{formatRupiah(totals.totalBayar)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
