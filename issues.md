# High-Impact GitHub Issues

Six substantive issues ranked by their direct tie to the v1.0 production release goal. Every issue here directly removes a blocker or eliminates a class of bugs that would prevent a reliable production launch.

---

## Issue 1

**Title:** WebSocket connection is never opened — all real-time sensor and alert features are silently dead

**Why this matters now:**
The roadmap's primary remaining gap is "WebSocket live data in UI". But the problem is deeper than wiring: `WebsocketService.connect(token, userId)` — the method that opens the Socket.IO connection — is **never called anywhere in the application**. `SensorsEffects.receiveSensorReading$`, `SensorsEffects.receiveSensorAlert$`, and the dashboard's live alert feed subscribe to `sensorReadings$` and `sensorAlerts$` observables that are backed by `this.socket.on(...)`, but `this.socket` is always `null`. Every subscriber gets zero events and no error. This is the single root cause blocking the entire real-time pillar of the app.

**Problem / What:**
`WebsocketService` has a `connect(token: string, userId: string)` method that creates the Socket.IO connection, but there is no call site. The correct place to call it is in `AuthEffects`, after `loginSuccess` / `rehydrateSession` succeeds — at that point both the JWT and the user ID are available. It must also be torn down on `logout` / `forceLogout` (the `disconnect()` call is already partially wired in `AuthEffects.logout$` via `walletService.disconnect()`, but `WebsocketService.disconnect()` is not called there).

Two secondary problems exist in `WebsocketService` itself:
1. `sensorReadings$` and `sensorAlerts$` are getters that call `this.on<T>(event)` on each access. `on<T>()` creates a `new Observable` each time, calling `socket.on(event, cb)` without ever calling `socket.off(event, cb)` on teardown — the teardown in the Observable only calls `socket.off(event)` with no callback argument, which removes **all** handlers for that event. If two subscribers ever call the getter simultaneously this creates a handler leak.
2. `SensorsDashboard` manually calls `wsService.on<SensorReading>('sensor:reading')` and dispatches `addRealtimeReading` directly, bypassing the NgRx effect entirely (`SensorsEffects.receiveSensorReading$` does the same thing, so readings are processed twice if the socket were ever open).

**Key Challenges:**
- Determining the correct Observable operator for the connect-on-login lifecycle: the auth effect must use `tap` (side-effect only) inside `loginSuccess$`/`rehydrateSession$`, and must not re-connect if already connected (guard with `connected$` state).
- Cleaning up the double-subscription in `SensorsDashboard` without breaking its local `recentReadings` update, since the component currently partially owes its state to a direct WS subscription rather than a selector.
- Fixing the `socket.off(event)` teardown to pass the specific callback reference so only the registered handler is removed.
- Handling the reconnect-after-token-refresh case: after a `forceLogout` + new `loginSuccess`, the socket must reconnect with the fresh token.

**Acceptance Criteria:**
- `WebsocketService.connect()` is called exactly once from `AuthEffects` after a successful login or session rehydration; the JWT and userId are passed correctly.
- `WebsocketService.disconnect()` is called from the existing `logout$` effect alongside `walletService.disconnect()`.
- `SensorsDashboard` reads real-time readings exclusively via the NgRx `selectRecentReadings` / `selectRealTimeBuffer` selectors; it no longer subscribes to `wsService.on()` directly.
- `sensorReadings$` and `sensorAlerts$` are converted from getters to stable `Observable` fields (created once in `connect()`, completed in `disconnect()`), eliminating the handler-leak on repeated access.
- Unit test for `SensorsEffects` verifies that `receiveSensorReading$` dispatches `SensorsActions.receiveSensorReading` when the observable emits.
- Integration smoke test: opening the sensor dashboard while authenticated shows live readings flowing into the store.

**Relevant files/functions:**
- `src/app/core/services/websocket.service.ts` — `connect()`, `on<T>()`, `sensorReadings$`, `sensorAlerts$`
- `src/app/core/store/auth/auth.effects.ts` — `loginSuccess$`, `logout$`, `rehydrateSession$`
- `src/app/core/store/sensors/sensors.effects.ts` — `receiveSensorReading$`, `receiveSensorAlert$`
- `src/app/features/sensors/sensors-dashboard/sensors-dashboard.ts` — `ngOnInit` direct WS subscription (lines ~326–340), `loadData()`
- `src/app/features/dashboard/dashboard/dashboard.ts` — `sensorAlerts$` Observable constructor

