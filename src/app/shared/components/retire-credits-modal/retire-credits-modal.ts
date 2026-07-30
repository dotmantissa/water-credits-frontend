import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreditAmountPipe } from '../../pipes/credit-amount.pipe';
import { LucideAngularModule, X, ChevronLeft, Check, Droplets } from 'lucide-angular';

interface Step {
  label: string;
  description: string;
}

@Component({
  selector: 'app-retire-credits-modal',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, CreditAmountPipe, LucideAngularModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        class="bg-white dark:bg-dark-bg-lighter rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div
          class="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700"
        >
          <div class="flex items-center gap-3">
            <button
              *ngIf="currentStep > 0"
              (click)="prevStep()"
              class="text-slate-400 hover:text-slate-600"
            >
              <lucide-angular [img]="ChevronLeft" class="w-5 h-5"></lucide-angular>
            </button>
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ steps[currentStep].label }}
            </h2>
          </div>
          <button
            (click)="close.emit()"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <lucide-angular [img]="X" class="w-5 h-5"></lucide-angular>
          </button>
        </div>
        <div class="px-6 py-4">
          <div class="flex items-center justify-between mb-6">
            <div *ngFor="let step of steps; let i = index" class="flex items-center">
              <div
                [class]="{
                  'bg-stellar-blue text-white': i <= currentStep,
                  'bg-slate-200 dark:bg-slate-700 text-slate-500': i > currentStep,
                }"
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
              >
                <lucide-angular
                  *ngIf="i < currentStep"
                  [img]="Check"
                  class="w-4 h-4"
                ></lucide-angular>
                <span *ngIf="i >= currentStep">{{ i + 1 }}</span>
              </div>
              <div
                *ngIf="i < steps.length - 1"
                [class]="{
                  'bg-stellar-blue': i < currentStep,
                  'bg-slate-200 dark:bg-slate-700': i >= currentStep,
                }"
                class="w-12 h-0.5 mx-1 transition-colors"
              ></div>
            </div>
          </div>

          <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {{ steps[currentStep].description }}
          </p>

          <div *ngIf="currentStep === 0">
            <label class="label">Select Project</label>
            <select [(ngModel)]="selectedProjectId" class="input mb-4">
              <option value="">Choose a project...</option>
              <option *ngFor="let p of projects" [value]="p.id">
                {{ p.name }} ({{ p.balance }} available)
              </option>
            </select>
          </div>

          <div *ngIf="currentStep === 1">
            <label class="label">Amount to Retire</label>
            <input
              type="number"
              [(ngModel)]="amount"
              class="input mb-2"
              placeholder="Enter amount..."
              min="0"
              step="any"
            />
            <p class="text-xs text-slate-400">
              Available balance: {{ availableBalance | creditAmount }}
            </p>
          </div>

          <div *ngIf="currentStep === 2">
            <label class="label">Retirement Purpose</label>
            <select [(ngModel)]="purpose" class="input mb-4">
              <option value="offset">Carbon Offset</option>
              <option value="sustainability">Sustainability Report</option>
              <option value="compliance">Regulatory Compliance</option>
              <option value="voluntary">Voluntary Retirement</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div *ngIf="currentStep === 3" class="space-y-3">
            <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-4 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Project</span><span>{{ selectedProjectName }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Amount</span
                ><span class="font-semibold text-environmental-green"
                  >{{ amount | creditAmount }} credits</span
                >
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Purpose</span
                ><span class="capitalize">{{ purpose }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Network</span><span>Testnet</span>
              </div>
            </div>
            <p class="text-xs text-slate-400">
              Confirm the details above. This transaction cannot be undone.
            </p>
          </div>

          <div *ngIf="currentStep === 4" class="text-center py-4">
            <lucide-angular
              [img]="Check"
              class="w-12 h-12 text-environmental-green mx-auto mb-3"
            ></lucide-angular>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Retirement Submitted!
            </h3>
            <p class="text-sm text-slate-500">Your credits are being retired on-chain.</p>
          </div>
        </div>

        <div class="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button *ngIf="currentStep <= 2" (click)="close.emit()" class="btn btn-outline">
            Cancel
          </button>
          <button
            *ngIf="currentStep < 3"
            (click)="nextStep()"
            [disabled]="!canProceed"
            class="btn btn-primary"
          >
            Continue
          </button>
          <button
            *ngIf="currentStep === 3"
            (click)="confirm.emit({ projectId: selectedProjectId, amount, purpose })"
            [disabled]="loading"
            class="btn btn-primary"
          >
            {{ loading ? 'Submitting...' : 'Confirm Retirement' }}
          </button>
          <button *ngIf="currentStep === 4" (click)="close.emit()" class="btn btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  `,
})
export class RetireCreditsModalComponent {
  @Input() projects: { id: string; name: string; balance: string }[] = [];
  @Input() loading = false;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{ projectId: string; amount: string; purpose: string }>();

  protected currentStep = 0;
  protected selectedProjectId = '';
  protected amount = '';
  protected purpose = 'offset';
  protected readonly steps: Step[] = [
    { label: 'Project', description: 'Select the project whose credits you want to retire.' },
    { label: 'Amount', description: 'Enter the amount of credits to retire.' },
    { label: 'Purpose', description: 'Select the purpose for this retirement.' },
    { label: 'Review', description: 'Review and confirm your retirement.' },
    { label: 'Done', description: 'Retirement submitted.' },
  ];

  protected readonly X = X;
  protected readonly ChevronLeft = ChevronLeft;
  protected readonly Check = Check;
  protected readonly Droplets = Droplets;

  get selectedProjectName(): string {
    return this.projects.find((p) => p.id === this.selectedProjectId)?.name || '';
  }

  get availableBalance(): string {
    return this.projects.find((p) => p.id === this.selectedProjectId)?.balance || '0';
  }

  get canProceed(): boolean {
    switch (this.currentStep) {
      case 0:
        return !!this.selectedProjectId;
      case 1:
        return !!this.amount && parseFloat(this.amount) > 0;
      case 2:
        return !!this.purpose;
      default:
        return true;
    }
  }

  nextStep(): void {
    if (this.canProceed) this.currentStep++;
  }

  prevStep(): void {
    if (this.currentStep > 0) this.currentStep--;
  }
}
