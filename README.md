# Table & Trust — Restaurant Loyalty POC

A full-stack POC for a restaurant loyalty platform used by waiters (tablet), cashiers (POS), and managers (analytics). Built with Next.js (App Router), Tailwind CSS, shadcn/ui, and Framer Motion. Data is persisted in local JSON files — no database required.

---

## Apps

| Route | Role | Description |
|---|---|---|
| `/` | Launcher | Pick your role; light/dark theme toggle |
| `/waiter` | Waiter (tablet) | Search guests, loyalty profile, order history, family, arrivals |
| `/cashier` | Cashier (POS) | Orders, promos, split checkout, active visits, shift summary |
| `/manager` | Manager | KPIs, weekly revenue, tier mix, popular items, guest occasions |

---

## Features

### Waiter app
- Phone / digit search → guest profile with stats
- Loyalty tier (Bronze / Silver / Gold / VIP) and progress toward next tier
- Visits, spend, points, last visit; favorite items; notes and preferences
- Birthday and anniversary alerts (today banner; within 14 days badge)
- Order history timeline; family group panel with quick navigation
- **Live updates:** Server-Sent Events (`/api/events`) when the cashier confirms an order for the selected guest, with polling fallback

### Cashier app
- Menu by category; cart with quantities
- Guest search; table number; order notes
- Promo code field (validated against `data/promos.json`)
- Split checkout modes (even split / by item); points and receipts flow
- Active in-house visits (`/api/visits`); shift log summary (`/api/shift-log`)
- Confirm order → persists to `data/orders.json` and notifies connected waiter clients via SSE

### Manager dashboard
- Today’s overview, top guests (month), upcoming birthdays/anniversaries
- Charts (Recharts): weekly revenue, tier distribution, popular menu items (category filter via `?category=`)

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Components | shadcn/ui, `@base-ui/react` |
| Charts | Recharts |
| Animations | Framer Motion |
| Toasts | Sonner (with i18n helpers) |
| Theming | `next-themes` |
| Data | JSON under `data/` |
| Real-time | SSE for order events + client polling fallback |

---

## Project structure

```
app/
  page.tsx                 # Launcher
  waiter/page.tsx          # Waiter tablet app
  cashier/page.tsx         # Cashier POS app
  manager/page.tsx         # Manager analytics (dynamic)
  manager/layout.tsx
  api/
    clients/route.ts       # Lookup, search digits, register guest
    orders/route.ts        # List / create orders (checkout, promos, split)
    menu/route.ts          # Menu items
    events/route.ts        # SSE stream: new orders for a clientId
    visits/route.ts        # Active visits; arrive / depart
    promos/route.ts        # List or validate promo by code
    shift-log/route.ts     # Per-day shift batches and totals

components/
  theme-toggle.tsx, theme-provider.tsx, ui/*, manager/*

lib/
  types.ts, data.ts        # JSON I/O and domain logic
  analytics.ts             # Manager KPIs and chart data
  events.ts                # In-process order event bus (SSE)
  api-messages.ts          # EN/AR message pairs for APIs
  order-checkout.ts, cashier-utils.ts, waiter-utils.ts, ...

data/
  clients.json             # Guest profiles (6 seeded)
  orders.json              # Orders (JSON-backed, grows with use)
  menu.json                # 15 items, 4 categories
  family_groups.json
  promos.json
  active_visits.json
  shift_log.json

docs/                      # Example curl snippets for flows and APIs
  waiter-task-01-api-curls.md
  cashier-task-02-curls.md
  task-03-real-time-sync-curls.md
```

API responses support English and Arabic via `Accept-Language` / `?lang=` (see `lib/api-messages.ts`).

---

## Scripts

```bash
npm install          # or: yarn
npm run dev          # dev server → http://localhost:3000
npm run build        # production build
npm run start        # run production server
npm run lint         # ESLint
npm test             # Vitest (or: yarn test)
```

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Try the flow:** open `/waiter` and `/cashier` in two windows. In Cashier, find a guest, add items, confirm. In Waiter, select the same guest — new orders should appear via live sync (SSE when available).

### Seeded test phones

| Phone | Guest | Tier |
|---|---|---|
| `0501234567` | Ahmed Al-Rashid | VIP |
| `0507654321` | Fatima Al-Rashid | Gold |
| `0509876543` | Omar Al-Rashid | Bronze |
| `0551112233` | Sara Khalil | Gold |
| `0554443322` | Khalid Khalil | Gold |
| `0566778899` | Layla Nasser | Silver |

Ahmed, Fatima, and Omar share one family group; Sara and Khalid share another.

---

## HTTP API (summary)

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/clients` | Profile by `phone` / `id`, search `digits`, list, or register (POST) |
| GET/POST | `/api/orders` | List all or by `clientId`; POST checkout body (items, clientId(s), table, promo, split) |
| GET | `/api/menu` | Menu catalog |
| GET | `/api/events?clientId=` | SSE: `connected` + `order` events |
| GET/POST/DELETE | `/api/visits` | Active visits; POST arrive; DELETE depart (`?clientId=`) |
| GET | `/api/promos` | Active promos or `?code=` validation |
| GET | `/api/shift-log?date=YYYY-MM-DD` | Shift batches for a day |

Concrete `curl` examples live under [`docs/`](docs/).
