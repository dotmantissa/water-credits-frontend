import { Component, OnInit } from '@angular/core';
import { AsyncPipe, NgIf, NgFor, NgClass, NgSwitch, NgSwitchCase } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  LucideAngularModule,
  Plus,
  Clock,
  Users,
  Vote,
  TrendingUp,
  Scale,
  Shield,
  Activity,
} from 'lucide-angular';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state';
import {
  DataTableComponent,
  ColumnDef,
} from '../../../shared/components/data-table/data-table.component';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';
import { NumberAbbreviatePipe } from '../../../shared/pipes/number-abbreviate.pipe';
import { Proposal, ProposalStatus, GovernanceConfig } from '../../../core/models/proposal.model';
import * as GovernanceActions from '../../../core/store/governance/governance.actions';
import {
  selectProposals,
  selectProposalsLoading,
  selectGovernanceConfig,
  selectGovernanceConfigLoading,
  selectGovernanceError,
} from '../../../core/store/governance/governance.selectors';
import { selectCurrentUser } from '../../../core/store/auth/auth.selectors';

@Component({
  selector: 'app-governance-dashboard',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    NgFor,
    NgClass,
    NgSwitch,
    NgSwitchCase,
    RouterLink,
    LucideAngularModule,
    StatusBadgeComponent,
    LoadingStateComponent,
    DataTableComponent,
    DurationPipe,
    NumberAbbreviatePipe,
  ],
  template: `
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Governance</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage protocol parameters and membership
          </p>
        </div>
        <a routerLink="/governance/new" class="btn btn-primary inline-flex items-center gap-2">
          <lucide-angular [img]="PlusIcon" class="w-4 h-4"></lucide-angular>
          New Proposal
        </a>
      </div>

      <app-loading-state
        [loading]="(loadingConfig$ | async) ?? false"
        [error]="error$ | async"
        [empty]="!(config$ | async)"
        skeleton="stat-card"
        emptyTitle="No configuration"
        emptyMessage="Governance configuration could not be loaded."
        (retry)="loadData()"
      >
        <div *ngIf="config$ | async as config" class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="card p-4">
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
              <lucide-angular [img]="ScaleIcon" class="w-3.5 h-3.5"></lucide-angular>
              <span>Protocol Fee</span>
            </div>
            <p class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ config.protocolFee }}%
            </p>
          </div>
          <div class="card p-4">
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
              <lucide-angular [img]="ClockIcon" class="w-3.5 h-3.5"></lucide-angular>
              <span>Vote Duration</span>
            </div>
            <p class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ config.voteDuration }}h
            </p>
          </div>
          <div class="card p-4">
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
              <lucide-angular [img]="ShieldIcon" class="w-3.5 h-3.5"></lucide-angular>
              <span>Timelock</span>
            </div>
            <p class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ config.timelockDuration }}h
            </p>
          </div>
          <div class="card p-4">
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
              <lucide-angular [img]="TrendingUpIcon" class="w-3.5 h-3.5"></lucide-angular>
              <span>Quorum</span>
            </div>
            <p class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ config.quorumThreshold }}%
            </p>
          </div>
          <div class="card p-4">
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
              <lucide-angular [img]="ActivityIcon" class="w-3.5 h-3.5"></lucide-angular>
              <span>Oracle Threshold</span>
            </div>
            <p class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ config.minOracleThreshold }}
            </p>
          </div>
          <div class="card p-4">
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
              <lucide-angular [img]="UsersIcon" class="w-3.5 h-3.5"></lucide-angular>
              <span>Quality Penalty</span>
            </div>
            <p class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ config.qualityPenaltyWeight }}
            </p>
          </div>
          <div class="card p-4">
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
              <lucide-angular [img]="VoteIcon" class="w-3.5 h-3.5"></lucide-angular>
              <span>N-Removal Weight</span>
            </div>
            <p class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ config.nRemovalWeight }}
            </p>
          </div>
          <div class="card p-4">
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
              <lucide-angular [img]="VoteIcon" class="w-3.5 h-3.5"></lucide-angular>
              <span>P-Removal Weight</span>
            </div>
            <p class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ config.pRemovalWeight }}
            </p>
          </div>
        </div>
      </app-loading-state>

      <div class="card">
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div class="flex items-center gap-2 overflow-x-auto">
            <button
              *ngFor="let tab of filterTabs"
              (click)="selectTab(tab.value)"
              [ngClass]="{
                'bg-stellar-blue text-white': selectedTabValue === tab.value,
                'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600':
                  selectedTabValue !== tab.value,
              }"
              class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <div class="p-6">
          <app-data-table
            [columns]="columns"
            [data]="(filteredProposals$ | async) || []"
            [loading]="(loadingProposals$ | async) || false"
            emptyTitle="No proposals found"
            emptyMessage="There are no proposals matching the selected filter."
            (rowClick)="goToProposal($event)"
          >
            <ng-template #row let-row let-col="column">
              <ng-container [ngSwitch]="col.key">
                <span
                  *ngSwitchCase="'title'"
                  class="font-medium text-slate-900 dark:text-white truncate block max-w-xs md:max-w-md"
                >
                  {{ row.title }}
                </span>
                <span *ngSwitchCase="'status'">
                  <app-status-badge [status]="row.status"></app-status-badge>
                </span>
                <span *ngSwitchCase="'votesFor'">
                  {{ row.votesFor | numberAbbreviate }}
                </span>
                <span *ngSwitchCase="'votesAgainst'">
                  {{ row.votesAgainst | numberAbbreviate }}
                </span>
                <span
                  *ngSwitchCase="'deadline'"
                  class="whitespace-nowrap inline-flex items-center gap-1"
                >
                  <lucide-angular
                    [img]="ClockIcon"
                    class="w-3.5 h-3.5 text-slate-400"
                  ></lucide-angular>
                  <span>{{ row.deadline | duration }} left</span>
                </span>
              </ng-container>
            </ng-template>
          </app-data-table>
        </div>
      </div>
    </div>
  `,
})
export class GovernanceDashboardComponent implements OnInit {
  protected readonly PlusIcon = Plus;
  protected readonly ClockIcon = Clock;
  protected readonly UsersIcon = Users;
  protected readonly VoteIcon = Vote;
  protected readonly TrendingUpIcon = TrendingUp;
  protected readonly ScaleIcon = Scale;
  protected readonly ShieldIcon = Shield;
  protected readonly ActivityIcon = Activity;

