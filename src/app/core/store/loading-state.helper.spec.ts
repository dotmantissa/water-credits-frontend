import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { selectLoadingState } from './loading-state.helper';
import { AppState } from './app.state';
import { Selector } from '@ngrx/store';

describe('selectLoadingState', () => {
  const mockLoadingSelector: Selector<AppState, boolean> = (state) => (state as any).test.loading;
  const mockErrorSelector: Selector<AppState, string | null> = (state) => (state as any).test.error;
  const mockDataSelector: Selector<AppState, unknown> = (state) => (state as any).test.data;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          initialState: {
            test: { loading: false, error: null, data: [] },
          } as any,
        }),
      ],
    });
  });

  it('should return loading state with array data', () => {
    const result = selectLoadingState(mockLoadingSelector, mockErrorSelector, mockDataSelector);
    const projFn = (result as any).projector;
    const state = { loading: false, error: null, data: [{ id: 1 }, { id: 2 }] };
    const out = projFn(state.loading, state.error, state.data);
    expect(out.loading).toBe(false);
    expect(out.error).toBeNull();
    expect(out.hasData).toBe(true);
  });

  it('should return hasData false for empty array', () => {
    const result = selectLoadingState(mockLoadingSelector, mockErrorSelector, mockDataSelector);
    const projFn = (result as any).projector;
    const out = projFn(false, null, []);
    expect(out.hasData).toBe(false);
  });

  it('should return loading true', () => {
    const result = selectLoadingState(mockLoadingSelector, mockErrorSelector, mockDataSelector);
    const projFn = (result as any).projector;
    const out = projFn(true, null, null);
    expect(out.loading).toBe(true);
  });

  it('should return error state', () => {
    const result = selectLoadingState(mockLoadingSelector, mockErrorSelector, mockDataSelector);
    const projFn = (result as any).projector;
    const out = projFn(false, 'Failed to load', null);
    expect(out.error).toBe('Failed to load');
  });

  it('should return hasData true for object data', () => {
    const result = selectLoadingState(mockLoadingSelector, mockErrorSelector, mockDataSelector);
    const projFn = (result as any).projector;
    const out = projFn(false, null, { name: 'test' });
    expect(out.hasData).toBe(true);
  });

  it('should return hasData false for null data', () => {
    const result = selectLoadingState(mockLoadingSelector, mockErrorSelector, mockDataSelector);
    const projFn = (result as any).projector;
    const out = projFn(false, null, null);
    expect(out.hasData).toBe(false);
  });
});
