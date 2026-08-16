import { Injectable, inject } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Action, Store } from '@ngrx/store';
import { from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { AppState } from './app.state';
import { CacheInvalidationService, CacheSlice } from './cache-invalidation.service';
import * as ProjectsActions from './projects/projects.actions';
import * as MarketplaceActions from './marketplace/marketplace.actions';
import { selectMarketplacePagination } from './marketplace/marketplace.selectors';
import * as GovernanceActions from './governance/governance.actions';
import * as FarmersActions from './farmers/farmers.actions';
import * as CreditsActions from './credits/credits.actions';
import * as AnalyticsActions from './analytics/analytics.actions';
import * as RetirementActions from './retirement/retirement.actions';
import { selectRetirementPage } from './retirement/retirement.selectors';

interface CachePagination {
  retirementPage: number;
  marketplacePage: number;
  marketplaceLimit: number;
}

/**
 * Maps each cache slice to the load action(s) that refresh it. Kept
 * separate from CACHE_INVALIDATION_MAP so the "what triggers a refresh"
 * mapping (service, easily unit-testable) stays decoupled from "how a
 * slice is refreshed" (this effect, which needs the actual action
 * creators).
 */
function loadActionsForSlice(slice: CacheSlice, pagination: CachePagination): Action[] {
  switch (slice) {
    case 'analytics':
      return [AnalyticsActions.loadAnalyticsOverview()];
    case 'projects':
      return [ProjectsActions.loadProjects({})];
    case 'credits':
      return [CreditsActions.loadPortfolio()];
    case 'retirement':
      return [RetirementActions.loadRetirements({ page: pagination.retirementPage, limit: 20 })];
    case 'marketplace':
      return [
        MarketplaceActions.loadListings({
          params: {
            page: pagination.marketplacePage,
            limit: pagination.marketplaceLimit,
          },
        }),
      ];
    case 'governance':
      return [GovernanceActions.loadProposals({ params: { page: 1, limit: 20 } })];
    case 'farmers':
      return [FarmersActions.loadParcels(), FarmersActions.loadFarmerOverview()];
    default:
      return [];
  }
}

@Injectable()
export class CacheInvalidationEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store<AppState>);
  private readonly cacheInvalidationService = inject(CacheInvalidationService);

  /**
   * Listens for every action registered in CACHE_INVALIDATION_MAP and
   * dispatches a load action for each dependent slice.
   *
   * The current-pagination approach deliberately reads pagination from the
   * store at invalidation time so a background refresh cannot reset an active
   * list view to page 1.
   *
   * mergeMap (not switchMap) is intentional: a single success action can
   * fan out into multiple independent refreshes (e.g. registerParcelSuccess
   * -> farmers + analytics), and switchMap would cancel an in-flight refresh
   * from an earlier trigger if a new one arrives before it completes.
   */
  invalidateDependentSlices$ = createEffect(() =>
    this.actions$.pipe(
      concatLatestFrom(() => [
        this.store.select(selectRetirementPage),
        this.store.select(selectMarketplacePagination),
      ]),
      mergeMap(([action, retirementPage, marketplacePagination]) => {
        const slices = this.cacheInvalidationService.getDependentSlices(action);
        const pagination: CachePagination = {
          retirementPage,
          marketplacePage: marketplacePagination.page,
          marketplaceLimit: marketplacePagination.limit,
        };
        return from(slices.flatMap((slice) => loadActionsForSlice(slice, pagination)));
      }),
    ),
  );
}
