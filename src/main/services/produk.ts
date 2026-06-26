import type { Produk, ProdukInput, Kemasan } from "../../shared/types";
import { getDatabase, getPengaturan } from "../database";
import { BrowserWindow, dialog } from "electron";
import fs from "fs";
import { getMainWindow } from "../index";
import { getKemasanLabel } from "../../shared/utils";

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
    gambar: row.gambar as string | null,
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
  data.nama_menu = (data.nama_menu || "").trim().toUpperCase();
  validateProdukInput(data);
  const db = getDatabase();
  const result = db
    .prepare(
      `INSERT INTO produk (nama_menu, harga_modal, harga_jual, harga_100gr, harga_200gr, harga_250gr, harga_500gr, harga_1kg, berat_produk, main_eceran, label_kemasan, gambar, updated_at)
       VALUES (@nama_menu, @harga_modal, @harga_jual, @harga_100gr, @harga_200gr, @harga_250gr, @harga_500gr, @harga_1kg, @berat_produk, @main_eceran, @label_kemasan, @gambar, datetime('now', 'localtime'))`,
    )
    .run(data);

  return getProduk(Number(result.lastInsertRowid))!;
}

export function updateProduk(id: number, data: ProdukInput): Produk {
  data.nama_menu = (data.nama_menu || "").trim().toUpperCase();
  validateProdukInput(data);
  getDatabase()
    .prepare(
      `UPDATE produk SET nama_menu=@nama_menu, harga_modal=@harga_modal, harga_jual=@harga_jual,
       harga_100gr=@harga_100gr, harga_200gr=@harga_200gr, harga_250gr=@harga_250gr,
       harga_500gr=@harga_500gr, harga_1kg=@harga_1kg, berat_produk=@berat_produk, main_eceran=@main_eceran, label_kemasan=@label_kemasan, gambar=@gambar, updated_at=datetime('now', 'localtime')
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
  const modalIdx =
    headers.indexOf("harga modal") !== -1
      ? headers.indexOf("harga modal")
      : headers.indexOf("harga beli");
  const jualIdx = headers.indexOf("harga jual");
  const gr100Idx = headers.indexOf("100gr");
  const gr200Idx =
    headers.indexOf("200gr") !== -1
      ? headers.indexOf("200gr")
      : headers.indexOf("200g");
  const gr250Idx =
    headers.indexOf("250gr") !== -1
      ? headers.indexOf("250gr")
      : headers.indexOf("250g");
  const gr500Idx =
    headers.indexOf("500gr") !== -1
      ? headers.indexOf("500gr")
      : headers.indexOf("500g");
  const kg1Idx = headers.indexOf("1kg");
  const labelKustomIdx =
    headers.indexOf("label kustom") !== -1
      ? headers.indexOf("label kustom")
      : headers.indexOf("label kemasan");

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

      const labelKemasanVal =
        labelKustomIdx !== -1
          ? parseLabelKemasanFromCsv(cols[labelKustomIdx])
          : null;

      insert.run({
        nama_menu: cols[nameIdx]
          .replace(/^"|"$/g, "")
          .replace(/""/g, '"')
          .trim()
          .toUpperCase(),
        berat_produk:
          beratIdx !== -1
            ? cols[beratIdx]?.trim().toLowerCase().replace(/,/g, ".") || null
            : null,
        main_eceran:
          eceranIdx !== -1
            ? (cols[eceranIdx]?.trim() as Kemasan) || null
            : null,
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

export async function exportCatalogPdf(
  selectedIds: number[],
): Promise<boolean> {
  const mainWindow = getMainWindow();
  if (!mainWindow) return false;

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Ekspor Katalog ke PDF",
    defaultPath: "katalog_produk.pdf",
    filters: [{ name: "PDF Document", extensions: ["pdf"] }],
  });

  if (canceled || !filePath) return false;

  try {
    const db = getDatabase();
    // Fetch selected products
    const placeholders = selectedIds.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT * FROM produk WHERE deleted = 0 AND id IN (${placeholders}) ORDER BY nama_menu ASC`,
      )
      .all(...selectedIds) as Record<string, unknown>[];

    const products = rows.map(rowToProduk);
    const primaryColor = db
      .prepare("SELECT nilai FROM pengaturan WHERE kunci = 'warna_primary'")
      .get() as { nilai: string } | undefined;
    const themeColor = primaryColor?.nilai || "#ea580c";

    // Fetch store configurations directly from settings database
    const storeName = getPengaturan("nama_toko", "TOKO SNACK");
    const alamat = getPengaturan("alamat_toko", "");
    const telepon = getPengaturan("telepon_toko", "");
    const storeIg = getPengaturan("instagram_toko", "");
    const storeShopee = getPengaturan("shopee_toko", "");
    const storeTokopedia = getPengaturan("tokopedia_toko", "");
    const storeTiktok = getPengaturan("tiktok_toko", "");
    const catalogTitle = "KATALOG PRODUK";

    // Format HTML for PDF catalog
    let productCardsHtml = "";
    for (const p of products) {
      // Build packaging prices
      let pricesHtml = "";
      const fields: [keyof Produk, string][] = [
        ["harga_jual", getKemasanLabel(p, "jual")],
        ["harga_100gr", getKemasanLabel(p, "100gr")],
        ["harga_200gr", getKemasanLabel(p, "200gr")],
        ["harga_250gr", getKemasanLabel(p, "250gr")],
        ["harga_500gr", getKemasanLabel(p, "500gr")],
        ["harga_1kg", getKemasanLabel(p, "1kg")],
      ];

      for (const [field, label] of fields) {
        const val = p[field] as number | null;
        if (val != null) {
          const isMain =
            p.main_eceran ===
            (field === "harga_jual" ? "jual" : field.replace("harga_", ""));
          const mainMarker = isMain
            ? ' <span class="main-marker">★</span>'
            : "";
          pricesHtml += `
            <div class="price-item">
              <span class="price-label">${label}${mainMarker}:</span>
              <span class="price-value">Rp ${val.toLocaleString("id-ID")}</span>
            </div>
          `;
        }
      }

      // Only render image-container if product has a valid image
      let imageContainerHtml = "";
      if (p.gambar) {
        imageContainerHtml = `
          <div class="image-container">
            <img src="${p.gambar}" alt="${p.nama_menu}" class="product-image" />
          </div>
        `;
      }

      productCardsHtml += `
        <div class="product-card">
          ${imageContainerHtml}
          <div class="product-info">
            <div>
              <h3 class="product-name">${p.nama_menu}</h3>
              ${p.berat_produk ? `<div class="product-meta">Berat: ${p.berat_produk}</div>` : ""}
            </div>
            <div class="price-list">
              ${pricesHtml}
            </div>
          </div>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            * {
              box-sizing: border-box;
            }
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              width: 180mm;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
            }
            .header {
              border-bottom: 3px solid ${themeColor};
              padding-bottom: 12px;
              margin-bottom: 25px;
              text-align: center;
            }
            .catalog-title {
              font-size: 26px;
              font-weight: 800;
              letter-spacing: 1px;
              margin: 0;
              color: ${themeColor};
              text-transform: uppercase;
            }
            .store-name {
              font-size: 16px;
              font-weight: 700;
              margin: 6px 0 0 0;
              text-transform: uppercase;
              color: #334155;
            }
            .store-details {
              font-size: 11px;
              color: #475569;
              margin: 4px 0 0 0;
              line-height: 1.4;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
            }
            .contact-row {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 12px;
              margin-top: 2px;
            }
            .contact-item {
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .contact-icon {
              width: 12px;
              height: 12px;
              vertical-align: middle;
            }
            .catalog-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
            }
            .product-card {
              display: flex;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px;
              background: #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.02);
              page-break-inside: avoid;
              break-inside: avoid;
              min-height: 120px;
              box-sizing: border-box;
            }
            .image-container {
              width: 100px;
              height: 100px;
              border-radius: 6px;
              overflow: hidden;
              margin-right: 12px;
              flex-shrink: 0;
              background-color: transparent;
              border: 1px solid #cbd5e1;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .product-image {
              width: 100%;
              height: 100%;
              object-fit: cover;
              background-color: transparent;
            }
            .product-info {
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              flex-grow: 1;
              min-width: 0;
            }
            .product-name {
              font-size: 14px;
              font-weight: 700;
              margin: 0;
              color: #0f172a;
              text-transform: uppercase;
              word-wrap: break-word;
              line-height: 1.3;
            }
            .product-meta {
              font-size: 10px;
              font-weight: 600;
              color: #64748b;
              margin-top: 3px;
            }
            .price-list {
              display: flex;
              flex-direction: column;
              gap: 3px;
              margin-top: 6px;
            }
            .price-item {
              font-size: 11px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 3px 5px;
              border-radius: 4px;
            }
            .price-label {
              font-weight: 600;
              color: #475569;
              max-width: 60%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .price-value {
              font-weight: 700;
              color: ${themeColor};
            }
            .main-marker {
              color: ${themeColor};
              font-size: 10px;
              margin-left: 2px;
            }
          </style>
        </head>
        <body>
          <div class="header">
          <div class="store-name">${storeName}</div>
            <h1 class="catalog-title">${catalogTitle}</h1>
            <div class="store-details">
              ${alamat ? `<div style="margin-bottom: 3px;">${alamat}</div>` : ""}
              <div class="contact-row">
                ${
                  telepon
                    ? `
                  <div class="contact-item">
                    <svg class="contact-icon" style="color: #22c55e;" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.012 2C6.48 2 2.01 6.47 2.01 12c0 1.91.536 3.69 1.464 5.215L2 22l5.015-1.341c1.474.82 3.16 1.341 5.015 1.341 5.52 0 10-4.47 10-10S17.532 2 12.012 2zm4.847 14.34c-.218.615-1.077 1.134-1.748 1.25-.457.08-1.054.14-3.05-.69-2.55-1.06-4.17-3.66-4.296-3.83-.127-.17-.927-1.24-.927-2.36 0-1.12.58-1.67.79-1.89.21-.22.45-.27.6-.27.15 0 .3.01.43.02.14.01.32-.05.5.38.19.46.65 1.58.71 1.7.06.12.1.26.02.42-.08.16-.12.26-.24.4-.12.14-.26.31-.37.42-.12.12-.25.25-.1.5.15.25.66 1.09 1.41 1.76.97.87 1.79 1.14 2.04 1.27.25.13.4.11.55-.06.15-.17.65-.75.82-.99.17-.25.35-.2.58-.11.24.09 1.5.71 1.76.84.26.13.43.2.5.31.07.11.07.65-.15 1.27z"/>
                    </svg>
                    <span>${telepon}</span>
                  </div>
                `
                    : ""
                }
                ${
                  storeIg
                    ? `
                  <div class="contact-item">
                    <svg class="contact-icon" style="color: #ec4899;" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                    <span>@${storeIg}</span>
                  </div>
                `
                    : ""
                }
                ${
                  storeShopee
                    ? `
                  <div class="contact-item">
                    <svg class="contact-icon" style="color: #ee4d2d;" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M15.9414 17.9633c.229-1.879-.981-3.077-4.1758-4.0969-1.548-.528-2.277-1.22-2.26-2.1719.065-1.056 1.048-1.825 2.352-1.85a5.2898 5.2898 0 0 1 2.8838.89c.116.072.197.06.263-.039.09-.145.315-.494.39-.62.051-.081.061-.187-.068-.281-.185-.1369-.704-.4149-.983-.5319a6.4697 6.4697 0 0 0-2.5118-.514c-1.909.008-3.4129 1.215-3.5389 2.826-.082 1.1629.494 2.1078 1.73 2.8278.262.152 1.6799.716 2.2438.892 1.774.552 2.695 1.5419 2.478 2.6969-.197 1.047-1.299 1.7239-2.818 1.7439-1.2039-.046-2.2878-.537-3.1278-1.19l-.141-.11c-.104-.08-.218-.075-.287.03-.05.077-.376.547-.458.67-.077.108-.035.168.045.234.35.293.817.613 1.134.775a6.7097 6.7097 0 0 0 2.8289.727 4.9048 4.9048 0 0 0 2.0759-.354c1.095-.465 1.8029-1.394 1.9449-2.554zM11.9986 1.4009c-2.068 0-3.7539 1.95-3.8329 4.3899h7.6657c-.08-2.44-1.765-4.3899-3.8328-4.3899zm7.8516 22.5981-.08.001-15.7843-.002c-1.074-.04-1.863-.91-1.971-1.991l-.01-.195L1.298 6.2858a.459.459 0 0 1 .45-.494h4.9748C6.8448 2.568 9.1607 0 11.9996 0c2.8388 0 5.1537 2.5689 5.2757 5.7898h4.9678a.459.459 0 0 1 .458.483l-.773 15.5883-.007.131c-.094 1.094-.979 1.9769-2.0709 2.0059z"/>
                    </svg>
                    <span>${storeShopee}</span>
                  </div>
                `
                    : ""
                }
                ${
                  storeTokopedia
                    ? `
                  <div class="contact-item">
                    <svg class="contact-icon" style="color: #42b549;" viewBox="0 0 80 80">
                      <path fill="#343638" d="M58.171 14.926C57.3 6.52 50.182-.016 41.557 0c-8.622.017-15.71 6.525-16.672 14.885l-.182 1.933 5.194.317.1-1.917C30.775 9.18 35.28 5.133 41.547 5.12c6.266-.012 10.884 4.094 11.564 10.2l.322 2.581 5.053-.36z"/>
                      <path fill="currentColor" d="M11.133 14.143a2.053 2.053 0 0 0-2.034 2.058l.058 29.944.01 5.353.003 1.43.035 18.5a2.054 2.054 0 0 0 2.058 2.052l18.497-.036 3.23-.006 20.502-.04c11.307-.02 20.54-9.29 20.518-20.593l-.003-1.43-.064-33.613a3.743 3.743 0 0 0-3.73-3.737c-3.767-.013-7.622-.02-11.36.198l-4.662.41c-4.16.515-8.365 1.453-11.722 3.151a2.06 2.06 0 0 1-1.887-.004c-3.521-1.832-7.35-2.778-11.713-3.259l-4.662-.344c-4.374-.196-8.843-.077-13.074-.034"/>
                      <circle cx="26.7" cy="38.6" r="12.8" fill="#ffffff"/>
                      <circle cx="56.3" cy="38.6" r="12.8" fill="#ffffff"/>
                      <circle cx="28.1" cy="38.8" r="8.5" fill="#343638"/>
                      <circle cx="25" cy="35" r="2.5" fill="#ffffff"/>
                      <circle cx="54.8" cy="38.8" r="8.5" fill="#343638"/>
                      <circle cx="51.8" cy="35" r="2.5" fill="#ffffff"/>
                      <polygon points="37,39 46,39 41.5,47" fill="#f4a215"/>
                    </svg>
                    <span>${storeTokopedia}</span>
                  </div>
                `
                    : ""
                }
                ${
                  storeTiktok
                    ? `
                  <div class="contact-item">
                    <svg class="contact-icon" style="color: #000000;" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.09-1.03-1.67-.98-2.78-2.62-2.94-4.54-.05-1.09.07-2.2.39-3.26.41-1.36 1.26-2.56 2.4-3.37 1.36-.99 3.1-1.21 4.69-1.07.01 1.35.03 2.7.02 4.04-.33-.08-.67-.12-1.01-.12-1.47 0-2.66 1.19-2.66 2.66s1.19 2.66 2.66 2.66c1.35 0 2.44-1.03 2.62-2.36.03-.23.04-.47.04-.71.02-3.87-.01-7.75.02-11.62z"/>
                    </svg>
                    <span>@${storeTiktok}</span>
                  </div>
                `
                    : ""
                }
              </div>
            </div>
          </div>
          <div class="catalog-grid">
            ${productCardsHtml}
          </div>
        </body>
      </html>
    `;

    // Render HTML to PDF using a hidden BrowserWindow
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`,
    );

    await new Promise<void>((resolve, reject) => {
      win.webContents.on("did-finish-load", () => resolve());
      win.webContents.on("did-fail-load", (_, errorCode, errorDescription) =>
        reject(
          new Error(`Failed to load page: ${errorCode} - ${errorDescription}`),
        ),
      );
    });

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      margins: {
        marginType: "none", // Use CSS margins instead
      },
    });

    win.destroy();
    fs.writeFileSync(filePath, pdfBuffer);
    return true;
  } catch (err) {
    console.error("Gagal mengekspor katalog PDF:", err);
    throw err;
  }
}
