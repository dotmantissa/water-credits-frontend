import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { CreditAmountPipe } from '../../../shared/pipes/credit-amount.pipe';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { StellarAddressPipe } from '../../../shared/pipes/stellar-address.pipe';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { CreditTransaction } from '../../../core/models/credit.model';
import { AppState } from '../../../core/store/app.state';
import * as FarmersActions from '../../../core/store/farmers/farmers.actions';
import * as CreditsActions from '../../../core/store/credits/credits.actions';
import {
  selectFarmerOverview,
  selectFarmerOverviewLoading,
} from '../../../core/store/farmers/farmers.selectors';
import {
  selectCreditTransactions,
  selectCreditsLoading,
} from '../../../core/store/credits/credits.selectors';
import {
  LucideAngularModule,
  Wallet,
  TrendingUp,
  Clock,
  DollarSign,
  ArrowUpRight,
  CheckCircle,
  Ban,
} from 'lucide-angular';

interface ProjectedEarning {
  month: string;
  amount: number;
}

@Component({
  selector: 'app-farmer-earnings',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    AsyncPipe,
    CreditAmountPipe,
    DateFormatPipe,
    StellarAddressPipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    LucideAngularModule,
  ],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Earnings</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Track your credit earnings and payout history
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <p
              class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
            >
              Total Earned
            </p>
            <div
              class="w-9 h-9 rounded-lg bg-environmental-green/10 flex items-center justify-center"
            >
              <lucide-angular
                [img]="Wallet"
                class="w-4 h-4 text-environmental-green"
              ></lucide-angular>
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
              Pending
            </p>
            <div class="w-9 h-9 rounded-lg bg-credit-gold/10 flex items-center justify-center">
              <lucide-angular [img]="Clock" class="w-4 h-4 text-credit-gold"></lucide-angular>
            </div>
          </div>
          <p class="text-2xl font-bold text-slate-900 dark:text-white">
            {{ (overview$ | async)?.totalCreditsRetired || '0' | creditAmount }}
          </p>
          <p class="text-xs text-slate-400 mt-1">awaiting verification</p>
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <p
              class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
            >
              Projected
            </p>
            <div class="w-9 h-9 rounded-lg bg-stellar-blue/10 flex items-center justify-center">
              <lucide-angular [img]="TrendingUp" class="w-4 h-4 text-stellar-blue"></lucide-angular>
            </div>
          </div>
          <p class="text-2xl font-bold text-slate-900 dark:text-white">
            {{ (overview$ | async)?.totalCreditsMinted || '0' | creditAmount }}
          </p>
          <p class="text-xs text-slate-400 mt-1">next 12 months</p>
        </div>
      </div>

      <div class="card p-5">
        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Projected Earnings
        </h3>
        <div class="flex items-end gap-2 h-48">
          <div
            *ngFor="let item of projectedEarnings"
            class="flex-1 flex flex-col items-center gap-1"
          >
            <div
              class="w-full bg-stellar-blue/10 rounded-t relative"
              [style.height.px]="getBarHeight(item.amount)"
            >
              <div
                class="w-full bg-stellar-blue/60 rounded-t absolute bottom-0 transition-all duration-500"
                [style.height.pct]="getBarPercent(item.amount)"
              ></div>
            </div>
            <span class="text-[10px] text-slate-400 text-center">{{ item.month }}</span>
            <span class="text-[10px] font-medium text-slate-600 dark:text-slate-300">{{
              item.amount | creditAmount
            }}</span>
          </div>
        </div>
      </div>

      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Payout History</h3>
          <span class="text-xs text-slate-400"
            >{{ (payouts$ | async)?.length || 0 }} transactions</span
          >
        </div>

        <app-loading-spinner
          *ngIf="payoutsLoading$ | async"
          size="sm"
          label="Loading payouts..."
        ></app-loading-spinner>

        <app-empty-state
          *ngIf="!(payoutsLoading$ | async) && (payouts$ | async)?.length === 0"
          title="No payouts yet"
          message="Your credit earnings and retirements will appear here."
        ></app-empty-state>

        <div
          *ngIf="!(payoutsLoading$ | async) && ((payouts$ | async)?.length ?? 0) > 0"
          class="overflow-x-auto"
        >
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-700">
                <th
                  class="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3"
                >
                  Date
                </th>
                <th
                  class="text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3"
                >
                  Amount
                </th>
                <th
                  class="text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3"
                >
                  Type
                </th>
                <th
                  class="text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3"
                >
                  Transaction
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let payout of payouts$ | async"
                class="border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <td class="py-3 text-slate-700 dark:text-slate-300">
                  {{ payout.timestamp | dateFormat: 'short' }}
                </td>
                <td class="py-3 text-right font-medium text-slate-900 dark:text-white">
                  {{ payout.amount | creditAmount }}
                </td>
                <td class="py-3 text-center">
                  <span
                    *ngIf="payout.type === 'sale'"
                    class="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full"
                  >
                    <lucide-angular [img]="CheckCircle" class="w-3 h-3"></lucide-angular>
                    Sale
                  </span>
                  <span
                    *ngIf="payout.type === 'retire'"
                    class="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full"
                  >
                    <lucide-angular [img]="ArrowUpRight" class="w-3 h-3"></lucide-angular>
                    Retired
                  </span>
                  <span
                    *ngIf="payout.type === 'mint'"
                    class="inline-flex items-center gap-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full"
                  >
                    <lucide-angular [img]="Clock" class="w-3 h-3"></lucide-angular>
                    Minted
                  </span>
                  <span
                    *ngIf="payout.type === 'transfer'"
                    class="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full"
                  >
                    Transfer
                  </span>
                </td>
                <td class="py-3 text-right">
                  <span class="text-xs font-mono text-slate-400">{{
                    payout.txHash | stellarAddress: 8
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class FarmerEarningsComponent implements OnInit, OnDestroy {
  protected overview$: Observable<any>;
  protected loading$: Observable<boolean>;
  /** All credit transactions for the current user — used as the payout ledger. */
  protected payouts$: Observable<CreditTransaction[]>;
  protected payoutsLoading$: Observable<boolean>;

  protected projectedEarnings: ProjectedEarning[] = [
    { month: 'Jan', amount: 1200 },
    { month: 'Feb', amount: 1200 },
    { month: 'Mar', amount: 1350 },
    { month: 'Apr', amount: 1500 },
    { month: 'May', amount: 1800 },
    { month: 'Jun', amount: 2000 },
    { month: 'Jul', amount: 2000 },
    { month: 'Aug', amount: 1800 },
    { month: 'Sep', amount: 1600 },
    { month: 'Oct', amount: 1400 },
    { month: 'Nov', amount: 1200 },
    { month: 'Dec', amount: 1150 },
  ];

  private maxProjectedAmount = Math.max(...this.projectedEarnings.map((e) => e.amount), 1);
  private destroy$ = new Subject<void>();

  protected readonly Wallet = Wallet;
  protected readonly TrendingUp = TrendingUp;
  protected readonly Clock = Clock;
  protected readonly DollarSign = DollarSign;
  protected readonly ArrowUpRight = ArrowUpRight;
  protected readonly CheckCircle = CheckCircle;
  protected readonly Ban = Ban;

  constructor(private store: Store<AppState>) {
    this.overview$ = this.store.select(selectFarmerOverview);
    this.loading$ = this.store.select(selectFarmerOverviewLoading);
    this.payoutsLoading$ = this.store.select(selectCreditsLoading);
    // Show all credit transactions as the payout ledger; sorted newest-first.
    this.payouts$ = this.store
      .select(selectCreditTransactions)
      .pipe(
        map((txs) =>
          [...txs].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          ),
        ),
      );
  }

  ngOnInit(): void {
    this.store.dispatch(FarmersActions.loadFarmerOverview());
    this.store.dispatch(CreditsActions.loadTransactions({}));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getBarHeight(amount: number): number {
    return (amount / this.maxProjectedAmount) * 160;
  }

  getBarPercent(amount: number): number {
    return (amount / this.maxProjectedAmount) * 100;
  }
}
