import { useEffect, useRef, useState } from "react";
import { calcCartTotals, formatRupiah } from "@shared/utils";
import { KEMASAN_LABELS } from "@shared/types";
import type { Kemasan } from "@shared/types";
import { useKasirStore } from "../store/kasirStore";
import { useNavStore } from "../store/navStore";

export default function PanelBayar() {
  const items = useKasirStore((s) => s.items);
  const paymentMode = useKasirStore((s) => s.paymentMode);
  const bayarInput = useKasirStore((s) => s.bayarInput);
  const bayar = useKasirStore((s) => s.bayar);
  const bayarError = useKasirStore((s) => s.bayarError);
  const confirmPrint = useKasirStore((s) => s.confirmPrint);
  const cetakStruk = useKasirStore((s) => s.cetakStruk);
  const setBayarInput = useKasirStore((s) => s.setBayarInput);
  const setCetakStruk = useKasirStore((s) => s.setCetakStruk);
  const exitPaymentMode = useKasirStore((s) => s.exitPaymentMode);
  const validateBayar = useKasirStore((s) => s.validateBayar);

  const storeName = useNavStore((s) => s.storeName);
  const alamatToko = useNavStore((s) => s.alamatToko);

  const totals = calcCartTotals(items);
  const inputRef = useRef<HTMLInputElement>(null);

  const kembali = bayar >= totals.totalBayar ? bayar - totals.totalBayar : 0;

  useEffect(() => {
    if (paymentMode) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [paymentMode]);

  // Keyboard shortcut: + or = → Uang Pas (exact change)
  useEffect(() => {
    if (!paymentMode) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setBayarInput(totals.totalBayar.toString());
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [paymentMode, totals.totalBayar, setBayarInput]);

  if (!paymentMode) {
    return (
      <div className="panel px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex flex-wrap gap-4">
            <span>
              <kbd className="rounded bg-slate-200 px-1.5 py-0.5">+</kbd> atau{" "}
              <kbd className="rounded bg-slate-200 px-1.5 py-0.5">=</kbd> Bayar
            </span>
            <span>
              <kbd className="rounded bg-slate-200 px-1.5 py-0.5">F2</kbd>{" "}
              Produk
            </span>
            <span>
              <kbd className="rounded bg-slate-200 px-1.5 py-0.5">F3</kbd> Paket
            </span>
            <span>
              <kbd className="rounded bg-slate-200 px-1.5 py-0.5">F4</kbd>{" "}
              Riwayat
            </span>
            <span>
              <kbd className="rounded bg-slate-200 px-1.5 py-0.5">Del</kbd>{" "}
              Hapus item
            </span>
            <span>
              <kbd className="rounded bg-slate-200 px-1.5 py-0.5">Esc</kbd>{" "}
              Batal transaksi
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-700">
            Qty: {totals.totalQty} | Total: {formatRupiah(totals.totalBayar)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[600px] border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Left Column: Payment Controls */}
        <div className="flex-1 p-6 md:p-8 flex flex-col bg-slate-50 border-r border-slate-100 min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0 px-1 pb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                Proses Pembayaran
              </h3>
              <button
                type="button"
                onClick={exitPaymentMode}
                className="text-slate-400 hover:text-slate-600 transition-colors text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              {/* Total Tagihan */}
              <div className="bg-snack-50 rounded-xl p-4 border border-snack-100/50">
                <label className="block text-xs font-semibold uppercase text-snack-700 mb-1">
                  Total Tagihan ({totals.totalQty} item)
                </label>
                <div className="text-3xl font-extrabold text-snack-700">
                  {formatRupiah(totals.totalBayar)}
                </div>
              </div>

              {/* Input Bayar */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
                  Uang Diterima (Rp)
                </label>
                <div className="flex gap-2 items-stretch">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={
                        bayarInput
                          ? parseInt(bayarInput, 10).toLocaleString("id-ID")
                          : ""
                      }
                      onChange={(e) => setBayarInput(e.target.value)}
                      className={`w-full pl-12 pr-4 py-3 bg-white border-2 rounded-xl text-2xl font-bold transition-all focus:outline-none focus:ring-4 focus:ring-snack-500/10 ${
                        bayarError
                          ? "border-red-500 focus:border-red-500"
                          : "border-slate-200 focus:border-snack-500"
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {/* Uang Pas button — inline right of input */}
                  <button
                    type="button"
                    title="Uang Pas (+ atau =)"
                    onClick={() => {
                      setBayarInput(totals.totalBayar.toString());
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[56px] bg-snack-50 hover:bg-snack-100 active:scale-95 text-snack-700 border-2 border-slate-200 hover:border-snack-300 rounded-xl font-bold text-[11px] leading-tight transition-all"
                  >
                    <span>Uang</span>
                    <span>Pas</span>
                  </button>
                </div>
                {bayarError && (
                  <p className="mt-1.5 text-sm font-medium text-red-600">
                    {bayarError}
                  </p>
                )}
              </div>

              {/* Uang Kembali */}
              <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/30">
                <label className="block text-xs font-semibold uppercase text-emerald-700 mb-1">
                  Uang Kembali
                </label>
                <div className="text-3xl font-extrabold text-emerald-600">
                  {formatRupiah(kembali)}
                </div>
              </div>

              {/* Pilihan Cetak Struk */}
              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cetakStruk}
                    onChange={(e) => setCetakStruk(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-snack-600"></div>
                  <span className="ml-3 text-sm font-semibold text-slate-700">
                    Cetak Struk Belanja
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons & Shortcut Hints */}
          <div className="pt-3 border-t border-slate-200/60">
            {confirmPrint && !bayarError ? (
              <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                <p className="text-xs font-semibold text-emerald-800">
                  Tekan{" "}
                  <kbd className="rounded bg-emerald-200/80 px-1.5 py-0.5 font-mono text-[10px]">
                    Enter
                  </kbd>{" "}
                  sekali lagi untuk menyimpan transaksi
                </p>
              </div>
            ) : (
              <div className="mb-4 rounded-xl bg-amber-50 border border-amber-100 p-3">
                <p className="text-xs font-semibold text-amber-800 text-center">
                  Masukkan nominal bayar yang cukup untuk melanjutkan
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (confirmPrint && !bayarError) {
                    // Save by calling enter on input
                    const enterEvent = new KeyboardEvent("keydown", {
                      key: "Enter",
                      bubbles: true,
                    });
                    inputRef.current?.dispatchEvent(enterEvent);
                  } else {
                    validateBayar();
                  }
                }}
                disabled={!confirmPrint || !!bayarError}
                className="flex-1 py-3 px-4 bg-snack-600 hover:bg-snack-700 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-center flex items-center justify-center gap-2 text-sm"
              >
                <span>Simpan Transaksi (Enter)</span>
              </button>
              <button
                type="button"
                onClick={exitPaymentMode}
                className="py-3 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition-all text-center text-sm"
              >
                Batal (Esc)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Thermal Receipt Live Preview */}
        <div className="w-full md:w-[360px] p-6 bg-slate-900 flex flex-col items-center justify-start overflow-hidden">
          <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
            Preview Struk Belanja
          </div>
          <div className="flex-1 w-full overflow-y-auto max-h-[440px] pr-1 flex items-start justify-center">
            {/* The Thermal Paper Receipt */}
            <div className="w-full bg-amber-50 p-5 shadow-xl border-t-4 border-dashed border-amber-200 text-slate-800 font-mono text-[11px] leading-relaxed relative rounded-b-md">
              <div className="text-center font-bold text-sm tracking-wider text-slate-900 mb-0.5">
                {storeName}
              </div>
              {alamatToko.trim() && (
                <div className="text-center text-[10px] text-slate-500 mb-3 leading-snug">
                  {alamatToko}
                </div>
              )}

              <div className="border-t border-dashed border-slate-300 my-2"></div>

              <div className="text-[10px] text-slate-600 space-y-0.5 mb-2">
                <div className="flex justify-between">
                  <span>NO: TRX-XXXXXXXX-XXXX</span>
                  <span>[PREVIEW]</span>
                </div>
                <div>TANGGAL: {new Date().toLocaleString("id-ID")}</div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-2"></div>

              {/* Cart items list */}
              <div className="space-y-2 py-1 max-h-[180px] overflow-y-auto">
                {items.map((item) => {
                  const labelKemasan =
                    KEMASAN_LABELS[item.kemasan as Kemasan] ?? item.kemasan;
                  const subTotalItem = item.harga_satuan * item.qty;
                  return (
                    <div key={item.key} className="space-y-0.5">
                      <div className="font-semibold text-slate-900">
                        {item.nama}
                        {labelKemasan && labelKemasan !== "Satuan"
                          ? ` (${labelKemasan})`
                          : ""}
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>
                          {item.qty} x{" "}
                          {item.harga_satuan.toLocaleString("id-ID")}
                        </span>
                        <span>{subTotalItem.toLocaleString("id-ID")}</span>
                      </div>
                      {item.diskon_item > 0 && (
                        <div className="flex justify-between text-red-600 pl-2 text-[10px]">
                          <span> Diskon</span>
                          <span>
                            -{" "}
                            {(item.diskon_item * item.qty).toLocaleString(
                              "id-ID",
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-dashed border-slate-300 my-2"></div>

              {/* Grand totals and payment */}
              <div className="space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span>TOTAL</span>
                  <span>{totals.total.toLocaleString("id-ID")}</span>
                </div>
                {totals.diskon > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>DISKON</span>
                    <span>- {totals.diskon.toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-1 text-xs">
                  <span>TOTAL BAYAR</span>
                  <span>{totals.totalBayar.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span>BAYAR</span>
                  <span>{bayar.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 border-t border-slate-200/50 pt-0.5">
                  <span>KEMBALI</span>
                  <span>{kembali.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 my-3"></div>

              <div className="text-center text-[10px] text-slate-500 italic space-y-0.5">
                <div>Terima kasih sudah berbelanja!</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
