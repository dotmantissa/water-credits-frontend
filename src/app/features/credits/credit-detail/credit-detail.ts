import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { map, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { CreditAmountPipe } from '../../../shared/pipes/credit-amount.pipe';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { StellarAddressPipe } from '../../../shared/pipes/stellar-address.pipe';
import { CreditBalance, CreditTransaction } from '../../../core/models/credit.model';
import { AppState } from '../../../core/store/app.state';
import * as CreditsActions from '../../../core/store/credits/credits.actions';
import {
  selectCreditBalances,
  selectCreditTransactions,
  selectCreditsLoading,
} from '../../../core/store/credits/credits.selectors';
import {
  LucideAngularModule,
  ArrowLeft,
  Droplets,
  TrendingUp,
  ShieldCheck,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Copy,
  ArrowRight,
} from 'lucide-angular';

@Component({
  selector: 'app-credit-detail',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    AsyncPipe,
    RouterLink,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    CreditAmountPipe,
    DateFormatPipe,
    StellarAddressPipe,
    LucideAngularModule,
  ],
  template: `
    <div *ngIf="loading$ | async" class="py-20">
      <app-loading-spinner size="lg" label="Loading credit details..."></app-loading-spinner>
    </div>

    <ng-container *ngIf="!(loading$ | async)">
      <div *ngIf="balance$ | async as balance; else noData">
        <div class="mb-6">
          <a
            routerLink="/credits"
            class="inline-flex items-center gap-1 text-sm text-stellar-blue hover:text-stellar-blue-light mb-4"
          >
            <lucide-angular [img]="ArrowLeftIcon" class="w-4 h-4"></lucide-angular>
            Back to Portfolio
          </a>
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-lg bg-stellar-blue/10 flex items-center justify-center">
              <lucide-angular
                [img]="DropletsIcon"
                class="w-5 h-5 text-stellar-blue"
              ></lucide-angular>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
                {{ balance.projectName }}
              </h1>
              <p class="text-xs text-slate-400 font-mono">{{ balance.projectId }}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="card p-5">
            <div class="flex items-center justify-between mb-2">
              <p
                class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold"
              >
                Minted
              </p>
              <div class="w-8 h-8 rounded-lg bg-stellar-blue/10 flex items-center justify-center">
                <lucide-angular
                  [img]="TrendingUpIcon"
                  class="w-4 h-4 text-stellar-blue"
                ></lucide-angular>
              </div>
            </div>
            <p class="text-xl font-bold text-slate-900 dark:text-white">
              {{ balance.totalMinted | creditAmount }}
            </p>
          </div>
          <div class="card p-5">
            <div class="flex items-center justify-between mb-2">
              <p
                class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold"
              >
                Retired
              </p>
              <div
                class="w-8 h-8 rounded-lg bg-environmental-green/10 flex items-center justify-center"
              >
                <lucide-angular
                  [img]="ShieldCheckIcon"
                  class="w-4 h-4 text-environmental-green"
                ></lucide-angular>
              </div>
            </div>
            <p class="text-xl font-bold text-slate-900 dark:text-white">
              {{ balance.totalRetired | creditAmount }}
            </p>
          </div>
          <div class="card p-5">
            <div class="flex items-center justify-between mb-2">
              <p
                class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold"
              >
                Balance
              </p>
              <div class="w-8 h-8 rounded-lg bg-credit-gold/10 flex items-center justify-center">
                <lucide-angular
                  [img]="DropletsIcon"
                  class="w-4 h-4 text-credit-gold"
                ></lucide-angular>
              </div>
            </div>
            <p class="text-xl font-bold text-slate-900 dark:text-white">
              {{ balance.balance | creditAmount }}
            </p>
          </div>
          <div class="card p-5">
            <div class="flex items-center justify-between mb-2">
              <p
                class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold"
              >
                Price
              </p>
              <div class="w-8 h-8 rounded-lg bg-credit-gold/10 flex items-center justify-center">
                <lucide-angular
                  [img]="DollarSignIcon"
                  class="w-4 h-4 text-credit-gold"
                ></lucide-angular>
              </div>
            </div>
            <p class="text-xl font-bold text-slate-900 dark:text-white">
              $ {{ balance.creditPrice }}
            </p>
          </div>
        </div>

        <div class="card overflow-hidden">
          <div class="p-5 border-b border-slate-200 dark:border-slate-700">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
              Transaction History
            </h2>
          </div>
          <div *ngIf="(transactions$ | async)?.length === 0" class="p-5">
            <app-empty-state
              title="No transactions"
              message="No transactions recorded for this project yet."
            ></app-empty-state>
          </div>
          <div *ngIf="((transactions$ | async) ?? []).length > 0" class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr
                  class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-bg"
                >
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    class="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    Amount
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    From / To
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    Transaction Hash
                  </th>
                  <th
                    class="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  *ngFor="let tx of transactions$ | async; let i = index"
                  class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td class="px-4 py-3.5">
                    <div class="flex items-center gap-2">
                      <div
                        [class]="
                          tx.type === 'mint'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'retire'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        "
                        class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      >
                        <lucide-angular
                          [img]="
                            tx.type === 'mint'
                              ? ArrowUpRightIcon
                              : tx.type === 'retire'
                                ? ArrowDownRightIcon
                                : ArrowLeftRightIcon
                          "
                          class="w-3.5 h-3.5"
                        ></lucide-angular>
                      </div>
                      <span class="text-sm font-medium text-slate-900 dark:text-white capitalize">{{
                        tx.type
                      }}</span>
                    </div>
                  </td>
                  <td
                    class="px-4 py-3.5 text-right text-sm font-mono font-semibold"
                    [class.text-emerald-600]="tx.type === 'mint'"
                    [class.text-red-600]="tx.type === 'retire'"
                    [class.text-blue-600]="tx.type === 'transfer' || tx.type === 'sale'"
                  >
                    {{ tx.type === 'mint' ? '+' : '-' }}{{ tx.amount | creditAmount }}
                  </td>
                  <td class="px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300 font-mono">
                    <span *ngIf="tx.from" class="flex items-center gap-1">
                      {{ tx.from | stellarAddress }}
                      <lucide-angular
                        [img]="ArrowRightIcon"
                        class="w-3 h-3 text-slate-400"
                      ></lucide-angular>
                    </span>
                    <span *ngIf="tx.to">{{ tx.to | stellarAddress }}</span>
                    <span *ngIf="!tx.from && !tx.to" class="text-slate-400">—</span>
                  </td>
                  <td class="px-4 py-3.5">
                    <span class="text-sm font-mono text-slate-500 dark:text-slate-400">{{
                      tx.txHash | stellarAddress: 8
                    }}</span>
                  </td>
                  <td
                    class="px-4 py-3.5 text-right text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap"
                  >
                    {{ tx.timestamp | dateFormat: 'short' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ng-template #noData>
        <div *ngIf="!(loading$ | async)">
          <app-empty-state
            title="Project not found"
            message="The requested credit project could not be found."
            actionLabel="Back to Portfolio"
            (action)="goBack()"
          ></app-empty-state>
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class CreditDetailComponent implements OnInit, OnDestroy {
  protected balance$!: Observable<CreditBalance | null>;
  protected transactions$!: Observable<CreditTransaction[]>;
  protected loading$: Observable<boolean>;

  private projectId = '';
  private destroy$ = new Subject<void>();

  protected readonly ArrowLeftIcon = ArrowLeft;
  protected readonly DropletsIcon = Droplets;
  protected readonly TrendingUpIcon = TrendingUp;
  protected readonly ShieldCheckIcon = ShieldCheck;
  protected readonly DollarSignIcon = DollarSign;
  protected readonly ArrowUpRightIcon = ArrowUpRight;
  protected readonly ArrowDownRightIcon = ArrowDownRight;
  protected readonly ArrowLeftRightIcon = ArrowLeftRight;
  protected readonly CopyIcon = Copy;
  protected readonly ArrowRightIcon = ArrowRight;

  constructor(
    private route: ActivatedRoute,
    private store: Store<AppState>,
  ) {
    this.loading$ = this.store.select(selectCreditsLoading);
  }

  ngOnInit(): void {
    // React to route param changes without full component destroy/re-create.
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((id) => {
        this.projectId = id;
        if (id) {
          this.balance$ = this.store
            .select(selectCreditBalances)
            .pipe(map((balances) => balances.find((b) => b.projectId === id) ?? null));
          this.transactions$ = this.store
            .select(selectCreditTransactions)
            .pipe(map((txs) => txs.filter((t) => t.projectId === id)));

          this.store.dispatch(CreditsActions.loadPortfolio());
          this.store.dispatch(CreditsActions.loadTransactions({ projectId: id }));
        } else {
          this.balance$ = this.store.select(selectCreditBalances).pipe(map(() => null));
          this.transactions$ = this.store.select(selectCreditTransactions).pipe(map(() => []));
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected goBack(): void {
    window.history.back();
  }
}
