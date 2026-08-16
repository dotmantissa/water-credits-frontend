import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, Observable, of } from 'rxjs';
import { toArray } from 'rxjs/operators';

import { CacheInvalidationEffects } from './cache-invalidation.effects';
import { CacheInvalidationService } from './cache-invalidation.service';
import * as AnalyticsActions from './analytics/analytics.actions';
import * as CreditsActions from './credits/credits.actions';
import * as ProjectsActions from './projects/projects.actions';
import * as FarmersActions from './farmers/farmers.actions';
import * as MarketplaceActions from './marketplace/marketplace.actions';
import { selectMarketplacePagination } from './marketplace/marketplace.selectors';
import * as RetirementActions from './retirement/retirement.actions';
import { selectRetirementPage } from './retirement/retirement.selectors';

interface PaginationOverrides {
  retirementPage?: number;
  marketplacePage?: number;
  marketplaceLimit?: number;
}

describe('CacheInvalidationEffects', () => {
  let actions$: Observable<Action>;
  let effects: CacheInvalidationEffects;

  function setup(source$: Observable<Action>, pagination: PaginationOverrides = {}) {
    actions$ = source$;
    TestBed.configureTestingModule({
      providers: [
        CacheInvalidationEffects,
        CacheInvalidationService,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            {
              selector: selectRetirementPage,
              value: pagination.retirementPage ?? 1,
            },
            {
              selector: selectMarketplacePagination,
              value: {
                page: pagination.marketplacePage ?? 1,
                limit: pagination.marketplaceLimit ?? 10,
                total: 0,
                totalPages: 0,
              },
            },
          ],
        }),
      ],
    });
    effects = TestBed.inject(CacheInvalidationEffects);
  }

  it('refreshes parcels, farmer overview, and analytics after parcel registration', async () => {
    setup(of(FarmersActions.registerParcelSuccess({ parcel: {} as any })));

    const actions = await firstValueFrom(effects.invalidateDependentSlices$.pipe(toArray()));
    expect(actions).toEqual([
      FarmersActions.loadParcels(),
      FarmersActions.loadFarmerOverview(),
      AnalyticsActions.loadAnalyticsOverview(),
    ]);
  });

  it('preserves the current retirement page when refreshing after confirmation', async () => {
    setup(of(RetirementActions.retirementConfirmed({ retirement: {} as any })), {
      retirementPage: 3,
    });

    const actions = await firstValueFrom(effects.invalidateDependentSlices$.pipe(toArray()));
    expect(actions).toEqual([
      CreditsActions.loadPortfolio(),
      AnalyticsActions.loadAnalyticsOverview(),
      RetirementActions.loadRetirements({ page: 3, limit: 20 }),
    ]);
  });

  it('preserves marketplace page and limit when refreshing after a purchase', async () => {
    setup(of(MarketplaceActions.buyConfirmed({ listing: {} as any })), {
      marketplacePage: 4,
      marketplaceLimit: 10,
    });

    const actions = await firstValueFrom(effects.invalidateDependentSlices$.pipe(toArray()));
    expect(actions).toEqual([
      CreditsActions.loadPortfolio(),
      MarketplaceActions.loadListings({ params: { page: 4, limit: 10 } }),
    ]);
  });

  it('emits nothing for an action with no registered mapping', async () => {
    setup(of(ProjectsActions.loadProjectsFailure({ error: 'boom' })));

    const actions = await firstValueFrom(effects.invalidateDependentSlices$.pipe(toArray()));
    expect(actions.length).toBe(0);
  });

  it('handles concurrent triggers without dropping either (mergeMap, not switchMap)', async () => {
    // Two independent trigger actions arriving back-to-back must both fan out
    // fully — this is the behavior mergeMap guarantees and switchMap would break.
    setup(
      of(
        FarmersActions.registerParcelSuccess({ parcel: {} as any }),
        ProjectsActions.createProjectSuccess({ project: {} as any }),
      ),
    );

    const actions = await firstValueFrom(effects.invalidateDependentSlices$.pipe(toArray()));
    // farmers loads (2) + analytics (1) + analytics + projects (2) = 5.
    expect(actions.length).toBe(5);
  });
});
