# Table & Trust — Restaurant Loyalty POC

A full-stack POC for a restaurant loyalty platform used by waiters (tablet) and cashiers (POS). Built with Next.js 15, Tailwind CSS, shadcn/ui, and Framer Motion. Data is persisted in local JSON files — no database required.

---

## Apps

| Route | Role | Description |
|---|---|---|
| `/` | Launcher | Pick your role |
| `/waiter` | Waiter (tablet) | Search guests, view loyalty profile, order history, family |
| `/cashier` | Cashier (POS) | Build and confirm orders, sync to loyalty system |

---

## Features

### Waiter App
- Phone number search → instant guest profile
- Loyalty tier badge (Bronze / Silver / Gold / VIP) with progress bar to next tier
- Stats: total visits, lifetime spend, points, last visit
- Favorite items — top 3 most ordered, highlighted
- Guest notes & preferences (allergies, seating, etc.)
- Birthday & anniversary alerts — banner if today, pill badge if within 14 days
- Order history timeline — most recent first
- Family group panel — click any member to jump to their profile
- Live polling — new orders placed by cashier appear within 3 seconds

### Cashier App
- Menu grid filtered by category (Starter / Main / Dessert / Drink)
- Cart with quantity controls and per-item remove
- Guest search with live dropdown
- Table number field
- Order notes
- Confirm order → writes to `data/orders.json` → instantly visible in waiter app

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Animations | Framer Motion |
| Data | JSON files (no database) |
| Real-time | Client-side polling (3s interval) |

---

## Project Structure

```
app/
  page.tsx              # Launcher home page
  waiter/page.tsx       # Waiter tablet app
  cashier/page.tsx      # Cashier POS app
  api/
    clients/route.ts    # GET by phone, by id, or all clients
    orders/route.ts     # GET orders, POST new order
    menu/route.ts       # GET menu items

lib/
  types.ts              # TypeScript interfaces
  data.ts               # JSON read/write + business logic (stats, favorites, family)

data/
  clients.json          # Guest profiles (6 seeded)
  orders.json           # Order history (9 seeded + live)
  menu.json             # 15 menu items across 4 categories
  family_groups.json    # 3 family groups

tasks/                  # Planned next features (pick up later)
  01-waiter-app-enhancements.md
  02-cashier-app-enhancements.md
  03-real-time-sync.md
  04-analytics-dashboard.md
  05-ui-polish.md
```

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To test the full flow, open `/waiter` and `/cashier` side by side:
1. In the **Cashier app** — search for a guest, build an order, confirm
2. In the **Waiter app** — search the same guest — the new order appears within ~3 seconds

### Seeded test phones

| Phone | Guest | Tier |
|---|---|---|
| `0501234567` | Ahmed Al-Rashid | VIP |
| `0507654321` | Fatima Al-Rashid | VIP |
| `0509876543` | Omar Al-Rashid | Bronze |
| `0551112233` | Sara Khalil | Gold |
| `0554443322` | Khalid Khalil | Gold |
| `0566778899` | Layla Nasser | Silver |

Ahmed, Fatima, and Omar are in the same family group. Sara and Khalid are in another.

---

## Planned Tasks

See the `tasks/` directory for detailed specs on what to build next:

- **Task 01** — Waiter enhancements: tablet keypad, guest registration, check-in flow
- **Task 02** — Cashier enhancements: loyalty points award, receipt modal, table management
- **Task 03** — Replace polling with Server-Sent Events for true real-time sync
- **Task 04** — Manager analytics dashboard (top guests, popular items, weekly revenue)
- **Task 05** — UI polish: skeleton loaders, toast notifications, tablet layout optimization
