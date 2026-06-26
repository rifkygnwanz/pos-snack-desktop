import { useCallback, useEffect, useMemo, useState } from "react";
import type { Produk, ProdukInput, Kemasan } from "@shared/types";
import { KEMASAN_LABELS } from "@shared/types";
import { formatRupiah, cleanIpcError, getKemasanLabel } from "@shared/utils";
import ConfirmDialog from "../components/ConfirmDialog";
import { useNavStore } from "../store/navStore";

const renderHargaCell = (p: Produk, kemasan: Kemasan, field: keyof Produk) => {
  const harga = p[field] as number | null;
  if (harga == null) return "—";

  const isMain = p.main_eceran === kemasan;
  const isJual = kemasan === "jual";

  if (isJual) {
    return (
      <span
        className={`flex items-center gap-1 font-semibold ${
          isMain ? "text-snack-600 font-bold" : "text-slate-800"
        }`}
        title={isMain ? "Pajangan Utama" : undefined}
      >
        {formatRupiah(harga)}
      </span>
    );
  }

  const customLabel = getKemasanLabel(p, kemasan);
  const isCustom = customLabel !== KEMASAN_LABELS[kemasan];

  return (
    <span
      className={`flex items-center gap-1.5 font-semibold flex-wrap ${
        isMain ? "text-snack-600 font-bold" : "text-slate-800"
      }`}
      title={isMain ? "Pajangan Utama" : undefined}
    >
      <span>{formatRupiah(harga)}</span>
      {isCustom && (
        <span
          className="text-[10px] font-bold text-snack-600 bg-snack-50 border border-snack-100/50 px-1.5 py-0.5 rounded shrink-0"
          title="Label Kustom"
        >
          {customLabel}
        </span>
      )}
    </span>
  );
};

const parseBerat = (beratStr: string | null) => {
  if (!beratStr) return { value: "", unit: "GR" as "KG" | "GR" };
  const clean = beratStr.trim();
  const match = clean.match(/^([\d.,]+)\s*(kg|gr|g)?$/i);
  if (match) {
    const val = match[1];
    let unit = (match[2] || "GR").toUpperCase();
    if (unit === "G") unit = "GR";
    return { value: val, unit: unit === "KG" ? "KG" : ("GR" as "KG" | "GR") };
  }
  return { value: clean, unit: "GR" as "KG" | "GR" };
};

const KEY_TO_KEMASAN: Record<string, Kemasan> = {
  harga_jual: "jual",
  harga_100gr: "100gr",
  harga_200gr: "200gr",
  harga_250gr: "250gr",
  harga_500gr: "500gr",
  harga_1kg: "1kg",
};

const emptyForm = (): ProdukInput => ({
  nama_menu: "",
  harga_modal: null,
  harga_jual: null,
  harga_100gr: null,
  harga_200gr: null,
  harga_250gr: null,
  harga_500gr: null,
  harga_1kg: null,
  berat_produk: "",
  main_eceran: null,
  label_kemasan: null,
  gambar: null,
});

