import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { NgIf } from '@angular/common';
import { LucideAngularModule, AlertTriangle, RefreshCw } from 'lucide-angular';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader';
import { EmptyStateComponent } from '../empty-state/empty-state';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, LucideAngularModule, SkeletonLoaderComponent, EmptyStateComponent],
  template: `
    <!-- Loading: skeleton or spinner -->
    <div *ngIf="loading">
      <ng-container *ngIf="skeleton; else spinnerBlock">
        <app-skeleton-loader [variant]="skeleton" [rows]="skeletonRows"></app-skeleton-loader>
      </ng-container>
      <ng-template #spinnerBlock>
        <div class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-2">
            <div
              class="animate-spin w-8 h-8 border-2 border-stellar-blue border-t-transparent rounded-full"
            ></div>
            <span *ngIf="loadingLabel" class="text-sm text-slate-500">{{ loadingLabel }}</span>
          </div>
        </div>
      </ng-template>
    </div>

    <!-- Error -->
    <div
      *ngIf="!loading && error"
      class="card p-5 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
    >
      <div class="flex items-center gap-2 mb-2">
        <lucide-angular [img]="AlertTriangleIcon" class="w-4 h-4 text-red-500"></lucide-angular>
        <p class="text-sm font-medium text-red-600 dark:text-red-400">{{ error }}</p>
      </div>
      <button (click)="retry.emit()" class="btn btn-sm btn-outline mt-1 flex items-center gap-1.5">
        <lucide-angular [img]="RefreshCwIcon" class="w-3.5 h-3.5"></lucide-angular>
        Retry
      </button>
    </div>

    <!-- Empty (no data, not loading, not error) -->
    <app-empty-state
      *ngIf="!loading && !error && empty"
      [title]="emptyTitle"
      [message]="emptyMessage"
    ></app-empty-state>

    <!-- Content -->
    <ng-container *ngIf="!loading && !error && !empty">
      <ng-content></ng-content>
    </ng-container>
  `,
})
export class LoadingStateComponent {
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() empty = false;
  @Input() emptyTitle = 'Nothing here yet';
  @Input() emptyMessage = '';
  @Input() skeleton: 'stat-card' | 'card' | 'table' | 'chart' | '' = '';
  @Input() skeletonRows = 5;
  @Input() loadingLabel = '';
  @Output() retry = new EventEmitter<void>();

  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly RefreshCwIcon = RefreshCw;
}
