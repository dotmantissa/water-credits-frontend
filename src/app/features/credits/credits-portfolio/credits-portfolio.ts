import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf, NgFor, AsyncPipe, NgSwitch, NgSwitchCase } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { CreditAmountPipe } from '../../../shared/pipes/credit-amount.pipe';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { StellarAddressPipe } from '../../../shared/pipes/stellar-address.pipe';
import { NumberAbbreviatePipe } from '../../../shared/pipes/number-abbreviate.pipe';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import {
  DataTableComponent,
  ColumnDef,
} from '../../../shared/components/data-table/data-table.component';
import { RetireCreditsModalComponent } from '../../../shared/components/retire-credits-modal/retire-credits-modal';
import {
  CreditBalance,
  CreditPortfolio,
  CreditTransaction,
} from '../../../core/models/credit.model';
import { RetirementRequest } from '../../../core/models/retirement.model';
import { AppState } from '../../../core/store/app.state';
import * as CreditsActions from '../../../core/store/credits/credits.actions';
import * as RetirementActions from '../../../core/store/retirement/retirement.actions';
import {
  selectPortfolio,
  selectCreditsLoading,
  selectCreditsError,
  selectCreditTransactions,
} from '../../../core/store/credits/credits.selectors';
import {
  selectIsRetirementInProgress,
  selectIsRetirementConfirmed,
} from '../../../core/store/retirement/retirement.selectors';
import {
  LucideAngularModule,
  Wallet,
  DollarSign,
  PieChart,
  RefreshCw,
  Droplets,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Tag,
} from 'lucide-angular';