export default function ProdukPage() {
  const { produkFormMode, editingProdukId, closeProdukForm, storeName } =
    useNavStore();
  const [produkList, setProdukList] = useState<Produk[]>([]);

  const getFormLabel = (key: string): string => {
    if (form.label_kemasan) {
      try {
        const obj = JSON.parse(form.label_kemasan);
        if (obj[KEY_TO_KEMASAN[key]]) {
          return obj[KEY_TO_KEMASAN[key]];
        }
      } catch (e) {}
    }
    return "";
  };

  const getFormNumericLabel = (key: string): string => {
    const fullLabel = getFormLabel(key);
    if (!fullLabel) return "";
    const match = fullLabel.match(/^([\d.,]+)/);
    return match ? match[1] : "";
  };

  const getDefaultNumber = (key: string): string => {
    if (key === "harga_100gr") return "100";
    if (key === "harga_200gr") return "200";
    if (key === "harga_250gr") return "250";
    if (key === "harga_500gr") return "500";
    if (key === "harga_1kg") return "1";
    return "";
  };

  const setFormLabel = (key: string, value: string) => {
    let obj: Record<string, string> = {};
    if (form.label_kemasan) {
      try {
        obj = JSON.parse(form.label_kemasan);
      } catch (e) {}
    }
    const kemasan = KEY_TO_KEMASAN[key];
    if (kemasan) {
      if (value.trim()) {
        obj[kemasan] = value;
      } else {
        delete obj[kemasan];
      }
    }
    setForm({
      ...form,
      label_kemasan: Object.keys(obj).length > 0 ? JSON.stringify(obj) : null,
    });
  };
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<keyof Produk>("nama_menu");
  const [sortAsc, setSortAsc] = useState(true);
  const [form, setForm] = useState<ProdukInput>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Produk | null>(null);
  const [detailTarget, setDetailTarget] = useState<Produk | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [beratValue, setBeratValue] = useState("");
  const [beratUnit, setBeratUnit] = useState<"KG" | "GR">("KG");

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [typedPassword, setTypedPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // State variables for Catalog PDF export
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<number[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const getBeratInGrams = (valStr: string, unit: "KG" | "GR") => {
    const numericVal = parseFloat(valStr.replace(/,/g, ".")) || 0;
    if (unit === "KG") return numericVal * 1000;
    return numericVal;
  };

  const getEceranWeightInGrams = (key: string) => {
    const customLabel = getFormLabel(key);
    if (customLabel) {
      const match = customLabel.match(/^([\d.,]+)\s*(kg|gr|g)?$/i);
      if (match) {
        const num = parseFloat(match[1].replace(/,/g, ".")) || 0;
        const unit = (match[2] || "gr").toLowerCase();
        if (unit === "kg") return num * 1000;
        return num;
      }
    }
    // Fallback to default
    if (key === "harga_100gr") return 100;
    if (key === "harga_200gr") return 200;
    if (key === "harga_250gr") return 250;
    if (key === "harga_500gr") return 500;
    if (key === "harga_1kg") return 1000;
    return 0;
  };

  const renderLiveProfit = (key: string) => {
    if (key === "harga_modal") return null;

    const modal = form.harga_modal;
    const jual = form[key as keyof ProdukInput] as number | null;

    if (jual == null) return null;
    if (modal == null) {
      return (
        <span className="text-[10px] font-semibold text-slate-400 block mt-1">
          * Isi Harga Modal di atas untuk melihat untung bersih
        </span>
      );
    }

    let calculatedModal = modal;
    const isEceran = key !== "harga_jual";

    if (isEceran) {
      const totalWeight = getBeratInGrams(beratValue, beratUnit);
      const itemWeight = getEceranWeightInGrams(key);
      if (totalWeight > 0) {
        calculatedModal = Math.round((itemWeight / totalWeight) * modal);
      } else {
        return (
          <span className="text-[10px] font-semibold text-amber-600 block mt-1">
            * Isi Berat Produk di atas untuk kalkulasi modal & untung eceran
          </span>
        );
      }
    }

    const profit = jual - calculatedModal;
    const margin = jual > 0 ? Math.round((profit / jual) * 100) : 0;
    const isLoss = profit < 0;

    return (
      <div className="flex items-center justify-between mt-1 text-[11px] font-bold select-none border-t border-slate-100/60 pt-1">
        <span className="text-slate-400 font-semibold">
          Modal: {formatRupiah(calculatedModal)}
        </span>
        <span
          className={
            isLoss ? "text-rose-600 animate-pulse" : "text-emerald-600"
          }
        >
          {isLoss ? "Rugi" : "Untung"}: {formatRupiah(profit)} (
          {margin > 0 ? `+${margin}%` : `${margin}%`})
        </span>
      </div>
    );
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
    setProdukList(await window.api.produk.list());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (produkFormMode === "add") {
      setForm(emptyForm());
      setFormError(null);
      setBeratValue("");
      setBeratUnit("KG");
    } else if (produkFormMode === "edit" && editingProdukId) {
      window.api.produk.get(editingProdukId).then((p) => {
        if (p) {
          setForm({
            nama_menu: p.nama_menu,
            harga_modal: p.harga_modal,
            harga_jual: p.harga_jual,
            harga_100gr: p.harga_100gr,
            harga_200gr: p.harga_200gr,
            harga_250gr: p.harga_250gr,
            harga_500gr: p.harga_500gr,
            harga_1kg: p.harga_1kg,
            berat_produk: p.berat_produk ?? "",
            main_eceran: p.main_eceran ?? null,
            label_kemasan: p.label_kemasan ?? null,
            gambar: p.gambar ?? null,
          });
          const { value, unit } = parseBerat(p.berat_produk);
          setBeratValue(value);
          setBeratUnit(unit);
        }
      });
    }
  }, [produkFormMode, editingProdukId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = produkList;
    if (q) {
      list = list.filter(
        (p) =>
          p.nama_menu.toLowerCase().includes(q) || String(p.id).includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortAsc ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
  }, [produkList, search, sortCol, sortAsc]);

  const toggleSort = (col: keyof Produk) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const parseField = (val: string): number | null => {
    const n = parseInt(val.replace(/\D/g, ""), 10);
    return val.trim() ? (Number.isFinite(n) ? n : null) : null;
  };

  const handleSave = async () => {
    if (!form.nama_menu.trim()) {
      setFormError("Nama menu wajib diisi");
      return;
    }
    try {
      const cleanBeratValue = beratValue.trim().replace(/,/g, ".");
      const finalBerat = cleanBeratValue
        ? `${cleanBeratValue}${beratUnit.toLowerCase()}`
        : null;
      const dataToSave = {
        ...form,
        berat_produk: finalBerat,
      };
      if (produkFormMode === "edit" && editingProdukId) {
        await window.api.produk.update(editingProdukId, dataToSave);
        setMessage("Produk diperbarui");
      } else {
        await window.api.produk.create(dataToSave);
        setMessage("Produk ditambahkan");
      }
      closeProdukForm();
      load();
      setFormError(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? cleanIpcError(err.message) : "Gagal menyimpan",
      );
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (produkFormMode !== "list" && e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleExport = async () => {
    const csv = await window.api.produk.exportCsv();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeStoreName = storeName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_");
    a.download = `produk_${safeStoreName || "toko"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const count = await window.api.produk.importCsv(text);
      setMessage(`${count} produk diimpor`);
      load();
    };
    input.click();
  };

  const openCatalogModal = () => {
    setSelectedCatalogIds(produkList.map((p) => p.id));
    setCatalogSearch("");
    setShowCatalogModal(true);
  };

  const handleExportCatalogPdf = async () => {
    if (selectedCatalogIds.length === 0) {
      alert("Pilih minimal satu produk untuk diekspor.");
      return;
    }
    setIsExportingPdf(true);
    try {
      const success = await window.api.produk.exportCatalog(selectedCatalogIds);
      if (success) {
        setMessage("Katalog PDF berhasil diekspor");
        setShowCatalogModal(false);
      }
    } catch (err) {
      console.error(err);
      alert(
        "Gagal mengekspor katalog: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const filteredCatalogProducts = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return produkList;
    return produkList.filter((p) => p.nama_menu.toLowerCase().includes(q));
  }, [produkList, catalogSearch]);

  const handleSelectAllCatalog = () => {
    setSelectedCatalogIds(produkList.map((p) => p.id));
  };

  const handleDeselectAllCatalog = () => {
    setSelectedCatalogIds([]);
  };

  return (
    <div className="h-full w-full relative">
      {/* Form Tambah/Edit Produk */}
      {produkFormMode !== "list" && (
        <div className="h-full overflow-auto p-4">
          <div className="panel mx-auto max-w-2xl p-6">
            <h2 className="mb-4 text-xl font-bold">
              {produkFormMode === "edit" ? "Edit Produk" : "Tambah Produk Baru"}
            </h2>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nama Menu *
                </label>
                <input
                  value={form.nama_menu}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nama_menu: e.target.value.toUpperCase(),
                    })
                  }
                  className={`input-field uppercase ${formError && !form.nama_menu.trim() ? "input-error" : ""}`}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Foto Produk
                </label>
                <div className="flex items-center gap-4 mt-1">
                  {form.gambar ? (
                    <div className="relative w-24 h-24 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center group">
                      <img
                        src={form.gambar}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, gambar: null })}
                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-xs font-bold"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <label className="w-24 h-24 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-snack-600 hover:border-snack-300 hover:bg-snack-50/30 cursor-pointer transition select-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mb-1"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        ></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <span className="text-[10px] font-bold">Unggah</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const img = new Image();
                              img.onload = () => {
                                const canvas = document.createElement("canvas");
                                const MAX_WIDTH = 500;
                                const MAX_HEIGHT = 500;
                                let width = img.width;
                                let height = img.height;

                                if (width > height) {
                                  if (width > MAX_WIDTH) {
                                    height *= MAX_WIDTH / width;
                                    width = MAX_WIDTH;
                                  }
                                } else {
                                  if (height > MAX_HEIGHT) {
                                    width *= MAX_HEIGHT / height;
                                    height = MAX_HEIGHT;
                                  }
                                }

                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext("2d");
                                ctx?.drawImage(img, 0, 0, width, height);
                                const compressedBase64 = canvas.toDataURL(
                                  "image/jpeg",
                                  0.7,
                                );
                                setForm({ ...form, gambar: compressedBase64 });
                              };
                              img.src = event.target?.result as string;
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                  <div className="text-xs text-slate-400 leading-relaxed max-w-sm">
                    Mendukung JPG, PNG. Foto akan dikompresi otomatis (maks.
                    500px, JPEG 70%) agar database tetap ringan.
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Berat</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={beratValue}
                    onChange={(e) =>
                      setBeratValue(e.target.value.replace(/[^0-9.,]/g, ""))
                    }
                    className="input-field pr-16"
                    placeholder="Contoh: 10, 500 (opsional)"
                  />
                  <div className="absolute right-2 flex items-center">
                    <button
                      type="button"
                      onClick={() =>
                        setBeratUnit(beratUnit === "KG" ? "GR" : "KG")
                      }
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition select-none cursor-pointer border border-slate-200"
                    >
                      {beratUnit}
                    </button>
                  </div>
                </div>
              </div>
              {[
                ["harga_modal", "Harga Modal"],
                ["harga_jual", "Harga Jual"],
                ["harga_100gr", "100gr"],
                ["harga_200gr", "200gr"],
                ["harga_250gr", "250gr"],
                ["harga_500gr", "500gr"],
                ["harga_1kg", "1kg"],
              ].map(([key, label]) => {
                const kemasan = KEY_TO_KEMASAN[key];
                const isMain = kemasan != null && form.main_eceran === kemasan;
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-2.5 border border-slate-100 rounded-xl p-4 bg-slate-50/50"
                  >
                    <div className="flex items-center justify-between">
                      {/* Inline Title / Label Editing */}
                      {kemasan ? (
                        key === "harga_jual" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800">
                              Harga Jual
                            </span>
                            <select
                              value={getFormLabel(key) || "Bal"}
                              onChange={(e) =>
                                setFormLabel(key, e.target.value)
                              }
                              className="bg-snack-50 text-snack-700 text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer border-none outline-none focus:ring-1 focus:ring-snack-500"
                            >
                              <option value="Bal">Bal</option>
                              <option value="Dus">Dus</option>
                              <option value="Satuan">Satuan</option>
                            </select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5 bg-transparent border-b border-transparent hover:border-slate-300 focus-within:border-snack-500 transition py-0.5">
                            <input
                              type="text"
                              value={getFormNumericLabel(key)}
                              onChange={(e) => {
                                const cleanVal = e.target.value.replace(
                                  /[^0-9.,]/g,
                                  "",
                                );
                                const unit = key === "harga_1kg" ? "kg" : "gr";
                                setFormLabel(
                                  key,
                                  cleanVal ? `${cleanVal}${unit}` : "",
                                );
                              }}
                              placeholder={getDefaultNumber(key)}
                              style={{
                                width: `${
                                  Math.max(
                                    getFormNumericLabel(key).length ||
                                      getDefaultNumber(key).length,
                                    1,
                                  ) * 9
                                }px`,
                              }}
                              className="text-sm font-semibold text-slate-800 bg-transparent outline-none text-left p-0"
                              title="Klik untuk mengubah nilai berat"
                            />
                            <span className="text-xs font-bold text-slate-400 select-none">
                              {key === "harga_1kg" ? "kg" : "gr"}
                            </span>
                          </div>
                        )
                      ) : (
                        <span className="text-sm font-semibold text-slate-800">
                          {label}
                        </span>
                      )}

                      {/* Radio Button for Main Eceran */}
                      {kemasan && (
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-500 hover:text-snack-600 transition select-none">
                            <input
                              type="radio"
                              name="main_eceran"
                              checked={isMain}
                              onChange={() =>
                                setForm({ ...form, main_eceran: kemasan })
                              }
                              className="h-3.5 w-3.5 text-snack-600 border-slate-300 focus:ring-snack-500"
                            />
                            <span>Pajangan Utama</span>
                          </label>
                          {isMain && (
                            <button
                              type="button"
                              onClick={() =>
                                setForm({ ...form, main_eceran: null })
                              }
                              className="text-[10px] text-red-500 hover:underline font-semibold"
                            >
                              Hapus Utama
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Price Input Field */}
                    <input
                      type="text"
                      value={
                        form[key as keyof ProdukInput] != null
                          ? "Rp " +
                            (
                              form[key as keyof ProdukInput] as number
                            ).toLocaleString("id-ID")
                          : ""
                      }
                      onChange={(e) =>
                        setForm({ ...form, [key]: parseField(e.target.value) })
                      }
                      className="input-field bg-white"
                      placeholder="Kosongkan jika tidak tersedia"
                    />
                    {renderLiveProfit(key)}
                  </div>
                );
              })}
            </div>
            {formError && (
              <p className="mt-3 text-sm text-red-600">{formError}</p>
            )}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="btn-primary"
              >
                Simpan (Ctrl+S)
              </button>
              <button
                type="button"
                onClick={closeProdukForm}
                className="btn-secondary"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main List View */}
      <div
        className={`flex h-full gap-3 p-4 overflow-hidden ${produkFormMode !== "list" ? "hidden" : ""}`}
      >
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
              placeholder="Cari produk..."
              className="input-field max-w-xs"
            />

            {isAdminUnlocked && (
              <button
                type="button"
                onClick={() => useNavStore.getState().openAddProduk()}
                className="btn-primary"
              >
                + Tambah Produk
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              className="btn-secondary"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={openCatalogModal}
              className="btn-secondary"
            >
              Cetak Katalog PDF
            </button>
            {isAdminUnlocked && (
              <button
                type="button"
                onClick={handleImport}
                className="btn-secondary"
              >
                Import CSV
              </button>
            )}

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
                  {[
                    ["id", "No", "w-12 text-center"],
                    ["nama_menu", "Nama Menu", ""],
                    ["berat_produk", "Berat", "w-24 text-center"],
                    ["harga_modal", "Harga Modal", ""],
                    ["harga_jual", "Harga Jual", ""],
                    ["harga_100gr", "100gr", ""],
                    ["harga_200gr", "200gr", ""],
                    ["harga_250gr", "250gr", ""],
                    ["harga_500gr", "500gr", ""],
                    ["harga_1kg", "1kg", ""],
                  ].map(([col, label, colClass]) => (
                    <th
                      key={col}
                      className={`cursor-pointer px-3 py-2 hover:bg-slate-100 ${colClass}`}
                      onClick={() => toggleSort(col as keyof Produk)}
                    >
                      {label} {sortCol === col ? (sortAsc ? "↑" : "↓") : ""}
                    </th>
                  ))}
                  {isAdminUnlocked && (
                    <th className="px-3 py-2 text-center w-24">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const isSelected = detailTarget?.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setDetailTarget(p)}
                      className={`cursor-pointer border-t border-slate-100 transition select-none ${
                        isSelected
                          ? "bg-snack-100 font-semibold"
                          : "hover:bg-snack-50"
                      }`}
                    >
                      <td className="px-3 py-2 text-center w-12">{idx + 1}</td>
                      <td
                        className="px-3 py-2 font-medium max-w-[200px] truncate"
                        title={p.nama_menu}
                      >
                        {p.nama_menu}
                      </td>
                      <td className="px-3 py-2 text-slate-700 font-medium text-center w-24 truncate">
                        {p.berat_produk ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {p.harga_modal != null
                          ? formatRupiah(p.harga_modal)
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {renderHargaCell(p, "jual", "harga_jual")}
                      </td>
                      <td className="px-3 py-2">
                        {renderHargaCell(p, "100gr", "harga_100gr")}
                      </td>
                      <td className="px-3 py-2">
                        {renderHargaCell(p, "200gr", "harga_200gr")}
                      </td>
                      <td className="px-3 py-2">
                        {renderHargaCell(p, "250gr", "harga_250gr")}
                      </td>
                      <td className="px-3 py-2">
                        {renderHargaCell(p, "500gr", "harga_500gr")}
                      </td>
                      <td className="px-3 py-2">
                        {renderHargaCell(p, "1kg", "harga_1kg")}
                      </td>
                      {isAdminUnlocked && (
                        <td
                          className="px-3 py-2 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-center items-center gap-2">
                            <button
                              type="button"
                              className="text-blue-600 hover:underline font-bold text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                useNavStore.getState().openEditProduk(p.id);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="text-red-600 hover:underline font-bold text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(p);
                              }}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar Detail Panel */}
        {detailTarget && (
          <div className="panel w-96 shrink-0 overflow-auto p-4 border border-slate-100 animate-in slide-in-from-right duration-200 flex flex-col gap-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 select-none">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-black rounded border bg-snack-50 text-snack-700 border-snack-100 uppercase tracking-wider">
                    Detail Barang
                  </span>
                  <h3
                    className="text-base font-extrabold text-slate-800 mt-1 uppercase max-w-[200px] truncate"
                    title={detailTarget.nama_menu}
                  >
                    {detailTarget.nama_menu}
                  </h3>
                </div>
                <button
                  onClick={() => setDetailTarget(null)}
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

              {/* Foto Produk di Detail Sidebar */}
              {detailTarget.gambar && (
                <div className="w-full h-48 bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden flex items-center justify-center select-none">
                  <img
                    src={detailTarget.gambar}
                    alt={detailTarget.nama_menu}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Basic Meta Cards */}
              <div className="grid grid-cols-2 gap-3 select-none">
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Berat Total
                  </span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {detailTarget.berat_produk || "—"}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Modal Bal
                  </span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {detailTarget.harga_modal != null
                      ? formatRupiah(detailTarget.harga_modal)
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Price Details Table for Packaging */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider select-none">
                  Daftar Harga & Laba
                </h4>
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 select-none border-b border-slate-100">
                      <tr>
                        <th className="px-2 py-2">Kemasan</th>
                        <th className="px-2 py-2 text-right">Harga</th>
                        <th className="px-2 py-2 text-right">Laba</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const totalWeight = detailTarget.berat_produk
                          ? parseFloat(
                              detailTarget.berat_produk.replace(/,/g, "."),
                            ) *
                              (detailTarget.berat_produk
                                .toLowerCase()
                                .includes("kg")
                                ? 1000
                                : 1) || 0
                          : 0;
                        const modal = detailTarget.harga_modal || 0;

                        return (
                          [
                            ["harga_jual", "Bal / Grosir", 0],
                            ["harga_100gr", "100gr", 100],
                            ["harga_200gr", "200gr", 200],
                            ["harga_250gr", "250gr", 250],
                            ["harga_500gr", "500gr", 500],
                            ["harga_1kg", "1kg", 1000],
                          ] as [keyof Produk, string, number][]
                        ).map(([field, defaultLabel, defaultWeight]) => {
                          const val = detailTarget[field] as number | null;
                          if (val == null) return null;

                          const labelText = getKemasanLabel(
                            detailTarget,
                            KEY_TO_KEMASAN[field],
                          );
                          const isMain =
                            detailTarget.main_eceran === KEY_TO_KEMASAN[field];

                          // Calculate modal
                          let calculatedModal = modal;
                          const isEceran = field !== "harga_jual";
                          if (isEceran) {
                            let itemWeight = defaultWeight;
                            const match = labelText.match(
                              /^([\d.,]+)\s*(kg|gr|g)?$/i,
                            );
                            if (match) {
                              const num =
                                parseFloat(match[1].replace(/,/g, ".")) || 0;
                              const unit = (match[2] || "gr").toLowerCase();
                              itemWeight = unit === "kg" ? num * 1000 : num;
                            }
                            if (totalWeight > 0) {
                              calculatedModal = Math.round(
                                (itemWeight / totalWeight) * modal,
                              );
                            } else {
                              calculatedModal = 0;
                            }
                          }

                          const profit = val - calculatedModal;
                          const margin =
                            val > 0 ? Math.round((profit / val) * 100) : 0;
                          const isLoss = profit < 0;

                          return (
                            <tr
                              key={field}
                              className="border-t border-slate-100 hover:bg-slate-50/50"
                            >
                              <td className="px-2 py-2 font-bold text-slate-800">
                                <div className="flex flex-col gap-0.5">
                                  <span
                                    className="truncate max-w-[100px]"
                                    title={labelText}
                                  >
                                    {labelText}
                                  </span>
                                  {isMain && (
                                    <span className="text-[8px] font-black text-snack-700 bg-snack-50 border border-snack-100/50 px-1 py-0.2 rounded uppercase w-max select-none">
                                      Utama
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 py-2 text-right font-semibold text-slate-700">
                                {formatRupiah(val)}
                              </td>
                              <td
                                className={`px-2 py-2 text-right font-extrabold ${isLoss ? "text-rose-600 animate-pulse" : "text-emerald-600"}`}
                              >
                                {calculatedModal > 0 ? (
                                  <>
                                    {formatRupiah(profit)}
                                    <span className="text-[9px] font-semibold text-slate-400 block">
                                      (
                                      {margin > 0
                                        ? `+${margin}%`
                                        : `${margin}%`}
                                      )
                                    </span>
                                  </>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          message={`Hapus produk ${deleteTarget.nama_menu}? Transaksi lama tetap tersimpan. (Y/N)`}
          onConfirm={async () => {
            await window.api.produk.delete(deleteTarget.id);
            setDeleteTarget(null);
            load();
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
                Masukkan password admin untuk mengubah data produk.
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

      {/* Modal Dialog Cetak Katalog */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 select-none">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Cetak Katalog PDF
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih produk-produk yang ingin dicantumkan di dalam katalog PDF.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
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

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 flex flex-col h-full min-h-0">
              {/* Products Checklist */}
              <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 select-none">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Daftar Produk ({selectedCatalogIds.length}/
                    {produkList.length})
                  </h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllCatalog}
                      className="text-xs font-bold text-snack-600 hover:underline"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllCatalog}
                      className="text-xs font-bold text-slate-500 hover:underline"
                    >
                      Hapus Pilihan
                    </button>
                  </div>
                </div>

                <div className="mt-3 shrink-0">
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Cari produk di katalog..."
                    className="input-field bg-slate-50 py-1.5 text-sm"
                  />
                </div>

                {/* Product List Container */}
                <div className="flex-1 overflow-auto mt-3 border border-slate-100 rounded-xl bg-slate-50/50 p-2 divide-y divide-slate-100 min-h-[200px]">
                  {filteredCatalogProducts.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-400 font-medium select-none">
                      Produk tidak ditemukan
                    </div>
                  ) : (
                    filteredCatalogProducts.map((p) => {
                      const isChecked = selectedCatalogIds.includes(p.id);
                      const handleToggleProduct = (id: number) => {
                        setSelectedCatalogIds((prev) =>
                          prev.includes(id)
                            ? prev.filter((x) => x !== id)
                            : [...prev, id],
                        );
                      };
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-3 py-2.5 px-3 hover:bg-white rounded-lg cursor-pointer transition select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleProduct(p.id)}
                            className="rounded border-slate-300 text-snack-600 focus:ring-snack-500 w-4 h-4"
                          />
                          {p.gambar ? (
                            <img
                              src={p.gambar}
                              className="w-8 h-8 rounded object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-black">
                              {p.nama_menu.slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 truncate uppercase">
                              {p.nama_menu}
                            </div>
                            {p.berat_produk && (
                              <div className="text-[10px] text-slate-400 font-semibold">
                                Berat: {p.berat_produk}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50 select-none">
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="py-2 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExportCatalogPdf}
                disabled={isExportingPdf || selectedCatalogIds.length === 0}
                className="py-2 px-5 bg-snack-600 hover:bg-snack-700 text-white rounded-xl font-bold shadow text-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isExportingPdf ? (
                  <>
                    <svg
                      className="animate-spin h-3 w-3 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Mengekspor...
                  </>
                ) : (
                  "Unduh Katalog PDF"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
