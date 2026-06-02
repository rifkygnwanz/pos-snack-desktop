import fs from 'fs'
import path from 'path'
import { getBackupDir, getDbPath, getPengaturan } from './database'

const MAX_BACKUPS = 30

export function backupDatabase(): string {
  const backupDir = getBackupDir()
  fs.mkdirSync(backupDir, { recursive: true })

  const rawStoreName = getPengaturan('nama_toko', 'TOKO_SNACK')
  const safeStoreName = rawStoreName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_') || 'toko'
  const prefix = `backup_${safeStoreName}_`

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const filename = `${prefix}${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.db`
  const dest = path.join(backupDir, filename)

  fs.copyFileSync(getDbPath(), dest)
  pruneOldBackups(backupDir)

  return dest
}

function pruneOldBackups(backupDir: string): void {
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith('backup_') && f.endsWith('.db'))
    .map((f) => ({
      name: f,
      path: path.join(backupDir, f),
      mtime: fs.statSync(path.join(backupDir, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime)

  for (const file of files.slice(MAX_BACKUPS)) {
    fs.unlinkSync(file.path)
  }
}
