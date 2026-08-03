import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import {
  DataTableComponent,
  ColumnDef,
} from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state';
import { Project, ProjectFilters } from '../../../core/models/project.model';
import * as ProjectsActions from '../../../core/store/projects/projects.actions';
import {
  selectAllProjects,
  selectProjectsLoading,
  selectProjectsError,
  selectProjectsPagination,
  selectProjectsFilters,
} from '../../../core/store/projects/projects.selectors';
import { LucideAngularModule, Plus, LayoutGrid, Table2 } from 'lucide-angular';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    AsyncPipe,
    DataTableComponent,
    StatusBadgeComponent,
    SearchInputComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    LucideAngularModule,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Projects</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor and manage water credit projects
          </p>
        </div>
        <a routerLink="/projects/new" class="btn btn-primary flex items-center gap-2">
          <lucide-angular [img]="Plus" class="w-4 h-4"></lucide-angular>
          New Project
        </a>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex-1 max-w-md">
          <app-search-input
            [value]="searchTerm"
            placeholder="Search projects..."
            (search)="onSearch($event)"
          />
        </div>
        <div
          class="flex items-center gap-2 bg-white dark:bg-dark-bg-lighter rounded-lg border border-slate-200 dark:border-slate-700 p-1"
        >
          <button
            (click)="viewMode = 'table'"
            [class]="
              viewMode === 'table'
                ? 'bg-stellar-blue/10 text-stellar-blue'
                : 'text-slate-400 hover:text-slate-600'
            "
            class="p-2 rounded-md transition-colors"
          >
            <lucide-angular [img]="Table2" class="w-4 h-4"></lucide-angular>
          </button>
          <button
            (click)="viewMode = 'grid'"
            [class]="
              viewMode === 'grid'
                ? 'bg-stellar-blue/10 text-stellar-blue'
                : 'text-slate-400 hover:text-slate-600'
            "
            class="p-2 rounded-md transition-colors"
          >
            <lucide-angular [img]="LayoutGrid" class="w-4 h-4"></lucide-angular>
          </button>
        </div>
      </div>

      <div *ngIf="viewMode === 'table'">
        <app-data-table
          [columns]="tableColumns"
          [data]="(projects$ | async) || []"
          [loading]="(loading$ | async) || false"
          [pagination]="pagination$ | async"
          [sortColumn]="sortColumn"
          [sortDirection]="sortDirection"
          (rowClick)="goToProject($event)"
          (sort)="onSort($event)"
          (page)="onPageChange($event)"
          emptyTitle="No projects found"
          emptyMessage="Get started by creating your first water credit project."
        />
      </div>

      <div *ngIf="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div class="col-span-full">
          <app-loading-state
            [loading]="(loading$ | async) ?? false"
            skeleton="card"
            loadingLabel="Loading projects..."
          ></app-loading-state>
        </div>
        <ng-container *ngIf="!(projects$ | async)?.length">
          <div class="col-span-full">
            <app-empty-state
              title="No projects found"
              message="Get started by creating your first water credit project."
            ></app-empty-state>
          </div>
        </ng-container>
        <div
          *ngFor="let project of projects$ | async"
          (click)="goToProject(project)"
          class="card p-5 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div class="flex items-start justify-between mb-3">
            <h3 class="font-semibold text-slate-900 dark:text-white">{{ project.name }}</h3>
            <app-status-badge [status]="project.status"></app-status-badge>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
            {{ project.description }}
          </p>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span class="text-slate-400">Area:</span>
              <span class="font-medium">{{ project.areaHectares }} ha</span>
            </div>
            <div>
              <span class="text-slate-400">Methodology:</span>
              <span class="font-medium">{{ project.methodology }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ProjectsListComponent implements OnInit, OnDestroy {
  protected projects$: Observable<Project[]>;
  protected loading$: Observable<boolean>;
  protected error$: Observable<string | null>;
  protected pagination$: Observable<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>;
  protected filters$: Observable<ProjectFilters>;
  protected viewMode: 'table' | 'grid' = 'table';
  protected searchTerm = '';
  protected sortColumn = 'createdAt';
  protected sortDirection: 'asc' | 'desc' = 'desc';
  private destroy$ = new Subject<void>();

  protected readonly Plus = Plus;
  protected readonly LayoutGrid = LayoutGrid;
  protected readonly Table2 = Table2;

  protected tableColumns: ColumnDef<Project>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'methodology', label: 'Methodology', sortable: true },
    { key: 'areaHectares', label: 'Area (ha)', sortable: true, align: 'right' },
    { key: 'createdAt', label: 'Created', sortable: true },
  ];

  constructor(
    private store: Store,
    private router: Router,
  ) {
    this.projects$ = this.store.select(selectAllProjects);
    this.loading$ = this.store.select(selectProjectsLoading);
    this.error$ = this.store.select(selectProjectsError);
    this.pagination$ = this.store.select(selectProjectsPagination);
    this.filters$ = this.store.select(selectProjectsFilters);
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProjects(): void {
    this.store.dispatch(
      ProjectsActions.loadProjects({
        filters: {
          sortBy: this.sortColumn,
          sortOrder: this.sortDirection.toUpperCase() as 'ASC' | 'DESC',
        },
      }),
    );
  }

  goToProject(project: object): void {
    this.router.navigate(['/projects', (project as Project).id]);
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.store.dispatch(ProjectsActions.setProjectFilters({ filters: { search: term } }));
    this.loadProjects();
  }

  onSort(event: { column: string; direction: 'asc' | 'desc' }): void {
    this.sortColumn = event.column;
    this.sortDirection = event.direction;
    this.loadProjects();
  }

  onPageChange(page: number): void {
    this.store.dispatch(ProjectsActions.setProjectPage({ page }));
    this.loadProjects();
  }
}
