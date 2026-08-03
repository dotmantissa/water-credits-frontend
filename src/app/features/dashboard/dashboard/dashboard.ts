import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf, NgFor, SlicePipe, AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CreditAmountPipe } from '../../../shared/pipes/credit-amount.pipe';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { WebsocketService } from '../../../core/services/websocket.service';
import { AnalyticsOverview, CreditsOverTimePoint } from '../../../core/models/analytics.model';
import { RecentRetirement } from '../../../core/models/retirement.model';
import { SensorAlert } from '../../../core/models/sensor-reading.model';
import * as AnalyticsActions from '../../../core/store/analytics/analytics.actions';
import {
  selectAnalyticsOverview,
  selectCreditsOverTime,
  selectRecentRetirements,
  selectDashboardLoading,
  selectAnalyticsError,
} from '../../../core/store/analytics/analytics.selectors';
import { AppState } from '../../../core/store/app.state';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state';
import { selectLoadingState } from '../../../shared/store/loading-state.selector';
import {
  LucideAngularModule,
  Droplets,
  Leaf,
  Coins,
  TrendingUp,
  Activity,
  AlertTriangle,
} from 'lucide-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    SlicePipe,
    AsyncPipe,
    CreditAmountPipe,
    DateFormatPipe,
    LucideAngularModule,
    LoadingStateComponent,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Overview of the Water Credits platform
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full"
            [class]="wsConnected ? 'bg-green-500' : 'bg-red-500'"
          ></span>
          <span class="text-xs text-slate-400">{{ wsConnected ? 'Live' : 'Disconnected' }}</span>
        </div>
      </div>

      <app-loading-state
        *ngIf="dashboardState$ | async as state"
        [loading]="state.loading"
        [error]="state.error"
        [empty]="false"
        skeleton="stat-card"
        (retry)="retryLoad()"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <p
                class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Total Projects
              </p>
              <div class="w-9 h-9 rounded-lg bg-stellar-blue/10 flex items-center justify-center">
                <lucide-angular [img]="Leaf" class="w-4 h-4 text-stellar-blue"></lucide-angular>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">
              {{ (overview$ | async)?.totalProjects || 0 }}
            </p>
            <p class="text-xs text-green-600 mt-1">
              {{ (overview$ | async)?.activeProjects || 0 }} active
            </p>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <p
                class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Credits Minted
              </p>
              <div
                class="w-9 h-9 rounded-lg bg-environmental-green/10 flex items-center justify-center"
              >
                <lucide-angular
                  [img]="Coins"
                  class="w-4 h-4 text-environmental-green"
                ></lucide-angular>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">
              {{ (overview$ | async)?.totalCreditsMinted || '0' | creditAmount }}
            </p>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <p
                class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Credits Retired
              </p>
              <div class="w-9 h-9 rounded-lg bg-credit-gold/10 flex items-center justify-center">
                <lucide-angular
                  [img]="TrendingUp"
                  class="w-4 h-4 text-credit-gold"
                ></lucide-angular>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">
              {{ (overview$ | async)?.totalCreditsRetired || '0' | creditAmount }}
            </p>
            <p class="text-xs text-slate-400 mt-1">
              {{ (overview$ | async)?.totalRetirements || 0 }} retirements
            </p>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <p
                class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Network
              </p>
              <div class="w-9 h-9 rounded-lg bg-retirement-red/10 flex items-center justify-center">
                <lucide-angular
                  [img]="Activity"
                  class="w-4 h-4 text-retirement-red"
                ></lucide-angular>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">
              {{ (overview$ | async)?.totalUsers || 0 }}
            </p>
            <p class="text-xs text-slate-400 mt-1">
              {{ (overview$ | async)?.verifiedOracles || 0 }} oracles
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card p-5">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
              Recent Retirements
            </h3>
            <div
              *ngIf="(recentRetirements$ | async)?.length === 0"
              class="text-center py-8 text-sm text-slate-400"
            >
              No retirements yet
            </div>
            <div
              *ngFor="let r of recentRetirements$ | async"
              class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
            >
              <div>
                <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {{ r.projectName }}
                </p>
                <p class="text-xs text-slate-400">{{ r.retiredAt | dateFormat: 'relative' }}</p>
              </div>
              <span class="text-sm font-semibold text-environmental-green">{{
                r.amount | creditAmount
              }}</span>
            </div>
          </div>

          <div class="card p-5">
            <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
              Sensor Alerts
            </h3>
            <div
              *ngIf="(sensorAlerts$ | async)?.length === 0"
              class="text-center py-8 text-sm text-slate-400"
            >
              <lucide-angular
                [img]="AlertTriangle"
                class="w-8 h-8 mx-auto mb-2 text-credit-gold"
              ></lucide-angular>
              No active alerts
            </div>
            <div
              *ngFor="let alert of sensorAlerts$ | async"
              class="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
            >
              <lucide-angular
                [img]="AlertTriangle"
                class="w-4 h-4 text-credit-gold mt-0.5 shrink-0"
              ></lucide-angular>
              <div>
                <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {{ alert.message }}
                </p>
                <p class="text-xs text-slate-400">{{ alert.parameter }} · {{ alert.severity }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="card p-5">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            Credits Over Time
          </h3>
          <div
            *ngIf="(creditsOverTime$ | async)?.length === 0"
            class="text-center py-8 text-sm text-slate-400"
          >
            No data available yet
          </div>
          <div *ngIf="(creditsOverTime$ | async)?.length" class="h-64 flex items-end gap-1">
            <div
              *ngFor="let point of creditsOverTime$ | async"
              class="flex-1 flex flex-col items-center gap-1"
            >
              <div class="w-full flex gap-0.5">
                <div
                  [style.height.px]="getMintedHeight(point)"
                  class="flex-1 bg-stellar-blue/60 rounded-t transition-all"
                ></div>
                <div
                  [style.height.px]="getRetiredHeight(point)"
                  class="flex-1 bg-environmental-green/60 rounded-t transition-all"
                ></div>
              </div>
              <span class="text-[10px] text-slate-400 -rotate-45 origin-left truncate w-8">{{
                point.date | slice: 5 : 10
              }}</span>
            </div>
          </div>
        </div>
      </app-loading-state>
    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  protected overview$: Observable<AnalyticsOverview | null>;
  protected creditsOverTime$: Observable<CreditsOverTimePoint[]>;
  protected recentRetirements$: Observable<RecentRetirement[]>;
  protected sensorAlerts$!: Observable<SensorAlert[]>;
  protected dashboardState$: Observable<{
    loading: boolean;
    error: string | null;
    hasData: boolean;
  }>;
  protected wsConnected = false;

  private destroy$ = new Subject<void>();
  private chartMax = 1;

  protected readonly Leaf = Leaf;
  protected readonly Coins = Coins;
  protected readonly TrendingUp = TrendingUp;
  protected readonly Activity = Activity;
  protected readonly AlertTriangle = AlertTriangle;
  protected readonly Droplets = Droplets;

  constructor(
    private store: Store<AppState>,
    private wsService: WebsocketService,
  ) {
    this.overview$ = this.store.select(selectAnalyticsOverview);
    this.creditsOverTime$ = this.store.select(selectCreditsOverTime);
    this.recentRetirements$ = this.store.select(selectRecentRetirements);
    this.dashboardState$ = this.store.select(
      selectLoadingState(selectDashboardLoading, selectAnalyticsError, selectAnalyticsOverview),
    );

    this.sensorAlerts$ = new Observable<SensorAlert[]>((observer) => {
      const alerts: SensorAlert[] = [];
      const sub = this.wsService.sensorAlerts$.subscribe((alert) => {
        alerts.unshift(alert);
        if (alerts.length > 5) alerts.pop();
        observer.next([...alerts]);
      });
      observer.next([]);
      return () => sub.unsubscribe();
    });
  }

  ngOnInit(): void {
    this.wsService.connected$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (connected) => (this.wsConnected = connected),
    });

    this.store.dispatch(AnalyticsActions.loadAnalyticsOverview());
    this.store.dispatch(AnalyticsActions.loadCreditsOverTime({ days: 30 }));
    this.store.dispatch(AnalyticsActions.loadRecentRetirements());

    this.creditsOverTime$.pipe(takeUntil(this.destroy$)).subscribe((points) => {
      this.chartMax = Math.max(...points.map((p) => Math.max(p.minted, p.retired)), 1);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getMintedHeight(point: CreditsOverTimePoint): number {
    return (point.minted / this.chartMax) * 200;
  }

  getRetiredHeight(point: CreditsOverTimePoint): number {
    return (point.retired / this.chartMax) * 200;
  }

  protected retryLoad(): void {
    this.store.dispatch(AnalyticsActions.loadAnalyticsOverview());
    this.store.dispatch(AnalyticsActions.loadCreditsOverTime({ days: 30 }));
    this.store.dispatch(AnalyticsActions.loadRecentRetirements());
  }
}
