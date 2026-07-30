import { createReducer, on } from '@ngrx/store';
import * as GovernanceActions from './governance.actions';
import * as AuthActions from '../auth/auth.actions';
import { Proposal, GovernanceConfig } from '../../models/proposal.model';

export interface GovernanceState {
  proposals: Proposal[];
  total: number;
  page: number;
  totalPages: number;
  selectedProposal: Proposal | null;
  config: GovernanceConfig | null;
  loadingProposals: boolean;
  loadingDetail: boolean;
  loadingConfig: boolean;
  voting: boolean;
  executing: boolean;
  creating: boolean;
  /** Timestamp (ms) of the last successful proposals fetch, for cache expiration checks. */
  lastFetched: number | null;
  error: string | null;
}

const initialState: GovernanceState = {
  proposals: [],
  total: 0,
  page: 1,
  totalPages: 1,
  selectedProposal: null,
  config: null,
  loadingProposals: false,
  loadingDetail: false,
  loadingConfig: false,
  voting: false,
  executing: false,
  creating: false,
  lastFetched: null,
  error: null,
};

export const governanceReducer = createReducer(
  initialState,

  // Load Config
  on(GovernanceActions.loadConfig, (state) => ({
    ...state,
    loadingConfig: true,
    error: null,
  })),
  on(GovernanceActions.loadConfigSuccess, (state, { config }) => ({
    ...state,
    config,
    loadingConfig: false,
  })),
  on(GovernanceActions.loadConfigFailure, (state, { error }) => ({
    ...state,
    loadingConfig: false,
    error,
  })),

  // Load Proposals
  on(GovernanceActions.loadProposals, (state) => ({
    ...state,
    loadingProposals: true,
    error: null,
  })),
  on(GovernanceActions.loadProposalsSuccess, (state, { proposals, total, page, totalPages }) => ({
    ...state,
    proposals,
    total,
    page,
    totalPages,
    loadingProposals: false,
    lastFetched: Date.now(),
  })),
  on(GovernanceActions.loadProposalsFailure, (state, { error }) => ({
    ...state,
    loadingProposals: false,
    error,
  })),

  // Load Proposal Detail
  on(GovernanceActions.loadProposalDetail, (state) => ({
    ...state,
    loadingDetail: true,
    error: null,
  })),
  on(GovernanceActions.loadProposalDetailSuccess, (state, { proposal }) => ({
    ...state,
    selectedProposal: proposal,
    loadingDetail: false,
  })),
  on(GovernanceActions.loadProposalDetailFailure, (state, { error }) => ({
    ...state,
    loadingDetail: false,
    error,
  })),

  // Create Proposal
  on(GovernanceActions.createProposal, (state) => ({
    ...state,
    creating: true,
    error: null,
  })),
  on(GovernanceActions.createProposalSuccess, (state, { proposal }) => ({
    ...state,
    proposals: [proposal, ...state.proposals],
    creating: false,
  })),
  on(GovernanceActions.createProposalFailure, (state, { error }) => ({
    ...state,
    creating: false,
    error,
  })),

  // Cast Vote
  on(GovernanceActions.castVote, (state) => ({
    ...state,
    voting: true,
    error: null,
  })),
  on(GovernanceActions.castVotePrepared, (state) => ({
    ...state,
    voting: true,
  })),
  on(GovernanceActions.castVoteSigned, (state) => ({
    ...state,
    voting: true,
  })),
  on(GovernanceActions.castVoteSignatureRejected, (state) => ({
    ...state,
    voting: false,
    error: null,
  })),
  on(GovernanceActions.castVoteSignatureFailure, (state, { error }) => ({
    ...state,
    voting: false,
    error,
  })),
  on(GovernanceActions.castVoteSuccess, (state, { proposal }) => ({
    ...state,
    selectedProposal:
      state.selectedProposal?.id === proposal.id ? proposal : state.selectedProposal,
    proposals: state.proposals.map((p) => (p.id === proposal.id ? proposal : p)),
    voting: false,
  })),
  on(GovernanceActions.castVoteFailure, (state, { error }) => ({
    ...state,
    voting: false,
    error,
  })),

  // Execute Proposal
  on(GovernanceActions.executeProposal, (state) => ({
    ...state,
    executing: true,
    error: null,
  })),
  on(GovernanceActions.executeProposalSuccess, (state, { proposal }) => ({
    ...state,
    selectedProposal:
      state.selectedProposal?.id === proposal.id ? proposal : state.selectedProposal,
    proposals: state.proposals.map((p) => (p.id === proposal.id ? proposal : p)),
    executing: false,
  })),
  on(GovernanceActions.executeProposalFailure, (state, { error }) => ({
    ...state,
    executing: false,
    error,
  })),
  // Full cache reset on forced logout, per the cache-invalidation strategy.
  on(AuthActions.forceLogout, () => initialState),
);
