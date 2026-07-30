import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Filter, X, MapPin } from 'lucide-angular';
import { MapViewComponent, MapMarker } from '../../../shared/components/map-view/map-view';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { PaginationControlsComponent } from '../../../shared/components/pagination-controls/pagination-controls';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { ProjectsService } from '../../../core/services/projects.service';
import { Project, ProjectFilters, ProjectStatus } from '../../../core/models/project.model';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    MapViewComponent,
    SearchInputComponent,
    StatusBadgeComponent,
    PaginationControlsComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-white dark:bg-dark-bg">
      <header
        class="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-bg-lighter shrink-0"
      >
        <div class="flex items-center gap-2">
          <lucide-angular [img]="MapPinIcon" class="w-5 h-5 text-stellar-blue"></lucide-angular>
          <span class="font-semibold text-slate-900 dark:text-white">Water Credits Explorer</span>
        </div>
        <a routerLink="/auth/login" class="btn btn-sm btn-outline">Sign In</a>
      </header>

      <div class="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div class="flex-1 relative">
          <app-map-view
            [markers]="mapMarkers"
            [height]="mapHeight"
            [clickable]="true"
            [centerLat]="20"
            [centerLng]="0"
            [zoom]="2"
            (markerClick)="onMarkerClick($event)"
          />

          <button
            type="button"
            (click)="filterPanelOpen = !filterPanelOpen"
            class="md:hidden absolute bottom-4 right-4 z-[500] btn btn-primary shadow-lg flex items-center gap-2"
          >
            <lucide-angular [img]="FilterIcon" class="w-4 h-4"></lucide-angular>
            Filters &amp; List
          </button>
        </div>

        <aside
          class="w-full md:w-96 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-bg-lighter overflow-y-auto p-4 space-y-4 fixed md:static inset-x-0 bottom-0 z-[400] max-h-[70vh] md:max-h-none rounded-t-2xl md:rounded-none shadow-2xl md:shadow-none transition-transform"
          [class.translate-y-full]="!filterPanelOpen"
          [class.md:translate-y-0]="true"
        >
          <div class="flex items-center justify-between md:hidden">
            <h2 class="font-semibold text-slate-900 dark:text-white">Filters &amp; Projects</h2>
            <button type="button" (click)="filterPanelOpen = false" class="text-slate-400">
              <lucide-angular [img]="XIcon" class="w-5 h-5"></lucide-angular>
            </button>
          </div>

          <app-search-input
            [value]="searchTerm"
            placeholder="Search by project name..."
            (search)="onSearch($event)"
          />

          <div class="grid grid-cols-2 gap-2">
            <select
              [(ngModel)]="statusFilter"
              (ngModelChange)="onFilterChange()"
              class="input text-sm"
            >
              <option value="">All statuses</option>
              <option *ngFor="let s of statusOptions" [value]="s">{{ s }}</option>
            </select>
            <input
              type="text"
              [(ngModel)]="methodologyFilter"
              (ngModelChange)="onMethodologyDebounced()"
              placeholder="Methodology"
              class="input text-sm"
            />
          </div>

          <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              [(ngModel)]="creditsAvailableOnly"
              (ngModelChange)="onFilterChange()"
            />
            Only show projects with credits available
          </label>

          <div *ngIf="loading" class="py-6">
            <app-loading-spinner size="md" label="Loading projects..."></app-loading-spinner>
          </div>

          <app-empty-state
            *ngIf="!loading && filteredProjects.length === 0"
            title="No projects found"
            message="Try adjusting your search or filters."
          ></app-empty-state>

          <div class="space-y-2" *ngIf="!loading">
            <div
              *ngFor="let project of filteredProjects"
              (click)="onProjectSelect(project)"
              class="card p-3 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div class="flex items-start justify-between mb-1">
                <h3 class="font-medium text-sm text-slate-900 dark:text-white">
                  {{ project.name }}
                </h3>
                <app-status-badge [status]="project.status"></app-status-badge>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                {{ project.description }}
              </p>
              <div class="flex items-center gap-3 text-xs text-slate-400">
                <span>{{ project.methodology }}</span>
                <span>{{ project.areaHectares }} ha</span>
              </div>
            </div>
          </div>

          <app-pagination-controls
            *ngIf="!loading && pagination.totalPages > 1"
            [page]="pagination.page"
            [totalPages]="pagination.totalPages"
            [total]="pagination.total"
            [limit]="pagination.limit"
            (goToPage)="onPageChange($event)"
          />
        </aside>
      </div>

      <div
        *ngIf="selectedProject as project"
        class="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 p-4"
        (click)="closeDetail()"
      >
        <div class="card max-w-lg w-full p-6 space-y-4" (click)="$event.stopPropagation()">
          <div class="flex items-start justify-between">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{{ project.name }}</h2>
            <button
              type="button"
              (click)="closeDetail()"
              class="text-slate-400 hover:text-slate-600"
            >
              <lucide-angular [img]="XIcon" class="w-5 h-5"></lucide-angular>
            </button>
          </div>
          <app-status-badge [status]="project.status"></app-status-badge>
          <p class="text-sm text-slate-600 dark:text-slate-300">{{ project.description }}</p>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-slate-400 block text-xs">Methodology</span>
              <span class="font-medium">{{ project.methodology }}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-xs">Area</span>
              <span class="font-medium">{{ project.areaHectares }} ha</span>
            </div>
            <div>
              <span class="text-slate-400 block text-xs">Credits minted</span>
              <span class="font-medium">{{ project.totalCreditsMinted || 0 }}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-xs">Credits available</span>
              <span class="font-medium">{{ creditsAvailable(project) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ExploreComponent implements OnInit, OnDestroy {
  protected projects: Project[] = [];
  protected filteredProjects: Project[] = [];
  protected mapMarkers: MapMarker[] = [];
  protected loading = false;
  protected selectedProject: Project | null = null;
  protected filterPanelOpen = false;
  protected mapHeight = 600;

  protected searchTerm = '';
  protected statusFilter: ProjectStatus | '' = '';
  protected methodologyFilter = '';
  protected creditsAvailableOnly = false;

  protected pagination = { page: 1, limit: 12, total: 0, totalPages: 0 };

  protected readonly statusOptions = Object.values(ProjectStatus);
  protected readonly FilterIcon = Filter;
  protected readonly XIcon = X;
  protected readonly MapPinIcon = MapPin;

  private methodologyDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(private projectsService: ProjectsService) {}

  ngOnInit(): void {
    this.updateMapHeight();
    this.loadProjects();
  }

  ngOnDestroy(): void {
    if (this.methodologyDebounceHandle) {
      clearTimeout(this.methodologyDebounceHandle);
    }
  }

  @HostListener('window:resize')
  updateMapHeight(): void {
    if (typeof window !== 'undefined') {
      this.mapHeight = Math.max(320, window.innerHeight - 64);
    }
  }

  private async loadProjects(): Promise<void> {
    this.loading = true;
    const filters: ProjectFilters = {
      page: this.pagination.page,
      limit: this.pagination.limit,
    };
    if (this.searchTerm) filters.search = this.searchTerm;
    if (this.statusFilter) filters.status = this.statusFilter;
    if (this.methodologyFilter) filters.methodology = this.methodologyFilter;

    try {
      const response = await this.projectsService.getProjects(filters);
      this.projects = response.data;
      this.pagination = {
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      };
      this.applyClientFilters();
      this.updateMapMarkers();
    } catch {
      this.projects = [];
      this.filteredProjects = [];
      this.mapMarkers = [];
    } finally {
      this.loading = false;
    }
  }

  private applyClientFilters(): void {
    this.filteredProjects = this.creditsAvailableOnly
      ? this.projects.filter((p) => this.creditsAvailable(p) > 0)
      : this.projects;
  }

  private updateMapMarkers(): void {
    this.mapMarkers = this.filteredProjects.map((p) => ({
      id: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      label: p.name,
      status: p.status,
      popupContent: `<strong>${p.name}</strong><br/>${p.methodology}`,
    }));
  }

  protected creditsAvailable(project: Project): number {
    return (project.totalCreditsMinted || 0) - (project.totalCreditsRetired || 0);
  }

  protected onSearch(term: string): void {
    this.searchTerm = term;
    this.pagination.page = 1;
    this.loadProjects();
  }

  protected onFilterChange(): void {
    this.pagination.page = 1;
    this.loadProjects();
  }

  protected onMethodologyDebounced(): void {
    if (this.methodologyDebounceHandle) {
      clearTimeout(this.methodologyDebounceHandle);
    }
    this.methodologyDebounceHandle = setTimeout(() => {
      this.pagination.page = 1;
      this.loadProjects();
    }, 300);
  }

  protected onPageChange(page: number): void {
    this.pagination.page = page;
    this.loadProjects();
  }

  protected onProjectSelect(project: Project): void {
    this.selectedProject = project;
  }

  protected onMarkerClick(marker: MapMarker): void {
    const project = this.projects.find((p) => p.id === marker.id);
    if (project) {
      this.selectedProject = project;
    }
  }

  protected closeDetail(): void {
    this.selectedProject = null;
  }
}
