import Database from 'better-sqlite3'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

const SCHEMA = `
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
  berat_produk TEXT,
  main_eceran TEXT,
  label_kemasan TEXT,
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

CREATE TABLE IF NOT EXISTS paket (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_paket TEXT NOT NULL,
  harga_modal INTEGER NOT NULL,
  harga_jual INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS detail_transaksi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaksi_id INTEGER NOT NULL,
  produk_id INTEGER,
  paket_id INTEGER,
  nama_snapshot TEXT NOT NULL,
  kemasan TEXT NOT NULL,
  harga_satuan INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  diskon_item INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL,
  FOREIGN KEY (transaksi_id) REFERENCES transaksi(id),
  FOREIGN KEY (produk_id) REFERENCES produk(id),
  FOREIGN KEY (paket_id) REFERENCES paket(id)
);

CREATE TABLE IF NOT EXISTS pengaturan (
  kunci TEXT PRIMARY KEY,
  nilai TEXT
);

CREATE INDEX IF NOT EXISTS idx_produk_nama ON produk(nama_menu);
CREATE INDEX IF NOT EXISTS idx_produk_deleted ON produk(deleted);
CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi(tanggal);
CREATE INDEX IF NOT EXISTS idx_transaksi_nomor ON transaksi(nomor_trx);
`

let db: Database.Database | null = null

export function getDbPath(): string {
  const userData = app.getPath('userData')
  return path.join(userData, 'pos_desktop.db')
}

export function getBackupDir(): string {
  return path.join(app.getPath('userData'), 'backup')
}

