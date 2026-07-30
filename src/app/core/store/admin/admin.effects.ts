import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, from } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { UsersService } from '../../services/users.service';
import * as AdminActions from './admin.actions';

@Injectable()
export class AdminEffects {
  loadAdminStatsEffect = createEffect(() =>
    this.actions.pipe(
      ofType(AdminActions.loadAdminStats),
      mergeMap(() =>
        from(this.usersService.getUsers({ page: 1, limit: 1 })).pipe(
          map((res) =>
            AdminActions.loadAdminStatsSuccess({
              totalUsers: res.total,
              activeOracles: 0,
              pendingQueue: 0,
              apiLatency: 0,
            }),
          ),
          catchError((error) => of(AdminActions.loadAdminStatsFailure({ error: error.message }))),
        ),
      ),
    ),
  );

  loadUsersEffect = createEffect(() =>
    this.actions.pipe(
      ofType(AdminActions.loadUsers),
      mergeMap(({ page, limit }) =>
        from(this.usersService.getUsers({ page, limit })).pipe(
          map((res) =>
            AdminActions.loadUsersSuccess({
              users: res.data,
              page: res.page,
              totalPages: res.totalPages,
              total: res.total,
            }),
          ),
          catchError((error) => of(AdminActions.loadUsersFailure({ error: error.message }))),
        ),
      ),
    ),
  );

  updateUserRoleEffect = createEffect(() =>
    this.actions.pipe(
      ofType(AdminActions.updateUserRole),
      mergeMap(({ userId, role }) =>
        from(this.usersService.updateUserRole(userId, role)).pipe(
          map(() => AdminActions.updateUserRoleSuccess()),
          catchError((error) => of(AdminActions.updateUserRoleFailure({ error: error.message }))),
        ),
      ),
    ),
  );

  constructor(
    private actions: Actions,
    private usersService: UsersService,
  ) {}
}
