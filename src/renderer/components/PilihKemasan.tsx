import { useEffect, useRef, useState } from 'react'
import type { Kemasan, Produk } from '@shared/types'
import { KEMASAN_LABELS } from '@shared/types'
import { getHargaKemasan, getKemasanLabel } from '@shared/utils'

interface PilihKemasanProps {
  produk: Produk
  onSelect: (kemasan: Kemasan, harga: number) => void
  onCancel: () => void
}

const KEMASAN_ORDER: Kemasan[] = ['jual', '100gr', '200gr', '250gr', '500gr', '1kg']

export default function PilihKemasan({ produk, onSelect, onCancel }: PilihKemasanProps) {
  const available = KEMASAN_ORDER.map((k) => ({ kemasan: k, harga: getHargaKemasan(produk, k) }))
  const mainIdx = produk.main_eceran ? available.findIndex((a) => a.kemasan === produk.main_eceran && a.harga != null) : -1
  const firstAvailableIdx = available.findIndex((a) => a.harga != null)
  const [selectedIdx, setSelectedIdx] = useState(mainIdx >= 0 ? mainIdx : (firstAvailableIdx >= 0 ? firstAvailableIdx : 0))
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((i) => {
          let next = i
          do {
            next = (next + 1) % available.length
          } while (available[next].harga == null && next !== i)
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((i) => {
          let next = i
          do {
            next = (next - 1 + available.length) % available.length
          } while (available[next].harga == null && next !== i)
          return next
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = available[selectedIdx]
        if (item.harga != null) onSelect(item.kemasan, item.harga)
      }
    }
    
    // Register event listener in the next tick to avoid capturing the bubbling Enter keydown event that mounted this modal
    const timer = setTimeout(() => {
      window.addEventListener('keydown', handler)
    }, 0)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handler)
    }
  }, [available, selectedIdx, onSelect, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        ref={listRef}
        tabIndex={-1}
        className="panel w-full max-w-md p-4 outline-none"
        role="dialog"
        aria-label="Pilih kemasan"
      >
        <h3 className="mb-1 text-lg font-bold text-slate-800">{produk.nama_menu}</h3>
        <p className="mb-4 text-sm text-slate-500">Pilih kemasan (↑↓ + Enter, Esc batal)</p>
        <div className="space-y-1">
          {available.map(({ kemasan, harga }, idx) => {
            const disabled = harga == null
            const selected = idx === selectedIdx
            return (
              <button
                key={kemasan}
                type="button"
                disabled={disabled}
                onClick={() => harga != null && onSelect(kemasan, harga)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                  disabled
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                    : selected
                      ? 'bg-snack-600 text-white'
                      : 'hover:bg-snack-50'
                }`}
              >
                <span>
                  {getKemasanLabel(produk, kemasan)}
                  {produk.main_eceran === kemasan && (
                    <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      selected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 font-semibold'
                    }`}>
                      ★ Utama
                    </span>
                  )}
                </span>
                <span>{harga != null ? `Rp ${harga.toLocaleString('id-ID')}` : '—'}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
