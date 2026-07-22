import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader';
import { EmptyStateComponent } from '../empty-state/empty-state';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [NgIf, SkeletonLoaderComponent, EmptyStateComponent],
  template: `
    <app-skeleton-loader *ngIf="!!loading" [type]="skeletonType"></app-skeleton-loader>

    <div
      *ngIf="!loading && error"
      class="card p-5 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
    >
      <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <button *ngIf="retryLabel" (click)="retry.emit()" class="btn btn-sm btn-outline mt-2">
        {{ retryLabel }}
      </button>
    </div>

    <app-empty-state
      *ngIf="!loading && !error && !hasData"
      [title]="emptyTitle"
      [message]="emptyMessage"
    ></app-empty-state>

    <ng-content *ngIf="!loading && !error && hasData"></ng-content>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class LoadingStateComponent {
  @Input() loading: boolean | null = false;
  @Input() error: string | null = null;
  @Input() data: unknown = null;
  @Input() skeletonType: 'stat-card' | 'card' | 'table' | 'chart' = 'card';
  @Input() emptyTitle = 'Nothing here yet';
  @Input() emptyMessage = '';
  @Input() retryLabel = '';
  @Output() retry = new EventEmitter<void>();

  get hasData(): boolean {
    if (Array.isArray(this.data)) return this.data.length > 0;
    return this.data != null;
  }
}
