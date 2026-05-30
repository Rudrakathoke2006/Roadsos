# RBU Sports Facility Usage & Issuance Register

A high-performance, university-grade Gymkhana Operations dashboard, inventory allocation tracking flow and secured gate-pass verification platform designed for Ramdeobaba University (RBU).

## System Stack

- **Backend / Engine**: FastAPI (Python 3.11-slim) with SQLAlchemy 2 (async database adapter) and Uvicorn.
- **Frontend / Admin Console**: React SPA (Vite) styled with high-performance responsive Tailwind CSS.
- **Mobile Handheld Client**: Flutter application utilizing `mobile_scanner` capturing secure, signed expirable gateway tokens.
- **Database / Store**: PostgreSQL 16 on alpine engine executing custom physical UUID primary mapping keys.
- **Reverse Proxy Gateways**: Nginx routing port `/api/` to ASGI/Uvicorn, and `/` directly serving React bundles over port `80`.

---

## 🏃 Quick Start (One Command Startup)

Boots up all central micro-services (Db, FastAPI backend, React Frontend compiled static assets and Nginx reverse proxy routing) under a unified sandbox running on standard machine docker engine:

```bash
docker-compose up --build
```

---

## 🌐 Portal Endpoints

Once docker boots, all local entry points compile on machine loopbacks without CORS friction:

- **Interactive Admin Console**: [http://localhost](http://localhost) (routes to React)
- **FastAPI Core Service Docs (Swagger)**: [http://localhost/api/v1/docs](http://localhost/api/v1/docs)
- **Database Service Status**: [http://localhost/api/v1/health](http://localhost/api/v1/health)

---

## 🔑 Default Seed Credentials

Sovereign database users seeded inside `init.sql` for Gymkhana operational managers:

- **E-Mail Access**: `admin@rbu.edu.in`
- **Security Password**: `rbuadmin123`
- **Authorized Role**: `SUPER_ADMIN`

*Other initial mock students and equipment are successfully seeded on first startup for immediate testing flow.*

---

## 📊 Core Features Operational Guide

### 1. Unified Sports Inventory
Allows adding, editing stock quantity pools, and reporting wear states (Excellent, Good, Weak, Damaged) of sports gears. System guards inventory pools from deletion if currently loaned to a registered scholar.

### 2. High Speed Equipment Check-out
Links active scholar registrations directly to inventory pools. Reduces quantity available upon checkout execution, generates a signed securely hashed expirable QR pass-token.

### 3. Expirable Gate-Pass Scanner Checkpoint
Generates checking QR code imagery via real-time API. Guard/Gymkhana leads can scan standard check-out code terminals on security gates. Verification automatic and releases checkouts, incrementing inventory pool instantly.

### 4. Excel Register export
Download standard university-grade spreadsheets (styled dynamically with classic Maroon accents and Calibri displays) reporting details, student phone, borrow timings and returned logs:
- **Button link**: Click **Export Excel Register** in the top right of the Overview Insights screen.
- **Direct API path**: Hit [http://localhost/api/v1/issuances/export](http://localhost/api/v1/issuances/export) on browser tab.
