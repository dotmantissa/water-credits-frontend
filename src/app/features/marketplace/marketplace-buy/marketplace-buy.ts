import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import {
  LucideAngularModule,
  ArrowLeft,
  ShoppingCart,
  CheckCircle2,
  XCircle,
} from 'lucide-angular';

import { MarketplaceListing, MarketplaceService } from '../../../core/services/marketplace.service';
import { AppState } from '../../../core/store/app.state';
import * as MarketplaceActions from '../../../core/store/marketplace/marketplace.actions';
import {
  selectIsBuyInProgress,
  selectIsBuyConfirmed,
  selectMarketplaceCancelling,
} from '../../../core/store/marketplace/marketplace.selectors';
import { selectCurrentUser } from '../../../core/store/auth/auth.selectors';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { CreditAmountPipe } from '../../../shared/pipes/credit-amount.pipe';
import { NumberAbbreviatePipe } from '../../../shared/pipes/number-abbreviate.pipe';
import { StellarAddressPipe } from '../../../shared/pipes/stellar-address.pipe';

@Component({
  selector: 'app-marketplace-buy',
  standalone: true,
  imports: [
    NgIf,
    RouterLink,
    LucideAngularModule,
    LoadingSpinnerComponent,
    CreditAmountPipe,
    NumberAbbreviatePipe,
    StellarAddressPipe,
  ],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">
      <a
        routerLink="/marketplace"
        class="inline-flex items-center gap-1 text-sm text-stellar-blue hover:text-stellar-blue-light"
      >
        <lucide-angular [img]="ArrowLeftIcon" class="w-4 h-4"></lucide-angular>
        Back to Marketplace
      </a>

      <app-loading-spinner
        *ngIf="loadingListing"
        size="lg"
        label="Loading listing..."
      ></app-loading-spinner>

      <div
        *ngIf="!loadingListing && loadError"
        class="card p-6 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 text-center"
      >
        <lucide-angular
          [img]="XCircleIcon"
          class="w-10 h-10 text-red-500 mx-auto mb-2"
        ></lucide-angular>
        <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
      </div>

      <div *ngIf="!loadingListing && listing && !confirmed" class="card p-6 space-y-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
            {{ isOwner ? 'Manage Listing' : 'Buy Credits' }}
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ listing.projectName }}</p>
        </div>

        <div
          *ngIf="inProgress"
          class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700/30 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300 flex items-center gap-3"
        >
          <svg class="animate-spin w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24">
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
          <div>
            <p class="font-medium">Waiting for wallet signature</p>
            <p class="mt-0.5 text-blue-700 dark:text-blue-400">
              Please approve the transaction in your Freighter wallet.
            </p>
          </div>
        </div>

        <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-5 space-y-4">
          <h3 class="font-medium text-slate-900 dark:text-white">Listing Details</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><span class="text-slate-400">Project:</span></div>
            <div class="font-medium text-slate-900 dark:text-white text-right">
              {{ listing.projectName }}
            </div>
            <div><span class="text-slate-400">Seller:</span></div>
            <div class="font-medium text-slate-900 dark:text-white text-right">
              {{ listing.sellerName || (listing.sellerId | stellarAddress) }}
            </div>
            <div><span class="text-slate-400">Amount:</span></div>
            <div class="font-medium text-slate-900 dark:text-white text-right">
              {{ listing.amount | creditAmount }} credits
            </div>
            <div><span class="text-slate-400">Price per credit:</span></div>
            <div class="font-medium text-slate-900 dark:text-white text-right">
              {{ listing.price | numberAbbreviate }} XLM
            </div>
            <div class="pt-2 border-t border-slate-200 dark:border-slate-700">
              <span class="text-slate-400">Total Cost:</span>
            </div>
            <div
              class="font-semibold text-slate-900 dark:text-white text-right pt-2 border-t border-slate-200 dark:border-slate-700"
            >
              {{ totalCost | numberAbbreviate }} XLM
            </div>
          </div>
        </div>

        <div
          *ngIf="listing.status !== 'active'"
          class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-300"
        >
          This listing is no longer active ({{ listing.status }}).
        </div>

        <div class="flex justify-end gap-3">
          <button
            *ngIf="isOwner && listing.status === 'active'"
            (click)="cancelListing()"
            [disabled]="cancelling"
            class="btn btn-outline text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800"
          >
            {{ cancelling ? 'Cancelling...' : 'Cancel Listing' }}
          </button>
          <button
            *ngIf="!isOwner && listing.status === 'active'"
            (click)="confirmPurchase()"
            [disabled]="inProgress"
            class="btn btn-primary flex items-center gap-2"
          >
            <lucide-angular [img]="ShoppingCartIcon" class="w-4 h-4"></lucide-angular>
            {{ inProgress ? 'Processing...' : 'Confirm Purchase' }}
          </button>
        </div>
      </div>

      <div *ngIf="confirmed && listing" class="card p-8 text-center space-y-4">
        <lucide-angular
          [img]="CheckCircle2Icon"
          class="w-14 h-14 text-environmental-green mx-auto"
        ></lucide-angular>
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">Purchase Complete</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          You successfully purchased {{ listing.amount | creditAmount }} credits from
          {{ listing.projectName }}.
        </p>
        <div class="flex justify-center gap-3 pt-2">
          <a routerLink="/credits" class="btn btn-outline">View Portfolio</a>
          <a routerLink="/marketplace" class="btn btn-primary">Back to Marketplace</a>
        </div>
      </div>
    </div>
  `,
})
export class MarketplaceBuyComponent implements OnInit, OnDestroy {
  protected readonly ArrowLeftIcon = ArrowLeft;
  protected readonly ShoppingCartIcon = ShoppingCart;
  protected readonly CheckCircle2Icon = CheckCircle2;
  protected readonly XCircleIcon = XCircle;

  protected listing: MarketplaceListing | null = null;
  protected loadingListing = true;
  protected loadError = '';

  protected inProgress = false;
  protected confirmed = false;
  protected isOwner = false;
  protected cancelling = false;

  private listingId = '';
  private currentUserWallet: string | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private store: Store<AppState>,
    private marketplaceService: MarketplaceService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.listingId = this.route.snapshot.paramMap.get('id') ?? '';
    this.watchCurrentUser();
    await this.loadListing();
    this.watchBuyPhase();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadListing(): Promise<void> {
    if (!this.listingId) {
      this.loadError = 'Listing not found';
      this.loadingListing = false;
      return;
    }
    try {
      this.listing = await this.marketplaceService.getListing(this.listingId);
      this.updateIsOwner();
    } catch {
      this.loadError = 'Failed to load listing';
    } finally {
      this.loadingListing = false;
    }
  }

  private watchCurrentUser(): void {
    this.store
      .select(selectCurrentUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUserWallet = user?.wallet ?? null;
        this.updateIsOwner();
      });
  }

  private updateIsOwner(): void {
    this.isOwner =
      !!this.listing &&
      !!this.currentUserWallet &&
      this.currentUserWallet === this.listing.sellerId;
  }

  private watchBuyPhase(): void {
    this.store
      .select(selectIsBuyInProgress)
      .pipe(takeUntil(this.destroy$))
      .subscribe((inProgress) => (this.inProgress = inProgress));

    this.store
      .select(selectIsBuyConfirmed)
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => (this.confirmed = true));

    this.store
      .select(selectMarketplaceCancelling)
      .pipe(takeUntil(this.destroy$))
      .subscribe((cancelling) => (this.cancelling = cancelling));
  }

  protected get totalCost(): number {
    if (!this.listing) return 0;
    return parseFloat(this.listing.amount) * this.listing.price;
  }

  protected confirmPurchase(): void {
    if (!this.listing || this.inProgress) return;
    this.store.dispatch(MarketplaceActions.initiateBuy({ listingId: this.listing.id }));
  }

  protected cancelListing(): void {
    if (!this.listing || this.cancelling) return;
    this.store.dispatch(MarketplaceActions.cancelListing({ listingId: this.listing.id }));
  }
}
