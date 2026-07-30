import { creditsReducer } from './credits.reducer';
import * as CreditsActions from './credits.actions';
import * as AuthActions from '../auth/auth.actions';

describe('creditsReducer lastFetched / stale-while-revalidate', () => {
  const portfolio = { holdings: [] } as any;

  it('starts with lastFetched null (never fetched)', () => {
    const state = creditsReducer(undefined, { type: '@@INIT' } as any);
    expect(state.lastFetched).toBeNull();
  });

  it('sets lastFetched on successful load', () => {
    const before = Date.now();
    const state = creditsReducer(undefined, CreditsActions.loadPortfolioSuccess({ portfolio }));
    expect(state.lastFetched).not.toBeNull();
    expect(state.lastFetched as number).toBeGreaterThanOrEqual(before);
  });

  it('keeps existing data (and lastFetched) visible while a revalidation load is in flight', () => {
    const loaded = creditsReducer(undefined, CreditsActions.loadPortfolioSuccess({ portfolio }));
    // Revalidation: loadPortfolio dispatched again (e.g. via cache invalidation)
    const revalidating = creditsReducer(loaded, CreditsActions.loadPortfolio());

    // loading is true but the previously-fetched portfolio/lastFetched are NOT cleared,
    // so a component can keep rendering cached data instead of flashing to empty.
    expect(revalidating.loading).toBe(true);
    expect(revalidating.portfolio).toEqual(portfolio);
    expect(revalidating.lastFetched).toBe(loaded.lastFetched);
  });

  it('updates lastFetched to a newer value once revalidation completes', async () => {
    const loaded = creditsReducer(undefined, CreditsActions.loadPortfolioSuccess({ portfolio }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    const revalidated = creditsReducer(loaded, CreditsActions.loadPortfolioSuccess({ portfolio }));
    expect(revalidated.lastFetched as number).toBeGreaterThan(loaded.lastFetched as number);
  });

  it('resets to initial state (including lastFetched) on forceLogout', () => {
    const loaded = creditsReducer(undefined, CreditsActions.loadPortfolioSuccess({ portfolio }));
    const loggedOut = creditsReducer(loaded, AuthActions.forceLogout());
    expect(loggedOut.lastFetched).toBeNull();
    expect(loggedOut.portfolio).toBeNull();
  });
});
