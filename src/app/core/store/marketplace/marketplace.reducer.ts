import { createReducer, on } from '@ngrx/store';
import * as MarketplaceActions from './marketplace.actions';
import * as AuthActions from '../auth/auth.actions';
import { MarketplaceListing, OrderBook } from '../../services/marketplace.service';

/** The buy wizard's current phase, used to drive UI state. */
export type BuyPhase =
  'idle' | 'preparing' | 'awaiting_signature' | 'submitting' | 'confirmed' | 'failed';

export interface MarketplaceState {
  listings: MarketplaceListing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Active filter values applied to the current listings query. */
  filters: { status?: string; projectId?: string; search?: string };
  orderBook: OrderBook | null;
  /** True while listings or order book fetch is in flight. */
  loading: boolean;
  /** True while create-listing mutation is in flight. */
  creating: boolean;
  /** True while a cancel-listing mutation is in flight. */
  cancelling: boolean;
  /** Buy wizard phase — drives spinner / step display. */
  buyPhase: BuyPhase;
  /** The listing currently being purchased through the buy wizard. */
  activeListing: MarketplaceListing | null;
  /** Timestamp (ms) of the last successful listings fetch, for cache expiration checks. */
  lastFetched: number | null;
  error: string | null;
}

const initialState: MarketplaceState = {
  listings: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
  filters: {},
  orderBook: null,
  loading: false,
  creating: false,
  cancelling: false,
  buyPhase: 'idle',
  activeListing: null,
  lastFetched: null,
  error: null,
};

export const marketplaceReducer = createReducer(
  initialState,

  on(MarketplaceActions.loadListings, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(MarketplaceActions.loadListingsSuccess, (state, { response }) => ({
    ...state,
    loading: false,
    listings: response.data,
    total: response.total,
    page: response.page,
    limit: response.limit,
    totalPages: response.totalPages,
    lastFetched: Date.now(),
  })),
  on(MarketplaceActions.loadListingsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(MarketplaceActions.loadOrderBook, (state) => ({
    ...state,
    loading: true,
    orderBook: null,
    error: null,
  })),
  on(MarketplaceActions.loadOrderBookSuccess, (state, { orderBook }) => ({
    ...state,
    loading: false,
    orderBook,
  })),
  on(MarketplaceActions.loadOrderBookFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(MarketplaceActions.createListing, (state) => ({
    ...state,
    creating: true,
    error: null,
  })),
  on(MarketplaceActions.createListingSuccess, (state, { listing }) => ({
    ...state,
    creating: false,
    listings: [listing, ...state.listings],
    total: state.total + 1,
  })),
  on(MarketplaceActions.createListingFailure, (state, { error }) => ({
    ...state,
    creating: false,
    error,
  })),

  on(MarketplaceActions.initiateBuy, (state) => ({
    ...state,
    buyPhase: 'preparing' as BuyPhase,
    activeListing: null,
    error: null,
  })),
  on(MarketplaceActions.buyPrepareFailure, (state, { error }) => ({
    ...state,
    buyPhase: 'failed' as BuyPhase,
    error,
  })),
  on(MarketplaceActions.buySignatureRejected, (state) => ({
    ...state,
    buyPhase: 'idle' as BuyPhase,
    error: null,
  })),
  on(MarketplaceActions.buySignatureFailure, (state, { error }) => ({
    ...state,
    buyPhase: 'failed' as BuyPhase,
    error,
  })),
  on(MarketplaceActions.buySubmitFailure, (state, { error }) => ({
    ...state,
    buyPhase: 'failed' as BuyPhase,
    error,
  })),
  on(MarketplaceActions.buyConfirmed, (state, { listing }) => ({
    ...state,
    buyPhase: 'confirmed' as BuyPhase,
    activeListing: listing,
    error: null,
    listings: state.listings.map((l) => (l.id === listing.id ? listing : l)),
  })),

  on(MarketplaceActions.cancelListing, (state) => ({
    ...state,
    cancelling: true,
    error: null,
  })),
  on(MarketplaceActions.cancelListingSuccess, (state, { listingId }) => ({
    ...state,
    cancelling: false,
    listings: state.listings.map((l) =>
      l.id === listingId ? { ...l, status: 'cancelled' as const } : l,
    ),
  })),
  on(MarketplaceActions.cancelListingFailure, (state, { error }) => ({
    ...state,
    cancelling: false,
    error,
  })),

  on(MarketplaceActions.setListingsFilters, (state, { status, projectId, search }) => ({
    ...state,
    filters: { status, projectId, search },
    page: 1,
  })),
  on(MarketplaceActions.setListingsPage, (state, { page }) => ({
    ...state,
    page,
  })),
  // Full cache reset on forced logout, per the cache-invalidation strategy.
  on(AuthActions.forceLogout, () => initialState),
);
