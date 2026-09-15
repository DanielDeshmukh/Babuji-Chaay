<div align="center">

![Babuji Chaay](https://img.shields.io/badge/Babuji_Chaay-Brown?style=for-the-badge&logo=chai&logoColor=white)

# Babuji Chaay POS

**A modern, full-stack Point-of-Sale system built exclusively for chai shops — combining inventory management, real-time billing, loss tracking, and analytics into a single lightning-fast PWA.**

![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Next.js](https://img.shields.io/badge/Built_with-Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-Private-FF6B6B?style=for-the-badge)
![CI](https://img.shields.io/badge/CI-Passing-brightgreen?style=for-the-badge&logo=githubactions&logoColor=white)
![Last Commit](https://img.shields.io/badge/Last_Commit-September_2026-blue?style=for-the-badge)

</div>

---

## Overview

Babuji Chaay is a production-grade POS system designed specifically for Indian chai stalls and tea shops. It replaces the traditional register-and-calculator workflow with a digital system that handles everything from inventory tracking to sales analytics — all within a Progressive Web App that works on any device with a browser.

The system is built for **single-operator use** — one admin manages the shop, handles billing, tracks inventory, and monitors sales through a unified dashboard.

---

## Features

### Billing & Transactions
- **One-tap item selection** with category-based filtering and search
- **Percentage, fixed, and BOGO discount support** — flexible offer management
- **Split payment processing** — accept cash, UPI, or card for a single transaction
- **Transaction history with full audit trail** — every sale item linked to its parent transaction
- **Bill number lookup** — instantly retrieve any past invoice by bill number
- **Refund processing with stock restoration** — partial and full refunds handled automatically

### Inventory Management
- **Real-time stock tracking** with low-stock alerts (≤5 items highlighted in red)
- **Daily menu auto-reset** — menu refreshes each day, old entries archived automatically
- **Loss and dump logging** — record wastage, expired stock, and staff consumption with timestamps
- **Product categories** — organize menu items (Chai, Snacks, Cold Drinks, etc.)

### Analytics & Reports
- **Interactive dashboard** with Recharts-powered bar and line charts
- **KPI cards** — today's sales, transaction count, revenue, and pending refunds
- **Daily and monthly sales reports** — downloadable Excel (.xlsx) with formatted headers and totals
- **Transaction export** — complete sales data with per-item breakdowns

### Profile & Settings
- **Admin profile management** with avatar upload (persisted as base64)
- **Dark and light mode toggle** — comfortable viewing in any lighting
- **PWA installable** — add to home screen on mobile and desktop

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | Turso (SQLite via libSQL) |
| **Client** | `@libsql/client` (raw SQL, no ORM) |
| **Auth** | JWT cookie-based authentication |
| **Charts** | Recharts |
| **Excel Export** | ExcelJS |
| **Deployment** | Vercel |
| **CI/CD** | GitHub Actions |
| **PWA** | Hand-written Service Worker |

---

## Architecture

```
src/
├── app/
│   ├── api/              # 20+ API routes (raw libSQL queries)
│   │   ├── auth/         # Login, Session, Logout
│   │   ├── products/     # CRUD inventory
│   │   ├── todays-menu/  # Daily menu with auto-reset
│   │   ├── transactions/ # Sales processing + stock decrement
│   │   ├── refund/       # Refund processing + stock restoration
│   │   ├── loss-dump-logs/ # Wastage tracking
│   │   ├── offers/       # Discount rules
│   │   ├── exports/      # Excel report generation
│   │   └── health/       # Public health check endpoint
│   ├── home/             # Dashboard with KPIs and charts
│   ├── menu/             # POS billing screen
│   ├── inventory/        # Stock management
│   ├── create/           # Product/offer/refund creation
│   ├── profile/          # Admin profile + loss/dump form
│   └── settings/         # Data export
├── components/           # Reusable UI components
└── lib/
    ├── db/               # Schema + seed data
    ├── auth.ts           # JWT helpers
    └── admin.ts          # Admin session management
```

---

## Database Schema

The system uses 8 relational tables on Turso's managed SQLite:

| Table | Purpose |
|-------|---------|
| `users` | Admin credentials |
| `profiles` | Admin profile data (name, phone, email, avatar) |
| `products` | Menu items with stock quantities |
| `todays_menu` | Daily menu snapshot with per-day stock |
| `transactions` | Sales records with totals and payment method |
| `transaction_items` | Individual items within each transaction |
| `offers` | Discount rules (percentage, fixed, BOGO) |
| `special_numbers` | Bill number aliases |
| `loss_dump_logs` | Wastage and inventory adjustment records |

---

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Authenticate admin user |
| `GET` | `/api/auth/session` | Check current session |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/products` | List all products |
| `POST` | `/api/products` | Create new product |
| `PUT` | `/api/products` | Update product details |
| `DELETE` | `/api/products?id=` | Delete product |
| `GET` | `/api/todays-menu` | Get today's menu (auto-resets daily) |
| `POST` | `/api/todays-menu` | Add item to today's menu |
| `POST` | `/api/transactions` | Process a sale (decrements stock) |
| `GET` | `/api/transactions` | List transactions with filters |
| `GET` | `/api/transactions/lookup?bill_number=` | Look up invoice by bill number |
| `POST` | `/api/refund` | Process refund (restores stock) |
| `GET` | `/api/offers` | List active offers |
| `POST` | `/api/offers` | Create discount rule |
| `GET` | `/api/loss-dump-logs` | List loss/dump entries |
| `POST` | `/api/loss-dump-logs` | Log inventory adjustment |
| `GET` | `/api/exports/sales` | Download sales report (.xlsx) |
| `GET` | `/api/profile` | Get admin profile |
| `PUT` | `/api/profile` | Update admin profile |
| `GET` | `/api/health` | System health check (public) |

---

## Security

- **JWT-based authentication** — cookie-secured session tokens
- **All routes protected** except `/api/health` and `/api/auth/login`
- **Admin-only access** — single-user system, no registration flow
- **No secrets in client code** — environment variables server-side only
- **CORS configured** — only accepts requests from the same origin

---

## Performance

- **First Load JS**: ~103 KB (shared across all routes)
- **Middleware**: 39.6 KB (route protection and auth checks)
- **Build time**: ~14 seconds
- **CI pipeline**: ~2 minutes (build + API tests)
- **Zero ORM overhead** — raw SQL queries for maximum throughput

---

## Live Demo

**[babuji-chaay.vercel.app](https://babuji-chaay.vercel.app)**

> Contact the administrator for access credentials.

---

## CI/CD Pipeline

Automated via GitHub Actions on every push to `main`:

1. **Build job** — TypeScript compilation + production build
2. **API test job** — Spins up dev server, runs integration tests against all endpoints
   - Health check, authentication, session validation
   - Database-dependent tests (products, menu, offers, profile, transactions)
3. **Deploy** — Vercel auto-deploys on merge to `main`

---

## License

Proprietary — All rights reserved. Not authorized for redistribution or commercial use without explicit permission from the author.

---

<div align="center">

**Built with care for chai shops everywhere.**

![Babuji Chaay](https://img.shields.io/badge/Made_for-Babuji_Chaay-Brown?style=for-the-badge)

</div>