export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = getDbPath()
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)

  // Seed default settings if empty
  try {
    const countSettings = db.prepare("SELECT COUNT(*) as c FROM pengaturan").get() as { c: number } | undefined
    if (!countSettings || countSettings.c === 0) {
      db.prepare("INSERT OR IGNORE INTO pengaturan (kunci, nilai) VALUES ('nama_toko', 'TOKO SNACK')").run()
      db.prepare("INSERT OR IGNORE INTO pengaturan (kunci, nilai) VALUES ('admin_password', 'admin')").run()
      db.prepare("INSERT OR IGNORE INTO pengaturan (kunci, nilai) VALUES ('alamat_toko', '')").run()
    }
    // Seed warna_primary unconditionally if missing
    db.prepare("INSERT OR IGNORE INTO pengaturan (kunci, nilai) VALUES ('warna_primary', '#ea580c')").run()
  } catch (err) {
    // Safe to ignore
  }

  // Migration: Add berat_produk column if it doesn't exist
  try {
    db.exec(`ALTER TABLE produk ADD COLUMN berat_produk TEXT`)
  } catch (err) {
    // Column already exists, safe to ignore
  }

  // Migration: Add main_eceran column if it doesn't exist
  try {
    db.exec(`ALTER TABLE produk ADD COLUMN main_eceran TEXT`)
  } catch (err) {
    // Column already exists, safe to ignore
  }

  // Migration: Add label_kemasan column if it doesn't exist
  try {
    db.exec(`ALTER TABLE produk ADD COLUMN label_kemasan TEXT`)
  } catch (err) {
    // Column already exists, safe to ignore
  }

  // Migration: Rename harga_100_110gr to harga_100gr if it exists
  try {
    db.exec(`ALTER TABLE produk RENAME COLUMN harga_100_110gr TO harga_100gr`)
  } catch (err) {
    // Column already renamed or table doesn't exist yet/fresh install
  }

  // Migration: Rename harga_beli to harga_modal if it exists
  try {
    db.exec(`ALTER TABLE produk RENAME COLUMN harga_beli TO harga_modal`)
  } catch (err) {
    // Column already renamed or table doesn't exist yet/fresh install
  }

  // Migration: Rename harga_jual_bal to harga_jual if it exists
  try {
    db.exec(`ALTER TABLE produk RENAME COLUMN harga_jual_bal TO harga_jual`)
  } catch (err) {
    // Column already renamed or table doesn't exist yet/fresh install
  }

  // Migration: Update main_eceran 'bal' to 'jual'
  try {
    db.prepare("UPDATE produk SET main_eceran = 'jual' WHERE main_eceran = 'bal'").run()
  } catch (err) {
    // safe to ignore
  }

  // Migration: Create table paket if not exists
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS paket (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_paket TEXT NOT NULL,
        harga_modal INTEGER NOT NULL,
        harga_jual INTEGER NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
    `)
  } catch (err) {
    // safe to ignore
  }

  // Migration: Make detail_transaksi.produk_id nullable and add paket_id
  try {
    const info = db.prepare("PRAGMA table_info(detail_transaksi)").all() as { name: string }[]
    const hasPaketId = info.some(c => c.name === 'paket_id')
    if (!hasPaketId) {
      db.exec(`
        PRAGMA foreign_keys=OFF;
        CREATE TABLE detail_transaksi_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaksi_id INTEGER NOT NULL,
          produk_id INTEGER,
          paket_id INTEGER,
          nama_snapshot TEXT NOT NULL,
          kemasan TEXT NOT NULL,
          harga_satuan INTEGER NOT NULL,
          qty INTEGER NOT NULL,
          diskon_item INTEGER NOT NULL DEFAULT 0,
          subtotal INTEGER NOT NULL,
          FOREIGN KEY (transaksi_id) REFERENCES transaksi(id),
          FOREIGN KEY (produk_id) REFERENCES produk(id),
          FOREIGN KEY (paket_id) REFERENCES paket(id)
        );
        INSERT INTO detail_transaksi_new (id, transaksi_id, produk_id, nama_snapshot, kemasan, harga_satuan, qty, diskon_item, subtotal)
        SELECT id, transaksi_id, produk_id, nama_snapshot, kemasan, harga_satuan, qty, diskon_item, subtotal FROM detail_transaksi;
        DROP TABLE detail_transaksi;
        ALTER TABLE detail_transaksi_new RENAME TO detail_transaksi;
        PRAGMA foreign_keys=ON;
      `)
    }
  } catch (err) {
    // safe to ignore
  }

  seedSampleData(db)

  return db
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

function seedSampleData(database: Database.Database): void {
  const count = database.prepare('SELECT COUNT(*) as c FROM produk').get() as { c: number }
  if (count.c > 0) return

  const insert = database.prepare(`
    INSERT INTO produk (nama_menu, harga_modal, harga_jual, harga_100gr, harga_200gr, harga_250gr, harga_500gr, harga_1kg)
    VALUES (@nama_menu, @harga_modal, @harga_jual, @harga_100gr, @harga_200gr, @harga_250gr, @harga_500gr, @harga_1kg)
  `)

  const samples = [
    { nama_menu: 'KERIPIK SINGKONG ORIGINAL', harga_modal: 8000, harga_jual: 95000, harga_100gr: 5000, harga_200gr: 9000, harga_250gr: 11000, harga_500gr: 20000, harga_1kg: 38000 },
    { nama_menu: 'KERIPIK SINGKONG PEDAS', harga_modal: 8500, harga_jual: 98000, harga_100gr: 5500, harga_200gr: 9500, harga_250gr: 12000, harga_500gr: 22000, harga_1kg: 40000 },
    { nama_menu: 'KACANG METE', harga_modal: 45000, harga_jual: null, harga_100gr: null, harga_200gr: 25000, harga_250gr: 30000, harga_500gr: 55000, harga_1kg: 105000 },
    { nama_menu: 'ABON SAPI', harga_modal: 120000, harga_jual: null, harga_100gr: 15000, harga_200gr: 28000, harga_250gr: null, harga_500gr: 55000, harga_1kg: 105000 }
  ]

  const tx = database.transaction(() => {
    for (const s of samples) insert.run(s)
  })
  tx()
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function clearDatabase(): void {
  const database = getDatabase()
  const tx = database.transaction(() => {
    database.prepare('DELETE FROM detail_transaksi').run()
    database.prepare('DELETE FROM transaksi').run()
    database.prepare('DELETE FROM produk').run()
    database.prepare('DELETE FROM paket').run()
    database.prepare('DELETE FROM pengaturan').run() // Also clear settings and reseed default on clear
    try {
      database.prepare("DELETE FROM sqlite_sequence WHERE name IN ('produk', 'transaksi', 'detail_transaksi', 'paket')").run()
    } catch (err) {
      // Ignore if sqlite_sequence doesn't exist or sequence not active yet
    }
    database.prepare("INSERT OR IGNORE INTO pengaturan (kunci, nilai) VALUES ('nama_toko', 'TOKO SNACK')").run()
    database.prepare("INSERT OR IGNORE INTO pengaturan (kunci, nilai) VALUES ('admin_password', 'admin')").run()
    database.prepare("INSERT OR IGNORE INTO pengaturan (kunci, nilai) VALUES ('alamat_toko', '')").run()
    database.prepare("INSERT OR IGNORE INTO pengaturan (kunci, nilai) VALUES ('warna_primary', '#ea580c')").run()
  })
  tx()
}

export function getPengaturan(kunci: string, defaultNilai: string): string {
  const database = getDatabase()
  try {
    const row = database.prepare('SELECT nilai FROM pengaturan WHERE kunci = ?').get(kunci) as { nilai: string } | undefined
    return row ? row.nilai : defaultNilai
  } catch (err) {
    return defaultNilai
  }
}

export function setPengaturan(kunci: string, nilai: string): void {
  const database = getDatabase()
  database.prepare('INSERT OR REPLACE INTO pengaturan (kunci, nilai) VALUES (?, ?)').run(kunci, nilai)
}

export function exportDatabaseData(): string {
  const database = getDatabase()
  const produk = database.prepare('SELECT * FROM produk').all()
  const paket = database.prepare('SELECT * FROM paket').all()
  const transaksi = database.prepare('SELECT * FROM transaksi').all()
  const detail_transaksi = database.prepare('SELECT * FROM detail_transaksi').all()
  const pengaturan = database.prepare('SELECT * FROM pengaturan').all()

  return JSON.stringify({
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    produk,
    paket,
    transaksi,
    detail_transaksi,
    pengaturan
  }, null, 2)
}

export function importDatabaseData(jsonStr: string): void {
  const data = JSON.parse(jsonStr)
  if (!data || typeof data !== 'object') {
    throw new Error('Format file tidak valid')
  }

  // Validasi struktur data backup
  if (
    !Array.isArray(data.produk) ||
    !Array.isArray(data.transaksi) ||
    !Array.isArray(data.detail_transaksi) ||
    !Array.isArray(data.pengaturan)
  ) {
    throw new Error('Struktur data backup tidak lengkap')
  }

  const database = getDatabase()

  // Jalankan import dalam satu transaksi database
  const performImport = database.transaction(() => {
    // 1. Hapus data di tabel terkait
    database.prepare('DELETE FROM detail_transaksi').run()
    database.prepare('DELETE FROM transaksi').run()
    database.prepare('DELETE FROM produk').run()
    database.prepare('DELETE FROM paket').run()
    database.prepare('DELETE FROM pengaturan').run()

    // Reset auto-increment sequences jika ada
    try {
      database.prepare("DELETE FROM sqlite_sequence WHERE name IN ('produk', 'transaksi', 'detail_transaksi', 'paket')").run()
    } catch (err) {
      // Abaikan jika tidak didukung
    }

    // 2. Masukkan Pengaturan
    const insertPengaturan = database.prepare('INSERT INTO pengaturan (kunci, nilai) VALUES (?, ?)')
    for (const p of data.pengaturan) {
      insertPengaturan.run(p.kunci, p.nilai)
    }

    // 3. Masukkan Paket
    if (Array.isArray(data.paket)) {
      const insertPaket = database.prepare(`
        INSERT INTO paket (id, nama_paket, harga_modal, harga_jual, deleted, created_at, updated_at)
        VALUES (@id, @nama_paket, @harga_modal, @harga_jual, @deleted, @created_at, @updated_at)
      `)
      for (const pk of data.paket) {
        insertPaket.run(pk)
      }
    }

    // 4. Masukkan Produk
    const insertProduk = database.prepare(`
      INSERT INTO produk (id, nama_menu, harga_modal, harga_jual, harga_100gr, harga_200gr, harga_250gr, harga_500gr, harga_1kg, berat_produk, main_eceran, label_kemasan, deleted, created_at, updated_at)
      VALUES (@id, @nama_menu, @harga_modal, @harga_jual, @harga_100gr, @harga_200gr, @harga_250gr, @harga_500gr, @harga_1kg, @berat_produk, @main_eceran, @label_kemasan, @deleted, @created_at, @updated_at)
    `)
    for (const p of data.produk) {
      insertProduk.run({
        ...p,
        harga_modal: p.harga_modal !== undefined ? p.harga_modal : (p.harga_beli !== undefined ? p.harga_beli : null),
        harga_jual: p.harga_jual !== undefined ? p.harga_jual : (p.harga_jual_bal !== undefined ? p.harga_jual_bal : null),
        harga_100gr: p.harga_100gr !== undefined ? p.harga_100gr : (p.harga_100_110gr !== undefined ? p.harga_100_110gr : null),
        berat_produk: p.berat_produk !== undefined ? (p.berat_produk ? p.berat_produk.toLowerCase() : null) : null,
        main_eceran: p.main_eceran === 'bal' ? 'jual' : (p.main_eceran !== undefined ? p.main_eceran : null),
        label_kemasan: p.label_kemasan !== undefined ? p.label_kemasan : null
      })
    }

    // 5. Masukkan Transaksi
    const insertTransaksi = database.prepare(`
      INSERT INTO transaksi (id, nomor_trx, tanggal, total, diskon, total_bayar, bayar, kembali)
      VALUES (@id, @nomor_trx, @tanggal, @total, @diskon, @total_bayar, @bayar, @kembali)
    `)
    for (const t of data.transaksi) {
      insertTransaksi.run(t)
    }

    // 6. Masukkan Detail Transaksi
    const insertDetail = database.prepare(`
      INSERT INTO detail_transaksi (id, transaksi_id, produk_id, paket_id, nama_snapshot, kemasan, harga_satuan, qty, diskon_item, subtotal)
      VALUES (@id, @transaksi_id, @produk_id, @paket_id, @nama_snapshot, @kemasan, @harga_satuan, @qty, @diskon_item, @subtotal)
    `)
    for (const d of data.detail_transaksi) {
      insertDetail.run({
        ...d,
        paket_id: d.paket_id !== undefined ? d.paket_id : null
      })
    }
  })

  performImport()
}

