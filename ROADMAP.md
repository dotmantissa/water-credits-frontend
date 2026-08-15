# Roadmap

This document tracks the current status of the project and planned work. Last updated: August 2026. Open a [discussion](https://github.com/water-credits/water-credits-frontend/discussions) if you want to propose changes or reprioritise.

---

## Current Status — Beta

The frontend is in active development against the testnet backend. Core infrastructure, store, and most feature components are complete. The remaining work is concentrated in: real-time WebSocket wiring, test coverage depth, toast rendering, and production hardening for v1.0.

---

## ✅ Completed

### Foundation
- [x] Angular 21 project scaffold with standalone components
- [x] Tailwind CSS + SCSS design system (dark-mode first, CSS custom properties)
- [x] Routing with lazy-loaded feature modules and role guards (`AuthGuard`, `RoleGuard`)
- [x] `PendingChangesGuard` — blocks navigation away from unsaved wizard forms
- [x] Freighter wallet integration (connect, sign challenge, sign transaction, network/address change listeners)
- [x] JWT authentication flow (login, register, session rehydration on hard refresh)
- [x] `SessionBusService` — 401 event bus to break DI cycle between `ApiService` and NgRx store
- [x] WebSocket service (Socket.IO) with reconnection logic and project subscribe/unsubscribe
- [x] ESLint + Prettier + commitlint + Husky pre-commit hooks
- [x] CI/CD pipeline (GitHub Actions: lint → test → build, concurrency cancellation, coverage artifact upload)
- [x] Docker image — multi-stage `Dockerfile` (Node build + nginx:alpine serve)
- [x] nginx config — SPA fallback, gzip, security headers, 1-year cache on fingerprinted assets

### NgRx Store — Full Implementation
- [x] **Auth** — actions, reducer, selectors, effects (login, logout, session rehydration, force-logout on 401)
- [x] **Projects** — actions, reducer, selectors, effects (load list, load detail, create)
- [x] **Sensors** — actions, reducer, selectors, effects (load devices, real-time WebSocket readings & alerts)
- [x] **Credits** — actions, reducer, selectors, effects (load portfolio, load transactions, retire)
- [x] **Retirement** — actions, reducer, selectors, effects (load list, load detail, retire credits — full two-phase prepare/sign/submit flow)
- [x] **Marketplace** — actions, reducer, selectors, effects (load listings, order book, create listing, buy — full two-phase flow, cancel order)
- [x] **Governance** — actions, reducer, selectors, effects (load proposals, load detail, create proposal, cast vote — full two-phase XDR flow, execute proposal)
- [x] **Farmers** — actions, reducer, selectors, effects (load parcels, register parcel, load farmer overview)
- [x] **Admin** — actions, reducer, selectors, effects (load users, update roles, load oracles, update fees)
- [x] **Analytics** — actions, reducer, selectors, effects (load overview, credits over time, recent retirements)
- [x] **Wallet** — actions, reducer, selectors (connect, disconnect)
- [x] **UI** — actions, reducer, selectors (sidebar toggle, dark mode, notifications queue with unread count)
- [x] `CacheInvalidationEffects` — cross-slice cache invalidation triggered by success actions
- [x] `LoadingStateHelper` + `LoadingStateSelector` — shared loading/error state utilities

### Core Services
- [x] `ApiService` — Axios HTTP client, JWT request interceptor, 401 → `SessionBusService`
- [x] `AuthService` — login, register, token management, fetch current user
- [x] `WalletService` — Freighter API wrapper (connect, signChallenge, signTx, checkConnection)
- [x] `WebsocketService` — Socket.IO client, typed `sensorReadings$` / `sensorAlerts$` observables
- [x] `ProjectsService`, `SensorsService`, `CreditsService`, `RetirementService` (two-phase + legacy fallback)
- [x] `MarketplaceService` (two-phase buy + legacy fallback), `GovernanceService`, `FarmersService`
- [x] `AdminService`, `AnalyticsService`, `OracleService`, `UsersService`
- [x] `NotificationService` — toast queue (BehaviorSubject; renderer component pending — see v1.0 planned)
- [x] `LoggingService` — structured client-side logging
- [x] `CertificatePdfService` — pdfmake PDF generation + QR code, lazy-loaded
- [x] `SessionBusService` — 401 unauthorised event bus

### Shared Components
- [x] Header, Sidebar, WalletConnect
- [x] DataTable (sortable, paginated), SensorChart (Chart.js multi-line time-series), CreditCard, MapView (Leaflet)
- [x] LoadingSpinner, SkeletonLoader, EmptyState, ConfirmDialog, StatusBadge
- [x] SearchInput, FilterPanel, PaginationControls
- [x] RetireCreditsModal, LoadingState (generic async wrapper)

### Shared Pipes & Directives
- [x] `TruncatePipe`, `StellarAddressPipe`, `DateFormatPipe`, `NumberAbbreviatePipe`, `DurationPipe`, `CreditAmountPipe`
- [x] `TooltipDirective`, `ClickOutsideDirective`, `CopyToClipboardDirective`

### Feature Modules
- [x] **Auth** — login (Freighter wallet flow), register
- [x] **Dashboard** — stats cards, projects map widget, recent retirements widget, credits-over-time chart
- [x] **Projects** — list (map + table toggle), detail (tabbed), registration wizard (5-step with `PendingChangesGuard`)
- [x] **Sensors** — dashboard with multi-parameter charts, raw data table, device list, sensor config
- [x] **Credits** — portfolio view (holdings, value, retire action), credit detail
- [x] **Marketplace** — listings, order book, create listing, buy flow (two-phase Freighter), candlestick price chart
- [x] **Retirement** — wizard form, certificate page (HTML + PDF download + print), retirement history list
- [x] **Governance** — proposals list, proposal detail (vote + execute), create proposal form; on-chain vote via Freighter fully wired
- [x] **Farmers Portal** — farmer dashboard, parcel registration (store-wired), BMP practices UI, earnings view
- [x] **Admin Panel** — admin dashboard, oracle management, fee configuration, user management
- [x] **Explore** — public (unauthenticated) project browser

### Stellar Transaction Signing (all three flows fully implemented)
- [x] Retire credits — prepare → Freighter sign → submit, with user-decline detection
- [x] Marketplace buy — prepare → Freighter sign → submit, with user-decline detection
- [x] Governance vote — prepare → Freighter sign → submit, with user-decline detection

### Testing (store layer — thorough)
- [x] `AuthEffects` spec, `SensorsEffects` spec, `RetirementEffects` spec
- [x] `MarketplaceEffects` spec (comprehensive), `GovernanceEffects` spec, `FarmersEffects` spec
- [x] `CreditsReducer` spec
- [x] `CacheInvalidationEffects` spec, `CacheInvalidationService` spec
- [x] `LoadingStateHelper` spec, `LoadingStateSelector` spec
- [x] `AuthGuard` spec, `RoleGuard` spec
- [x] `CertificatePdfService` spec
- [x] Feature component smoke specs (34 spec files — all components instantiate cleanly)

---

## 🚧 In Progress

- [ ] **WebSocket connection lifecycle** — `WebsocketService.connect()` is never called anywhere; socket never opens; all real-time sensor readings and dashboard alerts are silently dead
- [ ] **Toast notification renderer** — `NotificationService` pushes to a `BehaviorSubject` consumed by all effects, but no component renders toasts on screen; every `success`/`error`/`warning` fires into the void
- [ ] **Unit test coverage ≥ 80%** — 34 spec files exist but most feature component specs contain only a `should create` smoke test; component behavioural coverage is the remaining gap
- [ ] **`SensorsDashboard` store bypass** — calls `SensorsService` directly and dispatches success/failure actions itself, bypassing the effect; uses unsafe `(state as any).sensors` cast

---

## 📋 Planned

### v1.0 — Production Release
- [ ] **Fix WebSocket connection lifecycle** — open socket after login/rehydration, close on logout, fix handler-leak in `on<T>()`, remove double-subscription in `SensorsDashboard`
- [ ] **Toast renderer component** — render `NotificationService.notifications$` as dismissible on-screen toasts in `DefaultLayoutComponent`
- [ ] **`environment.prod.ts`** — file does not exist; CI falls back to `environment.ts.example`; all four Stellar contract addresses are `REPLACE_WITH_DEPLOYED_ADDRESS` placeholders
- [ ] **PWA authenticated cache safety** — `ngsw-config.json` caches `/credits/**` and `/analytics/**` with 1-day TTL keyed on URL only; removes cross-session data exposure on shared devices; add `Cache-Control: no-store` for authenticated endpoints in `ApiService`
- [ ] **`CacheInvalidationEffects` pagination reset fix** — replace hardcoded `page: 1` dispatches with stale-flag approach; fix missing `loadFarmerOverview` in farmers invalidation set
- [ ] **Wallet address persistence across reloads** — `WalletState.address` is always `null` after hard refresh; extend `rehydrateSession$` to call `walletService.checkConnection()`; create `WalletEffects` with `onAddressChange`/`onNetworkChange` registration
- [ ] **Extract shared `isUserDeclined` wallet util** — `isUserDeclined()` copy-pasted in `RetirementEffects`, `MarketplaceEffects`, `GovernanceEffects`
- [ ] **BMP practice enrollment wired to store/API** — `FarmerPracticesComponent` uses hardcoded local data; needs `enrollPractice`/`unenrollPractice` actions, effect, and service method
- [ ] **End-to-end tests (Playwright)** — zero e2e setup; critical journeys: login → retire credits, marketplace buy
- [ ] **Accessibility audit (WCAG 2.1 AA)** — no axe tooling; `aria-live` regions missing on real-time components; keyboard navigation unverified
- [ ] **Performance: virtual scrolling** — no `@angular/cdk/scrolling` usage yet; needed for sensor data tables and retirement history at scale

### v1.1
- [ ] **Light mode theme** — toggle is store-wired and CSS custom properties exist; preference not persisted to `localStorage` (resets to dark on every reload); component-level `[data-theme="light"]` coverage incomplete
- [ ] **Notifications centre** — header bell icon does nothing on click; needs in-app notification panel with read/unread state, `markNotificationsRead` dispatch, and email opt-in preferences
- [ ] **Mobile-responsive layout** — sidebar, data tables, and Chart.js canvases not optimised for small screens
- [ ] **Farmer portal: BMP edge-of-field sensor visualisations** — sensor readings linked to individual parcels, per-parcel `SensorChart` instances
- [ ] **Marketplace: order history CSV export** — export filled/cancelled orders from the order book view
- [ ] **Multi-language support (i18n)** — Angular `@angular/localize`; no strings extracted yet

### v1.2+
- [ ] **ESG report PDF export** — multi-retirement summary PDF (pattern established by `CertificatePdfService`)
- [ ] **Multi-wallet support** — LOBSTR, xBull alongside Freighter
- [ ] **Analytics dashboard for oracle operators** — submission history, node health trends, uptime charts
- [ ] **Bundle analysis and optimisation** — `webpack-bundle-analyzer` pass; evaluate CDN offload for Chart.js / Leaflet; deferred loading for pdfmake

---

## ⚠️ Known Limitations

- **Real-time data is dead** — `WebsocketService.connect()` is never called; sensor readings and dashboard alerts do not stream until the WebSocket lifecycle is fixed.
- **No toasts on screen** — all effect notifications (`NotificationService.success/error/warning`) are silently queued but never rendered; users see no feedback on any action result.
- **Wallet address lost on reload** — `WalletState.address` is always `null` after a page refresh even with a valid session; header shows "Connect Wallet" for an already-authenticated user.
- **No `environment.prod.ts`** — CI uses `environment.ts.example` as a stand-in; all four Stellar contract addresses are `REPLACE_WITH_DEPLOYED_ADDRESS` placeholders.
- **PWA cache is unsafe for production** — service worker caches authenticated endpoints with a 1-day TTL keyed on URL only; cross-user data exposure risk on shared devices.
- **Light mode preference resets on reload** — not persisted to `localStorage`; `isDarkMode` always initialises to `true`.
- **Mobile layout unoptimised** — designed primarily for desktop dashboards; tables, charts, and sidebar overflow on small screens.
- **`SensorsDashboard` bypasses the store** — uses `(state as any).sensors` unsafe cast and calls the HTTP service directly, breaking the unidirectional data-flow contract.

---

## Contributing to the Roadmap

Have a feature idea or want to reprioritise something? Open a [GitHub Discussion](https://github.com/water-credits/water-credits-frontend/discussions), reach out on [Telegram (@Escelit)](https://t.me/Escelit), or email [ogazipromise81@gmail.com](mailto:ogazipromise81@gmail.com). See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get involved.
