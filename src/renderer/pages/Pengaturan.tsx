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

  const [teleponToko, setTeleponToko] = useState("");
  const [instagramToko, setInstagramToko] = useState("");
  const [shopeeToko, setShopeeToko] = useState("");
  const [tokopediaToko, setTokopediaToko] = useState("");
  const [tiktokToko, setTiktokToko] = useState("");
  const [strukShowTelepon, setStrukShowTelepon] = useState("1");
  const [strukShowInstagram, setStrukShowInstagram] = useState("1");
  const [strukShowTiktok, setStrukShowTiktok] = useState("1");
  const [strukShowShopee, setStrukShowShopee] = useState("1");
  const [strukShowTokopedia, setStrukShowTokopedia] = useState("1");
  const [strukCustomFooter, setStrukCustomFooter] = useState("");
  const [strukSocialOrder, setStrukSocialOrder] = useState("telepon,instagram,tiktok,shopee,tokopedia");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const socialOrder = useMemo(() => {
    return strukSocialOrder.split(",");
  }, [strukSocialOrder]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const items = [...socialOrder];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setStrukSocialOrder(items.join(","));
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const [activeTab, setActiveTab] = useState<
    "identitas" | "tampilan" | "printer" | "system"
  >("identitas");

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
          setTeleponToko(config.teleponToko || "");
          setInstagramToko(config.instagramToko || "");
          setShopeeToko(config.shopeeToko || "");
          setTokopediaToko(config.tokopediaToko || "");
          setTiktokToko(config.tiktokToko || "");
          setStrukShowTelepon(
            config.strukShowTelepon !== undefined
              ? config.strukShowTelepon
              : "1",
          );
          setStrukShowInstagram(
            config.strukShowInstagram !== undefined
              ? config.strukShowInstagram
              : "1",
          );
          setStrukShowTiktok(
            config.strukShowTiktok !== undefined ? config.strukShowTiktok : "1",
          );
          setStrukShowShopee(
            config.strukShowShopee !== undefined ? config.strukShowShopee : "1",
          );
          setStrukShowTokopedia(
            config.strukShowTokopedia !== undefined
              ? config.strukShowTokopedia
              : "1",
          );
          setStrukCustomFooter(config.strukCustomFooter || "");
          setStrukSocialOrder(config.strukSocialOrder || "telepon,instagram,tiktok,shopee,tokopedia");
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
        teleponToko,
        instagramToko,
        shopeeToko,
        tokopediaToko,
        tiktokToko,
        strukShowTelepon,
        strukShowInstagram,
        strukShowTiktok,
        strukShowShopee,
        strukShowTokopedia,
        strukCustomFooter,
        strukSocialOrder
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
        teleponToko,
        instagramToko,
        shopeeToko,
        tokopediaToko,
        tiktokToko,
        strukShowTelepon,
        strukShowInstagram,
        strukShowTiktok,
        strukShowShopee,
        strukShowTokopedia,
        strukCustomFooter,
        strukSocialOrder
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
        teleponToko,
        instagramToko,
        shopeeToko,
        tokopediaToko,
        tiktokToko,
        strukShowTelepon,
        strukShowInstagram,
        strukShowTiktok,
        strukShowShopee,
        strukShowTokopedia,
        strukCustomFooter,
        strukSocialOrder
      );
      setSuccessMsg(
        `Printer berhasil diubah ke: ${newPrinter || "Default Komputer"} (Tersimpan otomatis)`,
      );
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan printer");
    }
  };

  const handleSaveStruk = async () => {
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
        teleponToko,
        instagramToko,
        shopeeToko,
        tokopediaToko,
        tiktokToko,
        strukShowTelepon,
        strukShowInstagram,
        strukShowTiktok,
        strukShowShopee,
        strukShowTokopedia,
        strukCustomFooter,
        strukSocialOrder
      );
      setSuccessMsg("Pengaturan struk belanja berhasil disimpan!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Gagal menyimpan pengaturan struk",
      );
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
        setTeleponToko(config.teleponToko || "");
        setInstagramToko(config.instagramToko || "");
        setShopeeToko(config.shopeeToko || "");
        setTokopediaToko(config.tokopediaToko || "");
        setTiktokToko(config.tiktokToko || "");
        setStrukShowTelepon(
          config.strukShowTelepon !== undefined ? config.strukShowTelepon : "1",
        );
        setStrukShowInstagram(
          config.strukShowInstagram !== undefined
            ? config.strukShowInstagram
            : "1",
        );
        setStrukShowTiktok(
          config.strukShowTiktok !== undefined ? config.strukShowTiktok : "1",
        );
        setStrukShowShopee(
          config.strukShowShopee !== undefined ? config.strukShowShopee : "1",
        );
        setStrukShowTokopedia(
          config.strukShowTokopedia !== undefined
            ? config.strukShowTokopedia
            : "1",
        );
        setStrukCustomFooter(config.strukCustomFooter || "");
        setStrukSocialOrder(config.strukSocialOrder || "telepon,instagram,tiktok,shopee,tokopedia");
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
          setTeleponToko(config.teleponToko || "");
          setInstagramToko(config.instagramToko || "");
          setShopeeToko(config.shopeeToko || "");
          setTokopediaToko(config.tokopediaToko || "");
          setTiktokToko(config.tiktokToko || "");
          setStrukShowTelepon(
            config.strukShowTelepon !== undefined
              ? config.strukShowTelepon
              : "1",
          );
          setStrukShowInstagram(
            config.strukShowInstagram !== undefined
              ? config.strukShowInstagram
              : "1",
          );
          setStrukShowTiktok(
            config.strukShowTiktok !== undefined ? config.strukShowTiktok : "1",
          );
          setStrukShowShopee(
            config.strukShowShopee !== undefined ? config.strukShowShopee : "1",
          );
          setStrukShowTokopedia(
            config.strukShowTokopedia !== undefined
              ? config.strukShowTokopedia
              : "1",
          );
          setStrukCustomFooter(config.strukCustomFooter || "");
          setStrukSocialOrder(config.strukSocialOrder || "telepon,instagram,tiktok,shopee,tokopedia");
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
    <div className="h-full overflow-hidden p-4 flex flex-col gap-3">
      {successMsg && (
        <div className="mx-auto max-w-5xl w-full rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800 border border-emerald-200 shadow-sm animate-in fade-in duration-200">
          {successMsg}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 max-w-5xl mx-auto w-full h-[calc(100vh-80px)] overflow-hidden">
        {/* Left Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0 flex flex-row md:flex-col gap-1.5 bg-white border border-slate-200/80 rounded-2xl p-4 h-fit shadow-sm">
          <div className="hidden md:block pb-3 mb-2 border-b border-slate-100 select-none">
            <h2 className="text-lg font-bold text-slate-800">Pengaturan</h2>
            <p className="text-[10px] text-slate-400 font-medium">
              Kelola konfigurasi kasir Anda
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("identitas")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "identitas"
                ? "shadow-sm border"
                : "text-slate-600 hover:bg-slate-50 border border-transparent"
            }`}
            style={
              activeTab === "identitas"
                ? {
                    backgroundColor: `${warnaPrimary}10`,
                    color: warnaPrimary,
                    borderColor: `${warnaPrimary}20`,
                  }
                : {}
            }
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span>Identitas Toko</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tampilan")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "tampilan"
                ? "shadow-sm border"
                : "text-slate-600 hover:bg-slate-50 border border-transparent"
            }`}
            style={
              activeTab === "tampilan"
                ? {
                    backgroundColor: `${warnaPrimary}10`,
                    color: warnaPrimary,
                    borderColor: `${warnaPrimary}20`,
                  }
                : {}
            }
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-3M9.7 8.3l4-4a1.5 1.5 0 012.1 0l2 2a1.5 1.5 0 010 2.1l-4 4a1.5 1.5 0 01-2.1 0l-2-2a1.5 1.5 0 010-2.1z"
              />
            </svg>
            <span>Tampilan & Tema</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("printer")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "printer"
                ? "shadow-sm border"
                : "text-slate-600 hover:bg-slate-50 border border-transparent"
            }`}
            style={
              activeTab === "printer"
                ? {
                    backgroundColor: `${warnaPrimary}10`,
                    color: warnaPrimary,
                    borderColor: `${warnaPrimary}20`,
                  }
                : {}
            }
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            <span>Printer Struk</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("system")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "system"
                ? "shadow-sm border"
                : "text-slate-600 hover:bg-slate-50 border border-transparent"
            }`}
            style={
              activeTab === "system"
                ? {
                    backgroundColor: `${warnaPrimary}10`,
                    color: warnaPrimary,
                    borderColor: `${warnaPrimary}20`,
                  }
                : {}
            }
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4m0 5c0 2.21-3.58 4-8 4s-8-1.79-8-4"
              />
            </svg>
            <span>Sistem & Data</span>
          </button>
        </div>

        {/* Right Content Pane */}
        <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-6 overflow-auto shadow-sm flex flex-col justify-between h-full">
          <div className="space-y-6 text-sm">
            {activeTab === "identitas" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-base font-bold text-slate-800">
                    Identitas &amp; Akses Toko
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Atur data profil toko dan password administrasi kasir
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase">
                      Nama Toko
                    </label>
                    <input
                      type="text"
                      value={namaToko}
                      onChange={(e) => setNamaToko(e.target.value)}
                      className="input-field font-medium text-slate-800"
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
                      className="input-field font-mono text-slate-800"
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
                    className="input-field resize-none w-full text-slate-800"
                    placeholder="Jalan Raya No. 123"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase">
                      No. Telepon / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={teleponToko}
                      onChange={(e) => setTeleponToko(e.target.value)}
                      className="input-field font-medium text-slate-800"
                      placeholder="Contoh: 08123456789"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase">
                      Instagram
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        @
                      </span>
                      <input
                        type="text"
                        value={instagramToko}
                        onChange={(e) =>
                          setInstagramToko(e.target.value.replace(/^@/, ""))
                        }
                        className="input-field font-medium text-slate-800 pl-7"
                        placeholder="toko_snack"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase">
                      Shopee
                    </label>
                    <input
                      type="text"
                      value={shopeeToko}
                      onChange={(e) => setShopeeToko(e.target.value)}
                      className="input-field font-medium text-slate-800"
                      placeholder="Contoh: tokosnack_official"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase">
                      Tokopedia
                    </label>
                    <input
                      type="text"
                      value={tokopediaToko}
                      onChange={(e) => setTokopediaToko(e.target.value)}
                      className="input-field font-medium text-slate-800"
                      placeholder="Contoh: tokosnack-official"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 uppercase">
                      Tiktok
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        @
                      </span>
                      <input
                        type="text"
                        value={tiktokToko}
                        onChange={(e) =>
                          setTiktokToko(e.target.value.replace(/^@/, ""))
                        }
                        className="input-field font-medium text-slate-800 pl-7"
                        placeholder="tokosnack.official"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveIdentity}
                    className="btn-primary text-xs w-full sm:w-auto"
                    style={{ backgroundColor: warnaPrimary }}
                  >
                    Simpan Identitas &amp; Password
                  </button>
                </div>
              </div>
            )}

            {activeTab === "tampilan" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-base font-bold text-slate-800">
                    Warna Tema Utama POS
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Ubah skema warna primer aplikasi kasir Anda
                  </p>
                </div>

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
                      Sesuaikan Warna
                    </span>

                    <div className="flex items-center gap-2">
                      <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-slate-300/80 shadow-sm cursor-pointer hover:border-slate-400 transition bg-white flex items-center justify-center">
                        <input
                          type="color"
                          value={warnaPrimary}
                          onChange={(e) => setWarnaPrimary(e.target.value)}
                          className="absolute inset-0 w-full h-full p-0 m-0 border-none cursor-pointer scale-150"
                          title="Buka Palet Sistem"
                        />
                      </div>
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

                  <div
                    className="relative w-full h-32 rounded-xl overflow-hidden cursor-crosshair select-none border border-slate-200 shadow-inner"
                    style={{
                      background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
                    }}
                    onMouseDown={handleHsvBoxMouseDown}
                  >
                    <div
                      className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${hsv.s}%`,
                        top: `${100 - hsv.v}%`,
                        backgroundColor: warnaPrimary,
                      }}
                    />
                  </div>

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
                      <div
                        className="absolute w-4.5 h-4.5 rounded-full border-2 border-white shadow-lg bg-white top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-105 transition"
                        style={{
                          left: `${(hsv.h / 360) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveColor}
                    className="btn-primary text-xs w-full sm:w-auto"
                    style={{ backgroundColor: warnaPrimary }}
                  >
                    Simpan Warna Tema
                  </button>
                </div>
              </div>
            )}

            {activeTab === "printer" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-200 h-full">
                {/* Left Column: Form Settings */}
                <div className="lg:col-span-7 space-y-4 flex flex-col justify-between h-full">
                  <div className="space-y-4 flex-1 overflow-auto pr-1">
                    <div className="border-b border-slate-100 pb-2">
                      <h3 className="text-base font-bold text-slate-800">
                        Printer &amp; Desain Struk Belanja
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        Pilih printer dan kustomisasi cetakan struk kasir Anda
                      </p>
                    </div>

                    {/* Printer Settings */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 uppercase">
                        Perangkat Printer
                      </label>
                      <div className="relative">
                        <select
                          value={selectedPrinter}
                          onChange={(e) => handleSavePrinter(e.target.value)}
                          className="input-field w-full cursor-pointer bg-white appearance-none pr-10"
                        >
                          <option value="">
                            Default Komputer (Gunakan Printer Sistem Utama)
                          </option>
                          {printerList.map((p) => (
                            <option key={p.name} value={p.name}>
                              {p.displayName || p.name}{" "}
                              {p.isDefault ? "(Default OS)" : ""}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        Pilih printer thermal yang akan digunakan untuk mencetak
                        struk belanja. Pengaturan printer akan otomatis disimpan
                        setiap kali Anda memilih opsi baru.
                      </p>
                    </div>

                    <div className="border-t border-slate-100 my-2"></div>

                    {/* Choose Contacts */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Tampilkan Kontak di Struk (Tahan &amp; Seret untuk Atur Urutan)
                      </label>
                      <div className="space-y-1 bg-slate-50 border border-slate-200/50 rounded-xl p-2 select-none">
                        {socialOrder.map((key, index) => {
                          let label = "";
                          let valSub = "";
                          let checked = false;
                          let onChangeChecked = (val: boolean) => {};

                          if (key === "telepon") {
                            label = "WhatsApp / Telepon";
                            valSub = teleponToko || "(Belum diatur)";
                            checked = strukShowTelepon === "1";
                            onChangeChecked = (val) => setStrukShowTelepon(val ? "1" : "0");
                          } else if (key === "instagram") {
                            label = "Instagram";
                            valSub = instagramToko ? `@${instagramToko}` : "(Belum diatur)";
                            checked = strukShowInstagram === "1";
                            onChangeChecked = (val) => setStrukShowInstagram(val ? "1" : "0");
                          } else if (key === "tiktok") {
                            label = "Tiktok";
                            valSub = tiktokToko ? `@${tiktokToko}` : "(Belum diatur)";
                            checked = strukShowTiktok === "1";
                            onChangeChecked = (val) => setStrukShowTiktok(val ? "1" : "0");
                          } else if (key === "shopee") {
                            label = "Shopee";
                            valSub = shopeeToko || "(Belum diatur)";
                            checked = strukShowShopee === "1";
                            onChangeChecked = (val) => setStrukShowShopee(val ? "1" : "0");
                          } else if (key === "tokopedia") {
                            label = "Tokopedia";
                            valSub = tokopediaToko || "(Belum diatur)";
                            checked = strukShowTokopedia === "1";
                            onChangeChecked = (val) => setStrukShowTokopedia(val ? "1" : "0");
                          }

                          return (
                            <div
                              key={key}
                              draggable
                              onDragStart={(e) => handleDragStart(e, index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDragEnd={handleDragEnd}
                              className={`flex items-center justify-between p-2 rounded-lg border border-transparent hover:bg-white hover:border-slate-200/60 transition-all duration-150 cursor-grab ${
                                draggedIndex === index ? "opacity-40 bg-slate-100 border-dashed border-slate-300" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {/* Drag Handle Icon */}
                                <div className="text-slate-400 cursor-grab shrink-0">
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8.5 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7-15a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                                  </svg>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-700">{label}</span>
                                  <span className="text-[9px] text-slate-400 font-medium">{valSub}</span>
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => onChangeChecked(e.target.checked)}
                                className="rounded border-slate-300 text-snack-600 focus:ring-snack-500 w-4 h-4 cursor-pointer"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 my-2"></div>

                    {/* Custom Footer Text Area */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600 uppercase">
                        Pesan Kaki Struk (Custom Footer)
                      </label>
                      <textarea
                        rows={2}
                        value={strukCustomFooter}
                        onChange={(e) => setStrukCustomFooter(e.target.value)}
                        className="input-field resize-none w-full text-slate-800 text-xs py-1.5"
                        placeholder="Contoh: Terima kasih sudah berbelanja!"
                      />
                      <p className="text-[9px] text-slate-400 font-medium leading-normal">
                        Pesan khusus yang dicetak di baris paling bawah struk.
                        Tekan Enter untuk menulis di baris baru.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveStruk}
                      className="btn-primary text-xs w-full sm:w-auto"
                      style={{ backgroundColor: warnaPrimary }}
                    >
                      Simpan Pengaturan Struk
                    </button>
                  </div>
                </div>

                {/* Right Column: Live Preview */}
                <div className="lg:col-span-5 flex flex-col h-full select-none">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Pratinjau Struk (Live Preview):
                  </span>
                  <div className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl p-4 flex justify-center items-start overflow-auto">
                    {/* Monospace receipt body */}
                    <div className="bg-white w-56 shadow-md rounded-lg p-3 border border-slate-200 font-mono text-[10px] font-bold text-slate-900 leading-normal space-y-1 shrink-0">
                      <div className="text-center font-bold uppercase">
                        {namaToko || "TOKO SNACK"}
                      </div>
                      <div className="text-center text-[7px] text-slate-500 break-all leading-tight">
                        {alamatToko || "(Alamat Toko)"}
                      </div>
                      <div className="my-1.5 border-t border-dashed border-slate-300"></div>

                      <div className="flex justify-between text-[7px] text-slate-400 font-semibold">
                        <span>TRX-20260626001</span>
                        <span>26/06/2026 15:45</span>
                      </div>

                      <div className="my-1 border-t border-dashed border-slate-300"></div>

                      {/* Items */}
                      <div>
                        <div>Ciki Ring (Keju)</div>
                        <div className="flex justify-between pl-2">
                          <span>2 x Rp 15.000</span>
                          <span>Rp 30.000</span>
                        </div>
                      </div>

                      <div className="my-1 border-t border-dashed border-slate-300"></div>

                      {/* Totals */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between">
                          <span>TOTAL</span>
                          <span>Rp 30.000</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>TOTAL BAYAR</span>
                          <span>Rp 30.000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>BAYAR</span>
                          <span>Rp 50.000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>KEMBALI</span>
                          <span>Rp 20.000</span>
                        </div>
                      </div>

                      {(strukShowTelepon === "1" && teleponToko) ||
                      (strukShowInstagram === "1" && instagramToko) ||
                      (strukShowTiktok === "1" && tiktokToko) ||
                      (strukShowShopee === "1" && shopeeToko) ||
                      (strukShowTokopedia === "1" && tokopediaToko) ? (
                        <>
                          <div className="my-1.5 border-t border-dashed border-slate-300"></div>
                          <div className="space-y-0.5 text-left text-[9px]">
                            {socialOrder.map((key) => {
                              if (key === "telepon" && strukShowTelepon === "1" && teleponToko) {
                                return <div key={key}>Whatsapp: {teleponToko}</div>;
                              }
                              if (key === "instagram" && strukShowInstagram === "1" && instagramToko) {
                                return <div key={key}>Instagram: @{instagramToko}</div>;
                              }
                              if (key === "tiktok" && strukShowTiktok === "1" && tiktokToko) {
                                return <div key={key}>Tiktok: @{tiktokToko}</div>;
                              }
                              if (key === "shopee" && strukShowShopee === "1" && shopeeToko) {
                                return <div key={key}>Shopee: {shopeeToko}</div>;
                              }
                              if (key === "tokopedia" && strukShowTokopedia === "1" && tokopediaToko) {
                                return <div key={key}>Tokopedia: {tokopediaToko}</div>;
                              }
                              return null;
                            })}
                          </div>
                        </>
                      ) : null}

                      <div className="my-1.5 border-t border-dashed border-slate-300"></div>

                      {/* Footer Message */}
                      <div className="text-center text-slate-600 whitespace-pre-wrap leading-tight text-[9px]">
                        {strukCustomFooter || "Terima kasih sudah berbelanja!"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "system" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* Backup Section */}
                <div className="space-y-2 pb-4 border-b border-slate-100">
                  <div className="border-b border-slate-100 pb-2 mb-2">
                    <h3 className="text-base font-bold text-slate-800">
                      Backup &amp; Lokasi Penyimpanan
                    </h3>
                  </div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase">
                    Folder Backup Otomatis
                  </label>
                  <p className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 font-mono text-xs break-all text-slate-600">
                    {backupPath}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
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
                <div className="space-y-3 pb-4 border-b border-slate-100">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">
                    Ekspor &amp; Impor Data Global
                  </label>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ekspor seluruh data produk, riwayat transaksi, dan
                    pengaturan toko Anda menjadi file cadangan `.json`. Anda
                    juga dapat mengimpor file tersebut kembali untuk memulihkan
                    data.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="btn-primary text-xs"
                      style={{ backgroundColor: warnaPrimary }}
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
                <div className="pt-2 space-y-3">
                  <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider">
                    Zona Bahaya (Danger Zone)
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tindakan ini akan menghapus secara permanen seluruh data
                    transaksi penjualan beserta daftar produk dari database
                    lokal Anda. Data yang sudah dihapus tidak dapat dipulihkan
                    kembali.
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
            )}
          </div>

          <p className="text-center text-[10px] text-slate-300 mt-12 pb-1 select-none border-t border-slate-50 pt-3">
            © 2026 Kasir · by Rifki Gunawan
          </p>
        </div>
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
