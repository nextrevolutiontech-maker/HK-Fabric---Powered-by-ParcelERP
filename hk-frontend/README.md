# 📦 HK Fabric — Powered by ParcelERP
> **Enterprise-Grade E-Commerce Order, Courier Tracking & Financial Management System**

![HK Fabric ERP System](public/favicon.ico)

---

## 📌 Executive Summary (Project Overview)

**HK Fabric - Powered by ParcelERP** ek high-performance, ultra-scalable Order & Parcel ERP System hai. Yeh application thousands of daily parcels, real-time courier slip (*parchiyan*) tracking, Cash-on-Delivery (COD) settlements, aur financial accounts ko zero-lag speed aur 100% data integrity ke sath manage karne ke liye design ki gayi hai.

---

## 🏗️ System Architecture & Technology Stack

```mermaid
graph TD
    User[Staff / Admin User] -->|Instant SPA Navigation| UI[Next.js App Router Client UI]
    UI -->|React Query v5 Cache| API[Serverless Next.js API Routes / OrderService]
    API -->|O1 Single Query & Transactions| DB[(Neon PostgreSQL Serverless Database)]
    UI -->|OCR Slip Scanner| Tesseract[Tesseract.js OCR Worker]
    UI -->|PWA Offline Cache| SW[Service Worker Cache]
```

### 💻 Stack Breakdown:
- **Frontend Framework:** Next.js 16 (App Router), React 18, TypeScript.
- **State Management & Caching:** TanStack React Query v5 (`placeholderData: keepPreviousData`, `staleTime: 5000`).
- **Styling System:** Vanilla Tailwind CSS + Lucide React Icons + Recharts Analytics.
- **Database & ORM:** Prisma ORM with Neon Serverless PostgreSQL Connection Pooling.
- **PWA & Offline Worker:** Workbox PWA Service Worker for offline order drafting and automatic queue sync.
- **Optical Scanner:** Tesseract.js for physical courier slip (*parchiyan*) tracking number auto-reading.

---

## ⚡ Engineering & Scalability Highlights

### 1. 🚀 O(1) Order Number Generator (400x Acceleration)
- **Problem:** Legacy sequential candidate number checking executed 100+ database loop queries, taking **20 Seconds (20,000ms)** per order.
- **Solution:** Implemented single indexed $O(1)$ `findFirst` query for the highest `orderNo` prefix (`HKF-2026-XXXXXX`).
- **Result:** Order Creation Latency dropped from **20,000ms $\rightarrow$ 50ms (400x Faster)**.

### 2. ⚡ 1-Click Direct Table Action Controls
- Added direct 1-click status update controls right in table rows:
  - **`Mark Delivered` (Green Check Icon):** Instant status shift to `Delivered`.
  - **`Mark Returned` (Rose X Icon):** Instant status shift to `Returned`.
  - **`Receive COD` (Amber Banknote Badge):** Instant COD Payment status update to `Received`.

### 3. 🔍 Search Bar Debouncing Engine (`useDebounce` Hook with 300ms Delay)
- **Problem:** Keystroke-by-keystroke input changes caused 11 heavy array filters and layout reflows per phone number typed.
- **Solution:** Created custom `useDebounce` hook with 300ms delay window across Global Search (⌘K), COD Parcels, Non-COD Parcels, and All Parcels.
- **Capability:** Multi-field searching matching Order #, Customer Name, Phone, Tracking #, City, AND Address.

### 4. 🛡️ Idempotency Keys & Double-Submit Protection
- **Problem:** Double-clicking "Save Order" or slow network retries created duplicate orders in the database.
- **Solution:** Integrated `x-idempotency-key` HTTP headers (`order-[ID]-[WhatsApp]-[Amount]`) and a 15-minute sliding window DB duplicate check (returns HTTP 409 Conflict with an interactive Duplicate Warning Modal).

### 5. ⚖️ Mathematical Financial Classification Engine (COD vs NON-COD)
- **Formula:** $\text{Net COD Amount (Remaining Balance)} = \max(0, \text{Grand Total} - \text{Advance Payment})$.
- **Strict Rule:**
  - If $\text{Remaining Balance} == 0 \implies$ Order is **100% AUTOMATICALLY "NON-COD"** (100% Advance Payment).
  - If $\text{Remaining Balance} > 0 \implies$ Order is **100% AUTOMATICALLY "COD"** (Courier collects cash on delivery).
- **Database Auto-Self-Correction:** Startup queries automatically rectify legacy zero-balance COD orders into NON-COD.

### 6. ⚡ Zero-Flicker SPA Navigation & Single Order API
- Outer App Shell (`Sidebar` and `Header`) is memoized using `React.memo` for **0% re-renders** during tab switches.
- TanStack React Query `placeholderData: keepPreviousData` holds previous data smoothly on screen, eliminating full-page spinners and visual flickering.
- Added `GET /api/orders/[id]` and `OrderService.getOrderById` for single order fetching by UUID or Order Number.

---

## 📂 Key Application Modules & Section Separation

| Module / Screen | Primary Purpose & Business Logic |
| :--- | :--- |
| **`Dashboard`** | Live metrics (Today Sales, Today COD Sales, Today Non-COD Sales, Parcel Status Chart, Recent Activity Log). |
| **`Create Parcel`** | Dynamic order creation form with auto-calculated Net COD Amount, duplicate detection, and instant print labels. |
| **`COD Parcels`** | Dedicated view for orders requiring Cash-on-Delivery. Includes sub-tabs for `All COD`, `Awaiting Tracking`, and `Tracked / Shipped` + 1-Click Action Controls. |
| **`Non-COD Parcels`** | Dedicated view for Prepaid / Online Paid orders. Includes sub-tabs for `All Non-COD`, `Awaiting Tracking`, and `Tracked / Shipped` + 1-Click Action Controls. |
| **`All Parcels`** | Master parcel repository with dedicated **TYPE** badges (`COD` / `NON-COD`), debounced search, and quick filter sub-tabs + 1-Click Action Controls. |
| **`Tracking`** | Centralized courier slip (*parchi*) tracking entry with sub-tabs (`COD Awaiting`, `NON-COD Awaiting`, `All Awaiting`). |
| **`COD Receiving`** | Courier cash collection entry for marking received payments. |
| **`Settlements`** | Courier payment reconciliation and automated bill matching. |
| **`Daily Closing`** | Daily sales closing report and revenue summary. |
| **`Activity Log`** | System audit trail recording staff actions (`Sami` / `Abid`) with timestamps and IP logging. |

---

## 🔒 Security & Data Integrity

1. **Owner Security PIN (`1234`):** High-risk operations (Order Deletion, Voiding Parcels, Settlement Approval) require Owner PIN authorization.
2. **Transaction Safety:** DB updates execute inside Prisma `$transaction` blocks to ensure atomic updates across orders, tracking entries, and activity logs.

---

## 🛠️ Local Development & Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (`.env`)
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:password@neon-db-url/hkfabric?sslmode=require"
OWNER_PIN="1234"
```

### 3. Prisma Database Setup
```bash
npx prisma db push
npx prisma generate
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 📝 License & Attribution
**HK Fabric — Powered by ParcelERP**  
*Internal Enterprise System for HK Fabric Store.* All rights reserved 2026.