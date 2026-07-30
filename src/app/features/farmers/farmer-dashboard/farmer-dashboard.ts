import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf, NgFor, NgClass, AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { CreditAmountPipe } from '../../../shared/pipes/credit-amount.pipe';
import { NumberAbbreviatePipe } from '../../../shared/pipes/number-abbreviate.pipe';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state';
import { AnalyticsOverview } from '../../../core/models/analytics.model';
import { Project } from '../../../core/models/project.model';
import { AppState } from '../../../core/store/app.state';
import * as FarmersActions from '../../../core/store/farmers/farmers.actions';
import {
  selectParcels,
  selectFarmerOverview,
  selectParcelsLoading,
  selectFarmersError,
  selectActiveParcelsCount,
  selectTotalAreaHectares,
} from '../../../core/store/farmers/farmers.selectors';
import { selectLoadingState, LoadingState } from '../../../shared/store/loading-state.selector';
import {
  LucideAngularModule,
  Droplets,
  MapPin,
  Leaf,
  Coins,
  TrendingUp,
  ArrowRight,
  Sprout,
  Wheat,
  Trees,
} from 'lucide-angular';

@Component({
  selector: 'app-farmer-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    NgIf,
    NgFor,
    NgClass,
    AsyncPipe,
    CreditAmountPipe,
    NumberAbbreviatePipe,
    StatusBadgeComponent,
    LoadingStateComponent,
    LucideAngularModule,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Farmer Dashboard</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your farmland, practices, and water credits
          </p>
        </div>
      </div>

      <app-loading-state
        *ngIf="state$ | async as state"
        [loading]="state.loading"
        [error]="state.error"
        [empty]="false"
        skeleton="stat-card"
        (retry)="loadData()"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <p
                class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Total Parcels
              </p>
              <div class="w-9 h-9 rounded-lg bg-stellar-blue/10 flex items-center justify-center">
                <lucide-angular [img]="MapPin" class="w-4 h-4 text-stellar-blue"></lucide-angular>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">
              {{ (parcels$ | async)?.length || 0 }}
            </p>
            <p class="text-xs text-green-600 mt-1">{{ activeParcelsCount$ | async }} active</p>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <p
                class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Total Area
              </p>
              <div
                class="w-9 h-9 rounded-lg bg-environmental-green/10 flex items-center justify-center"
              >
                <lucide-angular
                  [img]="Droplets"
                  class="w-4 h-4 text-environmental-green"
                ></lucide-angular>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">
              {{ (totalAreaHectares$ | async) ?? 0 | numberAbbreviate }}
            </p>
            <p class="text-xs text-slate-400 mt-1">hectares</p>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <p
                class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Credits Earned
              </p>
              <div class="w-9 h-9 rounded-lg bg-credit-gold/10 flex items-center justify-center">
                <lucide-angular [img]="Coins" class="w-4 h-4 text-credit-gold"></lucide-angular>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">
              {{ (overview$ | async)?.totalCreditsMinted || '0' | creditAmount }}
            </p>
            <p class="text-xs text-slate-400 mt-1">lifetime credits</p>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <p
                class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Active BMPs
              </p>
              <div class="w-9 h-9 rounded-lg bg-retirement-red/10 flex items-center justify-center">
                <lucide-angular [img]="Leaf" class="w-4 h-4 text-retirement-red"></lucide-angular>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ enrolledBmps }}</p>
            <p class="text-xs text-slate-400 mt-1">practices enrolled</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card p-5">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
              Recent Parcels
            </h3>
            <div
              *ngIf="(parcels$ | async)?.length === 0"
              class="text-center py-8 text-sm text-slate-400"
            >
              No parcels registered yet
            </div>
            <div
              *ngFor="let parcel of (parcels$ | async)?.slice(0, 4)"
              class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-dark-bg flex items-center justify-center"
                >
                  <lucide-angular [img]="Sprout" class="w-4 h-4 text-slate-500"></lucide-angular>
                </div>
                <div>
                  <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {{ parcel.name }}
                  </p>
                  <p class="text-xs text-slate-400">
                    {{ parcel.areaHectares }} ha &middot; {{ parcel.methodology }}
                  </p>
                </div>
              </div>
              <app-status-badge [status]="parcel.status"></app-status-badge>
            </div>
            <a
              *ngIf="(parcels$ | async)?.length"
              routerLink="/farmers/parcels"
              class="inline-flex items-center gap-1 text-sm text-stellar-blue hover:text-stellar-blue-light mt-3"
            >
              View all parcels
              <lucide-angular [img]="ArrowRight" class="w-3 h-3"></lucide-angular>
            </a>
          </div>

          <div class="card p-5">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
              Active BMPs
            </h3>
            <div *ngIf="bmps.length === 0" class="text-center py-8 text-sm text-slate-400">
              <lucide-angular
                [img]="Trees"
                class="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600"
              ></lucide-angular>
              No BMPs enrolled yet
            </div>
            <div
              *ngFor="let bmp of bmps"
              class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
            >
              <div class="flex items-center gap-3">
                <div
                  [ngClass]="
                    bmp.enrolled ? 'bg-environmental-green/10' : 'bg-slate-100 dark:bg-dark-bg'
                  "
                  class="w-8 h-8 rounded-lg flex items-center justify-center"
                >
                  <lucide-angular
                    [img]="bmp.enrolled ? Wheat : Leaf"
                    class="w-4 h-4"
                    [class]="bmp.enrolled ? 'text-environmental-green' : 'text-slate-500'"
                  ></lucide-angular>
                </div>
                <div>
                  <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {{ bmp.name }}
                  </p>
                  <p class="text-xs text-slate-400">{{ bmp.estimatedCredits }} credits/yr</p>
                </div>
              </div>
              <span
                [class]="
                  bmp.enrolled
                    ? 'bg-environmental-green/10 text-environmental-green'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                "
                class="text-xs px-2 py-0.5 rounded-full font-medium"
                >{{ bmp.enrolled ? 'Enrolled' : 'Not enrolled' }}</span
              >
            </div>
            <a
              routerLink="/farmers/practices"
              class="inline-flex items-center gap-1 text-sm text-stellar-blue hover:text-stellar-blue-light mt-3"
            >
              Manage practices
              <lucide-angular [img]="ArrowRight" class="w-3 h-3"></lucide-angular>
            </a>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            routerLink="/farmers/parcels"
            class="card p-5 hover:shadow-lg transition-shadow cursor-pointer flex items-center gap-4"
          >
            <div
              class="w-12 h-12 rounded-xl bg-stellar-blue/10 flex items-center justify-center shrink-0"
            >
              <lucide-angular [img]="MapPin" class="w-6 h-6 text-stellar-blue"></lucide-angular>
            </div>
            <div>
              <p class="font-semibold text-slate-900 dark:text-white">Parcels</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">Manage your farmland parcels</p>
            </div>
          </a>
          <a
            routerLink="/farmers/practices"
            class="card p-5 hover:shadow-lg transition-shadow cursor-pointer flex items-center gap-4"
          >
            <div
              class="w-12 h-12 rounded-xl bg-environmental-green/10 flex items-center justify-center shrink-0"
            >
              <lucide-angular
                [img]="Leaf"
                class="w-6 h-6 text-environmental-green"
              ></lucide-angular>
            </div>
            <div>
              <p class="font-semibold text-slate-900 dark:text-white">Practices</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">Enroll in BMP programs</p>
            </div>
          </a>
          <a
            routerLink="/farmers/earnings"
            class="card p-5 hover:shadow-lg transition-shadow cursor-pointer flex items-center gap-4"
          >
            <div
              class="w-12 h-12 rounded-xl bg-credit-gold/10 flex items-center justify-center shrink-0"
            >
              <lucide-angular [img]="TrendingUp" class="w-6 h-6 text-credit-gold"></lucide-angular>
            </div>
            <div>
              <p class="font-semibold text-slate-900 dark:text-white">Earnings</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">Track credits and payouts</p>
            </div>
          </a>
        </div>
      </app-loading-state>
    </div>
  `,
})
export class FarmerDashboardComponent implements OnInit, OnDestroy {
  protected state$: Observable<LoadingState>;
  protected overview$: Observable<AnalyticsOverview | null>;
  protected parcels$: Observable<Project[]>;
  protected activeParcelsCount$: Observable<number>;
  protected totalAreaHectares$: Observable<number>;

  protected bmps = [
    { name: 'Cover Crops', enrolled: true, estimatedCredits: 120 },
    { name: 'No-Till Farming', enrolled: true, estimatedCredits: 85 },
    { name: 'Buffer Strips', enrolled: false, estimatedCredits: 200 },
    { name: 'Managed Grazing', enrolled: false, estimatedCredits: 150 },
    { name: 'Compost Application', enrolled: false, estimatedCredits: 95 },
  ];

  private destroy$ = new Subject<void>();

  protected readonly Droplets = Droplets;
  protected readonly MapPin = MapPin;
  protected readonly Leaf = Leaf;
  protected readonly Coins = Coins;
  protected readonly TrendingUp = TrendingUp;
  protected readonly ArrowRight = ArrowRight;
  protected readonly Sprout = Sprout;
  protected readonly Wheat = Wheat;
  protected readonly Trees = Trees;

  constructor(private store: Store<AppState>) {
    this.state$ = this.store.select(
      selectLoadingState(selectParcelsLoading, selectFarmersError, selectParcels),
    );
    this.overview$ = this.store.select(selectFarmerOverview);
    this.parcels$ = this.store.select(selectParcels);
    this.activeParcelsCount$ = this.store.select(selectActiveParcelsCount);
    this.totalAreaHectares$ = this.store.select(selectTotalAreaHectares);
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected loadData(): void {
    this.store.dispatch(FarmersActions.loadParcels());
    this.store.dispatch(FarmersActions.loadFarmerOverview());
  }

  get enrolledBmps(): number {
    return this.bmps.filter((b) => b.enrolled).length;
  }
}
