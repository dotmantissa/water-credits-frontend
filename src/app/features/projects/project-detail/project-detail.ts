import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { map, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { NgIf, AsyncPipe } from '@angular/common';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { CreditAmountPipe } from '../../../shared/pipes/credit-amount.pipe';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { StellarAddressPipe } from '../../../shared/pipes/stellar-address.pipe';
import { SensorChartComponent } from '../../../shared/components/sensor-chart/sensor-chart';
import {
  SensorParameter,
  TimeRange,
} from '../../../shared/components/sensor-chart/sensor-parameter.model';
import { SensorReading } from '../../../core/models/sensor-reading.model';
import { SensorsService } from '../../../core/services/sensors.service';
import { Project } from '../../../core/models/project.model';
import * as ProjectsActions from '../../../core/store/projects/projects.actions';
import {
  selectSelectedProject,
  selectProjectsLoading,
} from '../../../core/store/projects/projects.selectors';
import {
  LucideAngularModule,
  ArrowLeft,
  MapPin,
  Calendar,
  Ruler,
  FileText,
  Activity,
  Droplets,
} from 'lucide-angular';

const PROJECT_SENSOR_PARAMS: SensorParameter[] = [
  { key: 'ph', label: 'pH', unit: '', color: '#7B2FBE', decimals: 2 },
  { key: 'turbidity', label: 'Turbidity', unit: 'NTU', color: '#F59E0B', decimals: 1 },
  { key: 'dissolvedOxygen', label: 'Dissolved O₂', unit: 'mg/L', color: '#3B82F6', decimals: 1 },
  { key: 'temperature', label: 'Temperature', unit: '°C', color: '#F97316', decimals: 1 },
];

const PROJECT_SENSOR_THRESHOLDS: Record<string, { low?: number; high?: number }> = {
  ph: { low: 6.5, high: 8.5 },
};

type ProjectTab = 'overview' | 'sensors';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    RouterLink,
    NgIf,
    AsyncPipe,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    CreditAmountPipe,
    DateFormatPipe,
    StellarAddressPipe,
    LucideAngularModule,
    SensorChartComponent,
  ],
  template: `
    <div *ngIf="loading$ | async" class="py-20">
      <app-loading-spinner size="lg" label="Loading project..."></app-loading-spinner>
    </div>

    <ng-container *ngIf="!(loading$ | async) && project">
      <div class="mb-6">
        <a
          routerLink="/projects"
          class="inline-flex items-center gap-1 text-sm text-stellar-blue hover:text-stellar-blue-light mb-4"
        >
          <lucide-angular [img]="ArrowLeft" class="w-4 h-4"></lucide-angular>
          Back to Projects
        </a>
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{ project.name }}</h1>
              <app-status-badge [status]="project.status"></app-status-badge>
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ project.description }}</p>
          </div>
          <div class="flex gap-2">
            <a [routerLink]="['/projects', project.id, 'edit']" class="btn btn-outline text-sm"
              >Edit</a
            >
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-700">
        <button
          (click)="activeTab = 'overview'"
          [class.text-stellar-blue]="activeTab === 'overview'"
          [class.border-stellar-blue]="activeTab === 'overview'"
          [class.border-transparent]="activeTab !== 'overview'"
          [class.text-slate-500]="activeTab !== 'overview'"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
        >
          Overview
        </button>
        <button
          (click)="onSensorsTabClick()"
          [class.text-stellar-blue]="activeTab === 'sensors'"
          [class.border-stellar-blue]="activeTab === 'sensors'"
          [class.border-transparent]="activeTab !== 'sensors'"
          [class.text-slate-500]="activeTab !== 'sensors'"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5"
        >
          <lucide-angular [img]="Droplets" class="w-3.5 h-3.5"></lucide-angular>
          Sensors
        </button>
      </div>

      <!-- Overview Tab -->
      <ng-container *ngIf="activeTab === 'overview'">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-6">
            <div class="card p-5">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Project Details
              </h2>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-slate-400 uppercase tracking-wider mb-1">Methodology</p>
                  <p class="text-sm font-medium">{{ project.methodology }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase tracking-wider mb-1">Area</p>
                  <p class="text-sm font-medium flex items-center gap-1">
                    <lucide-angular
                      [img]="Ruler"
                      class="w-3.5 h-3.5 text-slate-400"
                    ></lucide-angular>
                    {{ project.areaHectares }} hectares
                  </p>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase tracking-wider mb-1">Location</p>
                  <p class="text-sm font-medium flex items-center gap-1">
                    <lucide-angular
                      [img]="MapPin"
                      class="w-3.5 h-3.5 text-slate-400"
                    ></lucide-angular>
                    {{ project.latitude.toFixed(4) }}, {{ project.longitude.toFixed(4) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase tracking-wider mb-1">
                    Baseline Period
                  </p>
                  <p class="text-sm font-medium flex items-center gap-1">
                    <lucide-angular
                      [img]="Calendar"
                      class="w-3.5 h-3.5 text-slate-400"
                    ></lucide-angular>
                    {{ project.baselineStart | dateFormat: 'short' }} -
                    {{ project.baselineEnd | dateFormat: 'short' }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase tracking-wider mb-1">Owner</p>
                  <p class="text-sm font-mono">{{ project.ownerId | stellarAddress }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400 uppercase tracking-wider mb-1">Created</p>
                  <p class="text-sm font-medium">{{ project.createdAt | dateFormat: 'medium' }}</p>
                </div>
              </div>
            </div>

            <div class="card p-5">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Credit Activity
              </h2>
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-4 text-center">
                  <p class="text-xs text-slate-400 mb-1">Minted</p>
                  <p class="text-xl font-bold text-stellar-blue">
                    {{ project.totalCreditsMinted || 0 | creditAmount }}
                  </p>
                </div>
                <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-4 text-center">
                  <p class="text-xs text-slate-400 mb-1">Retired</p>
                  <p class="text-xl font-bold text-environmental-green">
                    {{ project.totalCreditsRetired || 0 | creditAmount }}
                  </p>
                </div>
                <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-4 text-center">
                  <p class="text-xs text-slate-400 mb-1">Price</p>
                  <p class="text-xl font-bold text-credit-gold">
                    {{ project.creditPrice ? '$' + project.creditPrice : 'N/A' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <div class="card p-5">
              <h3
                class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"
              >
                <lucide-angular [img]="FileText" class="w-4 h-4 text-stellar-blue"></lucide-angular>
                Documents
              </h3>
              <div class="text-center py-6 text-sm text-slate-400">No documents uploaded</div>
            </div>

            <div class="card p-5">
              <h3
                class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"
              >
                <lucide-angular [img]="Activity" class="w-4 h-4 text-stellar-blue"></lucide-angular>
                Recent Activity
              </h3>
              <div class="text-center py-6 text-sm text-slate-400">No recent activity</div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Sensors Tab -->
      <ng-container *ngIf="activeTab === 'sensors'">
        <div class="space-y-6">
          <div *ngIf="sensorLoading" class="flex items-center justify-center py-16">
            <app-loading-spinner size="md" label="Loading sensor data..."></app-loading-spinner>
          </div>

          <ng-container *ngIf="!sensorLoading">
            <div
              *ngIf="projectSensorReadings.length === 0"
              class="card p-10 text-center text-sm text-slate-400"
            >
              <lucide-angular
                [img]="Droplets"
                class="w-10 h-10 mx-auto mb-3 text-slate-300"
              ></lucide-angular>
              No sensor readings available for this project yet.
            </div>

            <ng-container *ngIf="projectSensorReadings.length > 0">
              <app-sensor-chart
                [title]="'Sensor Readings — ' + project.name"
                [data]="projectSensorReadings"
                [parameters]="projectSensorParams"
                [timeRange]="projectSensorTimeRange"
                [thresholds]="projectSensorThresholds"
                (rangeChange)="onProjectSensorRangeChange($event)"
                [height]="320"
              />
            </ng-container>
          </ng-container>
        </div>
      </ng-container>
    </ng-container>
  `,
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  protected project: Project | null = null;
  protected loading$: Observable<boolean>;
  protected activeTab: ProjectTab = 'overview';
  protected sensorLoading = false;
  protected projectSensorReadings: SensorReading[] = [];
  protected projectSensorParams = PROJECT_SENSOR_PARAMS;
  protected projectSensorThresholds = PROJECT_SENSOR_THRESHOLDS;
  protected projectSensorTimeRange: TimeRange = '24h';

  private destroy$ = new Subject<void>();
  private projectId = '';

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly MapPin = MapPin;
  protected readonly Calendar = Calendar;
  protected readonly Ruler = Ruler;
  protected readonly FileText = FileText;
  protected readonly Activity = Activity;
  protected readonly Droplets = Droplets;

  constructor(
    private route: ActivatedRoute,
    private store: Store,
    private sensorsService: SensorsService,
  ) {
    this.loading$ = this.store.select(selectProjectsLoading);
  }

  ngOnInit(): void {
    // Subscribe to the selected project from the store (set by the effect).
    this.store
      .select(selectSelectedProject)
      .pipe(takeUntil(this.destroy$))
      .subscribe((project) => {
        this.project = project;
      });

    // React to route param changes without requiring a full component
    // destroy/re-create cycle (e.g., navigating /projects/a → /projects/b).
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((id) => {
        this.projectId = id;
        if (id) {
          this.store.dispatch(ProjectsActions.loadProject({ id }));
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSensorsTabClick(): void {
    this.activeTab = 'sensors';
    if (this.projectSensorReadings.length === 0) {
      this.loadProjectSensorReadings();
    }
  }

  protected onProjectSensorRangeChange(range: TimeRange): void {
    this.projectSensorTimeRange = range;
    this.loadProjectSensorReadings();
  }

  private async loadProjectSensorReadings(): Promise<void> {
    if (!this.projectId) return;
    this.sensorLoading = true;
    try {
      const readings = await this.sensorsService.getLatestReadings(this.projectId);
      this.projectSensorReadings = readings;
    } catch {
      this.projectSensorReadings = [];
    } finally {
      this.sensorLoading = false;
    }
  }
}