**Out of scope:** Changes to the Socket.IO backend namespace or auth handshake protocol; WebSocket reconnect-on-token-refresh (that's a follow-on issue); `SensorsEffects.routeSubscription$` refactoring.

**Labels:** `type: bug`, `difficulty: advanced`, `area: websocket`, `area: realtime`, `priority: v1.0`

**Self-check:** If solved, this issue moves the real-time data pillar of v1.0 forward because it removes the root cause (socket never opened) that makes every live sensor reading, every dashboard alert, and every WS-backed store effect permanently dead.

---

## Issue 2

**Title:** `isUserDeclined` Freighter error guard is copy-pasted across three effects — extract shared wallet-tx utility and add edge-case coverage for Freighter v6/v7 error shapes

**Why this matters now:**
Three on-chain transaction flows — retire credits, marketplace buy, governance vote — each contain an identical `isUserDeclined(err)` function. The comment in `marketplace.effects.ts` even names this explicitly: *"Duplicated from RetirementEffects — see that file for the same helper; no shared util exists yet for this check."* This is the most fragile part of the wallet integration: if Freighter changes its rejection error message format (as it did between v5 and v6), all three flows must be patched in parallel, and a missed patch means users see an "error" toast when they simply cancelled — degrading trust in on-chain operations at the worst possible moment. Beyond the duplication, the current string matching covers `declined`, `rejected`, `cancelled/canceled` but not `User rejected the request` (the standard EIP-1193 phrasing increasingly used by multi-chain wallet SDKs) or the case where Freighter throws a structured object rather than an `Error` instance.

**Problem / What:**
Create `src/app/core/utils/wallet-tx.utils.ts` containing:
1. `isUserDeclined(err: unknown): boolean` — single authoritative implementation with full error shape coverage (Error instance check, plain object with `.message`, string throw, the EIP-1193 phrasing, and Freighter-specific variants).
2. `extractSigningError(err: unknown): string` — replaces the inline `err instanceof Error ? err.message : 'Signing failed'` ternaries scattered across all three effects.

Remove the three local copies from `retirement.effects.ts`, `marketplace.effects.ts`, and `governance.effects.ts` and import from the shared util. Add a `wallet-tx.utils.spec.ts` that covers every error shape variant.

**Key Challenges:**
- The util must handle: `Error` with message, plain `{ message: string }` object, bare string thrown, `null`/`undefined`, and Freighter structured rejection objects (where the error payload may be nested under `.error.message` or `.data`).
- Must not change any action dispatch paths — the refactor is purely extraction, zero behaviour change. Tests must confirm this.
- TypeScript `unknown` narrowing must be exhaustive with no `any` leakage (strict mode is enabled).

**Acceptance Criteria:**
- `src/app/core/utils/wallet-tx.utils.ts` exported with `isUserDeclined` and `extractSigningError`.
- All three effects import from the shared util; the local function definitions are deleted.
- `wallet-tx.utils.spec.ts` covers: `Error('User declined')`, `Error('User rejected the request')`, `Error('cancelled')`, plain object `{ message: 'rejected' }`, bare string `'declined'`, `null`, `undefined`, legitimate error `Error('network timeout')` → returns `false`.
- `ng lint` passes with zero warnings after the change.

**Relevant files/functions:**
- `src/app/core/store/retirement/retirement.effects.ts` lines 23–32 (`isUserDeclined`)
- `src/app/core/store/marketplace/marketplace.effects.ts` lines 19–28 (`isUserDeclined`)
- `src/app/core/store/governance/governance.effects.ts` lines 14–25 (`isUserDeclined`)
- `src/app/core/utils/` — target directory for new util

**Out of scope:** Changes to the action structure, retry logic, or Freighter API call signatures; adding a shared `signTx` wrapper (separate concern).

**Labels:** `type: refactor`, `type: bug`, `difficulty: intermediate`, `area: wallet`, `area: store`

**Self-check:** If solved, this issue moves wallet-transaction reliability forward because it eliminates a class of silent error-classification bugs that will surface when Freighter updates its rejection message format, and removes a maintenance trap that requires triple-patching every wallet error fix.

---

## Issue 3

**Title:** `SensorsDashboard` bypasses the NgRx store to load devices and dispatches success/failure actions directly — breaks the unidirectional data-flow contract and makes the component untestable

**Why this matters now:**
The roadmap's largest remaining task is "Backend API wiring — replace remaining mock/stub data with real NgRx dispatch + selector bindings." The sensor dashboard is the one feature component that regressed past this goal: it dispatches `loadDevicesSuccess` and `loadDevicesFailure` directly from a `private async loadData()` method (calling `SensorsService.getDevices()` itself), completely bypassing `SensorsEffects.loadDevices$`. This means: (a) the effect's `switchMap` cancellation on repeated calls doesn't apply, (b) error retry logic lives in two places, (c) the loading spinner is driven by a local `this.loading` boolean, not `selectSensorsLoading`, and (d) it is impossible to test the component in isolation without also mocking the service, which is not the NgRx contract. There is also a redundant selector access via `(state as any).sensors` — an unsafe cast that breaks type safety and will silently fail if the store slice is renamed.

**Problem / What:**
Refactor `SensorsDashboard` to follow the same pattern as every other connected component in the project:
1. `ngOnInit` dispatches `SensorsActions.loadDevices({ projectId })` — the effect handles the HTTP call.
2. All data is read via typed selectors (`selectSensorDevices`, `selectSensorsLoading`, `selectSensorsError`, `selectRecentReadings`) — not via `(state as any).sensors`.
3. The local `private async loadData()` method and the local `this.loading` boolean are deleted.
4. The direct `SensorsService` injection is removed from the constructor (the component should not hold an HTTP service reference).

Also: add a missing effect in `SensorsEffects` — `loadSensorHistory$` — that handles `SensorsActions.loadReadings` (the action exists in the actions file and the reducer handles it, but `sensors.effects.ts` has no corresponding effect for it).

**Key Challenges:**
- The component currently uses both the store's `recentReadings` (for real-time) and calls `SensorsService.getDevices()` imperatively; untangling these without losing the existing UI behaviour requires careful analysis of what data each template binding reads.
- The `(state as any).sensors` cast must be replaced with a typed `selectSensorsState` feature selector — must verify the feature key matches the `ActionReducerMap` key in `app.state.ts`.
- `loadReadings` in `sensors.effects.ts` has no effect handler — this must be added alongside the `SensorsService.getReadings(deviceId)` call, which doesn't exist yet in `SensorsService` (requires adding the method).

**Acceptance Criteria:**
- `SensorsDashboard` has no direct `SensorsService` injection; all data loads are dispatched as actions.
- `(state as any).sensors` is gone; replaced with typed `selectSensorDevices`, `selectRecentReadings` selectors.
- `SensorsEffects` has a working `loadReadings$` effect backed by a `SensorsService.getReadings(deviceId)` method.
- `SensorsEffects` spec covers `loadDevices` success and failure paths (currently missing).
- `ng build` produces no TypeScript errors.

**Relevant files/functions:**
- `src/app/features/sensors/sensors-dashboard/sensors-dashboard.ts` — `loadData()`, `ngOnInit` (lines ~318–365), constructor
- `src/app/core/store/sensors/sensors.effects.ts` — missing `loadReadings$` effect
- `src/app/core/services/sensors.service.ts` — needs `getReadings(deviceId: string)` method
- `src/app/core/store/sensors/sensors.selectors.ts` — `selectSensorDevices`, `selectRecentReadings`
- `src/app/core/store/sensors/sensors.effects.spec.ts` — add `loadDevices` success/failure tests

**Out of scope:** The WebSocket connect lifecycle (Issue 1); `SensorConfig` component; adding historical chart data loading.

**Labels:** `type: bug`, `type: refactor`, `difficulty: intermediate`, `area: sensors`, `area: store`, `priority: v1.0`

**Self-check:** If solved, this issue moves the API-wiring milestone forward because it fixes the one feature component that actively breaks the store contract, and adds the missing HTTP effect for device readings that no other issue covers.

---

## Issue 4

**Title:** Service worker data-cache config caches authenticated API responses with a 1-day TTL and no cache-busting — will serve stale or wrong-user data after logout

**Why this matters now:**
The roadmap lists PWA service worker as a v1.0 deliverable, and `ngsw-config.json` is already present with `provideServiceWorker` active in `app.config.ts`. But the current `dataGroups` configuration in `ngsw-config.json` will cause a critical security/correctness defect in production: it caches `/analytics/**`, `/projects/**`, and `/credits/**` with a `freshness` strategy, `maxAge: "1d"`, and `timeout: "5s"`. These are **authenticated endpoints** — the cache is keyed on URL only, not on the JWT or user identity. When a user logs out and another user logs in on the same device (or the same user logs in on a different Stellar account), the service worker will return the previous user's credit portfolio, retirement history, and analytics data from the Cache Storage API for up to 24 hours, bypassing the network entirely if the 5-second timeout elapses. There is also no `Vary: Authorization` awareness in the Angular service worker — it does not vary cache entries by request headers.

**Problem / What:**
This requires a two-part fix:

**Part 1 — Purge authenticated data cache on logout:**
The Angular service worker exposes a `SwUpdate` service, but cache invalidation requires directly calling `caches.delete()` on the relevant Cache Storage entries. Add a `PwaService` (or extend `AuthEffects`) that calls `caches.keys()` and deletes all `ngsw:db:*` and `ngsw:cache:*` entries scoped to authenticated data groups when `AuthActions.logout` or `AuthActions.forceLogout` is dispatched.

**Part 2 — Scope the data cache to non-sensitive, truly public endpoints only:**
Remove `/credits/**` and `/analytics/**` from `ngsw-config.json` — these are user-specific and must never be cached across sessions. Keep only `/projects/**` (project list is public-facing and safe to serve stale) and `map-tiles` (already correct). Add cache-busting headers (`Cache-Control: no-store`) to sensitive endpoints at the `ApiService` level so the SW never caches them even if the config is extended in future.

**Key Challenges:**
- The Angular service worker's Cache Storage key naming convention (`ngsw:db:<hash>:data`) must be inspected at runtime — the hash changes per build, so deletion must use prefix matching (`keys().filter(k => k.startsWith('ngsw:'))`), which requires care to not delete the app-shell cache (which would cause a blank screen on the next load).
- `caches` is a browser global not available in SSR/test environments — the `PwaService` must guard with `typeof caches !== 'undefined'`.
- Adding `Cache-Control: no-store` at the `ApiService` layer must not conflict with the Axios instance's default headers; it should be injected per-request via the request interceptor based on a request config flag, not globally.
- The `ngsw-config.json` `dataGroups` change must be validated against the Angular SW schema — the `$schema` field is already present, making this verifiable.

**Acceptance Criteria:**
- `ngsw-config.json` `dataGroups` no longer includes `/analytics/**` or `/credits/**`.
- A `PwaService` (or equivalent in `AuthEffects`) calls `caches.delete()` on all `ngsw:*` data-group cache entries when logout/forceLogout fires; the app-shell asset cache (`ngsw:*:assets`) is **not** deleted.
- `ApiService` attaches `Cache-Control: no-store` on requests to `/retirements/**`, `/credits/**`, `/analytics/**`, and `/marketplace/**`.
- Unit test for `PwaService` verifies cache deletion is called on logout actions and is a no-op in environments where `caches` is undefined.
- Manual test: log in as user A, load dashboard (data cached), log out, log in as user B, verify dashboard fetches fresh data from network (not SW cache).

**Relevant files/functions:**
- `src/ngsw-config.json` — `dataGroups` section
- `src/app/app.config.ts` — `provideServiceWorker` registration
- `src/app/core/services/api.service.ts` — request interceptor, `setTokenProvider`
- `src/app/core/store/auth/auth.effects.ts` — `logout$` effect
- New file: `src/app/core/services/pwa.service.ts`

**Out of scope:** Push notification support; background sync; offline form submission; changing the app-shell caching strategy.

**Labels:** `type: security`, `type: bug`, `difficulty: advanced`, `area: pwa`, `area: auth`, `priority: v1.0`

**Self-check:** If solved, this issue moves the v1.0 PWA deliverable forward because it turns the service worker from a cross-user data-leak vector into a correctly scoped offline cache that is safe to ship in production.

---

## Issue 5

**Title:** `CacheInvalidationEffects` dispatches blind `loadListings({ params: {} })` and `loadRetirements({ page: 1 })` on every success action — always resets pagination state and re-fetches data the current view never requested

**Why this matters now:**
`CacheInvalidationEffects` is the cross-slice cache invalidation backbone used after every on-chain operation. Its current implementation always dispatches load actions with hardcoded, reset parameters: `loadListings({ params: { page: 1, limit: 20 } })`, `loadRetirements({ page: 1, limit: 20 })`, `loadProposals({ params: { page: 1, limit: 20 } })`. This creates three distinct bugs: (1) If the user is on page 3 of the retirement history when a retirement completes, the invalidation resets them to page 1 and triggers a visible list jump. (2) If the user is on the sensor dashboard and a marketplace listing is filled (triggering `buyConfirmed` → `CacheInvalidationEffects` → `loadListings`), the entire marketplace slice is re-fetched even though no marketplace component is mounted — wasting bandwidth on every transaction. (3) `loadActionsForSlice('farmers')` always dispatches `loadParcels()`, but the farmers slice also has `loadFarmerOverview()` — the overview is never invalidated, leaving it stale after parcel registration. This class of bugs will become more visible as API wiring completes and real network traffic flows.

**Problem / What:**
Replace the hardcoded `loadActionsForSlice` function with a context-aware invalidation strategy:

1. **Add a `staleness flag` per slice** instead of immediately re-fetching. Each affected reducer gains a `stale: boolean` field (similar to `portfolioStale` already present in `CreditsState`). The invalidation effect sets these flags via dedicated `markStale` actions rather than dispatching load actions directly.

2. **Feature components read the `stale` flag** and re-fetch only if they are currently mounted and the flag is set for their slice. This moves the "should I reload?" decision to the component that actually owns the view, not the global effect.

3. **The `CacheInvalidationService.CACHE_INVALIDATION_MAP`** maps action types to `CacheSlice[]` — this stays as-is since it's well-tested; only the effect's response changes.

4. The `retirement` and `marketplace` load actions dispatched by effects should **pass through the current pagination state from the store** (via `withLatestFrom`) rather than hardcoding page 1 — as a minimum fix if the full stale-flag approach is deferred.

**Key Challenges:**
- The stale-flag approach requires adding `stale` to multiple reducer interfaces and corresponding `markStale` action creators for each slice — a broad but mechanical change.
- The existing `CacheInvalidationEffects` spec tests must be updated to expect `markStale` dispatches rather than `loadX` dispatches.
- `withLatestFrom` for current pagination state requires injecting the `Store` into `CacheInvalidationEffects` — it currently only injects `Actions` and `CacheInvalidationService`. This must not create a circular dependency.
- The `farmers` slice must also dispatch `FarmersActions.loadFarmerOverview()` on invalidation, not just `loadParcels()` — this is a correctness bug independent of the approach chosen.

**Acceptance Criteria:**
- `CacheInvalidationEffects` no longer hardcodes `page: 1` in any dispatched load action.
- Retiring credits while on retirement history page 3 does not reset pagination to page 1.
- Completing a marketplace buy while on the sensor dashboard does not trigger a network request to `/marketplace/listings`.
- `FarmersActions.loadFarmerOverview()` is included in the invalidation set for the `'farmers'` slice.
- Updated `cache-invalidation.effects.spec.ts` covers the "stale flag set but component not mounted → no network request" scenario, and "component mounted + stale flag → re-fetch on next view init".

**Relevant files/functions:**
- `src/app/core/store/cache-invalidation.effects.ts` — `loadActionsForSlice()`, `invalidateDependentSlices$`
- `src/app/core/store/cache-invalidation.service.ts` — `CACHE_INVALIDATION_MAP`
- `src/app/core/store/cache-invalidation.effects.spec.ts`
- `src/app/core/store/retirement/retirement.reducer.ts` — `lastFetched` already present; add `stale`
- `src/app/core/store/marketplace/marketplace.reducer.ts`
- `src/app/core/store/farmers/farmers.effects.ts` — `loadParcels` invalidation missing `loadFarmerOverview`

**Out of scope:** Switching to a reactive query library (NgRx Data, TanStack Query); changes to the `CACHE_INVALIDATION_MAP` trigger actions.

**Labels:** `type: bug`, `type: architecture`, `difficulty: advanced`, `area: store`, `area: cache`, `priority: v1.0`

**Self-check:** If solved, this issue moves the API-wiring milestone forward because it makes the cache invalidation system correct under real user workflows — currently it creates visible pagination resets and silent stale data on every on-chain operation.

---

## Issue 6

**Title:** `WalletState` does not persist the connected address across page reloads — session rehydration restores the JWT but leaves the wallet store empty, breaking every component that reads `selectWalletAddress`

**Why this matters now:**
The roadmap explicitly flags this in Known Limitations: *"the wallet store's effects (connect/disconnect) dispatch actions but do not yet persist the wallet address across page reloads."* This is not cosmetic — it breaks the header wallet display, any component using `selectWalletAddress` to construct Soroban calls or display the connected account, and the retirement certificate page which shows `cert.retireeAddress`. On hard refresh: `AuthEffects.rehydrateSession$` correctly calls `authService.fetchCurrentUser()` and dispatches `loginSuccess({ user, token })`, but the wallet address is never restored to `WalletState`. The user appears logged in (auth state is populated) but the wallet appears disconnected. The `WalletService.checkConnection()` method exists specifically for this scenario but is never called during rehydration.

**Problem / What:**
`AuthEffects.rehydrateSession$` currently only checks `localStorage` for the JWT and calls `fetchCurrentUser()`. It must be extended to also restore the wallet state:

1. After a successful `fetchCurrentUser()` call, call `walletService.checkConnection()`. If it returns `true` (Freighter is still connected to the same account), dispatch `connectWalletSuccess({ address })` alongside `loginSuccess`.

2. If `checkConnection()` returns `false` (Freighter disconnected or extension unavailable), the session is still valid — dispatch `loginSuccess` without the wallet action. The user is authenticated but will need to re-connect their wallet to sign transactions. The header must handle this state (authenticated but wallet not connected) without showing a broken address.

3. `WalletState` currently has no `network` field — but `WalletService.checkConnection()` could also read the network. Add `network: 'testnet' | 'public' | null` to `WalletState` and populate it during both login and rehydration.

4. Register `WalletService.onAddressChange()` and `WalletService.onNetworkChange()` callbacks somewhere in the auth/wallet lifecycle (currently they exist in the service but are never registered) — these should dispatch `connectWalletSuccess` or `disconnectWallet` when Freighter's state changes externally.

**Key Challenges:**
- `walletService.checkConnection()` is `async` — the `rehydrateSession$` effect is already `async` (uses `async/await` inside `switchMap`), so this fits naturally, but it must not cause `rehydrateSession$` to block login completion if Freighter is slow or unavailable.
- The `onAddressChange` / `onNetworkChange` callbacks must be registered once and cleaned up; the best location is `WalletEffects` using `OnInitEffects` (same pattern as `AuthEffects`), but `WalletEffects` does not currently exist — it must be created and registered in `app.config.ts`.
- The `WalletState` network field addition requires updating the `walletReducer`, `wallet.actions.ts` (`connectWalletSuccess` props), and all call sites of `connectWalletSuccess`.
- `selectWalletAddress` is used in feature components; none of them currently guard against a null address post-rehydration — the null case must be verified to not cause template errors.

**Acceptance Criteria:**
- Hard refresh on any authenticated route restores both `AuthState.token` and `WalletState.address` in a single rehydration pass.
- Header correctly shows the connected wallet address after hard refresh without requiring a manual reconnect.
- If Freighter is unavailable during rehydration, the app remains functional (authenticated, wallet shown as disconnected).
- `WalletState` includes `network: 'testnet' | 'public' | null`; it is populated during login and rehydration.
- `WalletEffects` registers `onAddressChange` / `onNetworkChange` and dispatches the appropriate actions.
- `WalletEffects` has a spec covering address-change dispatch and the rehydration-with-no-freighter path.
- `ng build --configuration production` passes with no errors after the `connectWalletSuccess` props change.

**Relevant files/functions:**
- `src/app/core/store/auth/auth.effects.ts` — `rehydrateSession$` (extend to call `checkConnection`)
- `src/app/core/services/wallet.service.ts` — `checkConnection()`, `onAddressChange()`, `onNetworkChange()`
- `src/app/core/store/wallet/wallet.reducer.ts` — add `network` field
- `src/app/core/store/wallet/wallet.actions.ts` — `connectWalletSuccess` props
- `src/app/core/store/wallet/wallet.selectors.ts` — add `selectWalletNetwork`
- `src/app/app.config.ts` — register new `WalletEffects`
- New file: `src/app/core/store/wallet/wallet.effects.ts`
- New file: `src/app/core/store/wallet/wallet.effects.spec.ts`

**Out of scope:** Multi-wallet support (LOBSTR, xBull); token refresh on network change; changes to the Freighter API wrapper beyond calling existing methods.

**Labels:** `type: bug`, `difficulty: advanced`, `area: wallet`, `area: auth`, `priority: v1.0`

**Self-check:** If solved, this issue moves the v1.0 production-ready goal forward because it eliminates a broken post-refresh state that makes every wallet-dependent UI element (address display, transaction signing, certificate view) appear broken on every page load in production.

---

## Issue 7

**Title:** Toast notification renderer is missing — every effect action result is silently swallowed with no user feedback

**Why this matters now:**
`NotificationService` is called by every NgRx effect in the codebase (`success`, `error`, `warning`, `info`) to communicate the outcome of every user action — retire credits, buy listing, cast vote, register parcel, login failure, session expiry. But there is no component anywhere in the DOM that subscribes to `NotificationService.notifications$` and renders those messages. The `DefaultLayoutComponent` renders only `<app-header>`, `<app-sidebar>`, and `<router-outlet>`. The result: the app appears completely unresponsive to user actions — no confirmation after a retirement, no error when a network request fails, no "session expired" warning on force-logout. This is a v1.0 blocker regardless of backend wiring status.

**Problem / What:**
Create `src/app/shared/components/toast-container/toast-container.component.ts` — a standalone component that:
1. Injects `NotificationService` and subscribes to `notifications$` using `AsyncPipe`.
2. Renders each `ToastNotification` as a dismissible toast card positioned fixed bottom-right (or top-right), stacked vertically.
3. Uses `@angular/animations` for enter/leave transitions (slide + fade) that respect `prefers-reduced-motion`.
4. Auto-dismisses after `notification.duration` ms (default 5000); `duration: 0` means persistent until manually dismissed.
5. Calls `notificationService.remove(id)` on manual close or auto-timeout.
6. Type-maps `'success' | 'error' | 'info' | 'warning'` to distinct colour/icon treatments using existing design tokens (`environmental-green`, `retirement-red`, `stellar-blue`, `credit-gold`).

Add `<app-toast-container>` to `DefaultLayoutComponent`'s template. The `UIState` notifications slice already exists in the store and is populated by `addNotification` actions — the `ToastContainerComponent` should read exclusively from `NotificationService.notifications$` (the service-level BehaviorSubject), **not** from the NgRx store, since the service is already the source of truth and all effects already call it directly.

**Key Challenges:**
- Two parallel notification systems exist: `NotificationService` (BehaviorSubject, used by all effects) and `UIState.notifications` (NgRx store, populated by `UIActions.addNotification` but never dispatched by any effect). These must be reconciled — the correct path is to keep `NotificationService` as the sole source and remove or ignore the unused store slice, not duplicate state.
- Angular animations require `BrowserAnimationsModule` or `provideAnimationsAsync()` in `app.config.ts` — check whether it is already provided before adding.
- The toast stack must be accessible: `role="status"` / `aria-live="polite"` for `info`/`success`, `role="alert"` / `aria-live="assertive"` for `error`/`warning`. Focus must not be stolen on toast appearance.
- `prefers-reduced-motion: reduce` must disable the slide/fade and show toasts instantly.
- The component must be covered by a spec: verify that a `success` notification appears in the DOM and is removed after `remove()` is called.

**Acceptance Criteria:**
- `<app-toast-container>` is present in `DefaultLayoutComponent`.
- Calling `notificationService.success('Title', 'Message')` renders a visible green toast within one change-detection cycle.
- Calling `notificationService.error(...)` renders a red toast with `role="alert"`.
- Auto-dismiss fires after the configured duration; manual close via ✕ button calls `notificationService.remove(id)`.
- `prefers-reduced-motion` media query disables animation.
- `toast-container.component.spec.ts` covers: success renders, error renders with `role="alert"`, manual close calls `remove`, auto-dismiss timing.
- `ng build --configuration production` passes; no `any` usage.

**Relevant files/functions:**
- `src/app/core/services/notification.service.ts` — `notifications$`, `remove(id)`
- `src/app/shared/layouts/default-layout/default-layout.ts` — add `<app-toast-container>`
- `src/app/app.config.ts` — check/add `provideAnimationsAsync()`
- `src/app/core/store/ui/ui.actions.ts` — `addNotification` (currently unused by effects; reconcile or remove)
- New: `src/app/shared/components/toast-container/toast-container.component.ts` + spec

**Out of scope:** The in-app notification centre / bell panel (that's a v1.1 feature); email notification preferences; changes to `NotificationService` method signatures.

**Labels:** `type: feature`, `difficulty: intermediate`, `area: ui`, `priority: v1.0`

**Self-check:** If solved, this issue moves v1.0 forward because it unblocks every user-facing feedback loop — without it, the app is functionally opaque after every action regardless of how well the backend is wired.

---

## Issue 8

**Title:** `environment.prod.ts` does not exist — production build falls back to development placeholders and `REPLACE_WITH_DEPLOYED_ADDRESS` contract stubs

**Why this matters now:**
`environment.prod.ts` is listed as a v1.0 deliverable and is completely absent from the repository. The CI pipeline explicitly works around this: `cp src/environments/environment.ts.example src/environments/environment.ts`. The `angular.json` `fileReplacements` for the `production` configuration references `environment.prod.ts` — if that entry exists and the file doesn't, production builds fail. If it doesn't exist in `angular.json`, the production build uses the development config with `production: false`, `apiUrl: 'http://localhost:3000/api/v1'`, and `REPLACE_WITH_DEPLOYED_ADDRESS` for all four contract addresses. Either way, there is no deployable production configuration today.

**Problem / What:**
1. Create `src/environments/environment.prod.ts` with `production: true`, the correct Stellar mainnet RPC URL, placeholder structure for all four contract addresses (documented clearly for the deployer), and `stellarNetwork: 'public'`.
2. Create `src/environments/environment.staging.ts` with `production: false`, testnet config, and documented placeholders — used for CI preview deployments.
3. Verify `angular.json` has correct `fileReplacements` entries pointing to these files for the `production` and `staging` configurations.
4. Update the CI workflow to stub `environment.prod.ts` (not just `environment.ts`) when building with `--configuration production` in the build job — using `environment.ts.example` as the stub so the CI build continues to pass without real contract addresses.
5. Update `CONTRIBUTING.md` and the repo `README.md` "Environment Configuration" section to document the expected values and how to obtain Stellar contract addresses from the backend deployment.

**Key Challenges:**
- The `fileReplacements` entry in `angular.json` must be checked against the actual Angular build configuration name (`production` vs `production-build` etc.) — Angular 17+ uses `@angular/build:application` which may have different config key names than the older `@angular-devkit/build-angular:browser`.
- `environment.prod.ts` must never be committed with real contract addresses or secrets; a `.gitignore` entry or clear `REPLACE_WITH_DEPLOYED_ADDRESS` sentinel must enforce this.
- The staging environment must use testnet Soroban RPC (`https://soroban-testnet.stellar.org`) while production uses mainnet (`https://soroban-mainnet.stellar.org`) — verify the correct mainnet endpoint from Stellar documentation.
- `nginx.conf` does not proxy the backend — API calls go directly to `environment.apiUrl`. Document the expected value for production deployments (either a load-balancer URL or the same-host `/api/v1` path).

**Acceptance Criteria:**
- `src/environments/environment.prod.ts` exists with `production: true`, `stellarNetwork: 'public'`, mainnet Soroban RPC URL, and all four contract address fields set to documented `REPLACE_WITH_DEPLOYED_ADDRESS` sentinels.
- `src/environments/environment.staging.ts` exists with testnet config.
- `ng build --configuration production` succeeds locally (using the `.example` stub or actual values).
- CI `build` job uses the correct stub file for `--configuration production`.
- `README.md` "Environment Configuration" section documents the three environment files, their intended use, and how to fill in contract addresses.
- `environment.prod.ts` and `environment.staging.ts` are listed in `.gitignore` (only the `.example` files are tracked).

**Relevant files/functions:**
- `src/environments/` — new files `environment.prod.ts`, `environment.staging.ts`
- `src/environments/environment.ts.example` — reference for structure
- `angular.json` — `fileReplacements` under `configurations.production`
- `.github/workflows/ci.yml` — `Prepare environment file` step in `build` job
- `README.md` — "Environment Configuration" section
- `.gitignore`

**Out of scope:** Deploying the contracts; setting up deployment pipelines beyond CI build; adding runtime environment variable injection (that would require a separate server-side config approach).

**Labels:** `type: feature`, `type: devops`, `difficulty: intermediate`, `area: config`, `priority: v1.0`

**Self-check:** If solved, this issue moves v1.0 forward because it creates the missing artifact that separates a deployable production build from a development build — without it there is no production configuration to deploy.

---

## Issue 9

**Title:** Implement `environment.prod.ts`-aware virtual scrolling for sensor data tables and retirement history using `@angular/cdk/scrolling`

**Why this matters now:**
The roadmap lists virtual scrolling as a v1.0 performance deliverable. Two specific views accumulate unbounded DOM nodes under real usage: the sensor readings raw data table (new rows pushed every few seconds from the WebSocket real-time buffer, potentially thousands per session) and the retirement history list (could be hundreds of records for active credit buyers). Both currently render all rows into the DOM. `@angular/cdk` is already a transitive dependency via Angular Material — it does not add bundle weight.

**Problem / What:**
There are two distinct cases that require different CDK approaches:

**Case 1 — `RetirementHistoryComponent` (paginated list, finite data):**
Use `ScrollingModule`'s `<cdk-virtual-scroll-viewport>` with `*cdkVirtualFor` as a drop-in replacement for `*ngFor` on the retirement rows. The fixed item size variant (`itemSize` in pixels) is appropriate here since row height is uniform. The existing `PaginationControlsComponent` can remain — virtual scroll handles within-page rendering; pagination handles page fetching.

**Case 2 — `SensorsDashboard` real-time buffer (unbounded, auto-growing):**
The `realTimeBuffer` in `SensorsState` is already capped at 100 items in the reducer (`slice(0, 100)`). The table that renders `recentReadings` should use `<cdk-virtual-scroll-viewport>` with `*cdkVirtualFor`. More importantly, the buffer cap strategy should be made explicit and configurable via a constant in `app.constants.ts` rather than a magic `100` in the reducer.

**Key Challenges:**
- `cdkVirtualFor` requires a fixed `itemSize` (pixels). If row heights vary (e.g. a retirement with a long `purpose` string), the standard fixed-size viewport will miscalculate scroll position. Either enforce a minimum fixed height via CSS (`min-height`, `overflow: hidden`) or use the `AutoSizeVirtualScrollStrategy` from `@angular/cdk-experimental/scrolling` — document the tradeoff.
- `DataTableComponent` (the shared reusable table) uses a standard `*ngFor` internally. Virtual scrolling cannot be added to it generically without changing its API — it is better applied at the feature component level where the scroll viewport is owned. Do not modify `DataTableComponent` itself.
- The retirement history component uses `AsyncPipe` with an Observable of paginated results. The `*cdkVirtualFor` `[cdkVirtualForOf]` input must receive the array synchronously or via a resolved observable — integrate correctly with the existing `selectRetirements` selector.
- Change detection: both components use or should use `ChangeDetectionStrategy.OnPush`. `cdkVirtualFor` is compatible with OnPush but requires `markForCheck()` discipline — verify no stale view arises when new real-time readings arrive.

**Acceptance Criteria:**
- `RetirementHistoryComponent` renders rows via `<cdk-virtual-scroll-viewport>` + `*cdkVirtualFor`; DOM node count stays constant as more retirements load (verified via browser DevTools Elements panel).
- `SensorsDashboard` real-time readings table uses `<cdk-virtual-scroll-viewport>` + `*cdkVirtualFor`; DOM node count stays constant as the buffer fills.
- The real-time buffer cap (`100`) is extracted to `REALTIME_BUFFER_MAX` in `src/app/core/constants/app.constants.ts` and referenced from the reducer.
- `ScrollingModule` is imported only in the two affected feature components (not globally).
- Both components pass their existing `should create` spec after the change; no new spec regressions.
- `ng build --configuration production` stays within bundle budgets.

**Relevant files/functions:**
- `src/app/features/retirement/retirement-history/retirement-history.ts`
- `src/app/features/sensors/sensors-dashboard/sensors-dashboard.ts`
- `src/app/core/store/sensors/sensors.reducer.ts` — `slice(0, 100)` magic number
- `src/app/core/constants/app.constants.ts` — add `REALTIME_BUFFER_MAX`
- `src/app/shared/components/data-table/data-table.component.ts` — read only; do not modify

**Out of scope:** Virtual scrolling in `DataTableComponent` itself; virtual scrolling for projects list (paginated at API level, no unbounded growth); `@angular/cdk-experimental` AutoSizeVirtualScrollStrategy (document as a follow-on if row heights prove variable).

**Labels:** `type: feature`, `type: performance`, `difficulty: intermediate`, `area: ui`, `area: sensors`, `priority: v1.0`

**Self-check:** If solved, this issue moves v1.0 performance forward because it prevents the two views most likely to accumulate thousands of DOM nodes under real usage — sensor streaming and retirement history — from degrading into unresponsive tables.

---

## Issue 10

**Title:** Light mode preference is not persisted — resets to dark on every page reload; `[data-theme="light"]` CSS overrides incomplete across components

**Why this matters now:**
The roadmap lists light mode as a v1.1 deliverable. The infrastructure is 80% there: `setDarkMode` action, `isDarkMode` in `UIState`, `selectIsDarkMode` selector, `document.documentElement.classList.toggle('dark')` in `HeaderComponent.ngOnInit`, and `[data-theme="light"]` CSS custom property overrides in `_variables.scss`. The only missing piece is persistence — `UIState` always initialises with `isDarkMode: true`, so every hard refresh resets to dark regardless of what the user chose. This makes the toggle functionally useless: users cannot maintain a light mode session.

**Problem / What:**
Two things need to happen:

**Part 1 — Persistence:**
Add a `UIEffects` class (new file) with two effects:
1. `persistTheme$` — listens for `setDarkMode` and writes `isDark` to `localStorage` under a key defined in `STORAGE_KEYS` (`app.constants.ts`).
2. Read-on-init — in `ngrxOnInitEffects()` (same pattern as `AuthEffects`), read `localStorage` for the saved theme and dispatch `setDarkMode({ isDark })` before any component renders. This must fire before the initial `ClassList.toggle('dark')` in `HeaderComponent.ngOnInit` to avoid a flash of the wrong theme.

**Part 2 — CSS completeness:**
Audit every feature component and shared component for hardcoded `dark:` Tailwind variants that do not have a corresponding `[data-theme="light"]` SCSS override, or `bg-dark-bg` / `text-dark-*` custom classes that only exist in dark mode. The goal is that `document.documentElement.setAttribute('data-theme', 'light')` (alongside removing the `dark` class) produces a legible, non-broken UI across all pages — not pixel-perfect, just no white-on-white or invisible elements.

**Key Challenges:**
- The theme flash (FOUC) on hard refresh: `ngrxOnInitEffects` fires after Angular bootstraps, which is after the first render. The only way to fully eliminate flash is to inline a tiny script in `index.html` that reads localStorage and sets the `dark` class synchronously before Angular loads — a standard pattern. This is a `<script>` in `<head>`, not an Angular effect.
- `UIEffects` must be registered in `app.config.ts`'s `provideEffects` array — it does not yet exist.
- `STORAGE_KEYS` in `app.constants.ts` already has `AUTH_TOKEN`; add `THEME` alongside it.
- The CSS audit is broad but mechanical — use the browser's element inspector on each page in light mode to identify breakage, then fix in the relevant component SCSS or global `styles.scss`.

**Acceptance Criteria:**
- Setting light mode, hard-refreshing the page, and returning preserves the light mode preference.
- No theme flash on hard refresh (inline script in `index.html` reads localStorage and sets class synchronously).
- `UIEffects` is registered in `app.config.ts`; has a spec covering the persist and rehydrate paths.
- All authenticated routes render with legible contrast in light mode — no white text on white background, no invisible icons.
- `ng lint` passes; `ng build` passes.

**Relevant files/functions:**
- `src/app/core/store/ui/ui.actions.ts` — `setDarkMode`
- `src/app/core/store/ui/ui.reducer.ts` — `initialState.isDarkMode`
- `src/app/core/constants/app.constants.ts` — add `STORAGE_KEYS.THEME`
- `src/app/shared/layouts/header/header.ts` — `toggleDarkMode()`, `ngOnInit` class toggle
- `src/index.html` — add inline `<script>` for flash prevention
- `src/styles.scss`, `src/theme/_variables.scss` — `[data-theme="light"]` overrides
- New: `src/app/core/store/ui/ui.effects.ts` + `ui.effects.spec.ts`
- `src/app/app.config.ts` — register `UIEffects`

**Out of scope:** Per-component theming beyond what's needed for legibility; system `prefers-color-scheme` detection (document as a follow-on); the notification centre bell panel (Issue 11).

**Labels:** `type: feature`, `difficulty: intermediate`, `area: ui`, `area: theme`, `priority: v1.1`

**Self-check:** If solved, this issue moves the v1.1 light mode deliverable forward because it makes the existing toggle actually work end-to-end — persistence + flash prevention + legible rendering — rather than being a stateless button that resets on every reload.

---

## Issue 11

**Title:** Implement the in-app notifications centre — bell icon panel with read/unread state, history, and `markNotificationsRead` dispatch

**Why this matters now:**
The roadmap lists "Notifications centre" as a v1.1 feature. The infrastructure is entirely ready: `UIState.notifications` (array of `Notification` objects with `read`, `timestamp`, `notificationType`), `addNotification` / `removeNotification` / `markNotificationsRead` actions, `selectUnreadNotificationCount` selector, and a bell icon in `HeaderComponent` with a hardcoded red dot. None of this is wired to any UI. This is a self-contained, high-value feature that meaningfully improves the UX of oracle operators and project developers who need to track events that happened while they weren't watching.

**Problem / What:**
Build a slide-out notification panel triggered by clicking the bell icon in `HeaderComponent`:

1. **`NotificationPanelComponent`** (new standalone component, `shared/components/notification-panel/`):
   - Renders `UIState.notifications` via `selectNotifications` selector, sorted newest-first.
   - Groups by date (Today / Yesterday / Earlier).
   - Each row: type icon (colour-coded), title, message, timestamp (`DurationPipe` for relative time), and a dismiss button (`removeNotification`).
   - "Mark all read" button dispatches `markNotificationsRead`.
   - Empty state when `notifications.length === 0`.
   - Keyboard-accessible: `role="dialog"`, `aria-label="Notifications"`, focus-trapped while open (`ClickOutsideDirective` for mouse dismiss, `Escape` key for keyboard dismiss).

2. **Wire `addNotification` into `NotificationService`** — every call to `notificationService.success/error/info/warning` should also dispatch `UIActions.addNotification` to the store so events are persisted in `UIState` and visible in the panel history. This is additive — `NotificationService` keeps its `BehaviorSubject` for the transient toast layer (Issue 7); the store receives a permanent copy.

3. **`HeaderComponent`** — clicking the bell opens/closes the panel (toggle `UIState` or local boolean); the red dot becomes the `selectUnreadNotificationCount` selector value displayed as a badge (hidden when count is 0).

**Key Challenges:**
- `NotificationService` currently has no access to the NgRx `Store` — injecting it directly creates a potential DI issue since `NotificationService` is `providedIn: 'root'` and `Store` may not be available in some test contexts. Use a safe injection: `private store = inject(Store, { optional: true })` and guard the dispatch with `if (this.store)`.
- The `Notification` interface in `ui.reducer.ts` uses `notificationType` (to avoid collision with the browser's native `Notification` global) — all code must use this field name consistently.
- Focus trapping in the panel requires `@angular/cdk/a11y` `FocusTrap` or `FocusTrapFactory` — verify this is available as a transitive CDK dependency before importing.
- The `DurationPipe` (`"2h ago"`) updates only on pipe evaluation — if the panel stays open, timestamps become stale. Either re-evaluate every 60s via `interval` + `AsyncPipe`, or accept that timestamps are accurate on open and stale while the panel is open (document the tradeoff).
- The store `notifications` array must be bounded — `MAX_NOTIFICATIONS = 50` is already defined in the reducer; verify the cap is enforced correctly when notifications exceed 50.

**Acceptance Criteria:**
- Clicking the bell opens the notification panel; clicking again or pressing `Escape` closes it.
- All notifications dispatched by effects appear in the panel with correct type icon and relative timestamp.
- "Mark all read" dispatches `markNotificationsRead`; the badge disappears.
- Individual dismiss (`removeNotification`) removes the item from both the panel and the store.
- Panel is keyboard-navigable; focus is trapped when open; `role="dialog"` and `aria-label` are present.
- `notification-panel.component.spec.ts` covers: renders notifications from store, mark-all-read dispatch, dismiss dispatch, empty state, badge count reflects `selectUnreadNotificationCount`.
- `ng build` passes; `ng lint` passes with zero warnings.

**Relevant files/functions:**
- `src/app/core/store/ui/ui.actions.ts` — `addNotification`, `removeNotification`, `markNotificationsRead`
- `src/app/core/store/ui/ui.reducer.ts` — `Notification` interface, `MAX_NOTIFICATIONS`
- `src/app/core/store/ui/ui.selectors.ts` — `selectUnreadNotificationCount`, `selectNotifications` (add if missing)
- `src/app/core/services/notification.service.ts` — add `Store` dispatch alongside existing `BehaviorSubject`
- `src/app/shared/layouts/header/header.ts` — wire bell click, badge count
- New: `src/app/shared/components/notification-panel/notification-panel.component.ts` + spec

**Out of scope:** Email/push notification preferences (v1.1 follow-on); persisting notifications across browser sessions (localStorage); WebSocket-pushed notifications from the server (separate to the client-side toast/history pipeline built here).

**Labels:** `type: feature`, `difficulty: intermediate`, `area: ui`, `priority: v1.1`

**Self-check:** If solved, this issue moves the v1.1 notifications centre deliverable forward because it turns a non-functional bell icon and a fully-implemented store slice into a real, accessible notification history that gives operators visibility into past events.
