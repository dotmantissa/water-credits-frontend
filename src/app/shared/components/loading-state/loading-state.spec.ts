import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { LoadingStateComponent } from './loading-state';

@Component({
  template: `
    <app-loading-state
      [loading]="loading"
      [error]="error"
      [empty]="empty"
      [skeleton]="skeleton"
      (retry)="onRetry()"
    >
      <div class="test-content">Content</div>
    </app-loading-state>
  `,
  imports: [LoadingStateComponent],
})
class TestHostComponent {
  loading = false;
  error: string | null = null;
  empty = false;
  skeleton: '' | 'stat-card' | 'card' | 'table' | 'chart' = '';
  retryCalled = false;

  onRetry() {
    this.retryCalled = true;
  }
}

describe('LoadingStateComponent', () => {
  let host: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(host).toBeTruthy();
  });

  it('should show content when not loading, no error, not empty', () => {
    host.loading = false;
    host.error = null;
    host.empty = false;
    fixture.detectChanges();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.test-content')).toBeTruthy();
    expect(el.querySelector('.skeleton')).toBeNull();
  });

  it('should show skeleton when loading with skeleton variant', () => {
    host.loading = true;
    host.skeleton = 'card';
    fixture.detectChanges();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.skeleton')).toBeTruthy();
    expect(el.querySelector('.test-content')).toBeNull();
  });

  it('should show spinner when loading without skeleton variant', () => {
    host.loading = true;
    host.skeleton = '';
    fixture.detectChanges();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.animate-spin')).toBeTruthy();
    expect(el.querySelector('.test-content')).toBeNull();
  });

  it('should show error state with retry button', () => {
    host.loading = false;
    host.error = 'Something went wrong';
    fixture.detectChanges();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Something went wrong');
    expect(el.querySelector('button')).toBeTruthy();
    expect(el.querySelector('.test-content')).toBeNull();
  });

  it('should emit retry when retry button is clicked', () => {
    host.loading = false;
    host.error = 'Error';
    fixture.detectChanges();
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    btn.click();
    expect(host.retryCalled).toBe(true);
  });

  it('should show empty state when empty is true', () => {
    host.loading = false;
    host.error = null;
    host.empty = true;
    fixture.detectChanges();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nothing here yet');
    expect(el.querySelector('.test-content')).toBeNull();
  });

  it('should prioritize loading over error and empty', () => {
    host.loading = true;
    host.error = 'Error';
    host.empty = true;
    host.skeleton = 'stat-card';
    fixture.detectChanges();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.skeleton')).toBeTruthy();
    expect(el.textContent).not.toContain('Something went wrong');
    expect(el.textContent).not.toContain('Nothing here yet');
  });
});
