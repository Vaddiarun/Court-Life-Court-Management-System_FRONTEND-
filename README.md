# Court Life — Frontend (React + Vite + Tailwind CSS)

Web UI for the Court Management System backend. One app, five role-based experiences:

| Role | Screens |
|---|---|
| **Super Admin** | Platform overview (firms, users, sync & notification health, integration success rate), run sync / dispatch jobs, law firms (create, edit plan & allowances, suspend/reactivate, users), usage & billing by firm/month, audit logs |
| **Firm Admin** | Dashboard, cases, hearing calendar, reminders, tasks (kanban), team & clients, reports & usage (allowance meters, overage), firm settings (auto hearing-reminder defaults), firm audit log |
| **Lawyer** | Dashboard, CNR lookup → review → add case, manual case entry with duplicate warning, case workspace, calendar, reminders, tasks, clients |
| **Junior Advocate** | Only assigned cases, team/client notes, own tasks and reminders |
| **Client** | Home, cases shared with them, hearings, shared documents, client-visible notes, notifications |

Case workspace tabs: **Overview** (details, next hearing, source & last-sync, *Sync now*), **People** (assign team, grant/revoke client access), **Hearings** (official vs manual, add manual entry, remind), **History** (change timeline + sync runs), **Documents** (upload, categorise, share with client, download), **Notes** (internal / team / client visibility), **Tasks**, **Reminders** (offsets 7/3/1/0 days, in-app/email/SMS/call).

Also: email/password and phone-OTP login, notification bell with unread count, profile (language from 23 options, channel preferences, SMS/call consent with timestamps, change password), automatic token refresh.

## Run in VS Code

Requires **Node.js 20.19+ (22 LTS recommended)** — check with `node -v`.

1. VS Code → **File → Open Folder…** → `I:\cort_ui_frontend` (accept the recommended extensions: Tailwind CSS IntelliSense, Prettier, ESLint).
2. Open the terminal (**Ctrl + `**) and run once:
   ```bash
   npm install
   ```
3. Start the dev server (hot reload):
   ```bash
   npm run dev
   ```
   → http://localhost:3000 . Or press **Ctrl+Shift+B** (runs the `npm run dev` task), or **F5** to debug in Chrome.

The backend must be running on http://localhost:8000.

## Run with one click (alternative)

1. Start the backend first (double-click `I:\court-life-backend\run_local.bat`) — it serves the API on http://localhost:8000.
2. Double-click **`run_frontend.bat`** (or run `npm install` then `npm run dev`).
3. Open http://localhost:3000 and sign in, e.g. `admin@courtlife.in` / `Admin@12345` (super admin).

The Vite dev server proxies `/api` to `http://127.0.0.1:8000`, so no CORS setup is needed.
Point it elsewhere with `VITE_BACKEND_URL=http://host:port npm run dev`.

## Deploy (independently of the backend)

This folder is a standalone project — it can live in its own Git repo and deploy on its own.

1. Set the backend URL at build time:
   ```bash
   VITE_API_URL=https://api.your-domain.in npm run build   # outputs static files to dist/
   ```
   On Vercel / Netlify / Cloudflare Pages add `VITE_API_URL` as an environment variable;
   build command `npm run build`, output directory `dist`. SPA routing is preconfigured
   (`vercel.json`, `public/_redirects`).
2. On the backend, allow the frontend's origin in `.env`:
   ```
   CORS_ORIGINS=["https://app.your-domain.in"]
   ```

Alternative: serve `dist/` and the API on one domain (Nginx: `/` → dist, `/api` → FastAPI) and leave `VITE_API_URL` empty.

## Structure

```
src/
  api/client.js        fetch wrapper: auth header, refresh-on-401, FastAPI error messages, downloads
  lib/auth.jsx         auth context (login, OTP, logout, current user, role helpers)
  lib/hooks.js         React Query helpers (useApi, useAction with toast + cache invalidation)
  lib/format.js        IST date/time, ₹ formatting
  components/ui.jsx    design system: Button, Input, Select, Field, Card, Badge, Table, Tabs, Modal, Toasts…
  components/Layout.jsx role-based sidebar, notifications bell, user menu
  components/forms.jsx reminder & task modals
  pages/               Login, Profile, Notifications
  pages/admin/         super admin console
  pages/firm/          firm workspace pages
```

Stack: React 19, React Router 7, TanStack Query 5, Tailwind CSS 4, lucide-react icons, Vite 8.
