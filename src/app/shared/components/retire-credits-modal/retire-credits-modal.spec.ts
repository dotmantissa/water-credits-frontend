import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RetireCreditsModalComponent } from './retire-credits-modal';

describe('RetireCreditsModalComponent', () => {
  let fixture: ComponentFixture<RetireCreditsModalComponent>;
  let component: RetireCreditsModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RetireCreditsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RetireCreditsModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('projects', [{ id: 'p1', name: 'Project One', balance: '100' }]);
    fixture.detectChanges();
  });

  function selectProject(id: string): void {
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function setAmount(value: string): void {
    const input = fixture.nativeElement.querySelector('input[type="number"]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function buttonByText(text: string): HTMLButtonElement {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const btn = buttons.find((b) => (b.textContent ?? '').trim() === text);
    if (!btn) throw new Error(`Button not found: ${text}`);
    return btn;
  }

  function clickContinue(): void {
    buttonByText('Continue').click();
    fixture.detectChanges();
  }

  function advanceToStepOne(): void {
    selectProject('p1');
    clickContinue();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should allow proceeding with a valid amount within the balance', () => {
    advanceToStepOne();
    setAmount('50');
    expect(component.canProceed).toBe(true);
    expect(component.amountError).toBeNull();
    expect(buttonByText('Continue').disabled).toBe(false);
  });

  it('should block proceeding when the amount exceeds the available balance', () => {
    advanceToStepOne();
    setAmount('150');
    expect(component.canProceed).toBe(false);
    expect(component.amountError).toBe('Exceeds available balance of 100');
  });

  it('should render an inline error message when the amount exceeds the balance', () => {
    advanceToStepOne();
    setAmount('150');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Exceeds available balance of 100');
  });

  it('should disable the Continue button when the amount exceeds the balance', () => {
    advanceToStepOne();
    setAmount('150');
    expect(buttonByText('Continue').disabled).toBe(true);
  });

  it('should fail validation with a zero amount', () => {
    advanceToStepOne();
    setAmount('0');
    expect(component.canProceed).toBe(false);
  });

  it('should fail validation with an empty amount', () => {
    advanceToStepOne();
    setAmount('');
    expect(component.canProceed).toBe(false);
  });

  it('should allow an amount equal to the balance with 7 decimal places', () => {
    fixture.componentRef.setInput('projects', [
      { id: 'p1', name: 'Project One', balance: '0.0000001' },
    ]);
    fixture.detectChanges();
    advanceToStepOne();
    setAmount('0.0000001');
    expect(component.canProceed).toBe(true);
    expect(component.amountError).toBeNull();
  });

  it('should reject an amount that exceeds the balance by 1 stroop (7 decimal places)', () => {
    fixture.componentRef.setInput('projects', [
      { id: 'p1', name: 'Project One', balance: '0.0000001' },
    ]);
    fixture.detectChanges();
    advanceToStepOne();
    setAmount('0.0000002');
    expect(component.canProceed).toBe(false);
    expect(component.amountError).toBe('Exceeds available balance of 0.0000001');
  });

  it('should reject an amount exceeding a large balance without precision loss', () => {
    fixture.componentRef.setInput('projects', [
      { id: 'p1', name: 'Project One', balance: '99999999999.0000000' },
    ]);
    fixture.detectChanges();
    advanceToStepOne();
    setAmount('100000000000');
    expect(component.canProceed).toBe(false);
    expect(component.amountError).toBe('Exceeds available balance of 99999999999.0000000');
  });

  it('should emit the correct confirm payload', () => {
    const confirmSpy = vi.fn();
    component.confirm.subscribe(confirmSpy);
    advanceToStepOne();
    setAmount('25');
    clickContinue();
    clickContinue();
    buttonByText('Confirm Retirement').click();
    expect(confirmSpy).toHaveBeenCalledWith({ projectId: 'p1', amount: 25, purpose: 'offset' });
  });
});
