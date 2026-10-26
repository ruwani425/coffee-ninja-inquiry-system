# ☕ Coffee Ninja — Customer Inquiry Management System

A reliable, full-stack web application designed for coffee service businesses to track customer inquiries, assign handlers, prevent lost tickets, and manage status lifecycles from submission to resolution.

Built for the **Coffee Ninja Full-Stack Developer Technical Assessment**.

---

## 🚀 Tech Stack

- **Frontend**: React 18, Vite, Vanilla CSS Design System, Lucide Icons
- **Backend**: Node.js (v20+ / ES Modules), Express
- **Database**: PostgreSQL 16 (via Docker Compose)
- **Testing**: Node.js Test Runner & Supertest (Backend), Vitest & React Testing Library (Frontend)

---

## 🔑 Seeded Test Accounts

The database comes pre-seeded with three accounts to test different roles and ownership access rules:

| Name | Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Sarah Jenkins** | Support Agent | `sarah@coffeeninja.com` | `NinjaPass123!` | Unassigned tickets + tickets assigned to Sarah |
| **Alex Rivera** | Support Agent | `alex@coffeeninja.com` | `NinjaPass123!` | Unassigned tickets + tickets assigned to Alex |
| **Elena Rostova** | Supervisor | `elena@coffeeninja.com` | `NinjaBoss123!` | Full unrestricted access across all tickets |

> 💡 **Tip:** On the login screen, convenient one-click "Quick Fill" buttons are provided to instantly log in as any of the above staff members.

---

## 🛠️ Quick Start & Local Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20 or higher)
- [Docker & Docker Compose](https://www.docker.com/) (for PostgreSQL)

### 2. Start PostgreSQL Database
```bash
docker compose up -d
```
*(Runs Postgres 16 on `localhost:5432` with database `coffee_ninja_db`)*

### 3. Install Dependencies
```bash
# In backend/
cd backend
npm install

# In frontend/
cd ../frontend
npm install
```

### 4. Initialize Schema & Seed Data
```bash
cd backend
npm run db:seed
```

### 5. Run Backend & Frontend Servers
In terminal 1 (Backend API):
```bash
cd backend
npm run dev
# Starts Express API at http://localhost:5000
```

In terminal 2 (Frontend App):
```bash
cd frontend
npm run dev
# Starts Vite React App at http://localhost:3000
```

Now open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Running Tests

Both backend and frontend include purposeful automated test suites verifying business rules, security permissions, and UI states.

### Run Backend Tests (Supertest & Node Test Runner)
```bash
cd backend
npm test
```
**Tests verified:**
1. Unauthorized request rejected with `401 Unauthorized`
2. Agent blocked from accessing another agent's assigned inquiry (`403 Forbidden` - Situation 3)
3. Supervisor allowed access to any inquiry
4. Missing input validation errors (`400 Bad Request` - Situation 1)
5. Stale data optimistic concurrency conflict rejection (`409 Conflict` - Situation 2)
6. Invalid status transitions rejected (e.g. `New -> Resolved` directly)
7. Non-existent inquiry returns `404 Not Found`
8. Malformed ID returns `400 Bad Request`

### Run Frontend Tests (Vitest & React Testing Library)
```bash
cd frontend
npm test
```
**Tests verified:**
1. StatusBadge rendering and styling across lifecycle states
2. Form validation error guidance for required inputs (Situation 1)
3. Filter interactions: search keyword debounce and status tab switching

---

## 🎯 Demonstrating The Three Real-World Situations

### Situation 1: Missing or Invalid Information
1. Click **"Record New Inquiry"**.
2. Leave fields blank or input an invalid email/phone and click **"Save Inquiry"**.
3. **Observe**: The UI highlights required fields with clear guidance messages. If bypassed directly via API `POST /api/inquiries`, the backend rejects with `400 Bad Request` and field-by-field error details.

### Situation 2: Two Browser Tabs with Stale Data
1. Open two browser tabs logged in as **Sarah Jenkins**.
2. In Tab 1, open inquiry #1 ("Cold brew batch sour taste") and click **"Mark as Resolved"**.
3. In Tab 2, without refreshing, try to click **"Mark as Resolved"** or edit.
4. **Observe**: The backend checks `expected_version` against `inquiry.version` and rejects the stale write with `409 Conflict`. Tab 2 renders a prominent **"Stale Data Detected"** warning banner with a 1-click **"Reload Latest"** button.

### Situation 3: Direct Link Access Enforcement
1. Log in as **Alex Rivera** (`alex@coffeeninja.com`). Alex cannot access tickets assigned to Sarah.
2. Directly navigate to an inquiry assigned to Sarah via URL query parameter:
   `http://localhost:3000/?inquiry=1`
3. **Observe**: The server independently verifies `assigned_to` and returns `403 Forbidden`. The frontend renders a clean **"Access Denied (403 Forbidden)"** security notice explaining the access restriction.
