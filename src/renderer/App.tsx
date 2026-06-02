import { useEffect } from "react";
import KasirPage from "./pages/Kasir";
import PaketPage from "./pages/Paket";
import PengaturanPage from "./pages/Pengaturan";
import ProdukPage from "./pages/Produk";
import RiwayatPage from "./pages/Riwayat";
import LaporanPage from "./pages/Laporan";
import { useNavStore, type Page } from "./store/navStore";

const NAV: { id: Page; label: string; shortcut?: string }[] = [
  { id: "kasir", label: "Kasir", shortcut: "Home" },
  { id: "produk", label: "Produk", shortcut: "F2" },
  { id: "paket", label: "Paket", shortcut: "F3" },
  { id: "riwayat", label: "Riwayat", shortcut: "F4" },
  { id: "laporan", label: "Laporan", shortcut: "F5" },
  { id: "pengaturan", label: "Pengaturan" },
];

export default function App() {
  const { page, setPage, storeName, loadStoreConfig } = useNavStore();

  useEffect(() => {
    loadStoreConfig();
  }, [loadStoreConfig]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-snack-700 bg-snack-600 px-4 py-3 text-white shadow">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/20 px-3 py-1 text-lg font-black tracking-tight uppercase">
            {storeName}
          </div>
          <div className="text-sm text-snack-100 font-semibold leading-none">
            Kasir v1.0
          </div>
        </div>
        <nav className="flex gap-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                page === item.id
                  ? "bg-white text-snack-700"
                  : "text-white/90 hover:bg-white/15"
              }`}
            >
              {item.label}
              {item.shortcut && (
                <span className="ml-1 text-xs opacity-70">
                  ({item.shortcut})
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">
        {page === "kasir" && <KasirPage />}
        {page === "produk" && <ProdukPage />}
        {page === "paket" && <PaketPage />}
        {page === "riwayat" && <RiwayatPage />}
        {page === "laporan" && <LaporanPage />}
        {page === "pengaturan" && <PengaturanPage />}
      </main>
    </div>
  );
}
