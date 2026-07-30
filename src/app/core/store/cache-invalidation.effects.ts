import { Injectable, inject } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { from } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';

import { CacheInvalidationService, CacheSlice } from './cache-invalidation.service';
import * as ProjectsActions from './projects/projects.actions';
import * as MarketplaceActions from './marketplace/marketplace.actions';
import * as GovernanceActions from './governance/governance.actions';
import * as FarmersActions from './farmers/farmers.actions';
import * as CreditsActions from './credits/credits.actions';
import * as AnalyticsActions from './analytics/analytics.actions';
import * as RetirementActions from './retirement/retirement.actions';

/**
 * Maps each cache slice to the load action(s) that refresh it. Kept
 * separate from CACHE_INVALIDATION_MAP so the "what triggers a refresh"
 * mapping (service, easily unit-testable) stays decoupled from "how a
 * slice is refreshed" (this effect, which needs the actual action
 * creators).
 */
function loadActionsForSlice(slice: CacheSlice): Action[] {
  switch (slice) {
    case 'analytics':
      return [AnalyticsActions.loadAnalyticsOverview()];
    case 'projects':
      return [ProjectsActions.loadProjects({})];
    case 'credits':
      return [CreditsActions.loadPortfolio()];
    case 'retirement':
      return [RetirementActions.loadRetirements({ page: 1, limit: 20 })];
    case 'marketplace':
      return [MarketplaceActions.loadListings({ params: { page: 1, limit: 20 } })];
    case 'governance':
      return [GovernanceActions.loadProposals({ params: { page: 1, limit: 20 } })];
    case 'farmers':
      return [FarmersActions.loadParcels()];
    default:
      return [];
  }
}

@Injectable()
export class CacheInvalidationEffects {
  private readonly actions$ = inject(Actions);
  private readonly cacheInvalidationService = inject(CacheInvalidationService);

  /**
   * Listens for every action registered in CACHE_INVALIDATION_MAP and
   * dispatches a load action for each dependent slice.
   *
   * mergeMap (not switchMap) is intentional: a single success action can
   * fan out into multiple independent refreshes (e.g. registerParcelSuccess
   * ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ farmers + analytics), and switchMap would cancel an in-flight refresh
   * from an earlier trigger if a new one arrives before it completes.
   */
  invalidateDependentSlices$ = createEffect(() =>
    this.actions$.pipe(
      mergeMap((action) => {
        const slices = this.cacheInvalidationService.getDependentSlices(action);
        return from(slices.flatMap((slice) => loadActionsForSlice(slice)));
      }),
      filter((action): action is Action => !!action),
    ),
  );
}
