import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { OracleService } from '../../../core/services/oracle.service';
import { NumberAbbreviatePipe } from '../../../shared/pipes/number-abbreviate.pipe';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { StellarAddressPipe } from '../../../shared/pipes/stellar-address.pipe';
import {
  DataTableComponent,
  ColumnDef,
} from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state';
import { AnalyticsOverview } from '../../../core/models/analytics.model';
import { OracleSubmission } from '../../../core/models/oracle.model';
import { AppState } from '../../../core/store/app.state';
import * as AnalyticsActions from '../../../core/store/analytics/analytics.actions';
import {
  selectAnalyticsOverview,
  selectAnalyticsOverviewLoading,
  selectAnalyticsError,
} from '../../../core/store/analytics/analytics.selectors';
import {
  LucideAngularModule,
  Users,
  Building2,
  HardDrive,
  RefreshCw,
  Activity,
  ArrowRight,
  Clock,
  ShieldCheck,
  Settings,
} from 'lucide-angular';
import { LoggingService } from '../../../core/services/logging.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
    AsyncPipe,
    RouterLink,
    NumberAbbreviatePipe,
    DateFormatPipe,
    StellarAddressPipe,
    DataTableComponent,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    LucideAngularModule,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            System overview and management
          </p>
        </div>
        <button (click)="refresh()" class="btn btn-outline text-sm flex items-center gap-2">
          <lucide-angular [img]="RefreshCwIcon" class="w-4 h-4"></lucide-angular>
          Refresh
        </button>
      </div>

      <app-loading-state
        [loading]="(loading$ | async) ?? false"
        [error]="error$ | async"
        [empty]="false"
        skeleton="stat-card"
        (retry)="refresh()"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <p
                class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Total Users
              </p>
              <div class="w-9 h-9 rounded-lg bg-stellar-blue/10 flex items-center justify-center">
                <lucide-angular
                  [img]="UsersIcon"
                  class="w-4 h-4 text-stellar-blue"
                ></lucide-angular>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">
              {{ (overview$ | async)?.totalUsers ?? 0 | numberAbbreviate }}
            </p>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <p
                class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Total Projects
              </p>
              <div
                class="w-9 h-9 rounded-lg bg-environmental-green/10 flex items-center justify-center"
              >
                <lucide-angular
                  [img]="Building2Icon"
                  class="w-4 h-4 text-environmental-green"
                ></lucide-angular>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">
              {{ (overview$ | async)?.totalProjects ?? 0 | numberAbbreviate }}
            </p>
            <p class="text-xs text-green-600 mt-1">
              {{ (overview$ | async)?.activeProjects ?? 0 }} active
            </p>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <p
                class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Oracles
              </p>
              <div class="w-9 h-9 rounded-lg bg-credit-gold/10 flex items-center justify-center">
                <lucide-angular
                  [img]="ShieldCheckIcon"
                  class="w-4 h-4 text-credit-gold"
                ></lucide-angular>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">
              {{ (overview$ | async)?.verifiedOracles ?? 0 | numberAbbreviate }}
            </p>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <p
                class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >
                Retirements
              </p>
              <div class="w-9 h-9 rounded-lg bg-retirement-red/10 flex items-center justify-center">
                <lucide-angular
                  [img]="RefreshCwIcon"
                  class="w-4 h-4 text-retirement-red"
                ></lucide-angular>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">
              {{ (overview$ | async)?.totalRetirements ?? 0 | numberAbbreviate }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card p-5">
            <h3
              class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2"
            >
              <lucide-angular [img]="ClockIcon" class="w-4 h-4 text-slate-400"></lucide-angular>
              Queue Depths
            </h3>
            <div class="space-y-3">
              <div
                class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700"
              >
                <span class="text-sm text-slate-600 dark:text-slate-400">Pending Submissions</span>
                <span class="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{{
                  queueDepths.pendingSubmissions
                }}</span>
              </div>
              <div
                class="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700"
              >
                <span class="text-sm text-slate-600 dark:text-slate-400"
                  >Confirmed Submissions</span
                >
                <span class="text-sm font-semibold text-stellar-blue">{{
                  queueDepths.confirmedSubmissions
                }}</span>
              </div>
              <div class="flex items-center justify-between py-2">
                <span class="text-sm text-slate-600 dark:text-slate-400">Failed Submissions</span>
                <span class="text-sm font-semibold text-environmental-green">{{
                  queueDepths.failedSubmissions
                }}</span>
              </div>
            </div>
          </div>

          <div class="card p-5">
            <h3
              class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2"
            >
              <lucide-angular [img]="ActivityIcon" class="w-4 h-4 text-slate-400"></lucide-angular>
              Quick Links
            </h3>
            <div class="space-y-2">
              <a
                routerLink="/admin/oracles"
                class="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-credit-gold/10 flex items-center justify-center"
                  >
                    <lucide-angular
                      [img]="HardDriveIcon"
                      class="w-4 h-4 text-credit-gold"
                    ></lucide-angular>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Oracle Management
                    </p>
                    <p class="text-xs text-slate-400">Manage oracle nodes and submissions</p>
                  </div>
                </div>
                <lucide-angular
                  [img]="ArrowRightIcon"
                  class="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors"
                ></lucide-angular>
              </a>
              <a
                routerLink="/admin/fees"
                class="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-stellar-blue/10 flex items-center justify-center"
                  >
                    <lucide-angular
                      [img]="SettingsIcon"
                      class="w-4 h-4 text-stellar-blue"
                    ></lucide-angular>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Fees & Parameters
                    </p>
                    <p class="text-xs text-slate-400">Configure protocol fees and thresholds</p>
                  </div>
                </div>
                <lucide-angular
                  [img]="ArrowRightIcon"
                  class="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors"
                ></lucide-angular>
              </a>
              <a
                routerLink="/admin/users"
                class="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-environmental-green/10 flex items-center justify-center"
                  >
                    <lucide-angular
                      [img]="UsersIcon"
                      class="w-4 h-4 text-environmental-green"
                    ></lucide-angular>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
                      User Management
                    </p>
                    <p class="text-xs text-slate-400">Manage users, roles, and KYC status</p>
                  </div>
                </div>
                <lucide-angular
                  [img]="ArrowRightIcon"
                  class="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors"
                ></lucide-angular>
              </a>
            </div>
          </div>
        </div>

        <div class="card p-5">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            Recent Submissions
          </h3>
          <app-data-table
            [columns]="submissionColumns"
            [data]="recentSubmissions"
            [loading]="submissionsLoading"
            emptyTitle="No submissions yet"
            emptyMessage="Oracle submissions will appear here once they start flowing."
          >
            <ng-template #row let-row let-col="column">
              <ng-container [ngSwitch]="col.key">
                <span *ngSwitchCase="'status'">
                  <app-status-badge [status]="row.status"></app-status-badge>
                </span>
                <span *ngSwitchCase="'oracleAddress'">{{
                  row.oracleAddress | stellarAddress
                }}</span>
                <span *ngSwitchCase="'createdAt'">{{
                  row.createdAt | dateFormat: 'relative'
                }}</span>
                <span *ngSwitchDefault>{{ row[col.key] }}</span>
              </ng-container>
            </ng-template>
          </app-data-table>
        </div>
      </app-loading-state>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  /** Overview stats from the analytics store slice — no async/await in component. */
  protected overview$: Observable<AnalyticsOverview | null>;
  protected loading$: Observable<boolean>;
  protected error$: Observable<string | null>;

  /** Oracle submissions are not yet in a store slice; fetched directly.
   *  This is intentional: the admin store slice is out of scope for this issue.
   *  The overview (main KPI cards) is fully store-driven. */
  protected submissionsLoading = false;
  protected recentSubmissions: OracleSubmission[] = [];

  protected queueDepths = {
    pendingSubmissions: 0,
    confirmedSubmissions: 0,
    failedSubmissions: 0,
  };

  protected readonly UsersIcon = Users;
  protected readonly Building2Icon = Building2;
  protected readonly HardDriveIcon = HardDrive;
  protected readonly RefreshCwIcon = RefreshCw;
  protected readonly ActivityIcon = Activity;
  protected readonly ArrowRightIcon = ArrowRight;
  protected readonly ClockIcon = Clock;
  protected readonly ShieldCheckIcon = ShieldCheck;
  protected readonly SettingsIcon = Settings;

  protected submissionColumns: ColumnDef<OracleSubmission>[] = [
    { key: 'projectId', label: 'Project ID' },
    { key: 'oracleAddress', label: 'Oracle' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Submitted', align: 'right' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store<AppState>,
    private oracleService: OracleService,
    private loggingService: LoggingService,
  ) {
    this.overview$ = this.store.select(selectAnalyticsOverview);
    this.loading$ = this.store.select(selectAnalyticsOverviewLoading);
    this.error$ = this.store.select(selectAnalyticsError);
  }

  ngOnInit(): void {
    // Dispatch analytics overview through the store; AnalyticsEffects handles the HTTP call.
    this.store.dispatch(AnalyticsActions.loadAnalyticsOverview());
    // Oracle submissions have no store slice — call the service directly.
    this.loadSubmissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected refresh(): void {
    this.store.dispatch(AnalyticsActions.loadAnalyticsOverview());
    this.loadSubmissions();
  }

  private async loadSubmissions(): Promise<void> {
    try {
      this.submissionsLoading = true;
      const res = await this.oracleService.getSubmissions({ limit: 5 });
      this.recentSubmissions = res.data;
      this.queueDepths = {
        pendingSubmissions: res.data.filter((s) => s.status === 'pending').length,
        confirmedSubmissions: res.data.filter((s) => s.status === 'confirmed').length,
        failedSubmissions: res.data.filter((s) => s.status === 'failed').length,
      };
    } catch (error) {
      this.loggingService.error('Failed to load submissions:', error);
    } finally {
      this.submissionsLoading = false;
    }
  }
}