  protected config$: Observable<GovernanceConfig | null>;
  protected loadingConfig$: Observable<boolean>;
  protected loadingProposals$: Observable<boolean>;
  protected error$: Observable<string | null>;
  protected filteredProposals$: Observable<Proposal[]>;
  protected selectedTabValue = 'all';

  /** BehaviorSubject drives reactive tab filtering without re-dispatching. */
  private readonly selectedTab$ = new BehaviorSubject<string>('all');

  protected readonly filterTabs = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'My Proposals', value: 'mine' },
  ];

  protected columns: ColumnDef<Proposal>[] = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'votesFor', label: 'Votes For', sortable: true, align: 'right' },
    { key: 'votesAgainst', label: 'Votes Against', sortable: true, align: 'right' },
    { key: 'deadline', label: 'Deadline', sortable: true },
  ];

  constructor(
    private store: Store,
    private router: Router,
  ) {
    this.config$ = this.store.select(selectGovernanceConfig);
    this.loadingConfig$ = this.store.select(selectGovernanceConfigLoading);
    this.loadingProposals$ = this.store.select(selectProposalsLoading);
    this.error$ = this.store.select(selectGovernanceError);

    // Filtering is purely client-side; no re-fetch needed on tab change.
    this.filteredProposals$ = combineLatest([
      this.store.select(selectProposals),
      this.store.select(selectCurrentUser),
      this.selectedTab$,
    ]).pipe(
      map(([proposals, user, tab]) => {
        if (tab === 'active') {
          return proposals.filter((p) => p.status === ProposalStatus.ACTIVE);
        }
        if (tab === 'mine') {
          return proposals.filter(
            (p) => p.proposerId === user?.id || p.proposerId === user?.wallet,
          );
        }
        return proposals;
      }),
    );
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.store.dispatch(GovernanceActions.loadConfig());
    this.store.dispatch(GovernanceActions.loadProposals({ params: { limit: 50 } }));
  }

  selectTab(tabValue: string): void {
    this.selectedTabValue = tabValue;
    // Push new value into the subject — filteredProposals$ reacts automatically.
    this.selectedTab$.next(tabValue);
  }

  goToProposal(proposal: object): void {
    this.router.navigate(['/governance', (proposal as Proposal).id]);
  }
}
