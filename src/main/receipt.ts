import { BrowserWindow } from "electron";
import type { DetailTransaksi, Kemasan, Transaksi } from "../shared/types";
import { KEMASAN_LABELS } from "../shared/types";
import { getPengaturan } from "./database";

const WIDTH = 32;
const LINE = "-".repeat(WIDTH);

function padLine(label: string, value: string, width = WIDTH): string {
  const space = Math.max(1, width - label.length - value.length);
  return `${label}${" ".repeat(space)}${value}`;
}

function center(text: string, width = WIDTH): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(pad) + text;
}

function wrapText(text: string, width = WIDTH): string[] {
  if (!text) return [];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + (current ? " " : "") + word).length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatRp(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function generateReceipt(
  transaksi: Transaksi,
  details: DetailTransaksi[],
  storeName = "TOKO SNACK",
  alamat = "",
): string {
  const lines: string[] = [""];
  const displayStoreName = (storeName || "TOKO SNACK").trim() || "TOKO SNACK";
  lines.push(center(displayStoreName.toUpperCase()));
  const displayAlamat = (alamat || "").trim();
  if (displayAlamat) {
    for (const l of wrapText(displayAlamat)) {
      lines.push(center(l));
    }
  }
  lines.push("");
  lines.push(transaksi.nomor_trx);
  lines.push(new Date(transaksi.tanggal).toLocaleString("id-ID"));
  lines.push(LINE);

  for (const item of details) {
    if (item.paket_id) {
      lines.push(`${item.nama_snapshot} (Paket)`);
    } else {
      const kemasan = KEMASAN_LABELS[item.kemasan as Kemasan] ?? item.kemasan;
      if (kemasan === "Satuan" || !kemasan) {
        lines.push(item.nama_snapshot);
      } else {
        lines.push(`${item.nama_snapshot} (${kemasan})`);
      }
    }
    lines.push(
      padLine(
        `${item.qty} x ${formatRp(item.harga_satuan)}`,
        formatRp(item.harga_satuan * item.qty),
      ),
    );
    if (item.diskon_item > 0) {
      lines.push(
        padLine("  Diskon", `- ${formatRp(item.diskon_item * item.qty)}`),
      );
    }
  }

  lines.push(LINE);
  lines.push(padLine("TOTAL", formatRp(transaksi.total)));
  if (transaksi.diskon > 0) {
    lines.push(padLine("DISKON", `- ${formatRp(transaksi.diskon)}`));
  }
  lines.push(padLine("TOTAL BAYAR", formatRp(transaksi.total_bayar)));
  lines.push(padLine("BAYAR", formatRp(transaksi.bayar)));
  lines.push(padLine("KEMBALI", formatRp(transaksi.kembali)));
  lines.push(LINE);
  lines.push(center("Terima kasih sudah berbelanja!"));
  lines.push("");

  return lines.join("\n");
}

export function printReceipt(text: string): void {
  try {
    const printerName = getPengaturan("selected_printer", "");

    // Create a temporary hidden window to perform silent printing
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Format HTML document with pre-formatted monospace receipt text
    const html = `
      <html>
        <head>
          <style>
            @page {
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0px 4px;
              font-family: 'Courier New', Courier, monospace;
              font-size: 9px;
              line-height: 1.25;
              white-space: pre-wrap;
              word-break: break-all;
              color: #000;
              background-color: #fff;
            }
          </style>
        </head>
        <body>${text.replace(/\n/g, "<br>").replace(/ /g, "&nbsp;")}</body>
      </html>
    `;

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    win.webContents.on("did-finish-load", () => {
      // Print silently to the selected printer or default OS printer
      win.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: printerName || undefined,
          margins: {
            marginType: "none",
          },
          pageSize: {
            width: 58000, // 58mm in microns
            height: 250000, // 250mm in microns (25 cm)
          },
        },
        (success, errorType) => {
          if (!success) {
            console.error("Gagal mencetak struk kasir:", errorType);
          }
          win.destroy();
        },
      );
    });
  } catch (err) {
    console.error("Kesalahan pada modul cetak struk:", err);
  }
}
