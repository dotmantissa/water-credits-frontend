import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIf, AsyncPipe } from '@angular/common';
import {
  LucideAngularModule,
  ArrowLeft,
  ExternalLink,
  Printer,
  Download,
  Award,
  Droplets,
  Hash,
  Calendar,
  MapPin,
  User,
} from 'lucide-angular';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { RetirementCertificate } from '../../../core/models/retirement.model';
import { CertificatePdfService } from '../../../core/services/certificate-pdf.service';
import { CreditAmountPipe } from '../../../shared/pipes/credit-amount.pipe';
import { DateFormatPipe } from '../../../shared/pipes/date-format.pipe';
import { StellarAddressPipe } from '../../../shared/pipes/stellar-address.pipe';
import { loadRetirementCertificate } from '../../../core/store/retirement/retirement.actions';
import {
  selectRetirementCertificate,
  selectRetirementLoading,
} from '../../../core/store/retirement/retirement.selectors';

@Component({
  selector: 'app-retirement-certificate',
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    RouterLink,
    LucideAngularModule,
    CreditAmountPipe,
    DateFormatPipe,
    StellarAddressPipe,
  ],
  template: `
    <div class="max-w-4xl mx-auto">
      <a
        routerLink="/retirement"
        class="inline-flex items-center gap-1 text-sm text-stellar-blue hover:text-stellar-blue-light mb-6"
      >
        <lucide-angular [img]="ArrowLeft" class="w-4 h-4"></lucide-angular>
        Back to Retirement History
      </a>

      <!-- Loading -->
      <div *ngIf="loading$ | async" class="flex items-center justify-center py-20">
        <svg
          class="animate-spin w-8 h-8 text-stellar-blue"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>

      <!-- Certificate content -->
      <div
        *ngIf="(cert$ | async) !== null && (loading$ | async) === false"
        id="certificate-content"
        class="bg-white dark:bg-dark-bg-lighter rounded-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl"
      >
        <div
          class="bg-gradient-to-r from-stellar-blue to-environmental-green p-6 text-white text-center"
        >
          <lucide-angular [img]="Award" class="w-12 h-12 mx-auto mb-2"></lucide-angular>
          <h1 class="text-2xl font-bold">Certificate of Carbon Credit Retirement</h1>
          <p class="text-blue-100 mt-1 text-sm">
            Water Credits &mdash; Verified Environmental Impact
          </p>
        </div>

        <ng-container *ngIf="cert$ | async as cert">
          <div class="p-8 space-y-6">
            <div class="text-center border-b border-slate-200 dark:border-slate-700 pb-6">
              <p
                class="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium"
              >
                This certifies that
              </p>
              <p class="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                {{ cert.retireeAddress | stellarAddress }}
              </p>
              <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">has permanently retired</p>
              <p class="text-4xl font-extrabold text-stellar-blue mt-2">
                {{ cert.amount | creditAmount }}
              </p>
              <p class="text-lg text-slate-600 dark:text-slate-300">water quality credits</p>
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-4">
                <div
                  class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1"
                >
                  <lucide-angular [img]="MapPin" class="w-3.5 h-3.5"></lucide-angular>
                  Project
                </div>
                <p class="font-semibold text-slate-900 dark:text-white">{{ cert.projectName }}</p>
              </div>
              <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-4">
                <div
                  class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1"
                >
                  <lucide-angular [img]="Droplets" class="w-3.5 h-3.5"></lucide-angular>
                  Amount Retired
                </div>
                <p class="font-semibold text-slate-900 dark:text-white">
                  {{ cert.amount | creditAmount }} credits
                </p>
              </div>
              <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-4">
                <div
                  class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1"
                >
                  <lucide-angular [img]="Calendar" class="w-3.5 h-3.5"></lucide-angular>
                  Retirement Date
                </div>
                <p class="font-semibold text-slate-900 dark:text-white">
                  {{ cert.retiredAt | dateFormat: 'long' }}
                </p>
              </div>
              <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-4">
                <div
                  class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1"
                >
                  <lucide-angular [img]="User" class="w-3.5 h-3.5"></lucide-angular>
                  Retiree Address
                </div>
                <p class="font-semibold text-slate-900 dark:text-white font-mono text-sm">
                  {{ cert.retireeAddress }}
                </p>
              </div>
            </div>

            <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-4">
              <div
                class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider mb-1"
              >
                Purpose
              </div>
              <p class="font-semibold text-slate-900 dark:text-white">{{ cert.purpose }}</p>
            </div>

            <div class="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <lucide-angular [img]="Hash" class="w-3.5 h-3.5"></lucide-angular>
                  Transaction Hash
                </span>
                <span class="font-mono text-xs text-slate-700 dark:text-slate-300">
                  {{ cert.txHash | stellarAddress: 8 }}
                </span>
              </div>
              <div
                *ngIf="cert.certificateIpfsUri"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <lucide-angular [img]="ExternalLink" class="w-3.5 h-3.5"></lucide-angular>
                  Certificate Metadata
                </span>
                <a
                  [href]="cert.certificateIpfsUri"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-stellar-blue hover:text-stellar-blue-light inline-flex items-center gap-1"
                >
                  View on IPFS
                  <lucide-angular [img]="ExternalLink" class="w-3 h-3"></lucide-angular>
                </a>
              </div>
            </div>
          </div>

          <div
            class="bg-slate-50 dark:bg-dark-bg border-t border-slate-200 dark:border-slate-700 px-8 py-4 flex items-center justify-between"
          >
            <p class="text-xs text-slate-400">
              Water Credits &mdash; Verified Carbon Credit Platform
            </p>
            <div class="flex items-center gap-3">
              <button
                (click)="printCertificate()"
                class="btn btn-outline flex items-center gap-2 text-sm"
              >
                <lucide-angular [img]="Printer" class="w-4 h-4"></lucide-angular>
                Print
              </button>
              <button
                (click)="downloadCertificate(cert)"
                [disabled]="downloading"
                class="btn btn-primary flex items-center gap-2 text-sm"
              >
                <lucide-angular [img]="Download" class="w-4 h-4"></lucide-angular>
                {{ downloading ? 'Generating...' : 'Download PDF' }}
              </button>
            </div>
          </div>
        </ng-container>
      </div>

      <!-- Not found -->
      <div
        *ngIf="(loading$ | async) === false && (cert$ | async) === null"
        class="text-center py-20"
      >
        <lucide-angular
          [img]="Award"
          class="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4"
        ></lucide-angular>
        <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-300">
          Certificate not found
        </h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
          The requested retirement certificate could not be loaded.
        </p>
        <a routerLink="/retirement" class="btn btn-primary mt-6 inline-flex items-center gap-2">
          <lucide-angular [img]="ArrowLeft" class="w-4 h-4"></lucide-angular>
          Back to Retirement History
        </a>
      </div>
    </div>
  `,
})
export class RetirementCertificateComponent implements OnInit {
  protected cert$: Observable<RetirementCertificate | null>;
  protected loading$: Observable<boolean>;

  protected downloading = false;

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly ExternalLink = ExternalLink;
  protected readonly Printer = Printer;
  protected readonly Download = Download;
  protected readonly Award = Award;
  protected readonly Droplets = Droplets;
  protected readonly Hash = Hash;
  protected readonly Calendar = Calendar;
  protected readonly MapPin = MapPin;
  protected readonly User = User;

  constructor(
    private route: ActivatedRoute,
    private store: Store,
    private certPdf: CertificatePdfService,
  ) {
    this.cert$ = this.store.select(selectRetirementCertificate);
    this.loading$ = this.store.select(selectRetirementLoading);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.store.dispatch(loadRetirementCertificate({ id }));
    }
  }

  protected printCertificate(): void {
    window.print();
  }

  protected async downloadCertificate(cert: RetirementCertificate): Promise<void> {
    if (this.downloading) return;
    this.downloading = true;
    try {
      await this.certPdf.generate(cert);
    } finally {
      this.downloading = false;
    }
  }
}
