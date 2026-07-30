import { createReducer, on } from '@ngrx/store';
import * as CreditsActions from './credits.actions';
import * as AuthActions from '../auth/auth.actions';
import { CreditBalance, CreditTransaction, CreditPortfolio } from '../../models/credit.model';
export interface CreditsState {
  portfolio: CreditPortfolio | null;
  balances: CreditBalance[];
  transactions: CreditTransaction[];
  /**
   * True after a retirement is confirmed — signals that the portfolio data is
   * stale and must be refetched before displaying.
   */
  portfolioStale: boolean;
  /** Timestamp (ms) of the last successful portfolio fetch, for cache expiration checks. */
  lastFetched: number | null;
  loading: boolean;
  error: string | null;
}
const initialState: CreditsState = {
  portfolio: null,
  balances: [],
  transactions: [],
  portfolioStale: false,
  lastFetched: null,
  loading: false,
  error: null,
};
export const creditsReducer = createReducer(
  initialState,
  on(CreditsActions.loadPortfolio, (state) => ({
    ...state,
    loading: true,
    error: null,
    portfolioStale: false,
  })),
  on(CreditsActions.loadPortfolioSuccess, (state, { portfolio }) => ({
    ...state,
    loading: false,
    portfolio,
    balances: portfolio.holdings,
    portfolioStale: false,
    lastFetched: Date.now(),
  })),
  on(CreditsActions.loadPortfolioFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(CreditsActions.loadTransactions, (state) => ({ ...state, loading: true })),
  on(CreditsActions.loadTransactionsSuccess, (state, { transactions }) => ({
    ...state,
    loading: false,
    transactions,
  })),
  on(CreditsActions.loadTransactionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  /**
   * Mark the portfolio as stale after a confirmed retirement.
   * The RetirementEffects dispatches loadPortfolio which immediately triggers
   * a fresh fetch — this flag is mostly for UI guards / selectors.
   */
  on(CreditsActions.invalidatePortfolio, (state) => ({
    ...state,
    portfolioStale: true,
    portfolio: null,
    balances: [],
  })),
  // Full cache reset on forced logout, per the cache-invalidation strategy.
  on(AuthActions.forceLogout, () => initialState),
);
