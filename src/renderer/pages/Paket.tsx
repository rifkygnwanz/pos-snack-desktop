import { useCallback, useEffect, useState } from "react";
import type { Paket, PaketInput } from "@shared/types";
import { formatRupiah, cleanIpcError } from "@shared/utils";
import ConfirmDialog from "../components/ConfirmDialog";
import { useNavStore } from "../store/navStore";

const emptyForm = (): PaketInput => ({
  nama_paket: "",
  harga_modal: 0,
  harga_jual: 0,
});

export default function PaketPage() {
  const { storeName } = useNavStore();
  const [paketList, setPaketList] = useState<Paket[]>([]);
  const [search, setSearch] = useState("");
  const [formMode, setFormMode] = useState<"list" | "add" | "edit">("list");
  const [editingPaketId, setEditingPaketId] = useState<number | null>(null);

  const [form, setForm] = useState<PaketInput>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [typedPassword, setTypedPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Paket | null>(null);
  const [detailTarget, setDetailTarget] = useState<Paket | null>(null);

  const loadPaket = useCallback(async () => {
    try {
      const data = await window.api.paket.list(search || undefined);
      setPaketList(data);
    } catch (err) {
      console.error(err);
    }
  }, [search]);

  useEffect(() => {
    loadPaket();
  }, [loadPaket]);

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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (!form.nama_paket.trim()) {
      setFormError("Nama paket wajib diisi");
      return;
    }
    if (form.harga_modal == null || form.harga_modal < 0) {
      setFormError("Harga modal tidak valid");
      return;
    }
    if (form.harga_jual == null || form.harga_jual < 0) {
      setFormError("Harga jual tidak valid");
      return;
    }

    try {
      if (formMode === "add") {
        await window.api.paket.create(form);
        setMessage("Paket berhasil ditambahkan");
      } else if (formMode === "edit" && editingPaketId != null) {
        await window.api.paket.update(editingPaketId, form);
        setMessage("Paket berhasil diperbarui");
      }

      setForm(emptyForm());
      setFormMode("list");
      setEditingPaketId(null);
      loadPaket();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? cleanIpcError(err.message)
          : "Gagal menyimpan paket",
      );
    }
  };

  const openAddMode = () => {
    setForm(emptyForm());
    setFormMode("add");
    setEditingPaketId(null);
    setFormError(null);
  };

  const openEditMode = (paket: Paket) => {
    setForm({
      nama_paket: paket.nama_paket,
      harga_modal: paket.harga_modal,
      harga_jual: paket.harga_jual,
    });
    setFormMode("edit");
    setEditingPaketId(paket.id);
    setFormError(null);
  };

  const handleDelete = async (paket: Paket) => {
    try {
      await window.api.paket.delete(paket.id);
      setMessage("Paket berhasil dihapus");
      loadPaket();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      alert(
        err instanceof Error
          ? cleanIpcError(err.message)
          : "Gagal menghapus paket",
      );
    }
  };

  const handleExport = async () => {
    try {
      const csv = await window.api.paket.exportCsv();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeStoreName = (storeName || "toko")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_");
      a.download = `paket_${safeStoreName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengekspor paket:", err);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const count = await window.api.paket.importCsv(text);
        setMessage(`${count} paket berhasil diimpor`);
        loadPaket();
        setTimeout(() => setMessage(null), 3000);
      } catch (err) {
        alert(err instanceof Error ? cleanIpcError(err.message) : "Gagal mengimpor paket");
      }
    };
    input.click();
  };

  const parseField = (val: string): number => {
    const clean = val.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  };

  return (
    <div className="h-full w-full">
      {/* Form Tambah/Ubah Paket */}
      {(formMode === "add" || formMode === "edit") && (
        <div className="h-full overflow-auto p-4">
          <div className="panel mx-auto max-w-xl p-6">
            <h2 className="mb-4 text-base font-bold text-slate-800">
              {formMode === "add" ? "Tambah Paket Baru" : "Ubah Data Paket"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Nama Paket
                </label>
                <input
                  type="text"
                  value={form.nama_paket}
                  onChange={(e) =>
                    setForm({ ...form, nama_paket: e.target.value.toUpperCase() })
                  }
                  className="input-field uppercase"
                  placeholder="CONTOH: SERBA 5RB"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Harga Modal
                </label>
                <input
                  type="text"
                  value={
                    form.harga_modal
                      ? "Rp " + form.harga_modal.toLocaleString("id-ID")
                      : ""
                  }
                  onChange={(e) =>
                    setForm({ ...form, harga_modal: parseField(e.target.value) })
                  }
                  className="input-field"
                  placeholder="Rp 0"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Harga Jual
                </label>
                <input
                  type="text"
                  value={
                    form.harga_jual
                      ? "Rp " + form.harga_jual.toLocaleString("id-ID")
                      : ""
                  }
                  onChange={(e) =>
                    setForm({ ...form, harga_jual: parseField(e.target.value) })
                  }
                  className="input-field"
                  placeholder="Rp 0"
                />
                {form.harga_jual > 0 && (
                  form.harga_modal > 0 ? (
                    <div className="flex items-center justify-between mt-1 text-[11px] font-bold select-none border-t border-slate-100/60 pt-1">
                      <span className="text-slate-400 font-semibold">
                        Modal: {formatRupiah(form.harga_modal)}
                      </span>
                      {(() => {
                        const profit = form.harga_jual - form.harga_modal;
                        const margin = form.harga_jual > 0 ? Math.round((profit / form.harga_jual) * 100) : 0;
                        const isLoss = profit < 0;
                        return (
                          <span className={isLoss ? "text-rose-600 animate-pulse" : "text-emerald-600"}>
                            {isLoss ? "Rugi" : "Untung"}: {formatRupiah(profit)} ({margin > 0 ? `+${margin}%` : `${margin}%`})
                          </span>
                        );
                      })()}
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 block mt-1">
                      * Isi Harga Modal di atas untuk melihat untung bersih
                    </span>
                  )
                )}
              </div>

              {formError && (
                <p className="text-sm font-semibold text-red-600">{formError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary">
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormMode("list");
                    setEditingPaketId(null);
                    setForm(emptyForm());
                  }}
                  className="btn-secondary"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main List View */}
      <div className={`flex h-full gap-3 p-4 overflow-hidden ${formMode !== "list" ? "hidden" : ""}`}>
      {/* Left List Container */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {message && (
          <div className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800 shrink-0">
            {message}
          </div>
        )}

        <div className="panel flex flex-wrap items-center gap-3 p-4 shrink-0">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari paket..."
            className="input-field max-w-xs"
          />
          {isAdminUnlocked && (
            <button type="button" onClick={openAddMode} className="btn-primary">
              + Tambah Paket
            </button>
          )}
          <button type="button" onClick={handleExport} className="btn-secondary">
            Export CSV
          </button>
          {isAdminUnlocked && (
            <button type="button" onClick={handleImport} className="btn-secondary">
              Import CSV
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (isAdminUnlocked) {
                setIsAdminUnlocked(false);
              } else {
                setShowPasswordModal(true);
              }
            }}
            className={`ml-auto px-4 py-2 rounded-lg font-bold text-sm shadow transition ${
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
                <th className="px-3 py-2">No</th>
                <th className="px-3 py-2">Nama Paket</th>
                <th className="px-3 py-2">Harga Modal</th>
                <th className="px-3 py-2">Harga Jual</th>
                {isAdminUnlocked && <th className="px-3 py-2 text-center w-28">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {paketList.map((p, idx) => {
                const isSelected = detailTarget?.id === p.id;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setDetailTarget(p)}
                    className={`cursor-pointer border-t border-slate-100 transition select-none ${
                      isSelected ? "bg-snack-100 font-semibold" : "hover:bg-snack-50"
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-slate-400">
                      #{idx + 1}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-800">
                      {p.nama_paket}
                    </td>
                    <td className="px-3 py-2">{formatRupiah(p.harga_modal)}</td>
                    <td className="px-3 py-2 font-bold text-snack-600">
                      {formatRupiah(p.harga_jual)}
                    </td>
                    {isAdminUnlocked && (
                      <td className="px-3 py-2 text-center select-none" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditMode(p);
                            }}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(p);
                            }}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {paketList.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdminUnlocked ? 5 : 4}
                    className="px-3 py-8 text-center text-slate-400"
                  >
                    Belum ada data paket
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Sidebar Detail Panel */}
      {detailTarget && (
        <div className="panel w-96 shrink-0 overflow-auto p-4 flex flex-col gap-4 border border-slate-100 animate-in slide-in-from-right duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 select-none">
              <div>
                <span className="px-2 py-0.5 text-[10px] font-black rounded border bg-indigo-50 text-indigo-700 border-indigo-100 uppercase tracking-wider">
                  Detail Paket
                </span>
                <h3 className="text-base font-extrabold text-slate-800 mt-1 uppercase max-w-[200px] truncate" title={detailTarget.nama_paket}>
                  {detailTarget.nama_paket}
                </h3>
              </div>
              <button
                onClick={() => setDetailTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition animate-in fade-in"
                title="Tutup Detail"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="space-y-4 text-sm select-none">
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Harga Modal</span>
                  <span className="font-semibold text-slate-700">{formatRupiah(detailTarget.harga_modal)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Harga Jual</span>
                  <span className="font-extrabold text-snack-600 text-sm">{formatRupiah(detailTarget.harga_jual)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  {(() => {
                    const profit = detailTarget.harga_jual - detailTarget.harga_modal;
                    const margin = detailTarget.harga_jual > 0 ? Math.round((profit / detailTarget.harga_jual) * 100) : 0;
                    const isLoss = profit < 0;

                    return (
                      <>
                        <span className={`font-bold text-[10px] uppercase ${isLoss ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {isLoss ? 'Estimasi Rugi' : 'Untung Bersih'}
                        </span>
                        <span className={`font-extrabold text-sm ${isLoss ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                          {formatRupiah(profit)} ({margin > 0 ? `+${margin}%` : `${margin}%`})
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {deleteTarget && (
        <ConfirmDialog
          message={`Hapus paket ${deleteTarget.nama_paket}? (Y/N)`}
          onConfirm={() => {
            handleDelete(deleteTarget);
            setDeleteTarget(null);
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
                Masukkan password admin untuk mengubah data paket.
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
