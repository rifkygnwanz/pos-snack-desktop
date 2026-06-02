CREATE TABLE IF NOT EXISTS produk (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_menu TEXT NOT NULL,
  harga_modal INTEGER,
  harga_jual INTEGER,
  harga_100gr INTEGER,
  harga_200gr INTEGER,
  harga_250gr INTEGER,
  harga_500gr INTEGER,
  harga_1kg INTEGER,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS transaksi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nomor_trx TEXT NOT NULL UNIQUE,
  tanggal DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
  total INTEGER NOT NULL,
  diskon INTEGER NOT NULL DEFAULT 0,
  total_bayar INTEGER NOT NULL,
  bayar INTEGER NOT NULL,
  kembali INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS detail_transaksi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaksi_id INTEGER NOT NULL,
  produk_id INTEGER NOT NULL,
  nama_snapshot TEXT NOT NULL,
  kemasan TEXT NOT NULL,
  harga_satuan INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  diskon_item INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL,
  FOREIGN KEY (transaksi_id) REFERENCES transaksi(id),
  FOREIGN KEY (produk_id) REFERENCES produk(id)
);

CREATE INDEX IF NOT EXISTS idx_produk_nama ON produk(nama_menu);
CREATE INDEX IF NOT EXISTS idx_produk_deleted ON produk(deleted);
CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi(tanggal);
CREATE INDEX IF NOT EXISTS idx_transaksi_nomor ON transaksi(nomor_trx);
