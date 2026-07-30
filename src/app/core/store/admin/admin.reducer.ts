import { createReducer, on } from '@ngrx/store';
import * as AdminActions from './admin.actions';

export interface AdminState {
  stats: {
    totalUsers: number;
    activeOracles: number;
    pendingQueue: number;
    apiLatency: number;
  } | null;
  statsLoading: boolean;
  statsError: string | null;
  users: any[];
  usersLoading: boolean;
  usersError: string | null;
  configSaving: boolean;
  configError: string | null;
}

export const initialState: AdminState = {
  stats: null,
  statsLoading: false,
  statsError: null,
  users: [],
  usersLoading: false,
  usersError: null,
  configSaving: false,
  configError: null,
};

export const adminReducer = createReducer(
  initialState,
  on(AdminActions.loadAdminStats, (state) => ({ ...state, statsLoading: true, statsError: null })),
  on(
    AdminActions.loadAdminStatsSuccess,
    (state, { totalUsers, activeOracles, pendingQueue, apiLatency }) => ({
      ...state,
      stats: { totalUsers, activeOracles, pendingQueue, apiLatency },
      statsLoading: false,
    }),
  ),
  on(AdminActions.loadAdminStatsFailure, (state, { error }) => ({
    ...state,
    statsLoading: false,
    statsError: error,
  })),

  on(AdminActions.loadUsers, (state) => ({ ...state, usersLoading: true, usersError: null })),
  on(AdminActions.loadUsersSuccess, (state, { users }) => ({
    ...state,
    users,
    usersLoading: false,
  })),
  on(AdminActions.loadUsersFailure, (state, { error }) => ({
    ...state,
    usersLoading: false,
    usersError: error,
  })),

  on(AdminActions.updateConfig, (state) => ({ ...state, configSaving: true, configError: null })),
  on(AdminActions.updateConfigSuccess, (state) => ({ ...state, configSaving: false })),
  on(AdminActions.updateConfigFailure, (state, { error }) => ({
    ...state,
    configSaving: false,
    configError: error,
  })),
);
