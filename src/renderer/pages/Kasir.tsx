import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Produk, Paket } from '@shared/types'
import ConfirmDialog from '../components/ConfirmDialog'
import Keranjang from '../components/Keranjang'
import PanelBayar from '../components/PanelBayar'
import PilihKemasan from '../components/PilihKemasan'
import SearchProduk, { type UnifiedSearchItem } from '../components/SearchProduk'
import { useKasirStore } from '../store/kasirStore'
import { useNavStore } from '../store/navStore'
import { cleanIpcError } from '@shared/utils'

export default function KasirPage() {
  const [produkList, setProdukList] = useState<Produk[]>([])
  const [paketList, setPaketList] = useState<Paket[]>([])
  const [selectedProduk, setSelectedProduk] = useState<Produk | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [searchFocusKey, setSearchFocusKey] = useState(0)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const {
    items,
    selectedKey,
    paymentMode,
    confirmPrint,
    removeItem,
    addItem,
    addPaketItem,
    enterPaymentMode,
    exitPaymentMode,
    validateBayar,
    resetAfterSave,
    clearCart,
    setLastReceipt,
    getTotals
  } = useKasirStore()

  const { setPage } = useNavStore()

  const loadData = useCallback(async () => {
    try {
      const [pData, pkData] = await Promise.all([
        window.api.produk.list(),
        window.api.paket.list()
      ])
      setProdukList(pData)
      setPaketList(pkData)
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const searchItems = useMemo<UnifiedSearchItem[]>(() => {
    const products: UnifiedSearchItem[] = produkList.map((p) => ({
      id: p.id,
      type: 'produk',
      nama: p.nama_menu,
      berat: p.berat_produk,
      original: p
    }))
    const packages: UnifiedSearchItem[] = paketList.map((pk) => ({
      id: pk.id,
      type: 'paket',
      nama: pk.nama_paket,
      berat: null,
      original: pk
    }))
    return [...products, ...packages]
  }, [produkList, paketList])

  const focusSearch = useCallback(() => {
    setSearchFocusKey((k) => k + 1)
    setTimeout(() => {
      searchContainerRef.current?.querySelector('input')?.focus()
    }, 50)
  }, [])

  const handleSave = useCallback(async () => {
    const { bayar, items: cartItems, cetakStruk } = useKasirStore.getState()

    if (cartItems.some((i) => i.diskon_item > i.harga_satuan)) {
      setMessage('Perbaiki diskon yang melebihi harga satuan')
      return
    }

    try {
      const result = await window.api.transaksi.save({ items: cartItems, bayar, cetak: cetakStruk })
      setLastReceipt(result.receipt)
      resetAfterSave()
      setMessage(`Transaksi ${result.transaksi.nomor_trx} tersimpan`)
      focusSearch()
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage(err instanceof Error ? cleanIpcError(err.message) : 'Gagal menyimpan transaksi')
    }
  }, [resetAfterSave, setLastReceipt, focusSearch])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (selectedProduk) return

      const isSearchDropdownOpen = !!document.querySelector('.absolute.z-20')

      if (e.key === 'F2') {
        e.preventDefault()
        setPage('produk')
      } else if (e.key === 'F3') {
        e.preventDefault()
        setPage('paket')
      } else if (e.key === 'F4') {
        e.preventDefault()
        setPage('riwayat')
      } else if (e.key === 'F5') {
        e.preventDefault()
        setPage('laporan')
      } else if (e.key === '+' || e.key === '=' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault()
        if (!paymentMode) {
          const ok = enterPaymentMode()
          if (!ok) setMessage('Keranjang masih kosong')
        }
      } else if (e.key === 'ArrowDown' && !paymentMode && items.length > 0) {
        if (!isSearchDropdownOpen) {
          e.preventDefault()
          const currentIndex = items.findIndex((i) => i.key === selectedKey)
          let nextIndex = 0
          if (currentIndex !== -1) {
            nextIndex = Math.min(currentIndex + 1, items.length - 1)
          }
          useKasirStore.getState().selectItem(items[nextIndex].key)
        }
      } else if (e.key === 'ArrowUp' && !paymentMode && items.length > 0) {
        if (!isSearchDropdownOpen) {
          e.preventDefault()
          const currentIndex = items.findIndex((i) => i.key === selectedKey)
          let prevIndex = items.length - 1
          if (currentIndex !== -1) {
            prevIndex = Math.max(currentIndex - 1, 0)
          }
          useKasirStore.getState().selectItem(items[prevIndex].key)
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !paymentMode && selectedKey) {
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault()
          setItemToDelete(selectedKey)
        }
      } else if (e.key === 'Escape') {
        const searchInput = searchContainerRef.current?.querySelector('input')
        if (paymentMode) {
          e.preventDefault()
          exitPaymentMode()
          focusSearch()
        } else if (document.activeElement === searchInput) {
          e.preventDefault()
          searchInput?.blur()
        } else if (selectedKey) {
          e.preventDefault()
          useKasirStore.getState().selectItem(null)
        } else if (!showCancelConfirm && items.length > 0) {
          e.preventDefault()
          setShowCancelConfirm(true)
        }
      } else if (e.key === 'Enter') {
        if (paymentMode) {
          e.preventDefault()
          if (confirmPrint) {
            handleSave()
          } else if (validateBayar()) {
            // wait for second enter
          }
        } else {
          const searchInput = searchContainerRef.current?.querySelector('input')
          if (document.activeElement !== searchInput) {
            e.preventDefault()
            searchInput?.focus()
          }
        }
      } else if ((e.key === 'p' || e.key === 'P') && e.ctrlKey) {
        e.preventDefault()
        window.api.transaksi.getLastReceipt().then((receipt) => {
          if (receipt) {
            setLastReceipt(receipt)
            setMessage('Struk transaksi terakhir siap cetak (printer pending)')
          } else {
            setMessage('Belum ada transaksi')
          }
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    selectedProduk,
    paymentMode,
    confirmPrint,
    selectedKey,
    items,
    showCancelConfirm,
    setPage,
    enterPaymentMode,
    exitPaymentMode,
    validateBayar,
    handleSave,
    focusSearch,
    setLastReceipt
  ])

  const handleSelect = (item: UnifiedSearchItem) => {
    if (item.type === 'paket') {
      const paket = item.original as Paket
      addPaketItem(paket)
      focusSearch()
    } else {
      setSelectedProduk(item.original as Produk)
    }
  }

  const handleKemasanSelect = (kemasan: Parameters<typeof addItem>[1], harga: number) => {
    if (selectedProduk) {
      addItem(selectedProduk, kemasan, harga)
      setSelectedProduk(null)
      focusSearch()
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {message && (
        <div className="rounded-lg bg-snack-100 px-4 py-2 text-sm text-snack-900">{message}</div>
      )}

      <div ref={searchContainerRef} className="panel p-4">
        <SearchProduk key={searchFocusKey} itemList={searchItems} onSelect={handleSelect} />
      </div>

      <Keranjang />
      <PanelBayar />

      {selectedProduk && (
        <PilihKemasan
          produk={selectedProduk}
          onSelect={handleKemasanSelect}
          onCancel={() => {
            setSelectedProduk(null)
            focusSearch()
          }}
        />
      )}

      {showCancelConfirm && (
        <ConfirmDialog
          message="Batalkan transaksi? Semua item keranjang akan dihapus. (Y/N)"
          onConfirm={() => {
            clearCart()
            setShowCancelConfirm(false)
            focusSearch()
          }}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}

      {itemToDelete && (
        <ConfirmDialog
          message="Hapus item ini dari keranjang? (Y/N)"
          onConfirm={() => {
            removeItem(itemToDelete)
            setItemToDelete(null)
            focusSearch()
          }}
          onCancel={() => setItemToDelete(null)}
        />
      )}
    </div>
  )
}
