import { createReducer, on } from '@ngrx/store';
import * as RetirementActions from './retirement.actions';
import * as AuthActions from '../auth/auth.actions';
import { Retirement, RetirementCertificate } from '../../models/retirement.model';

/** The retirement wizard's current phase, used to drive UI state. */
export type RetirementPhase =
  'idle' | 'preparing' | 'awaiting_signature' | 'submitting' | 'confirmed' | 'failed';

export interface RetirementState {
  /** Paginated list from the Retirement History view. */
  retirements: Retirement[];
  total: number;
  page: number;
  totalPages: number;

  /** The retirement currently being processed through the wizard. */
  activeRetirement: Retirement | null;

  /** Certificate loaded for the certificate page. */
  certificate: RetirementCertificate | null;

  /** Wizard phase — drives spinner / step display. */
  phase: RetirementPhase;

  /** Timestamp (ms) of the last successful retirements-list fetch, for cache expiration checks. */
  lastFetched: number | null;

  /** True while any async operation is in flight. */
  loading: boolean;

  error: string | null;
}

const initialState: RetirementState = {
  retirements: [],
  total: 0,
  page: 1,
  totalPages: 1,
  activeRetirement: null,
  certificate: null,
  phase: 'idle',
  lastFetched: null,
  loading: false,
  error: null,
};

export const retirementReducer = createReducer(
  initialState,

  on(RetirementActions.initiateRetirement, (state) => ({
    ...state,
    phase: 'preparing' as RetirementPhase,
    loading: true,
    error: null,
    activeRetirement: null,
    certificate: null,
  })),

  on(RetirementActions.retirementPrepared, (state, { prepareResponse }) => ({
    ...state,
    activeRetirement: prepareResponse.retirement,
    phase: (prepareResponse.unsignedXdr ? 'awaiting_signature' : 'submitting') as RetirementPhase,
  })),

  on(RetirementActions.retirementPrepareFailure, (state, { error }) => ({
    ...state,
    phase: 'failed' as RetirementPhase,
    loading: false,
    error,
  })),

  on(RetirementActions.retirementSigned, (state) => ({
    ...state,
    phase: 'submitting' as RetirementPhase,
  })),

  on(RetirementActions.retirementSignatureRejected, (state) => ({
    ...state,
    phase: 'idle' as RetirementPhase,
    loading: false,
    error: null,
  })),

  on(RetirementActions.retirementSignatureFailure, (state, { error }) => ({
    ...state,
    phase: 'failed' as RetirementPhase,
    loading: false,
    error,
  })),

  on(RetirementActions.retirementSubmitted, (state, { retirement }) => ({
    ...state,
    activeRetirement: retirement,
    phase: 'confirmed' as RetirementPhase,
  })),

  on(RetirementActions.retirementSubmitFailure, (state, { error }) => ({
    ...state,
    phase: 'failed' as RetirementPhase,
    loading: false,
    error,
  })),

  on(RetirementActions.retirementConfirmed, (state, { retirement }) => ({
    ...state,
    activeRetirement: retirement,
    phase: 'confirmed' as RetirementPhase,
    loading: false,
    error: null,
  })),

  on(RetirementActions.retirementFailure, (state, { error }) => ({
    ...state,
    phase: 'failed' as RetirementPhase,
    loading: false,
    error,
  })),

  on(RetirementActions.loadRetirements, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(
    RetirementActions.loadRetirementsSuccess,
    (state, { retirements, total, page, totalPages }) => ({
      ...state,
      retirements,
      total,
      page,
      totalPages,
      loading: false,
      lastFetched: Date.now(),
    }),
  ),

  on(RetirementActions.loadRetirementsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(RetirementActions.loadRetirementCertificate, (state) => ({
    ...state,
    certificate: null,
    loading: true,
    error: null,
  })),

  on(RetirementActions.loadRetirementCertificateSuccess, (state, { certificate }) => ({
    ...state,
    certificate,
    loading: false,
  })),

  on(RetirementActions.loadRetirementCertificateFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  // Full cache reset on forced logout, per the cache-invalidation strategy.
  on(AuthActions.forceLogout, () => initialState),
);
