import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { firstValueFrom } from 'rxjs';
import { selectLoadingState } from './loading-state.selector';
import { createFeatureSelector, createSelector } from '@ngrx/store';

interface TestState {
  data: {
    items: string[];
    loading: boolean;
    error: string | null;
  };
}

const selectTestData = createFeatureSelector<TestState['data']>('data');
const selectItems = createSelector(selectTestData, (s) => s.items);
const selectLoading = createSelector(selectTestData, (s) => s.loading);
const selectError = createSelector(selectTestData, (s) => s.error);

describe('selectLoadingState', () => {
  let store: MockStore;
  const initialState: TestState = {
    data: { items: [], loading: false, error: null },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState })],
    });
    store = TestBed.inject(MockStore);
  });

  it('should return loading: false, error: null, hasData: false for empty initial state', async () => {
    const selector = selectLoadingState(selectLoading, selectError, selectItems);
    const result = await firstValueFrom(store.select(selector));
    expect(result.loading).toBe(false);
    expect(result.error).toBeNull();
    expect(result.hasData).toBe(false);
  });

  it('should return loading: true when loading is true', async () => {
    store.setState({ data: { items: [], loading: true, error: null } });
    const selector = selectLoadingState(selectLoading, selectError, selectItems);
    const result = await firstValueFrom(store.select(selector));
    expect(result.loading).toBe(true);
    expect(result.hasData).toBe(false);
  });

  it('should return error when error is present', async () => {
    store.setState({ data: { items: [], loading: false, error: 'Network error' } });
    const selector = selectLoadingState(selectLoading, selectError, selectItems);
    const result = await firstValueFrom(store.select(selector));
    expect(result.error).toBe('Network error');
    expect(result.hasData).toBe(false);
  });

  it('should return hasData: true when items array is non-empty', async () => {
    store.setState({ data: { items: ['a', 'b'], loading: false, error: null } });
    const selector = selectLoadingState(selectLoading, selectError, selectItems);
    const result = await firstValueFrom(store.select(selector));
    expect(result.hasData).toBe(true);
  });

  it('should handle object data with hasData: true when not null', async () => {
    const selectObjData = createSelector(selectTestData, () => ({ name: 'test' }));
    const selector = selectLoadingState(selectLoading, selectError, selectObjData);
    store.setState({ data: { items: [], loading: false, error: null } });
    const result = await firstValueFrom(store.select(selector));
    expect(result.hasData).toBe(true);
  });

  it('should handle object data with hasData: false when null', async () => {
    const selectNullData = createSelector(selectTestData, () => null);
    const selector = selectLoadingState(selectLoading, selectError, selectNullData);
    store.setState({ data: { items: [], loading: false, error: null } });
    const result = await firstValueFrom(store.select(selector));
    expect(result.hasData).toBe(false);
  });

  it('should support multiple loading selectors with OR logic', async () => {
    const selectLoading2 = createSelector(selectTestData, () => false);
    const combinedSelector = selectLoadingState(
      [selectLoading, selectLoading2],
      selectError,
      selectItems,
    );
    store.setState({ data: { items: [], loading: true, error: null } });
    const result = await firstValueFrom(store.select(combinedSelector));
    expect(result.loading).toBe(true);
  });
});
