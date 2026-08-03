import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgFor],
  template: `
    <!-- Stat Card Skeleton -->
    <div *ngIf="variant === 'stat-card'" class="card p-5">
      <div class="flex items-center justify-between mb-3">
        <div class="skeleton h-3 w-24 rounded"></div>
        <div class="skeleton h-9 w-9 rounded-lg"></div>
      </div>
      <div class="skeleton h-7 w-20 rounded mb-1"></div>
      <div class="skeleton h-3 w-16 rounded"></div>
    </div>

    <!-- Card Skeleton -->
    <div *ngIf="variant === 'card'" class="card p-5">
      <div class="flex items-start justify-between mb-3">
        <div class="skeleton h-5 w-32 rounded"></div>
        <div class="skeleton h-5 w-16 rounded-full"></div>
      </div>
      <div class="space-y-2 mb-4">
        <div class="skeleton h-3 w-full rounded"></div>
        <div class="skeleton h-3 w-3/4 rounded"></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <div class="skeleton h-3 w-10 rounded mb-1"></div>
          <div class="skeleton h-3 w-16 rounded"></div>
        </div>
        <div>
          <div class="skeleton h-3 w-16 rounded mb-1"></div>
          <div class="skeleton h-3 w-20 rounded"></div>
        </div>
      </div>
    </div>

    <!-- Table Skeleton -->
    <div *ngIf="variant === 'table'" class="card overflow-hidden">
      <div class="p-4 border-b border-slate-200 dark:border-slate-700">
        <div class="flex items-center gap-3">
          <div class="skeleton h-8 flex-1 rounded"></div>
          <div class="skeleton h-8 w-20 rounded"></div>
        </div>
      </div>
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-200 dark:border-slate-700">
            <th *ngFor="let col of tableColumns" class="text-left px-4 py-3">
              <div class="skeleton h-3 rounded" [style.width]="col + 'px'"></div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            *ngFor="let r of rowArray"
            class="border-b border-slate-100 dark:border-slate-700/50 last:border-0"
          >
            <td *ngFor="let col of tableColumns" class="px-4 py-3">
              <div class="skeleton h-4 rounded" [style.width]="col - 20 + 'px'"></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Chart Skeleton -->
    <div *ngIf="variant === 'chart'" class="card p-5">
      <div class="skeleton h-5 w-40 rounded mb-4"></div>
      <div class="flex items-end gap-1" [style.height.px]="height">
        <div *ngFor="let bar of bars" class="flex-1 flex flex-col justify-end gap-0.5">
          <div class="skeleton rounded-t w-full" [style.height.%]="bar"></div>
          <div class="skeleton h-2 w-full rounded"></div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .skeleton {
        background: linear-gradient(
          90deg,
          rgb(226 232 240 / 0.6) 25%,
          rgb(226 232 240 / 0.3) 50%,
          rgb(226 232 240 / 0.6) 75%
        );
        background-size: 200% 100%;
        animation: skeleton-pulse 1.5s ease-in-out infinite;
      }

      :host-context(.dark) .skeleton {
        background: linear-gradient(
          90deg,
          rgb(51 65 85 / 0.6) 25%,
          rgb(51 65 85 / 0.3) 50%,
          rgb(51 65 85 / 0.6) 75%
        );
        background-size: 200% 100%;
      }

      @keyframes skeleton-pulse {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
    `,
  ],
})
export class SkeletonLoaderComponent {
  @Input() variant: 'stat-card' | 'card' | 'table' | 'chart' = 'card';
  @Input() rows = 5;
  @Input() height = 256;

  protected readonly tableColumns = [120, 100, 80, 60, 90];
  protected readonly bars = [60, 45, 80, 35, 70, 50, 65, 40, 75, 55, 85, 30];

  private _cachedRows = -1;
  private _rowArray: unknown[] = [];

  get rowArray(): unknown[] {
    if (this._cachedRows !== this.rows) {
      this._cachedRows = this.rows;
      this._rowArray = Array.from({ length: this.rows });
    }
    return this._rowArray;
  }
}
