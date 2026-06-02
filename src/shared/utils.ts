import { KEMASAN_LABELS } from "./types";
import type { Kemasan } from "./types";

export function getKemasanLabel(
  produk: { label_kemasan?: string | null },
  kemasan: Kemasan,
): string {
  if (produk.label_kemasan) {
    try {
      const customLabels = JSON.parse(produk.label_kemasan) as Partial<
        Record<Kemasan, string>
      >;
      if (customLabels && customLabels[kemasan]?.trim()) {
        const val = customLabels[kemasan]!.trim();
        return val.replace(/\s*(kg|gr)$/i, (m, unit) => unit.toLowerCase());
      }
    } catch (e) {
      // safe fallback
    }
  }
  return KEMASAN_LABELS[kemasan];
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseRupiahInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function getHargaKemasan(
  produk: {
    harga_jual: number | null;
    harga_100gr: number | null;
    harga_200gr: number | null;
    harga_250gr: number | null;
    harga_500gr: number | null;
    harga_1kg: number | null;
  },
  kemasan: import("./types").Kemasan,
): number | null {
  const map: Record<import("./types").Kemasan, number | null> = {
    jual: produk.harga_jual,
    "100gr": produk.harga_100gr,
    "200gr": produk.harga_200gr,
    "250gr": produk.harga_250gr,
    "500gr": produk.harga_500gr,
    "1kg": produk.harga_1kg,
  };
  return map[kemasan];
}

export function cartItemKey(produkId: number, kemasan: string): string {
  return `${produkId}-${kemasan}`;
}

export function calcSubtotal(
  harga: number,
  qty: number,
  diskon: number,
): number {
  return (harga - diskon) * qty;
}

export function calcCartTotals(
  items: { harga_satuan: number; qty: number; diskon_item: number }[],
) {
  const total = items.reduce(
    (sum, item) => sum + item.harga_satuan * item.qty,
    0,
  );
  const diskon = items.reduce(
    (sum, item) => sum + item.diskon_item * item.qty,
    0,
  );
  const totalBayar = items.reduce(
    (sum, item) =>
      sum + calcSubtotal(item.harga_satuan, item.qty, item.diskon_item),
    0,
  );
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
  return { total, diskon, totalBayar, totalQty };
}

function getInitials(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .join("");
}

export function searchProduk(
  query: string,
  produkList: { id: number; nama_menu: string }[],
): number[] {
  const q = query.trim().toLowerCase();
  if (!q) return produkList.map((p) => p.id);

  const scored = produkList.map((p) => {
    const name = p.nama_menu.toLowerCase();
    const idStr = String(p.id);
    const initials = getInitials(p.nama_menu);
    let score = 0;

    if (idStr === q) score = 1000;
    else if (name === q) score = 900;
    else if (initials === q) score = 870;
    else if (name.startsWith(q)) score = 800 - name.length;
    else if (initials.startsWith(q)) score = 750;
    else if (name.includes(q)) score = 600 - name.indexOf(q);
    else if (idStr.includes(q)) score = 400;
    else {
      const fuzzy = fuzzyMatch(q, name);
      if (fuzzy) score = 200 + fuzzy;
    }

    return { id: p.id, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .map((s) => s.id);
}

function fuzzyMatch(query: string, text: string): number {
  let qi = 0;
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) qi++;
  }
  return qi === query.length ? query.length : 0;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function cleanIpcError(message: string): string {
  const match = message.match(
    /Error invoking remote method '.*?':\s*(?:Error:\s*)?(.*)/s,
  );
  if (match && match[1]) {
    return match[1].trim();
  }
  if (message.startsWith("Error: ")) {
    return message.substring(7).trim();
  }
  return message;
}
