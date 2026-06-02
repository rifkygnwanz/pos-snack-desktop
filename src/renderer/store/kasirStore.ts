import { create } from "zustand";
import type { CartItem, Kemasan, Produk, Paket } from "@shared/types";
import { cartItemKey, calcCartTotals, getKemasanLabel } from "@shared/utils";

const CETAK_STRUK_KEY = "kasir:cetakStruk";

function loadCetakStruk(): boolean {
  try {
    const saved = localStorage.getItem(CETAK_STRUK_KEY);
    if (saved === null) return true; // default on first run
    return saved === "true";
  } catch {
    return true;
  }
}

function saveCetakStruk(val: boolean): void {
  try {
    localStorage.setItem(CETAK_STRUK_KEY, String(val));
  } catch {
    // ignore
  }
}

interface KasirState {
  items: CartItem[];
  selectedKey: string | null;
  paymentMode: boolean;
  bayar: number;
  bayarInput: string;
  bayarError: string | null;
  confirmPrint: boolean;
  lastReceipt: string | null;
  cetakStruk: boolean;
  addItem: (produk: Produk, kemasan: Kemasan, harga: number) => void;
  addPaketItem: (paket: Paket) => void;
  updateQty: (key: string, qty: number) => void;
  updateDiskon: (key: string, diskon: number) => void;
  removeItem: (key: string) => void;
  selectItem: (key: string | null) => void;
  enterPaymentMode: () => boolean;
  exitPaymentMode: () => void;
  setBayarInput: (value: string) => void;
  validateBayar: () => boolean;
  confirmPayment: () => void;
  resetAfterSave: () => void;
  clearCart: () => void;
  setLastReceipt: (receipt: string | null) => void;
  setCetakStruk: (val: boolean) => void;
  getTotals: () => { total: number; diskon: number; totalBayar: number };
}

export const useKasirStore = create<KasirState>((set, get) => ({
  items: [],
  selectedKey: null,
  paymentMode: false,
  bayar: 0,
  bayarInput: "",
  bayarError: null,
  confirmPrint: false,
  lastReceipt: null,
  cetakStruk: loadCetakStruk(),

  addItem: (produk, kemasan, harga) => {
    const key = cartItemKey(produk.id, kemasan);
    const existing = get().items.find((i) => i.key === key);
    const label = getKemasanLabel(produk, kemasan);
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.key === key ? { ...i, qty: i.qty + 1 } : i,
        ),
        selectedKey: key,
      });
    } else {
      set({
        items: [
          ...get().items,
          {
            key,
            produk_id: produk.id,
            paket_id: null,
            nama: produk.nama_menu,
            kemasan: label,
            harga_satuan: harga,
            qty: 1,
            diskon_item: 0,
          },
        ],
        selectedKey: key,
      });
    }
  },

  addPaketItem: (paket) => {
    const key = `paket-${paket.id}`;
    const existing = get().items.find((i) => i.key === key);
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.key === key ? { ...i, qty: i.qty + 1 } : i,
        ),
        selectedKey: key,
      });
    } else {
      set({
        items: [
          ...get().items,
          {
            key,
            produk_id: null,
            paket_id: paket.id,
            nama: paket.nama_paket,
            kemasan: "Paket",
            harga_satuan: paket.harga_jual,
            qty: 1,
            diskon_item: 0,
          },
        ],
        selectedKey: key,
      });
    }
  },

  updateQty: (key, qty) => {
    set({ items: get().items.map((i) => (i.key === key ? { ...i, qty } : i)) });
  },

  updateDiskon: (key, diskon) => {
    set({
      items: get().items.map((i) =>
        i.key === key ? { ...i, diskon_item: Math.max(0, diskon) } : i,
      ),
    });
  },

  removeItem: (key) => {
    set({ items: get().items.filter((i) => i.key !== key), selectedKey: null });
  },

  selectItem: (key) => set({ selectedKey: key }),

  enterPaymentMode: () => {
    if (!get().items.length) return false;
    set({
      paymentMode: true,
      bayar: 0,
      bayarInput: "",
      bayarError: null,
      confirmPrint: false,
      // preserve the user's saved preference — do NOT reset to true
    });
    return true;
  },

  exitPaymentMode: () =>
    set({
      paymentMode: false,
      bayar: 0,
      bayarInput: "",
      bayarError: null,
      confirmPrint: false,
      // preserve the user's saved preference — do NOT reset to true
    }),

  setBayarInput: (value) => {
    const digits = value.replace(/\D/g, "");
    const num = digits ? parseInt(digits, 10) : 0;
    const { totalBayar } = get().getTotals();
    set({
      bayarInput: digits,
      bayar: num,
      bayarError:
        num > 0 && num < totalBayar ? "Nominal bayar kurang dari total" : null,
      confirmPrint: num >= totalBayar && totalBayar > 0,
    });
  },

  validateBayar: () => {
    const { bayar, getTotals } = get();
    const { totalBayar } = getTotals();
    if (bayar < totalBayar) {
      set({ bayarError: "Nominal bayar kurang dari total" });
      return false;
    }
    set({ bayarError: null, confirmPrint: true });
    return true;
  },

  confirmPayment: () => set({ confirmPrint: true }),

  resetAfterSave: () =>
    set({
      items: [],
      selectedKey: null,
      paymentMode: false,
      bayar: 0,
      bayarInput: "",
      bayarError: null,
      confirmPrint: false,
      // preserve the user's saved preference — do NOT reset to true
    }),

  clearCart: () =>
    set({
      items: [],
      selectedKey: null,
      paymentMode: false,
      bayar: 0,
      bayarInput: "",
      bayarError: null,
      confirmPrint: false,
      // preserve the user's saved preference — do NOT reset to true
    }),

  setLastReceipt: (receipt) => set({ lastReceipt: receipt }),

  setCetakStruk: (val) => {
    saveCetakStruk(val); // persist to localStorage
    set({ cetakStruk: val });
  },

  getTotals: () => calcCartTotals(get().items),
}));

