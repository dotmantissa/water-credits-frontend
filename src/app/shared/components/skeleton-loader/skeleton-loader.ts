import { Component, Input } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [NgIf, NgFor],
  template: `
    <div *ngIf="type === 'stat-card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div *ngFor="let i of [1, 2, 3, 4]" class="card p-5 animate-pulse">
        <div class="flex items-center justify-between mb-3">
          <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
          <div class="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
        </div>
        <div class="h-7 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2"></div>
        <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
      </div>
    </div>

    <div *ngIf="type === 'card'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div *ngFor="let i of [1, 2, 3, 4, 5, 6]" class="card p-5 animate-pulse">
        <div class="flex items-start justify-between mb-3">
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div class="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-16"></div>
        </div>
        <div class="space-y-2 mb-3">
          <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    </div>

    <div *ngIf="type === 'table'" class="card animate-pulse overflow-hidden">
      <div class="p-5 space-y-4">
        <div *ngFor="let i of [1, 2, 3, 4, 5]" class="flex items-center gap-4">
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded flex-[3]"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded flex-[1]"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded flex-[2]"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded flex-[1]"></div>
        </div>
      </div>
    </div>

    <div *ngIf="type === 'chart'" class="card p-5 animate-pulse">
      <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-6"></div>
      <div class="flex items-end gap-2 h-48">
        <div
          *ngFor="let h of [60, 80, 45, 90, 70, 55, 85, 65, 75, 50, 88, 72]"
          class="flex-1 bg-slate-200 dark:bg-slate-700 rounded-t"
          [style.height.%]="h"
        ></div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class SkeletonLoaderComponent {
  @Input() type: 'stat-card' | 'card' | 'table' | 'chart' = 'card';
}
