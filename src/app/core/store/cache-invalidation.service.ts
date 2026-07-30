import { Injectable } from '@angular/core';
import { Action } from '@ngrx/store';

import * as ProjectsActions from './projects/projects.actions';
import * as MarketplaceActions from './marketplace/marketplace.actions';
import * as GovernanceActions from './governance/governance.actions';
import * as FarmersActions from './farmers/farmers.actions';
import * as RetirementActions from './retirement/retirement.actions';

/**
 * Store slice names used as cache-invalidation targets. Kept as a union
 * rather than an enum so it stays a plain string at the call site.
 */
export type CacheSlice =
  'analytics' | 'projects' | 'credits' | 'retirement' | 'marketplace' | 'governance' | 'farmers';

/**
 * Maps a "success" action's `.type` string to the slices that must be
 * refreshed as a result. This is the single source of truth for cross-slice
 * cache invalidation — CacheInvalidationEffects reads it to know which load
 * actions to dispatch after each success action.
 *
 * Deliberately keyed by `.type` (a string) rather than the action creator
 * itself: it lets the effect subscribe generically via `ofType(...actions)`
 * while this map stays a plain, testable lookup table.
 */
export const CACHE_INVALIDATION_MAP: Record<string, CacheSlice[]> = {
  [ProjectsActions.createProjectSuccess.type]: ['analytics', 'projects'],
  [RetirementActions.retirementConfirmed.type]: ['credits', 'analytics', 'retirement'],
  [MarketplaceActions.createListingSuccess.type]: ['marketplace'],
  [MarketplaceActions.buyConfirmed.type]: ['credits', 'marketplace'],
  [GovernanceActions.castVoteSuccess.type]: ['governance'],
  [FarmersActions.registerParcelSuccess.type]: ['farmers', 'analytics'],
};

/** The list of action types this service knows how to react to. */
export const CACHE_INVALIDATION_TRIGGER_TYPES = Object.keys(CACHE_INVALIDATION_MAP);

@Injectable({ providedIn: 'root' })
export class CacheInvalidationService {
  /**
   * Returns the slices that should be invalidated (refreshed) in response to
   * the given action, or an empty array if the action isn't a registered
   * trigger.
   */
  getDependentSlices(action: Action): CacheSlice[] {
    return CACHE_INVALIDATION_MAP[action.type] ?? [];
  }
}
