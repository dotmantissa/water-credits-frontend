import { createAction, props } from '@ngrx/store';

export const loadAdminStats = createAction('[Admin] Load Stats');
export const loadAdminStatsSuccess = createAction(
  '[Admin] Load Stats Success',
  props<{ totalUsers: number; activeOracles: number; pendingQueue: number; apiLatency: number }>(),
);
export const loadAdminStatsFailure = createAction(
  '[Admin] Load Stats Failure',
  props<{ error: string }>(),
);

export const loadUsers = createAction(
  '[Admin] Load Users',
  props<{ page: number; limit: number }>(),
);
export const loadUsersSuccess = createAction(
  '[Admin] Load Users Success',
  props<{ users: any[]; page: number; totalPages: number; total: number }>(),
);
export const loadUsersFailure = createAction(
  '[Admin] Load Users Failure',
  props<{ error: string }>(),
);

export const updateUserRole = createAction(
  '[Admin] Update User Role',
  props<{ userId: string; role: string }>(),
);
export const updateUserRoleSuccess = createAction('[Admin] Update User Role Success');
export const updateUserRoleFailure = createAction(
  '[Admin] Update User Role Failure',
  props<{ error: string }>(),
);

export const toggleUserKyc = createAction(
  '[Admin] Toggle User KYC',
  props<{ userId: string; verified: boolean }>(),
);
export const toggleUserKycSuccess = createAction('[Admin] Toggle User KYC Success');
export const toggleUserKycFailure = createAction(
  '[Admin] Toggle User KYC Failure',
  props<{ error: string }>(),
);

export const updateConfig = createAction(
  '[Admin] Update Config',
  props<{ config: Record<string, number> }>(),
);
export const updateConfigSuccess = createAction('[Admin] Update Config Success');
export const updateConfigFailure = createAction(
  '[Admin] Update Config Failure',
  props<{ error: string }>(),
);
