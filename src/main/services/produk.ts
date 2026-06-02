import type { Produk, ProdukInput, Kemasan } from "../../shared/types";
import { getDatabase } from "../database";

function rowToProduk(row: Record<string, unknown>): Produk {
  return {
    id: row.id as number,
    nama_menu: row.nama_menu as string,
    harga_modal: row.harga_modal as number | null,
    harga_jual: row.harga_jual as number | null,
    harga_100gr: row.harga_100gr as number | null,
    harga_200gr: row.harga_200gr as number | null,
    harga_250gr: row.harga_250gr as number | null,
    harga_500gr: row.harga_500gr as number | null,
    harga_1kg: row.harga_1kg as number | null,
    berat_produk: row.berat_produk as string | null,
    main_eceran: row.main_eceran as Kemasan | null,
    label_kemasan: row.label_kemasan as string | null,
    deleted: row.deleted as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function listProduk(search?: string): Produk[] {
  const db = getDatabase();
  let rows: Record<string, unknown>[];

  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    rows = db
      .prepare(
        `SELECT * FROM produk WHERE deleted = 0 AND (nama_menu LIKE ? OR CAST(id AS TEXT) LIKE ?) ORDER BY nama_menu ASC`,
      )
      .all(q, q) as Record<string, unknown>[];
  } else {
    rows = db
      .prepare("SELECT * FROM produk WHERE deleted = 0 ORDER BY nama_menu ASC")
      .all() as Record<string, unknown>[];
  }

  return rows.map(rowToProduk);
}

export function getProduk(id: number): Produk | null {
  const row = getDatabase()
    .prepare("SELECT * FROM produk WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToProduk(row) : null;
}

export function createProduk(data: ProdukInput): Produk {
  data.nama_menu = (data.nama_menu || '').trim().toUpperCase();
  validateProdukInput(data);
  const db = getDatabase();
  const result = db
    .prepare(
      `INSERT INTO produk (nama_menu, harga_modal, harga_jual, harga_100gr, harga_200gr, harga_250gr, harga_500gr, harga_1kg, berat_produk, main_eceran, label_kemasan, updated_at)
       VALUES (@nama_menu, @harga_modal, @harga_jual, @harga_100gr, @harga_200gr, @harga_250gr, @harga_500gr, @harga_1kg, @berat_produk, @main_eceran, @label_kemasan, datetime('now', 'localtime'))`,
    )
    .run(data);

  return getProduk(Number(result.lastInsertRowid))!;
}

export function updateProduk(id: number, data: ProdukInput): Produk {
  data.nama_menu = (data.nama_menu || '').trim().toUpperCase();
  validateProdukInput(data);
  getDatabase()
    .prepare(
      `UPDATE produk SET nama_menu=@nama_menu, harga_modal=@harga_modal, harga_jual=@harga_jual,
       harga_100gr=@harga_100gr, harga_200gr=@harga_200gr, harga_250gr=@harga_250gr,
       harga_500gr=@harga_500gr, harga_1kg=@harga_1kg, berat_produk=@berat_produk, main_eceran=@main_eceran, label_kemasan=@label_kemasan, updated_at=datetime('now', 'localtime')
       WHERE id=@id`,
    )
    .run({ ...data, id });

  return getProduk(id)!;
}

export function deleteProduk(id: number): void {
  const db = getDatabase();
  const used = db
    .prepare("SELECT COUNT(*) as c FROM detail_transaksi WHERE produk_id = ?")
    .get(id) as { c: number };

  if (used.c > 0) {
    db.prepare(
      `UPDATE produk SET deleted = 1, updated_at = datetime('now', 'localtime') WHERE id = ?`,
    ).run(id);
  } else {
    db.prepare("DELETE FROM produk WHERE id = ?").run(id);
  }
}

function validateProdukInput(data: ProdukInput): void {
  if (!data.nama_menu?.trim()) throw new Error("Nama menu wajib diisi");
  const hasPrice = [
    data.harga_jual,
    data.harga_100gr,
    data.harga_200gr,
    data.harga_250gr,
    data.harga_500gr,
    data.harga_1kg,
  ].some((v) => v != null && v > 0);
  if (!hasPrice)
    throw new Error("Minimal 1 harga kemasan atau harga bal harus diisi");
}

function formatLabelKemasanForCsv(jsonStr: string | null): string {
  if (!jsonStr) return "";
  try {
    const obj = JSON.parse(jsonStr) as Record<string, string>;
    return Object.entries(obj)
      .map(([k, v]) => `${k}:${v}`)
      .join(";");
  } catch (e) {
    return "";
  }
}

function parseLabelKemasanFromCsv(csvVal: string | null): string | null {
  if (!csvVal || !csvVal.trim()) return null;
  try {
    const obj: Record<string, string> = {};
    const parts = csvVal.split(";");
    for (const part of parts) {
      const [k, v] = part.split(":");
      if (k && v) {
        obj[k.trim()] = v.trim();
      }
    }
    return Object.keys(obj).length > 0 ? JSON.stringify(obj) : null;
  } catch (e) {
    return null;
  }
}

export function exportProdukCsv(): string {
  const produk = listProduk();
  const header =
    "No,Nama Menu,Berat,Kemasan Utama,Harga Modal,Harga Jual,100gr,200gr,250gr,500gr,1kg,Label Kustom";
  const rows = produk.map((p, idx) =>
    [
      idx + 1,
      `"${p.nama_menu.replace(/"/g, '""')}"`,
      p.berat_produk ?? "",
      p.main_eceran ?? "",
      p.harga_modal ?? "",
      p.harga_jual ?? "",
      p.harga_100gr ?? "",
      p.harga_200gr ?? "",
      p.harga_250gr ?? "",
      p.harga_500gr ?? "",
      p.harga_1kg ?? "",
      `"${formatLabelKemasanForCsv(p.label_kemasan)}"`,
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

export function importProdukCsv(csv: string): number {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return 0;

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("nama menu");
  const beratIdx = headers.indexOf("berat");
  const eceranIdx = headers.indexOf("kemasan utama");
  const modalIdx = headers.indexOf("harga modal") !== -1 ? headers.indexOf("harga modal") : headers.indexOf("harga beli");
  const jualIdx = headers.indexOf("harga jual");
  const gr100Idx = headers.indexOf("100gr");
  const gr200Idx = headers.indexOf("200gr") !== -1 ? headers.indexOf("200gr") : headers.indexOf("200g");
  const gr250Idx = headers.indexOf("250gr") !== -1 ? headers.indexOf("250gr") : headers.indexOf("250g");
  const gr500Idx = headers.indexOf("500gr") !== -1 ? headers.indexOf("500gr") : headers.indexOf("500g");
  const kg1Idx = headers.indexOf("1kg");
  const labelKustomIdx = headers.indexOf("label kustom") !== -1 ? headers.indexOf("label kustom") : headers.indexOf("label kemasan");

  const db = getDatabase();
  const insert = db.prepare(`
    INSERT INTO produk (nama_menu, harga_modal, harga_jual, harga_100gr, harga_200gr, harga_250gr, harga_500gr, harga_1kg, berat_produk, main_eceran, label_kemasan, updated_at)
    VALUES (@nama_menu, @harga_modal, @harga_jual, @harga_100gr, @harga_200gr, @harga_250gr, @harga_500gr, @harga_1kg, @berat_produk, @main_eceran, @label_kemasan, datetime('now', 'localtime'))
  `);

  let count = 0;
  const tx = db.transaction(() => {
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 2 || nameIdx === -1 || !cols[nameIdx]?.trim()) continue;

      const labelKemasanVal = labelKustomIdx !== -1 ? parseLabelKemasanFromCsv(cols[labelKustomIdx]) : null;

      insert.run({
        nama_menu: cols[nameIdx].replace(/^"|"$/g, "").replace(/""/g, '"').trim().toUpperCase(),
        berat_produk: beratIdx !== -1 ? cols[beratIdx]?.trim().toLowerCase().replace(/,/g, ".") || null : null,
        main_eceran: eceranIdx !== -1 ? (cols[eceranIdx]?.trim() as Kemasan) || null : null,
        harga_modal: modalIdx !== -1 ? parseOptionalInt(cols[modalIdx]) : null,
        harga_jual: jualIdx !== -1 ? parseOptionalInt(cols[jualIdx]) : null,
        harga_100gr: gr100Idx !== -1 ? parseOptionalInt(cols[gr100Idx]) : null,
        harga_200gr: gr200Idx !== -1 ? parseOptionalInt(cols[gr200Idx]) : null,
        harga_250gr: gr250Idx !== -1 ? parseOptionalInt(cols[gr250Idx]) : null,
        harga_500gr: gr500Idx !== -1 ? parseOptionalInt(cols[gr500Idx]) : null,
        harga_1kg: kg1Idx !== -1 ? parseOptionalInt(cols[kg1Idx]) : null,
        label_kemasan: labelKemasanVal,
      });
      count++;
    }
  });
  tx();
  return count;
}

function parseOptionalInt(val: string | undefined): number | null {
  if (!val?.trim()) return null;
  const n = parseInt(val.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
