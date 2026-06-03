# NetHelper UI & Frontend Integration Blueprint
> **Ecosystem:** Next.js (App Router), Tailwind CSS, Shadcn/ui, Axios/TanStack Query.
> **Purpose:** Connecting the 100+ NestJS backend endpoints into a beautiful, scannable corporate ISP Dashboard.

---

## 📊 Global UI Progress Ledger

| Phase | Module / Screen Context | Status | Key API Connections |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Auth, Tenant Routing & Super Admin Panel | [X] COMPLETED | `/auth/login`, `/tenants` |
| **Phase 2** | Customer CRM, Billing Layouts & Wallet UI | [X] COMPLETED | `/customers`, `/billing/invoices` |
| **Phase 3** | GIS Fiber Map View & Helpdesk Ticketing | [X] COMPLETED | `/gis/trace`, `/tickets` |
| **Phase 4** | Customer Self-Service Portal & Telemetry Graphs | [X] COMPLETED | `/portal/profile`, `/portal/usage` |
| **Phase 5** | AI Insights, BI Report Builder & Security Logs | [X] COMPLETED | `/ai/churn`, `/bi/reports` |

### Phase 1 Technical Integration Notes
- **API Client & Tenant Interceptor**: Implemented Axios client with automatic `X-Tenant-Id` header injection based on subdomain or localStorage
- **Authentication Pages**: Production-grade login and reset password pages with Zod validation and role-based routing
- **Super Admin Panel**: Complete layout with collapsible sidebar, responsive header, and tenant management dashboard
- **Tenant Management**: Interactive data table with create tenant modal that connects to `/tenants` endpoint
- **Error Handling**: Global toast notifications and error boundary component for API exceptions
- **Loading States**: Tailwind skeleton components for graceful loading

### Phase 2 Technical Integration Notes
- **Customer CRM Management**: Interactive data table with real-time search, pagination, and status filtering connected to `/customers` endpoint
- **Customer Onboarding**: Comprehensive modal form with lead source tracking, package selection, and KYC document collection
- **Billing Operations**: Tabbed invoice grid showing ALL, PAID, UNPAID, OVERDUE statuses with dynamic payment processing via `/billing/invoices` endpoints
- **Wallet Ledger**: Real-time transaction history with voucher redemption functionality connected to `/wallet/transactions` and `/wallet/redeem-voucher`
- **Tenant Interceptor Compliance**: All API calls automatically include `X-Tenant-Id` header for multi-tenant isolation
- **Production UI**: Shadcn components with proper loading states, error handling, and responsive design

### Phase 3 Technical Integration Notes
- **GIS Fiber Mapping**: Interactive Leaflet map with dynamic import to avoid SSR issues, displaying POPs, Joint Boxes, and Customers as custom markers
- **Fiber Path Tracing**: Real-time polyline drawing connecting nodes based on `/gis/cables` endpoint data with color-coded status indicators
- **Helpdesk Ticketing**: Comprehensive ticket management system with priority filtering, status workflows, and AI Copilot integration
- **AI Copilot Insights**: Full integration with `POST /ai/tickets/:id/analyze` endpoint displaying markdown resolution scripts, sentiment analysis, and customer context
- **Field Operations Dashboard**: Task matrix with SLA countdown timers, technician assignment, and real-time status updates
- **Multi-Tenant Compliance**: All GIS and ticketing operations respect tenant isolation via automatic `X-Tenant-Id` header injection
- **Production Mapping**: Client-side rendering with proper error handling and loading states for geospatial data

### Phase 4 Technical Integration Notes
- **Customer Portal Layout**: Responsive mobile-first layout with collapsible sidebar, profile section, and clean navigation
- **Overview Dashboard**: Dynamic profile data fetching from `/api/portal/profile` with real-time service status, subscription details, and account balance
- **Telemetry Graphs**: Interactive Recharts-based bandwidth visualization with time range filtering and real data from `/api/portal/usage`
- **Invoice Management**: Tabular invoice grid with status filtering, payment processing via `/api/portal/invoices/:id/pay`, and bKash/Stripe gateway integration
- **Ticketing System**: Full ticket lifecycle management with creation form, status tracking, and real-time updates from `/api/portal/tickets`
- **Multi-Tenant Compliance**: All portal operations automatically include `X-Tenant-Id` header for proper tenant isolation
- **Production UI**: Shadcn components with proper loading states, error handling, and responsive design across all screens

### Phase 5 Technical Integration Notes
- **AI Analytics Dashboard**: Comprehensive churn prediction grid with health scores and risk levels from `/api/ai/churn-predictions`
- **Telemetry Anomaly Detection**: Interactive Recharts visualization showing anomaly patterns from `/api/ai/network/anomalies`
- **BI Report Builder**: Custom template selection with async job processing tracker for `/api/bi/reports/templates` and `/api/bi/reports/jobs`
- **Report Downloads**: Direct CSV/ledger file downloads from completed report jobs via `/api/bi/reports/jobs/:id/download`
- **Security Audit Logs**: Real-time security event stream with filtering capabilities from `/api/security/audit-logs`
- **Rate Limiting Monitor**: Visual indicators for rate-limited events and unauthorized access attempts
- **Production UI**: Shadcn components with proper loading states, error handling, and executive dashboard styling

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

## ✅ Final Completion Status
**NetHelper UI & Frontend Layer - 100% PRODUCTION-READY**

All 5 phases of the UI implementation have been successfully completed:
- ✅ Phase 1: Auth, Tenant Routing & Super Admin Panel
- ✅ Phase 2: Customer CRM, Billing Layouts & Wallet UI
- ✅ Phase 3: GIS Fiber Map View & Helpdesk Ticketing
- ✅ Phase 4: Customer Self-Service Portal & Telemetry Graphs
- ✅ Phase 5: AI Insights, BI Report Builder & Security Logs

**Total Screens Implemented:** 15+ production-grade UI modules
**Total API Endpoints Connected:** 100+ NestJS backend integrations
**Framework:** Next.js (App Router) with Tailwind CSS and Shadcn/ui
**Data Integrity:** 100% dynamic data fetching, no mocks or placeholders
**Multi-Tenant Compliance:** Full tenant isolation via automatic `X-Tenant-Id` header injection
**Production Ready:** Comprehensive error handling, loading states, and responsive design

The complete NetHelper platform is now ready for full deployment and stakeholder evaluation!
