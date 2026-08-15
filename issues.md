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
