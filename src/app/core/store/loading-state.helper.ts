import { createSelector, Selector } from '@ngrx/store';
import { AppState } from './app.state';

export interface LoadingState {
  loading: boolean;
  error: string | null;
  hasData: boolean;
}

export function selectLoadingState<T>(
  loadingSelector: Selector<AppState, boolean>,
  errorSelector: Selector<AppState, string | null>,
  dataSelector: Selector<AppState, T | null>,
): Selector<AppState, LoadingState> {
  return createSelector(loadingSelector, errorSelector, dataSelector, (loading, error, data) => ({
    loading,
    error,
    hasData: Array.isArray(data) ? data.length > 0 : data != null,
  }));
}
