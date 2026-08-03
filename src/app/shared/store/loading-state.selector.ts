import { createSelector, Selector } from '@ngrx/store';

export interface LoadingState {
  loading: boolean;
  error: string | null;
  hasData: boolean;
}

type BoolSelector = Selector<any, boolean>;

/**
 * Creates a composite selector that returns { loading, error, hasData } for any
 * store slice. Handles three common shapes:
 *
 * 1. Single `loading` + `error` + data array/object
 * 2. Multiple loading flags (OR'd together)
 * 3. No loading flag (defaults to false)
 *
 * @param loadingSelectors - One or more selectors that return a boolean
 * @param errorSelector - Selector that returns string | null
 * @param dataSelector - Selector that returns T[] | T | null
 */
export function selectLoadingState<T>(
  loadingSelector: BoolSelector,
  errorSelector: Selector<any, string | null>,
  dataSelector: Selector<any, T[] | T | null>,
): Selector<any, LoadingState>;
export function selectLoadingState<T>(
  loadingSelectors: BoolSelector[],
  errorSelector: Selector<any, string | null>,
  dataSelector: Selector<any, T[] | T | null>,
): Selector<any, LoadingState>;
export function selectLoadingState<T>(
  loadingInput: BoolSelector | BoolSelector[],
  errorSelector: Selector<any, string | null>,
  dataSelector: Selector<any, T[] | T | null>,
): Selector<any, LoadingState> {
  const loadingArray = Array.isArray(loadingInput) ? loadingInput : [loadingInput];
  const combinedLoadingSelector = createSelector(loadingArray, (...bools: boolean[]) =>
    bools.some((v) => v),
  );
  return createSelector(
    combinedLoadingSelector,
    errorSelector,
    dataSelector,
    (loading: boolean, error: string | null, data: T[] | T | null) => {
      const hasData = Array.isArray(data) ? data.length > 0 : data != null;
      return { loading, error, hasData };
    },
  );
}
