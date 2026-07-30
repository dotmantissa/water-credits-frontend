import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Observable, Subject, takeUntil } from 'rxjs';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state';
import { NotificationService } from '../../../core/services/notification.service';
import { Project, ProjectCreate } from '../../../core/models/project.model';
import { AppState } from '../../../core/store/app.state';
import * as FarmersActions from '../../../core/store/farmers/farmers.actions';
import {
  selectParcels,
  selectParcelsLoading,
  selectFarmersError,
  selectFarmerRegistering,
} from '../../../core/store/farmers/farmers.selectors';
import {
  LucideAngularModule,
  Plus,
  MapPin,
  Sprout,
  X,
  ChevronRight,
  Crop,
  Ruler,
  Calendar,
  Globe,
} from 'lucide-angular';

@Component({
  selector: 'app-farmer-parcels',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    NgFor,
    AsyncPipe,
    StatusBadgeComponent,
    LoadingStateComponent,
    LucideAngularModule,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">My Parcels</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your farmland parcels and water credit projects
          </p>
        </div>
        <button (click)="showForm = !showForm" class="btn btn-primary flex items-center gap-2">
          <lucide-angular [img]="showForm ? X : Plus" class="w-4 h-4"></lucide-angular>
          {{ showForm ? 'Cancel' : 'Register Parcel' }}
        </button>
      </div>

      <div *ngIf="showForm" class="card p-6 border border-stellar-blue/20">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Register New Parcel
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="label">Parcel Name *</label>
            <input
              type="text"
              [(ngModel)]="form.name"
              class="input"
              placeholder="e.g., North Field"
            />
          </div>
          <div class="md:col-span-2">
            <label class="label">Description *</label>
            <textarea
              [(ngModel)]="form.description"
              class="input min-h-[80px]"
              placeholder="Describe soil type, crops, and practices..."
              required
            ></textarea>
          </div>
          <div>
            <label class="label">Latitude *</label>
            <input
              type="number"
              [(ngModel)]="form.latitude"
              class="input"
              placeholder="e.g., 41.403"
              step="any"
            />
          </div>
          <div>
            <label class="label">Longitude *</label>
            <input
              type="number"
              [(ngModel)]="form.longitude"
              class="input"
              placeholder="e.g., 2.174"
              step="any"
            />
          </div>
          <div>
            <label class="label">Area (hectares) *</label>
            <input
              type="number"
              [(ngModel)]="form.areaHectares"
              class="input"
              placeholder="e.g., 50"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label class="label">Crop Type</label>
            <select [(ngModel)]="selectedCrop" class="input">
              <option value="">Select crop...</option>
              <option value="corn">Corn</option>
              <option value="soybeans">Soybeans</option>
              <option value="wheat">Wheat</option>
              <option value="cotton">Cotton</option>
              <option value="rice">Rice</option>
              <option value="vegetables">Vegetables</option>
              <option value="orchard">Orchard</option>
              <option value="pasture">Pasture</option>
            </select>
          </div>
          <div>
            <label class="label">Baseline Start *</label>
            <input type="date" [(ngModel)]="form.baselineStart" class="input" />
          </div>
          <div>
            <label class="label">Baseline End *</label>
            <input type="date" [(ngModel)]="form.baselineEnd" class="input" />
          </div>
          <div>
            <label class="label">Methodology *</label>
            <select [(ngModel)]="form.methodology" class="input">
              <option value="">Select methodology...</option>
              <option value="water-quality-credits-v1">Water Quality Credits v1</option>
              <option value="nutrient-reduction-v1">Nutrient Reduction v1</option>
              <option value="sediment-reduction-v1">Sediment Reduction v1</option>
            </select>
          </div>
        </div>

        <div
          class="mt-4 p-4 bg-slate-50 dark:bg-dark-bg rounded-lg border border-dashed border-slate-300 dark:border-slate-600"
        >
          <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
            <lucide-angular [img]="MapPin" class="w-4 h-4"></lucide-angular>
            <span>Map Boundary (Optional)</span>
          </div>
          <div
            class="h-40 bg-slate-100 dark:bg-dark-bg-lighter rounded flex items-center justify-center text-xs text-slate-400"
          >
            Leaflet map placeholder &mdash; draw polygon to define parcel boundary
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <button
            (click)="saveParcel()"
            [disabled]="saving$ | async"
            class="btn btn-primary flex items-center gap-2"
          >
            <svg
              *ngIf="saving$ | async"
              class="animate-spin w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              ></path>
            </svg>
            {{ (saving$ | async) ? 'Registering...' : 'Register Parcel' }}
          </button>
        </div>
      </div>

      <app-loading-state
        [loading]="(loading$ | async) ?? false"
        [error]="error$ | async"
        [empty]="!(parcels$ | async)?.length"
        skeleton="card"
        emptyTitle="No parcels registered"
        emptyMessage="Register your first farmland parcel to start earning water quality credits."
        (retry)="loadParcels()"
      >
        <div
          *ngIf="(parcels$ | async)?.length"
          class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <div
            *ngFor="let parcel of parcels$ | async; trackBy: trackByParcel"
            (click)="goToParcel(parcel)"
            class="card p-5 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-stellar-blue/10 flex items-center justify-center">
                  <lucide-angular [img]="Sprout" class="w-4 h-4 text-stellar-blue"></lucide-angular>
                </div>
                <h3 class="font-semibold text-slate-900 dark:text-white">{{ parcel.name }}</h3>
              </div>
              <app-status-badge [status]="parcel.status"></app-status-badge>
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
              {{ parcel.description }}
            </p>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="flex items-center gap-1">
                <lucide-angular [img]="Ruler" class="w-3 h-3 text-slate-400"></lucide-angular>
                <span class="text-slate-400">Area:</span>
                <span class="font-medium text-slate-700 dark:text-slate-300"
                  >{{ parcel.areaHectares }} ha</span
                >
              </div>
              <div class="flex items-center gap-1">
                <lucide-angular [img]="Crop" class="w-3 h-3 text-slate-400"></lucide-angular>
                <span class="text-slate-400">Methodology:</span>
                <span class="font-medium text-slate-700 dark:text-slate-300">{{
                  parcel.methodology
                }}</span>
              </div>
              <div class="flex items-center gap-1">
                <lucide-angular [img]="Globe" class="w-3 h-3 text-slate-400"></lucide-angular>
                <span class="text-slate-400">Location:</span>
                <span class="font-medium text-slate-700 dark:text-slate-300"
                  >{{ parcel.latitude.toFixed(3) }}, {{ parcel.longitude.toFixed(3) }}</span
                >
              </div>
              <div class="flex items-center gap-1">
                <lucide-angular [img]="Calendar" class="w-3 h-3 text-slate-400"></lucide-angular>
                <span class="text-slate-400">Baseline:</span>
                <span class="font-medium text-slate-700 dark:text-slate-300">{{
                  (parcel.baselineStart || '').split('T')[0]
                }}</span>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <span class="text-xs text-stellar-blue flex items-center gap-1">
                View details
                <lucide-angular [img]="ChevronRight" class="w-3 h-3"></lucide-angular>
              </span>
            </div>
          </div>
        </div>
      </app-loading-state>
    </div>
  `,
})
export class FarmerParcelsComponent implements OnInit, OnDestroy {
  protected loading$: Observable<boolean>;
  protected saving$: Observable<boolean>;
  protected error$: Observable<string | null>;
  protected parcels$: Observable<Project[]>;
  protected showForm = false;
  protected selectedCrop = '';
  private destroy$ = new Subject<void>();

  protected form: ProjectCreate = {
    name: '',
    description: '',
    latitude: 0,
    longitude: 0,
    methodology: '',
    areaHectares: 0,
    baselineStart: '',
    baselineEnd: '',
  };

  protected readonly Plus = Plus;
  protected readonly MapPin = MapPin;
  protected readonly Sprout = Sprout;
  protected readonly X = X;
  protected readonly ChevronRight = ChevronRight;
  protected readonly Crop = Crop;
  protected readonly Ruler = Ruler;
  protected readonly Calendar = Calendar;
  protected readonly Globe = Globe;

  constructor(
    private store: Store<AppState>,
    private actions$: Actions,
    private notificationService: NotificationService,
    private router: Router,
  ) {
    this.loading$ = this.store.select(selectParcelsLoading);
    this.saving$ = this.store.select(selectFarmerRegistering);
    this.error$ = this.store.select(selectFarmersError);
    this.parcels$ = this.store.select(selectParcels);
  }

  ngOnInit(): void {
    this.store.dispatch(FarmersActions.loadParcels());

    this.actions$
      .pipe(ofType(FarmersActions.registerParcelSuccess), takeUntil(this.destroy$))
      .subscribe(() => {
        this.showForm = false;
        this.resetForm();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToParcel(parcel: Project): void {
    this.router.navigate(['/projects', parcel.id]);
  }

  trackByParcel(_index: number, parcel: Project): string {
    return parcel.id;
  }

  loadParcels(): void {
    this.store.dispatch(FarmersActions.loadParcels());
  }

  saveParcel(): void {
    if (
      !this.form.name ||
      !this.form.description ||
      !this.form.methodology ||
      !this.form.baselineStart ||
      !this.form.baselineEnd ||
      this.form.areaHectares <= 0
    ) {
      this.notificationService.warning('Incomplete form', 'Please fill in all required fields');
      return;
    }
    this.store.dispatch(FarmersActions.registerParcel({ data: this.form }));
  }

  private resetForm(): void {
    this.form = {
      name: '',
      description: '',
      latitude: 0,
      longitude: 0,
      methodology: '',
      areaHectares: 0,
      baselineStart: '',
      baselineEnd: '',
    };
    this.selectedCrop = '';
  }
}
