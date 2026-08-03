import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonLoaderComponent } from './skeleton-loader';

describe('SkeletonLoaderComponent', () => {
  let component: SkeletonLoaderComponent;
  let fixture: ComponentFixture<SkeletonLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonLoaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonLoaderComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should default to card variant', () => {
    fixture.detectChanges();
    expect(component.variant).toBe('card');
  });

  it('should render card skeleton by default', () => {
    fixture.detectChanges();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.card')).toBeTruthy();
    expect(el.querySelector('.skeleton')).toBeTruthy();
  });

  it('should render stat-card skeleton', () => {
    component.variant = 'stat-card';
    fixture.detectChanges();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.card')).toBeTruthy();
    expect(el.querySelector('.skeleton')).toBeTruthy();
  });

  it('should render table skeleton', () => {
    component.variant = 'table';
    fixture.detectChanges();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('table')).toBeTruthy();
  });

  it('should render chart skeleton', () => {
    component.variant = 'chart';
    fixture.detectChanges();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.card')).toBeTruthy();
    expect(el.querySelector('.skeleton')).toBeTruthy();
  });
});
