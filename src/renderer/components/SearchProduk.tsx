import { useEffect, useMemo, useRef, useState } from "react";
import type { Produk, Paket } from "@shared/types";
import { searchProduk } from "@shared/utils";

export interface UnifiedSearchItem {
  id: number;
  type: "produk" | "paket";
  nama: string;
  berat?: string | null;
  original: Produk | Paket;
}

interface SearchProdukProps {
  itemList: UnifiedSearchItem[];
  onSelect: (item: UnifiedSearchItem) => void;
  autoFocus?: boolean;
}

export default function SearchProduk({
  itemList,
  onSelect,
  autoFocus = true,
}: SearchProdukProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchList = useMemo(() => {
    return itemList.map((item, idx) => ({
      id: idx,
      nama_menu: item.nama,
    }));
  }, [itemList]);

  const filteredIndices = useMemo(
    () => searchProduk(query, searchList),
    [query, searchList],
  );

  const filtered = useMemo(
    () =>
      filteredIndices
        .map((idx) => itemList[idx])
        .filter(Boolean) as UnifiedSearchItem[],
    [filteredIndices, itemList],
  );

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (open && dropdownRef.current) {
      const activeEl = dropdownRef.current.children[highlight] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlight, open]);

  const selectItem = (item: UnifiedSearchItem) => {
    setQuery("");
    setOpen(false);
    onSelect(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        if (filtered.length === 1) {
          selectItem(filtered[0]);
        } else if (filtered[highlight]) {
          selectItem(filtered[highlight]);
        }
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Cari Produk / Paket
      </label>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder="Ketik nama produk atau paket..."
        className="input-field text-base"
        autoComplete="off"
      />
      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-500">
              Item tidak ditemukan
            </div>
          ) : (
            filtered.map((item, idx) => {
              const rank =
                itemList.findIndex(
                  (x) => x.type === item.type && x.id === item.id,
                ) + 1;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectItem(item)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                    idx === highlight ? "bg-snack-100" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center min-w-0">
                    <span className="text-xs text-slate-400 w-10 shrink-0">
                      #{rank}
                    </span>
                    <span className="font-medium text-slate-800 truncate">
                      {item.nama}
                    </span>
                    {item.type === "paket" && (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded ml-1.5 shrink-0">
                        PAKET
                      </span>
                    )}
                    {item.berat && (
                      <span className="text-xs text-slate-400 font-mono ml-1.5 shrink-0">
                        {item.berat}
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function focusSearchInput(): void {
  const el = document.querySelector<HTMLInputElement>("[data-search-produk]");
  el?.focus();
}
