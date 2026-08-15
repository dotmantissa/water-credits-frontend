# Roadmap

This document tracks the current status of the project and planned work. Last updated: August 2026. Open a [discussion](https://github.com/water-credits/water-credits-frontend/discussions) if you want to propose changes or reprioritise.

---

## Current Status — Beta

The frontend is in active development against the testnet backend. The scaffold and core infrastructure are complete; the remaining work is API wiring, test coverage, and production hardening. The app is **not yet production-ready** — see known limitations below.

---

## ✅ Completed

### Foundation
- [x] Angular 21 project scaffold with standalone components
- [x] Tailwind CSS + SCSS design system (dark-mode first, CSS custom properties)
- [x] Routing with lazy-loaded feature modules and role guards (`AuthGuard`, `RoleGuard`)
- [x] `PendingChangesGuard` — blocks navigation away from unsaved wizard forms
- [x] Freighter wallet integration (connect, sign challenge, sign transaction, network/address change listeners)
- [x] JWT authentication flow (login, register, silent token refresh)
- [x] `SessionBusService` — 401 event bus to break DI cycle between `ApiService` and NgRx store
- [x] WebSocket service (Socket.IO) with reconnection logic and project subscribe/unsubscribe
- [x] ESLint + Prettier + commitlint + Husky pre-commit hooks

### NgRx Store — Full Implementation
- [x] **Auth** — actions, reducer, selectors, effects (login, logout, refresh, force-logout on 401, wallet connect/disconnect)
- [x] **Projects** — actions, reducer, selectors, effects (load list, load detail, create)
- [x] **Sensors** — actions, reducer, selectors, effects (load history, real-time WebSocket readings & alerts)
- [x] **Credits** — actions, reducer, selectors, effects (load portfolio, retire)
- [x] **Retirement** — actions, reducer, selectors, effects (load list, load detail, retire credits, download certificate)
- [x] **Marketplace** — actions, reducer, selectors, effects (load listings, load order book, create listing, buy, cancel order, load price history)
- [x] **Governance** — actions, reducer, selectors, effects (load proposals, load detail, create proposal, cast vote, execute proposal)
- [x] **Farmers** — actions, reducer, selectors, effects (load dashboard, load parcels, register parcel, load practices, enroll practice, load earnings)
- [x] **Admin** — actions, reducer, selectors, effects (load users, update roles, load oracles, update fees)
- [x] **Analytics** — actions, reducer, selectors, effects (load overview, credits over time, price history)
- [x] **Wallet** — actions, reducer, selectors (connect, disconnect, network/address sync)
- [x] **UI** — actions, reducer, selectors (sidebar toggle, theme, active modal, notifications)
- [x] `CacheInvalidationEffects` — cross-slice cache invalidation triggered by success actions
- [x] `LoadingStateHelper` + `LoadingStateSelector` — shared loading/error state utilities

### Core Services
- [x] `ApiService` — Axios-based HTTP client with JWT interceptor and 401 handling
- [x] `AuthService` — login, register, token management
- [x] `WalletService` — Freighter API wrapper
- [x] `WebsocketService` — Socket.IO client with typed event callbacks
- [x] `ProjectsService`, `SensorsService`, `CreditsService`, `RetirementService`
- [x] `MarketplaceService`, `GovernanceService`, `FarmersService`
- [x] `AdminService` (oracle management, fee config, user management)
- [x] `AnalyticsService` — dashboard overview, credits-over-time, price history
- [x] `OracleService` — oracle node status
- [x] `UsersService` — user role management
- [x] `NotificationService` — toast/in-app notification queue
- [x] `LoggingService` — structured client-side logging
- [x] `CertificatePdfService` — pdfmake-based retirement certificate PDF generation and download
- [x] `SessionBusService` — 401 unauthorised event bus

### Shared Components
- [x] Header, Sidebar, WalletConnect
- [x] DataTable (sortable, paginated), SensorChart (Chart.js multi-line), CreditCard, MapView (Leaflet)
- [x] LoadingSpinner, SkeletonLoader, EmptyState, ConfirmDialog, StatusBadge
- [x] SearchInput, FilterPanel, PaginationControls
- [x] RetireCreditsModal
- [x] LoadingState (generic async wrapper component)

### Shared Pipes & Directives
- [x] `TruncatePipe`, `StellarAddressPipe`, `DateFormatPipe`, `NumberAbbreviatePipe`, `DurationPipe`, `CreditAmountPipe`
- [x] `TooltipDirective`, `ClickOutsideDirective`, `CopyToClipboardDirective`

### Feature Modules (UI scaffolded, store wired)
- [x] **Auth** — login (Freighter wallet flow), register
- [x] **Dashboard** — stats cards, projects map widget, recent retirements widget, credits-over-time chart, sensor alerts, oracle status
- [x] **Projects** — list (map + table view), detail (tabbed: overview / sensors / credits / documents), registration wizard
- [x] **Sensors** — real-time dashboard, historical charts, multi-parameter overlay, raw data table, sensor config
- [x] **Credits** — portfolio view (holdings by project, value), credit detail
- [x] **Marketplace** — listings, order book, create listing, buy flow (`marketplace-buy`), price chart (`marketplace-chart`)
- [x] **Retirement** — retirement wizard form, certificate view, retirement history list
- [x] **Farmers Portal** — farmer dashboard, parcel registration, practice enrollment, earnings
- [x] **Governance** — proposals list, proposal detail (votes, deadline, execute), create proposal form
- [x] **Admin Panel** — admin dashboard, oracle management, fee configuration, user management
- [x] **Explore** — public (unauthenticated) project browser

### Testing
- [x] `AuthEffects` spec
- [x] `SensorsEffects` spec
- [x] `RetirementEffects` spec
- [x] `MarketplaceEffects` spec (comprehensive — 20k file)
- [x] `GovernanceEffects` spec
- [x] `FarmersEffects` spec
- [x] `CreditsReducer` spec
- [x] `CacheInvalidationEffects` spec, `CacheInvalidationService` spec
- [x] `LoadingStateHelper` spec, `LoadingStateSelector` spec
- [x] `AuthGuard` spec, `RoleGuard` spec
- [x] `CertificatePdfService` spec

---

## 🚧 In Progress

- [ ] **Backend API wiring** — replace remaining mock/stub data in feature components with real NgRx dispatch + selector bindings (store layer is done; UI components need to be connected)
- [ ] **Stellar transaction signing** — complete the retire-credits and marketplace buy/sell transaction flows end-to-end (service and store are ready; needs integration testing against testnet)
- [ ] **WebSocket live data in UI** — connect real-time sensor readings from the store to the sensor dashboard and dashboard alert widgets
- [ ] **Unit test coverage** — bring overall coverage to ≥ 80%; remaining gaps are feature components and shared components

---

## 📋 Planned

### v1.0 — Production Release
- [ ] End-to-end tests (Playwright) for critical user journeys: login → retire credits, marketplace buy
- [ ] Accessibility audit (WCAG 2.1 AA) — verify ARIA labels, focus trapping, live regions, keyboard navigation
- [ ] Production environment configuration (`environment.prod.ts` with real contract addresses)
- [ ] Docker image + nginx config (SPA routing, WebSocket proxy, static asset caching)
- [ ] CI/CD pipeline (GitHub Actions: lint → test → build → deploy)
- [ ] PWA service worker (`ngsw-config.json` exists — needs runtime testing and cache strategy tuning)
- [ ] Performance: virtual scrolling (`@angular/cdk`) for sensor data tables and retirement history

### v1.1
- [ ] Light mode theme (toggle exists in store; CSS variables defined but not fully applied)
- [ ] Multi-language support (i18n — Angular `@angular/localize`)
- [ ] Notifications centre (in-app notification preferences + email opt-in settings)
- [ ] Advanced marketplace: candlestick price chart, order history CSV export
- [ ] Farmer portal: edge-of-field sensor visualisations (sensor data linked to parcels)
- [ ] Mobile-responsive layout pass — optimise sidebar, tables, and charts for small screens

### v1.2+
- [ ] Governance: on-chain vote submission via Freighter (UI ready; needs Soroban contract integration)
- [ ] ESG report PDF export (multi-retirement summary, similar to certificate-pdf pattern)
- [ ] Multi-wallet support (LOBSTR, xBull)
- [ ] Analytics dashboard for oracle operators (submission history, node health trends)
- [ ] Bundle analysis and optimisation (`webpack-bundle-analyzer` pass, CDN offload for Chart.js / Leaflet)

---

## ⚠️ Known Limitations

- Feature components render store data but many are not yet dispatching real load actions on init — backend wiring is the primary remaining gap.
- The Stellar contract addresses in `environment.ts` are testnet placeholders; mainnet deployment requires updating all four contract addresses.
- Light mode toggle is wired in the store and CSS custom properties are defined, but the `[data-theme="light"]` overrides are not fully propagated across all components.
- Mobile layout is not optimised — the app is designed primarily for desktop dashboards.
- The wallet store's effects (connect/disconnect) dispatch actions but do not yet persist the wallet address across page reloads.
- No CI pipeline is configured yet; all lint, test, and build checks must be run locally.
- `ngsw-config.json` is present but the service worker has not been tested for cache correctness against the real backend API.

---

## Contributing to the Roadmap

Have a feature idea or want to reprioritise something? Open a [GitHub Discussion](https://github.com/water-credits/water-credits-frontend/discussions), reach out on [Telegram (@Escelit)](https://t.me/Escelit), or email [ogazipromise81@gmail.com](mailto:ogazipromise81@gmail.com). See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get involved.
