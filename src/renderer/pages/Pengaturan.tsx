import { useEffect, useState, useMemo } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { useNavStore } from "../store/navStore";

// Helper to convert hex to HSV (Hue: 0-360, Saturation: 0-100, Value/Brightness: 0-100)
function hexToHsv(hex: string) {
  let r = 0,
    g = 0,
    b = 0;
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.slice(0, 2), 16);
    g = parseInt(cleanHex.slice(2, 4), 16);
    b = parseInt(cleanHex.slice(4, 6), 16);
  }

  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((d / max) * 100);
  const v = Math.round(max * 100);

  return { h, s, v };
}

// Helper to convert HSV to hex
function hsvToHex(h: number, s: number, v: number): string {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0,
    g = 0,
    b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h <= 360) {
    r = c;
    g = 0;
    b = x;
  }

  const rHex = Math.round((r + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const gHex = Math.round((g + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const bHex = Math.round((b + m) * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

export default function PengaturanPage() {
  const [backupPath, setBackupPath] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showConfirm2, setShowConfirm2] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [namaToko, setNamaToko] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [alamatToko, setAlamatToko] = useState("");
  const [warnaPrimary, setWarnaPrimary] = useState("#ea580c");
  const [printerList, setPrinterList] = useState<
    Array<{ name: string; displayName: string; isDefault: boolean }>
  >([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");

  // Password gate
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [typedPassword, setTypedPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // HSV State memoization for interactive Figma-style color picker
  const hsv = useMemo(() => {
    return hexToHsv(warnaPrimary);
  }, [warnaPrimary]);

  const handleHsvBoxUpdate = (
    clientX: number,
    clientY: number,
    rect: DOMRect,
  ) => {
    let s = ((clientX - rect.left) / rect.width) * 100;
    let v = (1 - (clientY - rect.top) / rect.height) * 100;

    s = Math.max(0, Math.min(100, Math.round(s)));
    v = Math.max(0, Math.min(100, Math.round(v)));

    const newHex = hsvToHex(hsv.h, s, v);
    setWarnaPrimary(newHex);
  };

  const handleHsvBoxMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    handleHsvBoxUpdate(e.clientX, e.clientY, rect);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleHsvBoxUpdate(moveEvent.clientX, moveEvent.clientY, rect);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleHueUpdate = (clientX: number, rect: DOMRect) => {
    let pct = (clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    const h = Math.round(pct * 360);

    const newHex = hsvToHex(h, hsv.s, hsv.v);
    setWarnaPrimary(newHex);
  };

  const handleHueMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    handleHueUpdate(e.clientX, rect);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleHueUpdate(moveEvent.clientX, rect);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    if (isAuthenticated) {
      window.api.settings.get().then((s) => setBackupPath(s.backupPath));
      window.api.settings.getStoreConfig().then((config) => {
        if (config) {
          setNamaToko(config.namaToko);
          setAdminPassword(config.adminPassword || "");
          setAlamatToko(config.alamatToko || "");
          setWarnaPrimary(config.warnaPrimary || "#ea580c");
          setSelectedPrinter(config.selectedPrinter || "");
        }
      });
      window.api.settings.getPrinters().then((printers) => {
        setPrinterList(printers || []);
      });
    }
  }, [isAuthenticated]);

  const handlePasswordVerify = async () => {
    try {
      const config = await window.api.settings.getStoreConfig();
      const correctPassword = config?.adminPassword || "admin";
      if (typedPassword === correctPassword) {
        setIsAuthenticated(true);
        setPasswordError(null);
      } else {
        setPasswordError("Password admin salah!");
      }
    } catch {
      setPasswordError("Gagal memverifikasi password");
    }
  };
  const handleSaveIdentity = async () => {
    if (!namaToko.trim()) {
      alert("Nama toko tidak boleh kosong!");
      return;
    }
    try {
      await window.api.settings.updateStoreConfig(
        namaToko,
        adminPassword || undefined,
        alamatToko,
        warnaPrimary,
        selectedPrinter,
      );
      useNavStore.getState().setStoreConfig({
        storeName: namaToko.trim().toUpperCase(),
        alamatToko: alamatToko.trim(),
        warnaPrimary: warnaPrimary,
      });
      setSuccessMsg("Identitas & password toko berhasil disimpan!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan identitas");
    }
  };

  const handleSaveColor = async () => {
    if (!namaToko.trim()) {
      alert("Nama toko tidak boleh kosong!");
      return;
    }
    try {
      await window.api.settings.updateStoreConfig(
        namaToko,
        adminPassword || undefined,
        alamatToko,
        warnaPrimary,
        selectedPrinter,
      );
      useNavStore.getState().setStoreConfig({
        storeName: namaToko.trim().toUpperCase(),
        alamatToko: alamatToko.trim(),
        warnaPrimary: warnaPrimary,
      });
      setSuccessMsg("Warna tema POS berhasil disimpan!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan warna tema");
    }
  };

  const handleSavePrinter = async (newPrinter: string) => {
    setSelectedPrinter(newPrinter);
    if (!namaToko.trim()) return;
    try {
      await window.api.settings.updateStoreConfig(
        namaToko,
        adminPassword || undefined,
        alamatToko,
        warnaPrimary,
        newPrinter,
      );
      setSuccessMsg(
        `Printer berhasil diubah ke: ${newPrinter || "Default Komputer"} (Tersimpan otomatis)`,
      );
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan printer");
    }
  };

  const handleClearDatabase = async () => {
    try {
      await window.api.settings.clearDatabase();
      await useNavStore.getState().loadStoreConfig();
      const config = await window.api.settings.getStoreConfig();
      if (config) {
        setNamaToko(config.namaToko);
        setAdminPassword(config.adminPassword || "");
        setAlamatToko(config.alamatToko || "");
        setWarnaPrimary(config.warnaPrimary || "#ea580c");
        setSelectedPrinter(config.selectedPrinter || "");
      }
      setSuccessMsg("Semua data produk dan transaksi berhasil dihapus!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus data");
    }
  };

  const handleExportData = async () => {
    try {
      const success = await window.api.settings.exportData();
      if (success) {
        setSuccessMsg("Seluruh data berhasil diekspor!");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengekspor data");
    }
  };

  const handleImportData = async () => {
    try {
      const success = await window.api.settings.importData();
      if (success) {
        await useNavStore.getState().loadStoreConfig();
        const config = await window.api.settings.getStoreConfig();
        if (config) {
          setNamaToko(config.namaToko);
          setAdminPassword(config.adminPassword || "");
          setAlamatToko(config.alamatToko || "");
          setWarnaPrimary(config.warnaPrimary || "#ea580c");
          setSelectedPrinter(config.selectedPrinter || "");
        }
        setSuccessMsg("Seluruh data berhasil diimpor!");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengimpor data");
    }
  };

  // Password gate — shown until authenticated
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100 space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              Akses Pengaturan
            </h3>
            <p className="text-xs text-slate-500">
              Masukkan password admin untuk membuka pengaturan.
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
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePasswordVerify();
                if (e.key === "Escape") useNavStore.getState().setPage("kasir");
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePasswordVerify}
              className="flex-1 py-2.5 px-4 bg-snack-600 hover:bg-snack-700 text-white rounded-xl font-bold shadow text-sm transition"
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => useNavStore.getState().setPage("kasir")}
              className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm transition"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-3">
      {successMsg && (
        <div className="mx-auto max-w-xl w-full rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800 border border-emerald-200 shadow-sm animate-in fade-in duration-200">
          {successMsg}
        </div>
      )}

      <div className="panel mx-auto max-w-xl p-6 w-full">
        <h2 className="mb-4 text-xl font-bold text-slate-800">Pengaturan</h2>
        <div className="space-y-6 text-sm">
          {/* Section 3: Printer Struk Kasir */}
          <div className="space-y-4 border-b border-slate-100 pb-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Printer Struk Kasir
            </h3>
            <div className="space-y-1.5">
              <div className="relative">
                <select
                  value={selectedPrinter}
                  onChange={(e) => handleSavePrinter(e.target.value)}
                  className="input-field w-full cursor-pointer bg-white appearance-none pr-10"
                >
                  <option value="">
                    Default Komputer (Gunakan printer default sistem)
                  </option>
                  {printerList.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.displayName || p.name}{" "}
                      {p.isDefault ? "(Default OS)" : ""}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Pilih printer thermal yang akan digunakan untuk mencetak struk
                belanja. Pengaturan printer akan otomatis disimpan setiap kali
                Anda memilih opsi baru.
              </p>
            </div>
          </div>

          {/* Section 1: Identitas & Akses Toko */}
          <div className="space-y-4 border-b border-slate-100 pb-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Identitas &amp; Akses Toko
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase">
                  Nama Toko
                </label>
                <input
                  type="text"
                  value={namaToko}
                  onChange={(e) => setNamaToko(e.target.value)}
                  className="input-field font-medium"
                  placeholder="Nama Toko Anda"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase">
                  Password Admin (Kunci Gembok)
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="input-field font-mono"
                  placeholder="Ketik password baru..."
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase">
                Alamat Toko (Tampil di Struk)
              </label>
              <textarea
                value={alamatToko}
                onChange={(e) => setAlamatToko(e.target.value)}
                rows={3}
                className="input-field resize-none w-full"
                placeholder="Jalan Raya No. 123"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveIdentity}
              className="btn-primary text-xs w-full sm:w-auto"
            >
              Simpan Identitas &amp; Password
            </button>
          </div>

          {/* Section 2: Warna Tema Utama POS */}
          <div className="space-y-4 border-b border-slate-100 pb-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Warna Tema Utama POS
            </h3>

            {/* Presets / Pilihan Cepat */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200/50 rounded-xl p-3 select-none">
              <span className="text-xs font-bold text-slate-500 uppercase">
                Pilihan Cepat:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { hex: "#ea580c", label: "Orange" },
                  { hex: "#3b82f6", label: "Blue" },
                  { hex: "#10b981", label: "Emerald" },
                  { hex: "#8b5cf6", label: "Purple" },
                  { hex: "#ec4899", label: "Pink" },
                  { hex: "#0ea5e9", label: "Cyan" },
                ].map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setWarnaPrimary(preset.hex)}
                    className={`w-6 h-6 rounded-full border transition-all ${
                      warnaPrimary === preset.hex
                        ? "border-slate-800 scale-110 shadow"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>

            {/* Figma-Style Interactive Canvas Color Board */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 space-y-4 w-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider select-none">
                  Sesuaikan Warna (Figma-Style)
                </span>

                <div className="flex items-center gap-2">
                  {/* Native fallback color picker input */}
                  <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-slate-300/80 shadow-sm cursor-pointer hover:border-slate-400 transition bg-white flex items-center justify-center">
                    <input
                      type="color"
                      value={warnaPrimary}
                      onChange={(e) => setWarnaPrimary(e.target.value)}
                      className="absolute inset-0 w-full h-full p-0 m-0 border-none cursor-pointer scale-150"
                      title="Buka Palet Sistem"
                    />
                  </div>
                  {/* Hex input block */}
                  <input
                    type="text"
                    value={warnaPrimary.toUpperCase()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (
                        val.startsWith("#") &&
                        (val.length === 4 || val.length === 7)
                      ) {
                        setWarnaPrimary(val);
                      } else if (
                        !val.startsWith("#") &&
                        (val.length === 3 || val.length === 6)
                      ) {
                        setWarnaPrimary(`#${val}`);
                      } else {
                        setWarnaPrimary(val);
                      }
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 w-20 text-center focus:outline-none focus:border-snack-500 uppercase"
                  />
                </div>
              </div>

              {/* 2D Brightness/Saturation Canvas Box */}
              <div
                className="relative w-full h-32 rounded-xl overflow-hidden cursor-crosshair select-none border border-slate-200 shadow-inner"
                style={{
                  background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
                }}
                onMouseDown={handleHsvBoxMouseDown}
              >
                {/* Pointer Pin ring */}
                <div
                  className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${hsv.s}%`,
                    top: `${100 - hsv.v}%`,
                    backgroundColor: warnaPrimary,
                  }}
                />
              </div>

              {/* Hue Slider bar with full HSL spectrum */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center select-none text-[10px] font-bold">
                  <span className="text-slate-400 uppercase">
                    Hue (Corak Warna)
                  </span>
                  <span className="text-slate-500 font-mono">{hsv.h}°</span>
                </div>
                <div
                  className="relative w-full h-3 rounded-full cursor-pointer select-none border border-slate-200/60 shadow-sm"
                  style={{
                    background:
                      "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
                  }}
                  onMouseDown={handleHueMouseDown}
                >
                  {/* Slider pointer pin */}
                  <div
                    className="absolute w-4.5 h-4.5 rounded-full border-2 border-white shadow-lg bg-white top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-105 transition"
                    style={{
                      left: `${(hsv.h / 360) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveColor}
              className="btn-primary text-xs w-full sm:w-auto"
            >
              Simpan Warna Tema
            </button>
          </div>

          {/* Backup Section */}
          <div className="space-y-2 pb-6 border-b border-slate-100">
            <label className="block font-semibold text-slate-700">
              Folder Backup Otomatis
            </label>
            <p className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 font-mono text-xs break-all text-slate-600">
              {backupPath}
            </p>
            <p className="text-xs text-slate-500">
              Backup otomatis dicadangkan setiap kali transaksi disimpan
              (maksimum 30 file cadangan).
            </p>
            <button
              type="button"
              onClick={() => window.api.settings.openBackupFolder()}
              className="btn-secondary text-xs"
            >
              Buka Folder Backup
            </button>
          </div>

          {/* Export / Import Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Ekspor &amp; Impor Data Global
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ekspor seluruh data produk, riwayat transaksi, dan pengaturan toko
              Anda menjadi file cadangan `.json`. Anda juga dapat mengimpor file
              tersebut kembali untuk memulihkan data.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportData}
                className="btn-primary text-xs"
              >
                Ekspor Data (Backup)
              </button>
              <button
                type="button"
                onClick={() => setShowImportConfirm(true)}
                className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs transition"
              >
                Impor Data (Restore)
              </button>
            </div>
          </div>

          {/* Destructive Action Section */}
          <div className="border-t border-red-100 pt-6 space-y-3">
            <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider">
              Zona Bahaya (Danger Zone)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tindakan ini akan menghapus secara permanen seluruh data transaksi
              penjualan beserta daftar produk dari database lokal Anda. Data
              yang sudah dihapus tidak dapat dipulihkan kembali.
            </p>
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs shadow transition-all"
            >
              Hapus Semua Data &amp; Mulai Ulang
            </button>
          </div>
        </div>

        {/* Footer credit */}
        <p className="text-center text-[10px] text-slate-300 mt-12 pb-1 select-none">
          © 2026 Kasir · by Rifki Gunawan
        </p>
      </div>

      {showConfirm && (
        <ConfirmDialog
          message="Apakah Anda YAKIN ingin menghapus SEMUA data produk dan riwayat transaksi? Tindakan ini permanen. (Y/N)"
          onConfirm={() => {
            setShowConfirm(false);
            setShowConfirm2(true);
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {showImportConfirm && (
        <ConfirmDialog
          message="PERINGATAN: Mengimpor data baru akan MENGHAPUS seluruh produk, riwayat transaksi, dan pengaturan saat ini. Apakah Anda yakin ingin melanjutkan? (Y/N)"
          onConfirm={() => {
            setShowImportConfirm(false);
            handleImportData();
          }}
          onCancel={() => setShowImportConfirm(false)}
        />
      )}

      {showConfirm2 && (
        <ConfirmDialog
          message="KONFIRMASI TERAKHIR: Anda benar-benar yakin? Semua database produk dan transaksi akan dikosongkan. (Y/N)"
          onConfirm={() => {
            setShowConfirm2(false);
            handleClearDatabase();
          }}
          onCancel={() => setShowConfirm2(false)}
        />
      )}
    </div>
  );
}
