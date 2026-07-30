import { Component, OnInit } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Plus, FileText } from 'lucide-angular';
import { RetirementService } from '../../../core/services/retirement.service';
import { Retirement } from '../../../core/models/retirement.model';
import {
  DataTableComponent,
  ColumnDef,
} from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { CreditAmountPipe } from '../../../shared/pipes/credit-amount.pipe';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';

@Component({
  selector: 'app-retirement-history',
  standalone: true,
  imports: [
    NgIf,
    NgSwitch,
    NgSwitchCase,
    RouterLink,
    LucideAngularModule,
    DataTableComponent,
    StatusBadgeComponent,
    CreditAmountPipe,
    DateFormatPipe,
  ],
  template: `
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Retirement History</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View all your retired carbon credits and download certificates.
          </p>
        </div>
        <a routerLink="/retirement/new" class="btn btn-primary flex items-center gap-2">
          <lucide-angular [img]="PlusIcon" class="w-4 h-4"></lucide-angular>
          New Retirement
        </a>
      </div>

      <app-data-table
        [columns]="columns"
        [data]="retirements"
        [loading]="loading"
        [pagination]="pagination"
        (page)="onPageChange($event)"
      >
        <ng-template #row let-row let-col="column">
          <ng-container [ngSwitch]="col.key">
            <span *ngSwitchCase="'projectName'">
              {{ row.projectName || row.projectId }}
            </span>
            <span *ngSwitchCase="'amount'">
              {{ row.amount | creditAmount }}
            </span>
            <span *ngSwitchCase="'purpose'" class="max-w-[200px] truncate block">
              {{ row.purpose }}
            </span>
            <span *ngSwitchCase="'status'">
              <app-status-badge [status]="row.status"></app-status-badge>
            </span>
            <span *ngSwitchCase="'retiredAt'" class="whitespace-nowrap">
              {{ row.retiredAt | dateFormat }}
            </span>
            <span *ngSwitchCase="'certificate'">
              <a
                *ngIf="row.status === 'confirmed'"
                [routerLink]="['/retirement', row.id, 'certificate']"
                class="text-stellar-blue hover:text-stellar-blue-light inline-flex items-center gap-1 text-sm"
              >
                <lucide-angular [img]="FileTextIcon" class="w-4 h-4"></lucide-angular>
                Certificate
              </a>
              <span *ngIf="row.status !== 'confirmed'" class="text-slate-400 text-sm">—</span>
            </span>
          </ng-container>
        </ng-template>
      </app-data-table>
    </div>
  `,
})
export class RetirementHistoryComponent implements OnInit {
  protected retirements: Retirement[] = [];
  protected loading = false;
  protected page = 1;
  protected totalPages = 1;
  protected total = 0;
  protected limit = 10;
  protected pagination = {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  };

  protected readonly PlusIcon = Plus;
  protected readonly FileTextIcon = FileText;

  protected columns: ColumnDef<Retirement>[] = [
    { key: 'projectName', label: 'Project', width: '25%' },
    { key: 'amount', label: 'Amount' },
    { key: 'purpose', label: 'Purpose' },
    { key: 'status', label: 'Status' },
    { key: 'retiredAt', label: 'Date' },
    { key: 'certificate', label: 'Certificate' },
  ];

  constructor(private retirementService: RetirementService) {}

  async ngOnInit(): Promise<void> {
    await this.loadRetirements();
  }

  private async loadRetirements(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.retirementService.getRetirements({
        page: this.page,
        limit: this.limit,
      });
      this.retirements = response.data;
      this.total = response.total;
      this.totalPages = response.totalPages;
      this.page = response.page;
      this.pagination = {
        page: response.page,
        limit: this.limit,
        total: response.total,
        totalPages: response.totalPages,
      };
    } catch {
      this.retirements = [];
    } finally {
      this.loading = false;
    }
  }

  protected onPageChange(page: number): void {
    this.page = page;
    this.loadRetirements();
  }
}
