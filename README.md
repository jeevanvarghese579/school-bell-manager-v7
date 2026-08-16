# School Bell Manager v7

A school bell scheduling system for creating multiple **Bell Profiles**, each containing scheduled **Bells/Alarms**. Works as a web app and a Windows desktop application (Electron) from one shared React/Vite codebase.

- **Web + Desktop, one app:** the same React app runs in a browser and inside Electron.
- **Offline or Cloud:** works fully offline with IndexedDB, or sign in to sync across devices.
- **Bell Profiles & Bells:** unlimited profiles, each with unlimited bells, sorted chronologically.
- **Custom sounds:** one built-in "Default Bell" plus unlimited uploaded MP3/WAV/OGG sounds.
- **Light / Dark / System theme** with a centralized design-token system.
- **Master Alarm Switch** disables all bell execution without touching individual alarms.
- **Windows tray, auto-start, and background scheduling** via Electron.

> **Cloud backend note:** This build ships with a **Supabase** cloud provider (auth + database + storage) already wired up and ready. The project also includes Firebase Firestore and Storage security-rule files under `firebase/`, and `.env.example` documents the Firebase variables, for teams that prefer to swap in Firebase. The data layer is provider-agnostic — see `src/services/DataProvider.ts`.

---

## 1. Install dependencies

```bash
npm install
```

## 2. Configure the cloud backend

Cloud mode uses **Supabase** by default. The Supabase project is already provisioned and credentials are pre-populated in `.env`. No manual setup is required for the default build.

If you want to use **Firebase** instead, copy `.env.example` to `.env` and fill in the Firebase variables:

```bash
cp .env.example .env
```

### Firebase services to enable (optional, Firebase path only)

1. **Authentication** → enable Email/Password provider.
2. **Cloud Firestore** → create a database.
3. **Storage** → enable it for custom sound uploads.

### Apply Firestore rules (Firebase path only)

```bash
firebase deploy --only firestore:rules
```

The rules file is at `firebase/firestore.rules`. It restricts every document under `users/{uid}/...` to the owning user.

### Apply Storage rules (Firebase path only)

```bash
firebase deploy --only storage
```

The rules file is at `firebase/storage.rules`. It restricts sound files to the owning user's prefix.

## 3. Run the browser development version

```bash
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

## 4. Run the Electron development version

```bash
npm run electron:dev
```

This starts Vite and launches Electron pointed at the dev server. The tray icon, background scheduling, and minimize-to-tray behavior are active.

## 5. Build the website

```bash
npm run build
```

The static site is output to `dist/`. Preview it with `npm run preview`.

## 6. Build the Windows installer

```bash
npm run electron:build
```

This builds the Vite app and packages it with `electron-builder` into a Windows NSIS installer under `release/`.

> The Windows installer can only be produced on a machine with the appropriate tooling. This repository's CI/build host may be Linux-only — in that case, run this step on a Windows machine.

---

## Architecture

```
                 React / Vite App
                       |
              ---------------------
              |                   |
          Browser             Electron
                                  |
                         Windows services
                         Tray
                         Auto-start
                         Background bells

                  React UI
                     |
                 Data Layer (DataProvider)
                  /      \
             IndexedDB  Supabase (or Firebase)
```

- `src/services/DataProvider.ts` — the provider interface.
- `src/services/OfflineProvider.ts` — IndexedDB-backed provider.
- `src/services/CloudProvider.ts` — Supabase-backed provider.
- `src/hooks/useAuth.tsx` — picks the active provider based on auth state.
- `src/electron/electronBridge.ts` — type-safe bridge to Electron APIs.
- `electron/main.cjs` — Electron main process (tray, scheduling, auto-start).

## About

School Bell Manager — Version 7.0.0
Developed by: Jeevan Varghese
Visit `itsjeevanvarghese.web.app` for more softwares.
