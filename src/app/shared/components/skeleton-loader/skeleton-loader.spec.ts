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
    expect(component).toBeTruthy();
  });

  it('should default to card type', () => {
    expect(component.type).toBe('card');
  });

  it('should render stat-card skeleton', () => {
    component.type = 'stat-card';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.card').length).toBe(4);
  });

  it('should render card skeleton', () => {
    component.type = 'card';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.card').length).toBe(6);
  });

  it('should render table skeleton', () => {
    component.type = 'table';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.card')).toBeTruthy();
    expect(compiled.querySelectorAll('.flex.items-center.gap-4').length).toBe(5);
  });

  it('should render chart skeleton', () => {
    component.type = 'chart';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.card')).toBeTruthy();
    expect(compiled.querySelectorAll('.flex-1.bg-slate-200').length).toBe(12);
  });
});
