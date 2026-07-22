import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingStateComponent } from './loading-state';

describe('LoadingStateComponent', () => {
  let component: LoadingStateComponent;
  let fixture: ComponentFixture<LoadingStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingStateComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show skeleton when loading', () => {
    component.loading = true;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-skeleton-loader')).toBeTruthy();
    expect(compiled.querySelector('app-empty-state')).toBeFalsy();
  });

  it('should show error card when error is set', () => {
    component.loading = false;
    component.error = 'Something went wrong';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.bg-red-50')).toBeTruthy();
    expect(compiled.textContent).toContain('Something went wrong');
  });

  it('should show retry button when retryLabel is set', () => {
    component.loading = false;
    component.error = 'Error';
    component.retryLabel = 'Retry';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button')?.textContent?.trim()).toBe('Retry');
  });

  it('should not show retry button when retryLabel is empty', () => {
    component.loading = false;
    component.error = 'Error';
    component.retryLabel = '';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button')).toBeFalsy();
  });

  it('should show empty state when no data', () => {
    component.loading = false;
    component.error = null;
    component.data = null;
    component.emptyTitle = 'No items';
    component.emptyMessage = 'Nothing to see';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-empty-state')).toBeTruthy();
  });

  it('should show empty state for empty array', () => {
    component.loading = false;
    component.error = null;
    component.data = [];
    component.emptyTitle = 'No items';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-empty-state')).toBeTruthy();
  });

  it('should show content when data is present', () => {
    component.loading = false;
    component.error = null;
    component.data = [{ id: 1 }];
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-empty-state')).toBeFalsy();
    expect(compiled.querySelector('app-skeleton-loader')).toBeFalsy();
  });

  it('should compute hasData correctly for objects', () => {
    component.data = { foo: 'bar' };
    expect(component.hasData).toBe(true);

    component.data = null;
    expect(component.hasData).toBe(false);
  });

  it('should emit retry event', () => {
    let emitted = false;
    component.retry.subscribe(() => {
      emitted = true;
    });
    component.retry.emit();
    expect(emitted).toBe(true);
  });
});
