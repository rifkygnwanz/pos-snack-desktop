# POS Desktop Offline

Offline desktop POS — keyboard-first cashier workflow.

## fix security app mac

xattr -cr /Applications/Kasir.app

## Stack

- Electron + React + Vite + TypeScript
- SQLite (`better-sqlite3`)
- Tailwind CSS + Zustand

## Development

```bash
cd desktop-pos
npm install --ignore-scripts   # if better-sqlite3 fails on Node 26+
npx electron-builder install-app-deps
node node_modules/electron/install.js
npm run dev
```

> **Note:** Native modules are rebuilt for Electron (not system Node). If `npm install` fails on `better-sqlite3`, use `--ignore-scripts` then run `electron-builder install-app-deps`.

## Build

```bash
npm run dist // for mac and windows
npx electron-builder --win // for windows
npx electron-builder --mac // for mac
```

## Keyboard shortcuts (Kasir)

| Key             | Action                                 |
| --------------- | -------------------------------------- |
| Enter           | Confirm step / save transaction        |
| Esc             | Cancel transaction (with confirmation) |
| F2              | Transaction history                    |
| F3              | Add new product                        |
| F4 / Ctrl+Enter | Payment mode                           |
| Delete          | Remove selected cart item              |
| Ctrl+P          | Reprint last receipt                   |

## Modules (v1)

- Kasir — daily transactions
- Product management — CRUD + CSV import/export
- Transaction history — read-only
- Auto SQLite backup (max 30 files)
- Receipt format ready (printer pending)
