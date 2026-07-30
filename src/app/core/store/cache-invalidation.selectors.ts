import { AppState } from './app.state';
import { CacheSlice } from './cache-invalidation.service';

/** Union of every slice-state shape that carries a lastFetched timestamp. */
type StateWithLastFetched = { lastFetched: number | null };

/**
 * Reads the lastFetched timestamp for a given cache-tracked slice, for use
 * in cache-expiration checks (e.g. "is this data older than 5 minutes?").
 *
 * Usage: this.store.select(selectLastFetched('projects'))
 */
export function selectLastFetched(slice: CacheSlice) {
  return (state: AppState): number | null => {
    const sliceState = (state as unknown as Record<CacheSlice, StateWithLastFetched>)[slice];
    return sliceState?.lastFetched ?? null;
  };
}

/** True if the slice's data is older than maxAgeMs (or has never been fetched). */
export function isStale(slice: CacheSlice, maxAgeMs: number) {
  return (state: AppState): boolean => {
    const lastFetched = selectLastFetched(slice)(state);
    if (lastFetched === null) return true;
    return Date.now() - lastFetched > maxAgeMs;
  };
}
