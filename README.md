# VaultLedger — Private Loan & Interest Management Dashboard

A production-grade, fintech-style full-stack dashboard for tracking loans, interest accrual, payments, and financial growth in real-time.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS (custom design tokens) |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| PDF Export | jsPDF + jspdf-autotable |

---

## Features

### Authentication
- Single-admin JWT-based login
- Protected routes with auto-redirect
- Token stored in localStorage, auto-refresh

### Loan Management
- Create loans: Principal, Rate, SI/CI, Compounding frequency, Start date
- Optional EMI with full amortization schedule
- Optional penalty (flat or percentage)
- Pause/Resume interest accrual with period tracking
- Soft-close loans on full repayment

### Real-Time Interest Calculation
- Updates every second in the UI
- SI: `(P × R × T) / 100`
- CI: `P × (1 + R/n)^(nT)` with configurable n (daily/monthly/yearly)
- Pause periods subtracted from effective time

### Payment & Recovery
- Record EMI / partial / full / interest-only / penalty payments
- Full transaction history per borrower
- Automatic balance recalculation

### EMI System
- Formula: `[P × r × (1+r)^n] / [(1+r)^n - 1]`
- Amortization table (principal vs interest split per month)
- Live preview on loan creation form

### Dashboard
- 4 KPI cards with count-up animation (Total Given, Recovered, Interest Earned, Outstanding)
- Live portfolio tracker updating every second
- Donut chart: Recovered vs Pending
- Area chart: Monthly recovery trend (12 months)
- Borrower progress bars
- Recent transactions feed

### PDF Export
- Per-borrower report: loan details, payment history, summary
- Dark-themed, branded PDF via jsPDF

---

## Project Structure

```
loan-dashboard/
├── backend/
│   ├── models/
│   │   ├── User.js          # Admin user schema
│   │   ├── Loan.js          # Full loan schema (pause periods, EMI, penalty)
│   │   └── Payment.js       # Payment transactions
│   ├── routes/
│   │   ├── auth.js          # Login, register, /me
│   │   ├── loans.js         # CRUD + pause/resume + real-time state
│   │   ├── payments.js      # Payment CRUD
│   │   └── dashboard.js     # Aggregated KPIs + trends
│   ├── middleware/
│   │   └── auth.js          # JWT protect middleware
│   ├── utils/
│   │   ├── interestCalc.js  # SI/CI engine, EMI, amortization, growth snapshots
│   │   └── seed.js          # Demo data seeder
│   ├── server.js            # Express app + MongoDB connection
│   ├── .env                 # Environment variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── dashboard/
    │   │   │   └── KpiCard.jsx         # Animated KPI cards
    │   │   ├── charts/
    │   │   │   ├── DonutChart.jsx      # Recovery split chart
    │   │   │   └── GrowthChart.jsx     # Monthly recovery trend
    │   │   ├── loans/
    │   │   │   ├── LoanCard.jsx        # Portfolio card with progress bar
    │   │   │   └── AddPaymentModal.jsx # Record payment modal
    │   │   └── ui/
    │   │       └── Layout.jsx          # Sidebar + nav
    │   ├── context/
    │   │   └── AuthContext.jsx         # Auth state + login/logout
    │   ├── hooks/
    │   │   └── index.js                # useLiveCounter, useLoans, useDashboard, etc.
    │   ├── pages/
    │   │   ├── LoginPage.jsx           # Secure login screen
    │   │   ├── DashboardPage.jsx       # Main overview hub
    │   │   ├── LoansPage.jsx           # Searchable, filterable loan list
    │   │   ├── NewLoanPage.jsx         # Full loan creation form
    │   │   └── LoanDetailPage.jsx      # Deep loan view: live counter, charts, payments
    │   ├── utils/
    │   │   ├── api.js                  # Axios instance with auth interceptor
    │   │   ├── calculations.js         # Client-side interest engine (mirrors backend)
    │   │   └── pdfExport.js            # jsPDF loan report generator
    │   ├── App.jsx                     # Routes + protected/public route guards
    │   ├── main.jsx                    # React entry + toast provider
    │   └── index.css                   # Tailwind + custom design system
    ├── tailwind.config.js              # Custom color tokens, fonts, shadows
    ├── vite.config.js                  # Vite + API proxy
    └── package.json
```

---

## Setup & Installation

### Prerequisites
- Node.js v18+
- MongoDB (local: `mongod` or Atlas URI)
- npm v9+

---

### Step 1 — Clone & install dependencies

```bash
# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

---

### Step 2 — Configure environment

```bash
# In backend/.env (already created):
PORT=5000
MONGODB_URI=mongodb://localhost:27017/loan_dashboard
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
```

For MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string.

---

### Step 3 — Seed demo data

```bash
cd backend
npm run seed
```

This creates:
- Admin user: `admin@loandashboard.com` / `Admin@123456`
- 6 realistic loans (active, closed, paused)
- 30+ payment records across borrowers

---

### Step 4 — Start development servers

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# → Server running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# → App running on http://localhost:5173
```

---

### Step 5 — Login

Open `http://localhost:5173`

```
Email:    admin@loandashboard.com
Password: Admin@123456
```

---

## Key API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → JWT token |
| GET | `/api/auth/me` | Current user (protected) |
| POST | `/api/auth/register` | First-time setup only |

### Loans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/loans` | All loans with computed state |
| POST | `/api/loans` | Create loan |
| GET | `/api/loans/:id` | Single loan + payments + growth data |
| PUT | `/api/loans/:id` | Update loan |
| DELETE | `/api/loans/:id` | Delete loan + payments |
| POST | `/api/loans/:id/pause` | Pause interest accrual |
| POST | `/api/loans/:id/resume` | Resume interest |
| GET | `/api/loans/:id/state` | Real-time computed state only |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments?loanId=xxx` | Payments for a loan |
| POST | `/api/payments` | Record payment |
| DELETE | `/api/payments/:id` | Delete payment |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | KPIs + trends + recent payments |

---

## Interest Calculation Formulas

### Simple Interest
```
SI = (P × R × T) / 100
Total = P + SI
```

### Compound Interest
```
A = P × (1 + R/n)^(n×T)
Interest = A - P

Where:
  n = compounding periods per year
      daily=365, monthly=12, yearly=1
  T = effective time in years (excluding pause periods)
```

### EMI
```
EMI = [P × r × (1+r)^n] / [(1+r)^n - 1]

Where:
  r = monthly rate = annual_rate / 100 / 12
  n = tenure in months
```

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| `arc-400` | `#00e5ff` | Primary accent, CTAs, live indicators |
| `aurum-400` | `#ffbb33` | Interest / gold metrics |
| `verdant-400` | `#00e676` | Success, recovered amounts |
| `plasma-400` | `#ff4d6d` | Danger, outstanding balances |
| `void-900` | `#020408` | Background base |
| Font Display | Syne | Headings, KPI values |
| Font Body | DM Sans | UI text |
| Font Mono | JetBrains Mono | Numbers, codes, labels |

---

## Production Deployment

### Frontend build
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

### Backend
- Set `NODE_ENV=production`
- Use a strong `JWT_SECRET` (64+ char random string)
- Use MongoDB Atlas for cloud DB
- Deploy on Railway, Render, or VPS

### Reverse proxy (nginx example)
```nginx
location /api/ {
    proxy_pass http://localhost:5000/api/;
}
location / {
    root /path/to/frontend/dist;
    try_files $uri /index.html;
}
```

---

## Demo Credentials
```
Email:    admin@loandashboard.com  
Password: Admin@123456
```

---

Built with precision. All interest calculations mirror exactly between server and client for zero-drift real-time display.
