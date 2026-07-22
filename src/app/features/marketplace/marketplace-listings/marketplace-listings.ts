import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf, NgFor, NgClass, NgSwitch, NgSwitchCase, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { LucideAngularModule, Plus, BarChart3 } from 'lucide-angular';
import { MarketplaceListing } from '../../../core/services/marketplace.service';
import { AppState } from '../../../core/store/app.state';
import * as MarketplaceActions from '../../../core/store/marketplace/marketplace.actions';
import {
  selectListings,
  selectMarketplaceLoading,
  selectMarketplaceError,
  selectMarketplacePagination,
} from '../../../core/store/marketplace/marketplace.selectors';
import {
  DataTableComponent,
  ColumnDef,
} from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state';
import { CreditAmountPipe } from '../../../shared/pipes/credit-amount.pipe';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { StellarAddressPipe } from '../../../shared/pipes/stellar-address.pipe';
import { NumberAbbreviatePipe } from '../../../shared/pipes/number-abbreviate.pipe';

@Component({
  selector: 'app-marketplace-listings',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    NgSwitch,
    NgSwitchCase,
    AsyncPipe,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    DataTableComponent,
    StatusBadgeComponent,
    SearchInputComponent,
    LoadingStateComponent,
    CreditAmountPipe,
    DateFormatPipe,
    StellarAddressPipe,
    NumberAbbreviatePipe,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Marketplace</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse and trade water credits
          </p>
        </div>
        <div class="flex items-center gap-3">
          <a routerLink="/marketplace/orderbook" class="btn btn-ghost">
            <lucide-angular [img]="BarChart3Icon" class="w-4 h-4"></lucide-angular>
            Order Book
          </a>
          <a routerLink="/marketplace/new" class="btn btn-primary">
            <lucide-angular [img]="PlusIcon" class="w-4 h-4"></lucide-angular>
            Create Listing
          </a>
        </div>
      </div>

      <div class="card p-5">
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <app-search-input
              [value]="searchQuery"
              placeholder="Search listings..."
              (search)="onSearch($event)"
            />
          </div>
          <select [(ngModel)]="statusFilter" (change)="filterByStatus(statusFilter)" class="input">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="sold">Sold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <app-loading-state
        [loading]="loading$ | async"
        [error]="error$ | async"
        [data]="listings$ | async"
        skeletonType="table"
        emptyTitle="No listings found"
        emptyMessage="There are no marketplace listings matching your criteria."
        retryLabel="Retry"
        (retry)="reload()"
      >
        <app-data-table
          [columns]="columns"
          [data]="(listings$ | async) || []"
          [loading]="false"
          [pagination]="pagination$ | async"
          (page)="onPageChange($event)"
        >
          <ng-template #row let-row let-col="column">
            <ng-container [ngSwitch]="col.key">
              <ng-template ngSwitchCase="projectName">
                <span class="font-medium text-slate-900 dark:text-white">{{
                  row.projectName
                }}</span>
              </ng-template>
              <ng-template ngSwitchCase="sellerName">
                <span class="text-slate-600 dark:text-slate-400">{{
                  row.sellerName || (row.sellerId | stellarAddress)
                }}</span>
              </ng-template>
              <ng-template ngSwitchCase="amount">
                <span class="font-mono text-slate-700 dark:text-slate-300">{{
                  row.amount | creditAmount
                }}</span>
              </ng-template>
              <ng-template ngSwitchCase="price">
                <span class="font-mono text-slate-700 dark:text-slate-300"
                  >{{ row.price | numberAbbreviate }} XLM</span
                >
              </ng-template>
              <ng-template ngSwitchCase="totalValue">
                <span class="font-mono text-slate-700 dark:text-slate-300"
                  >{{ row.totalValue | numberAbbreviate }} XLM</span
                >
              </ng-template>
              <ng-template ngSwitchCase="status">
                <app-status-badge [status]="row.status"></app-status-badge>
              </ng-template>
              <ng-template ngSwitchCase="createdAt">
                <span class="text-slate-500 dark:text-slate-400">{{
                  row.createdAt | dateFormat: 'short'
                }}</span>
              </ng-template>
              <ng-template ngSwitchCase="actions">
                <button
                  *ngIf="row.status === 'active'"
                  (click)="buyListing(row)"
                  class="btn btn-sm btn-primary"
                >
                  Buy
                </button>
              </ng-template>
              <ng-template ngSwitchDefault>
                {{ row[col.key] }}
              </ng-template>
            </ng-container>
          </ng-template>
        </app-data-table>
      </app-loading-state>
    </div>
  `,
})
export class MarketplaceListingsComponent implements OnInit, OnDestroy {
  protected readonly PlusIcon = Plus;
  protected readonly BarChart3Icon = BarChart3;

  protected listings$: Observable<MarketplaceListing[]>;
  protected loading$: Observable<boolean>;
  protected error$: Observable<string | null>;
  protected pagination$: Observable<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>;

  protected statusFilter = '';
  protected searchQuery = '';

  private page = 1;
  private destroy$ = new Subject<void>();

  protected columns: ColumnDef<MarketplaceListing>[] = [
    { key: 'projectName', label: 'Project', sortable: true },
    { key: 'sellerName', label: 'Seller' },
    { key: 'amount', label: 'Amount', align: 'right' },
    { key: 'price', label: 'Price', align: 'right' },
    { key: 'totalValue', label: 'Total Value', align: 'right' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created' },
    { key: 'actions', label: '', align: 'right' },
  ];

  constructor(
    private store: Store<AppState>,
    protected router: Router,
  ) {
    this.listings$ = this.store.select(selectListings);
    this.loading$ = this.store.select(selectMarketplaceLoading);
    this.error$ = this.store.select(selectMarketplaceError);
    this.pagination$ = this.store.select(selectMarketplacePagination);
  }

  ngOnInit(): void {
    this.dispatchLoad();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private dispatchLoad(): void {
    const params: Record<string, any> = { page: this.page, limit: 10 };
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.searchQuery) params['search'] = this.searchQuery;
    this.store.dispatch(MarketplaceActions.loadListings({ params }));
  }

  protected reload(): void {
    this.dispatchLoad();
  }

  protected onPageChange(page: number): void {
    this.page = page;
    this.store.dispatch(MarketplaceActions.setListingsPage({ page }));
    this.dispatchLoad();
  }

  protected filterByStatus(status: string): void {
    this.statusFilter = status;
    this.page = 1;
    this.dispatchLoad();
  }

  protected onSearch(term: string): void {
    this.searchQuery = term;
    this.page = 1;
    this.dispatchLoad();
  }

  protected buyListing(listing: MarketplaceListing): void {
    this.router.navigate(['/marketplace', listing.id, 'buy']);
  }
}