@Component({
  selector: 'app-credits-portfolio',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    AsyncPipe,
    NgSwitch,
    NgSwitchCase,
    RouterLink,
    CreditAmountPipe,
    DateFormatPipe,
    StellarAddressPipe,
    NumberAbbreviatePipe,
    LoadingStateComponent,
    EmptyStateComponent,
    DataTableComponent,
    RetireCreditsModalComponent,
    LucideAngularModule,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Credits Portfolio</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your water credit holdings and retirements
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
        [empty]="!((loading$ | async) || (error$ | async)) && (portfolio$ | async) === null"
        emptyTitle="No portfolio data"
        emptyMessage="We couldn't load your credit portfolio. Try refreshing."
        skeleton="stat-card"
        (retry)="refresh()"
      >
        <div *ngIf="portfolio$ | async as portfolio">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="card p-5">
              <div class="flex items-center justify-between mb-2">
                <p
                  class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold"
                >
                  Total Balance
                </p>
                <div class="w-9 h-9 rounded-lg bg-stellar-blue/10 flex items-center justify-center">
                  <lucide-angular
                    [img]="WalletIcon"
                    class="w-4.5 h-4.5 text-stellar-blue"
                  ></lucide-angular>
                </div>
              </div>
              <p class="text-2xl font-bold text-slate-900 dark:text-white">
                {{ portfolio.totalBalance | creditAmount }}
              </p>
              <p class="text-xs text-slate-400 mt-1">
                Across {{ portfolio.holdings.length || 0 }} projects
              </p>
            </div>
            <div class="card p-5">
              <div class="flex items-center justify-between mb-2">
                <p
                  class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold"
                >
                  Total Value
                </p>
                <div class="w-9 h-9 rounded-lg bg-credit-gold/10 flex items-center justify-center">
                  <lucide-angular
                    [img]="DollarSignIcon"
                    class="w-4.5 h-4.5 text-credit-gold"
                  ></lucide-angular>
                </div>
              </div>
              <p class="text-2xl font-bold text-slate-900 dark:text-white">
                $ {{ portfolio.totalValue | numberAbbreviate }}
              </p>
            </div>
            <div class="card p-5">
              <div class="flex items-center justify-between mb-2">
                <p
                  class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold"
                >
                  Holdings
                </p>
                <div
                  class="w-9 h-9 rounded-lg bg-environmental-green/10 flex items-center justify-center"
                >
                  <lucide-angular
                    [img]="PieChartIcon"
                    class="w-4.5 h-4.5 text-environmental-green"
                  ></lucide-angular>
                </div>
              </div>
              <p class="text-2xl font-bold text-slate-900 dark:text-white">
                {{ portfolio.holdings.length || 0 }}
              </p>
              <p class="text-xs text-slate-400 mt-1">Active projects</p>
            </div>
          </div>

          <div class="card overflow-hidden mb-6">
            <div class="p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Holdings</h2>
            </div>
            <app-data-table
              [columns]="holdingsColumns"
              [data]="portfolio.holdings || []"
              [loading]="false"
              emptyTitle="No credit holdings"
              emptyMessage="You don't have any credit holdings yet."
            >
              <ng-template #row let-row let-col="column">
                <ng-container [ngSwitch]="col.key">
                  <a
                    *ngSwitchCase="'projectName'"
                    [routerLink]="['/credits', row.projectId]"
                    class="text-sm font-medium text-slate-900 dark:text-white hover:text-stellar-blue transition-colors"
                    >{{ row.projectName }}</a
                  >
                  <span
                    *ngSwitchCase="'balance'"
                    class="text-sm text-slate-700 dark:text-slate-300 font-mono"
                    >{{ row.balance | creditAmount }}</span
                  >
                  <span
                    *ngSwitchCase="'totalRetired'"
                    class="text-sm text-slate-700 dark:text-slate-300 font-mono"
                    >{{ row.totalRetired | creditAmount }}</span
                  >
                  <span
                    *ngSwitchCase="'creditPrice'"
                    class="text-sm text-slate-700 dark:text-slate-300"
                    >$ {{ row.creditPrice }}</span
                  >
                  <span
                    *ngSwitchCase="'value'"
                    class="text-sm text-slate-700 dark:text-slate-300 font-semibold"
                    >$ {{ parseFloat(row.balance) * row.creditPrice | numberAbbreviate }}</span
                  >
                  <div *ngSwitchCase="'actions'" class="flex items-center gap-2">
                    <button
                      (click)="openRetireModal(row)"
                      class="btn btn-sm btn-outline flex items-center gap-1.5 text-xs"
                    >
                      <lucide-angular [img]="DropletsIcon" class="w-3.5 h-3.5"></lucide-angular>
                      Retire
                    </button>
                    <button
                      (click)="sellHolding(row)"
                      class="btn btn-sm btn-outline flex items-center gap-1.5 text-xs"
                    >
                      <lucide-angular [img]="TagIcon" class="w-3.5 h-3.5"></lucide-angular>
                      Sell
                    </button>
                  </div>
                </ng-container>
              </ng-template>
            </app-data-table>
          </div>

          <div class="card overflow-hidden">
            <div class="p-5 border-b border-slate-200 dark:border-slate-700">
              <h2
                class="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"
              >
                <lucide-angular
                  [img]="ClockIcon"
                  class="w-4.5 h-4.5 text-stellar-blue"
                ></lucide-angular>
                Recent Transactions
              </h2>
            </div>
            <div *ngIf="(transactions$ | async)?.length === 0" class="p-5">
              <app-empty-state
                title="No transactions yet"
                message="Your recent credit transactions will appear here."
              ></app-empty-state>
            </div>
            <div
              *ngIf="((transactions$ | async) ?? []).length > 0"
              class="divide-y divide-slate-100 dark:divide-slate-700/50"
            >
              <div
                *ngFor="let tx of transactions$ | async"
                class="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <div
                    [class]="
                      tx.type === 'mint'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        : tx.type === 'retire'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    "
                    class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  >
                    <lucide-angular
                      [img]="
                        tx.type === 'mint'
                          ? ArrowUpRightIcon
                          : tx.type === 'retire'
                            ? ArrowDownRightIcon
                            : ArrowLeftRightIcon
                      "
                      class="w-4 h-4"
                    ></lucide-angular>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-slate-900 dark:text-white capitalize">
                      {{ tx.type }}
                    </p>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {{ tx.txHash | stellarAddress }}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p
                    class="text-sm font-semibold font-mono"
                    [class.text-emerald-600]="tx.type === 'mint'"
                    [class.text-red-600]="tx.type === 'retire'"
                    [class.text-blue-600]="tx.type === 'transfer' || tx.type === 'sale'"
                  >
                    {{ tx.type === 'mint' ? '+' : '-' }}{{ tx.amount | creditAmount }}
                  </p>
                  <p class="text-xs text-slate-400">{{ tx.timestamp | dateFormat: 'relative' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </app-loading-state>
    </div>

    <app-retire-credits-modal
      *ngIf="showRetireModal"
      [projects]="retireProjects"
      [loading]="(retirementLoading$ | async) ?? false"
      (close)="closeRetireModal()"
      (confirm)="onRetireConfirm($event)"
    />
  `,
})
export class CreditsPortfolioComponent implements OnInit, OnDestroy {
  protected portfolio$: Observable<CreditPortfolio | null>;
  protected loading$: Observable<boolean>;
  protected error$: Observable<string | null>;
  protected transactions$: Observable<CreditTransaction[]>;
  protected retirementLoading$: Observable<boolean>;

  protected showRetireModal = false;
  protected retireProjects: { id: string; name: string; balance: string }[] = [];

  protected readonly holdingsColumns: ColumnDef<CreditBalance>[] = [
    { key: 'projectName', label: 'Project', sortable: true },
    { key: 'balance', label: 'Balance', sortable: true, align: 'right' },
    { key: 'totalRetired', label: 'Retired', sortable: true, align: 'right' },
    { key: 'creditPrice', label: 'Price', sortable: true, align: 'right' },
    { key: 'value', label: 'Value', sortable: true, align: 'right' },
    { key: 'actions', label: 'Actions', align: 'center' },
  ];

  protected readonly WalletIcon = Wallet;
  protected readonly DollarSignIcon = DollarSign;
  protected readonly PieChartIcon = PieChart;
  protected readonly RefreshCwIcon = RefreshCw;
  protected readonly DropletsIcon = Droplets;
  protected readonly ClockIcon = Clock;
  protected readonly ArrowUpRightIcon = ArrowUpRight;
  protected readonly ArrowDownRightIcon = ArrowDownRight;
  protected readonly ArrowLeftRightIcon = ArrowLeftRight;
  protected readonly TagIcon = Tag;

  protected readonly parseFloat = parseFloat;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store<AppState>,
    private router: Router,
  ) {
    this.portfolio$ = this.store.select(selectPortfolio);
    this.loading$ = this.store.select(selectCreditsLoading);
    this.error$ = this.store.select(selectCreditsError);
    this.transactions$ = this.store.select(selectCreditTransactions);
    this.retirementLoading$ = this.store.select(selectIsRetirementInProgress);
  }

  ngOnInit(): void {
    this.store.dispatch(CreditsActions.loadPortfolio());
    this.store.dispatch(CreditsActions.loadTransactions({}));

    this.store
      .select(selectIsRetirementConfirmed)
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => this.closeRetireModal());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected refresh(): void {
    this.store.dispatch(CreditsActions.loadPortfolio());
  }

  protected openRetireModal(balance: CreditBalance): void {
    this.retireProjects = [
      {
        id: balance.projectId,
        name: balance.projectName,
        balance: balance.balance,
      },
    ];
    this.showRetireModal = true;
  }

  protected sellHolding(balance: CreditBalance): void {
    this.router.navigate(['/marketplace/new'], { queryParams: { projectId: balance.projectId } });
  }

  protected closeRetireModal(): void {
    this.showRetireModal = false;
    this.retireProjects = [];
  }

  protected onRetireConfirm(event: { projectId: string; amount: string; purpose: string }): void {
    const request: RetirementRequest = {
      projectId: event.projectId,
      amount: event.amount,
      purpose: event.purpose,
    };
    this.store.dispatch(RetirementActions.initiateRetirement({ request }));
  }
}
