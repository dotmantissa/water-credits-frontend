import { createSelector } from '@ngrx/store';
import { AppState } from '../app.state';

export const selectAdminState = (state: AppState) => state.admin;

export const selectAdminStats = createSelector(selectAdminState, (s) => s.stats);
export const selectAdminStatsLoading = createSelector(selectAdminState, (s) => s.statsLoading);
export const selectAdminUsers = createSelector(selectAdminState, (s) => s.users);
export const selectAdminUsersLoading = createSelector(selectAdminState, (s) => s.usersLoading);
export const selectAdminConfigSaving = createSelector(selectAdminState, (s) => s.configSaving);
