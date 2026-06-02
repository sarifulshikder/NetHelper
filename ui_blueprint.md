# NetHelper UI & Frontend Integration Blueprint
> **Ecosystem:** Next.js (App Router), Tailwind CSS, Shadcn/ui, Axios/TanStack Query.
> **Purpose:** Connecting the 100+ NestJS backend endpoints into a beautiful, scannable corporate ISP Dashboard.

---

## 📊 Global UI Progress Ledger

| Phase | Module / Screen Context | Status | Key API Connections |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Auth, Tenant Routing & Super Admin Panel | [ ] NOT STARTED | `/auth/login`, `/tenants` |
| **Phase 2** | Customer CRM, Billing Layouts & Wallet UI | [ ] NOT STARTED | `/customers`, `/billing/invoices` |
| **Phase 3** | GIS Fiber Map View & Helpdesk Ticketing | [ ] NOT STARTED | `/gis/trace`, `/tickets` |
| **Phase 4** | Customer Self-Service Portal & Telemetry Graphs | [ ] NOT STARTED | `/portal/profile`, `/portal/usage` |
| **Phase 5** | AI Insights, BI Report Builder & Security Logs | [ ] NOT STARTED | `/ai/churn`, `/bi/reports` |

---

## 🏛️ UI Layout Architecture & Pages Directory

### 1. Multi-Tenant Dynamic Routing
- URL Structure: `https://app.nethelper.com/` (Subdomain or Context header will detect tenant via Next.js Middleware).
- All API requests must append the `X-Tenant-Id` or dynamic domain mapping header.

### 2. Screen Breakdown & Components

#### 🔑 Authentication Pages (`/login`, `/reset-password`)
- Role-based redirection logic (If Super Admin -> redirect to `/admin`, If Customer -> redirect to `/portal`).

#### 🏢 Admin/Staff Dashboard (`/dashboard/*`)
- **Overview Area:** Real-time MRR, Active/Suspended counters, Open Tickets list (using `/analytics/overview`).
- **CRM & Billing:** Interactive tables with server-side pagination for Customers and Invoices.
- **GIS Mapping Sheet:** Integration with `react-leaflet` or `google-maps` to draw fiber paths and POP nodes using coordinates from `/gis/trace`.
- **AI Copilot Center:** Ticket details view with side-panel showing AI-generated resolution suggestions.

#### 📱 Customer Portal (`/portal/*`)
- Mobile-responsive portal layout.
- Quick bKash/Stripe "Pay Now" button mapped to `/portal/invoices/:id/pay`.
- Bandwidth usage line chart (using Recharts or Chart.js) consuming `/portal/usage` simulation telemetry.

---

## 🛠️ Code of Conduct for UI Implementation
1. **No Fake JSON Mocking:** Every single component must use dynamic states fetching from the running NestJS API.
2. **Strict RBAC Visibility:** Buttons like "Delete Tenant" or "Override Balance" must be conditionally hidden unless the user's decrypted JWT payload matches the required role.
3. **Optimistic Updates & Skeleton Loaders:** Use Shadcn skeleton layouts for loading states to prevent jarring screen shifts.
