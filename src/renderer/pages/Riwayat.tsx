import { useCallback, useEffect, useState } from "react";
import type { DetailTransaksi, Transaksi, Kemasan } from "@shared/types";
import { KEMASAN_LABELS } from "@shared/types";
import { formatDateTime, formatRupiah, cleanIpcError } from "@shared/utils";
import ConfirmDialog from "../components/ConfirmDialog";

export default function RiwayatPage() {
  const [list, setList] = useState<Transaksi[]>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<{
    transaksi: Transaksi;
    details: DetailTransaksi[];
  } | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [typedPassword, setTypedPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaksi | null>(null);
  const [activeRange, setActiveRange] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');

  const setQuickRange = (range: 'all' | 'today' | 'yesterday') => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    setActiveRange(range);

    if (range === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (range === 'today') {
      setDateFrom(formatDate(today));
      setDateTo(formatDate(today));
    } else if (range === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      setDateFrom(formatDate(yesterday));
      setDateTo(formatDate(yesterday));
    }
  };

  const handlePasswordVerify = async () => {
    try {
      const config = await window.api.settings.getStoreConfig();
      const correctPassword = config?.adminPassword || "admin";
      if (typedPassword === correctPassword) {
        setIsAdminUnlocked(true);
        setShowPasswordModal(false);
        setTypedPassword("");
        setPasswordError(null);
      } else {
        setPasswordError("Password admin salah!");
      }
    } catch (err) {
      setPasswordError("Gagal memverifikasi password");
    }
  };

  const load = useCallback(async () => {
    const data = await window.api.transaksi.list({
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    setList(data);
  }, [search, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id: number) => {
    const data = await window.api.transaksi.get(id);
    setSelected(data);
    setReceiptPreview(null);
  };

  const reprint = async () => {
    if (!selected) return;
    const receipt = await window.api.transaksi.getReceipt(
      selected.transaksi.id,
    );
    setReceiptPreview(receipt);
    if (receipt) {
      await window.api.transaksi.print(receipt);
    }
  };

  return (
    <div className="flex h-full gap-3 p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="panel flex flex-wrap items-center gap-3 p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor TRX..."
            className="input-field max-w-xs h-10"
          />
           <input
             type="date"
             value={dateFrom}
             onChange={(e) => {
               setDateFrom(e.target.value);
               setActiveRange("custom");
             }}
             className="input-field max-w-[160px] h-10"
           />
           <input
             type="date"
             value={dateTo}
             onChange={(e) => {
               setDateTo(e.target.value);
               setActiveRange("custom");
             }}
             className="input-field max-w-[160px] h-10"
           />
 
           {/* Quick Date Range Buttons */}
           <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 select-none h-10 items-center">
             <button
               type="button"
               onClick={() => setQuickRange("all")}
               className={`h-full flex items-center px-3 text-[11px] font-bold rounded-md transition ${
                 activeRange === "all"
                   ? "bg-snack-600 text-white shadow-sm"
                   : "hover:bg-white hover:shadow-sm text-slate-600"
               }`}
             >
               Semua
             </button>
             <button
               type="button"
               onClick={() => setQuickRange("today")}
               className={`h-full flex items-center px-3 text-[11px] font-bold rounded-md transition ${
                 activeRange === "today"
                   ? "bg-snack-600 text-white shadow-sm"
                   : "hover:bg-white hover:shadow-sm text-slate-600"
               }`}
             >
               Hari Ini
             </button>
             <button
               type="button"
               onClick={() => setQuickRange("yesterday")}
               className={`h-full flex items-center px-3 text-[11px] font-bold rounded-md transition ${
                 activeRange === "yesterday"
                   ? "bg-snack-600 text-white shadow-sm"
                   : "hover:bg-white hover:shadow-sm text-slate-600"
               }`}
             >
               Kemarin
             </button>
           </div>

          {/* Unlock Admin Action Button */}
          <button
            type="button"
            onClick={() => {
              if (isAdminUnlocked) {
                setIsAdminUnlocked(false);
              } else {
                setShowPasswordModal(true);
              }
            }}
            className={`ml-auto px-4 rounded-lg font-bold text-sm shadow transition h-10 flex items-center justify-center ${
              isAdminUnlocked
                ? "bg-amber-100 hover:bg-amber-200 text-amber-800"
                : "bg-snack-600 hover:bg-snack-700 text-white"
            }`}
          >
            {isAdminUnlocked ? "Selesai Ubah" : "Ubah"}
          </button>
        </div>

        <div className="panel min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Nomor TRX</th>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Total Bayar</th>
                <th className="px-3 py-2">Bayar</th>
                <th className="px-3 py-2">Kembali</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => openDetail(t.id)}
                  className={`cursor-pointer border-t border-slate-100 hover:bg-snack-50 ${
                    selected?.transaksi.id === t.id ? "bg-snack-100" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-medium">{t.nomor_trx}</td>
                  <td className="px-3 py-2">{formatDateTime(t.tanggal)}</td>
                  <td className="px-3 py-2">{t.item_count ?? "—"}</td>
                  <td className="px-3 py-2">{formatRupiah(t.total_bayar)}</td>
                  <td className="px-3 py-2">{formatRupiah(t.bayar)}</td>
                  <td className="px-3 py-2">{formatRupiah(t.kembali)}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-slate-400"
                  >
                    Belum ada transaksi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="panel w-96 shrink-0 flex flex-col animate-in slide-in-from-right duration-200 h-full overflow-hidden">
          {/* Unscrollable Fixed Header */}
          <div className="flex items-center justify-between pt-4 px-4 pb-3 border-b border-slate-100 select-none">
            <div>
              <span className="px-2 py-0.5 text-[10px] font-black rounded border bg-snack-50 text-snack-700 border-snack-100 uppercase tracking-wider">
                Detail Transaksi
              </span>
              <h3
                className="text-base font-extrabold text-slate-800 mt-1 uppercase max-w-[200px] truncate"
                title={selected.transaksi.nomor_trx}
              >
                {selected.transaksi.nomor_trx}
              </h3>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition animate-in fade-in"
              title="Tutup Detail"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Single Continuous Scroll Container for all content below the header */}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6 space-y-4 scrollbar-thin">
            <p className="-mt-1 text-xs text-slate-500 select-none">
              {formatDateTime(selected.transaksi.tanggal)}
            </p>

            <div className="space-y-2 text-sm">
              {selected.details.map((d) => (
                <div key={d.id} className="rounded-lg bg-slate-50 p-2">
                  <div className="font-medium">{d.nama_snapshot}</div>
                  <div className="text-slate-600">
                    {KEMASAN_LABELS[d.kemasan as Kemasan] ?? d.kemasan} ·{" "}
                    {d.qty} × {formatRupiah(d.harga_satuan)}
                  </div>
                  {d.diskon_item > 0 && (
                    <div className="text-red-600">
                      Diskon: {formatRupiah(d.diskon_item * d.qty)}
                    </div>
                  )}
                  <div className="font-semibold">
                    {formatRupiah(d.subtotal)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span>Total</span>
                <span>{formatRupiah(selected.transaksi.total)}</span>
              </div>
              {selected.transaksi.diskon > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Diskon</span>
                  <span>-{formatRupiah(selected.transaksi.diskon)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total Bayar</span>
                <span>{formatRupiah(selected.transaksi.total_bayar)}</span>
              </div>
              <div className="flex justify-between">
                <span>Bayar</span>
                <span>{formatRupiah(selected.transaksi.bayar)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Kembali</span>
                <span>{formatRupiah(selected.transaksi.kembali)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={reprint}
              className="btn-secondary mt-4 w-full"
            >
              Cetak Ulang Struk
            </button>

            {isAdminUnlocked && (
              <button
                type="button"
                onClick={() => setDeleteTarget(selected.transaksi)}
                className="w-full mt-2 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow transition duration-150"
              >
                ⚠️ Hapus Transaksi Ini
              </button>
            )}

            {receiptPreview && (
              <pre
                className="mt-3 rounded-xl bg-slate-950 p-4 text-[16px] text-green-400 font-mono border border-slate-800 shadow-xl select-text whitespace-pre leading-normal w-full overflow-x-auto"
                style={{ fontFamily: '"Courier New", Courier, monospace' }}
              >
                {receiptPreview}
              </pre>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Hapus transaksi ${deleteTarget.nomor_trx}? Tindakan ini tidak dapat dibatalkan. (Y/N)`}
          onConfirm={async () => {
            try {
              await window.api.transaksi.delete(deleteTarget.id);
              setDeleteTarget(null);
              setSelected(null);
              load();
            } catch (err) {
              alert(
                err instanceof Error
                  ? cleanIpcError(err.message)
                  : "Gagal menghapus transaksi",
              );
            }
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Admin Password verification modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-800">
                Verifikasi Akses Admin
              </h3>
              <p className="text-xs text-slate-500">
                Masukkan password admin untuk menghapus transaksi.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                value={typedPassword}
                onChange={(e) => {
                  setTypedPassword(e.target.value);
                  setPasswordError(null);
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    handlePasswordVerify();
                  }
                }}
                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-center text-lg font-bold transition focus:outline-none focus:ring-4 focus:ring-snack-500/10 ${
                  passwordError
                    ? "border-red-500 focus:border-red-500"
                    : "border-slate-200 focus:border-snack-500"
                }`}
                placeholder="••••••"
                autoFocus
              />
              {passwordError && (
                <p className="text-xs font-semibold text-red-600 text-center">
                  {passwordError}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handlePasswordVerify}
                className="flex-1 py-2.5 px-4 bg-snack-600 hover:bg-snack-700 text-white rounded-xl font-bold shadow text-xs transition"
              >
                Konfirmasi
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setTypedPassword("");
                  setPasswordError(null);
                }}
                className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
