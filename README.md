```markdown
# 🫖 Babuji Chaay  
**Point of Sale & Café Management System**  
**Developed by:** Daniel Deshmukh & Saurabh Yadav  

---

## 📘 Overview

**Babuji Chaay** is a full-stack web application serving as an end-to-end **Point of Sale (POS)** and **Inventory Management System** for cafés, tea stalls, and small businesses.  
It enables seamless billing, real-time inventory management, offer creation, and in-depth analytics — all through an intuitive, touch-friendly interface.

Built using **React + Tailwind** on the frontend and **Node.js + Supabase** on the backend, it provides a modern, secure, and responsive experience for café operators.

---

## 🎯 Core Objectives

- Streamline daily billing and transaction workflows  
- Simplify inventory and product management  
- Provide real-time analytics and visual reports  
- Offer a kiosk-friendly, touch-based interface  
- Support offers, discounts, and promotional management  

---

## 🏗️ System Architecture

### Frontend

**Tech Stack:** React, Tailwind CSS, shadcn/ui, lucide-react, recharts, Vite  

The frontend delivers a responsive, dynamic experience optimized for touchscreen and desktop users.

#### Key Components

| Component | Description |
|------------|-------------|
| `Dashboard.jsx` | Displays performance metrics, sales charts, and trends |
| `CreationPage.jsx` | Interface for creating or editing products/offers |
| `InventoryManager.jsx` | Manages stock levels and product details |
| `OfferManager.jsx` | Handles promotional offers and discounts |
| `VirtualKeyboard.jsx` | Provides an on-screen keyboard for POS terminals |
| `AuthModal.jsx` | Handles user authentication |
| `Background.jsx` | Implements the brand’s forest-green theme with golden accents |
| `SpecialNumber.jsx` | Generates unique daily billing identifiers |

#### Theming & UI
- Light/Dark mode support  
- Responsive Tailwind-based layouts  
- Modern, accessible UI with **shadcn/ui** components  

---

### Backend

**Tech Stack:** Node.js, Express.js, Supabase (PostgreSQL via NeonDB)  

The backend follows a modular **MVC structure** — managing business logic, data persistence, and RESTful APIs.

#### Key Files & Directories

| File / Folder | Description |
|----------------|-------------|
| `script.js` | Entry point for Express server and middleware setup |
| `controllers/transactionController.js` | Handles transactions, payments, and bill numbering |
| `controllers/reportController.js` | Generates reports and analytics |
| `routes/transactionRoutes.js` | Defines transaction-related endpoints |
| `routes/reportRoutes.js` | Defines report/analytics endpoints |
| `db/neonClient.js` | Neon PostgreSQL database connection |
| `supabaseClient.js` | Supabase SDK configuration |

---

## 🗃️ Database Schema

**Supabase** powers authentication and data storage.  

| Table | Purpose | Key Columns |
|--------|----------|-------------|
| `products` | Stores menu items and stock data | `id`, `name`, `price`, `stock_quantity`, `category` |
| `transactions` | Records each sale with a unique daily bill number | `id`, `daily_bill_no`, `total_amount`, `discount`, `payment_method`, `created_at` |
| `offers` | Manages active offers and their conditions | `id`, `description`, `product_ids[]`, `offer_duration`, `discount_value` |
| `users` | Authentication and role-based access | `id`, `email`, `role`, `created_at` |

---

## ⚙️ Core Features

### 1. **Point of Sale (POS)**
- Fast, intuitive billing system  
- Split payments (Cash + UPI)  
- Auto-calculates totals and change  
- Generates unique `daily_bill_no`

### 2. **Inventory Management**
- Add, edit, or remove products  
- Auto-adjust stock on sale  
- Visual inventory dashboards  

### 3. **Offer Management**
- Define “Buy One Get One” and discount offers  
- Time-bound and product-based offers  
- Easy modification and deactivation  

### 4. **Reports & Analytics**
- Daily/monthly summaries  
- Revenue charts via **recharts**  
- Exportable, printable insights  

### 5. **Virtual Keyboard**
- Touch-friendly on-screen keyboard  
- Usable across all POS fields  

### 6. **UI & Theming**
- Café-inspired design  
- Fast-rendering UI  
- Fully responsive  

### 7. **Authentication & Access Control**
- Supabase authentication  
- Role-based permissions  

---

## 🧰 Tech Stack Summary

| Layer | Technologies |
|--------|---------------|
| **Frontend** | React, Tailwind CSS, shadcn/ui, lucide-react, recharts |
| **Backend** | Node.js, Express.js |
| **Database** | Supabase (PostgreSQL via NeonDB) |
| **Reports** | Backend-driven via controllers |
| **Hosting** | Vercel / Render / Supabase |
| **Version Control** | Git & GitHub |

---

## 📂 Folder Structure

```

Babuji-Chaay/
├── Backend/
│   ├── controllers/
│   │   ├── reportController.js
│   │   └── transactionController.js
│   ├── routes/
│   │   ├── reportRoutes.js
│   │   └── transactionRoutes.js
│   ├── db/
│   │   └── neonClient.js
│   ├── supabaseClient.js
│   ├── script.js
│   └── package.json
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── assets/
│   │   ├── lib/
│   │   └── App.jsx
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md

````

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js v18+  
- Active Supabase project  
- PostgreSQL (NeonDB or Supabase-hosted)

### 1. Backend Setup
```bash
cd Backend
npm install
npm start
````

Create a `.env` file with:

```env
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-key>
PORT=3000
```

### 2. Frontend Setup

```bash
cd Frontend
npm install
npm run dev
```

---

## 🔗 API Endpoints

| Endpoint               | Method | Description                |
| ---------------------- | ------ | -------------------------- |
| `/api/transactions`    | GET    | Retrieve all transactions  |
| `/api/transactions`    | POST   | Create a new transaction   |
| `/api/reports/daily`   | GET    | Fetch daily report summary |
| `/api/reports/monthly` | GET    | Fetch monthly analytics    |

---

## 👥 Contributors

| Name                | Role                 | Responsibilities                                             |
| ------------------- | -------------------- | ------------------------------------------------------------ |
| **Daniel Deshmukh** | Full Stack Developer | Core architecture, backend controllers, Supabase integration |
| **Saurabh Yadav**   | Frontend Developer   | UI/UX design, React components, and performance optimization |

---

⭐ *“Babuji Chaay” — Brewing efficiency, one cup at a time.* ☕

```
```
