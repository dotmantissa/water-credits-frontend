import { inject, isDevMode } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { selectCurrentUserRole } from '../store/auth/auth.selectors';
import { UserRole } from '../models/user.model';
import { AppState } from '../store/app.state';

/**
 * Functional role guard for role-based access control.
 *
 * Usage in routes:
 *   canActivate: [AuthGuard, RoleGuard]
 *   data: { roles: ['admin'] }          // or ['farmer'], etc.
 *
 * Must be used after AuthGuard so that auth.user is guaranteed to be present
 * when RoleGuard runs.  If the user's role is not in data.roles, they are
 * redirected to /dashboard.
 * Missing or empty role configuration is treated as a route misconfiguration:
 * the guard warns in development and blocks access.
 *
 * The guard reads auth.user.role from the NgRx store — the single source of
 * truth for session state.
 */
export const RoleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
): Observable<boolean | UrlTree> => {
  const store = inject(Store<AppState>);
  const router = inject(Router);

  const allowedRoles: UserRole[] = route.data?.['roles'] ?? [];

  if (isDevMode() && allowedRoles.length === 0) {
    console.warn('[RoleGuard] Route has no allowed roles configured. All users will be blocked.');
  }

  return store.select(selectCurrentUserRole).pipe(
    take(1),
    map((role): boolean | UrlTree => {
      if (role && allowedRoles.includes(role)) {
        return true;
      }
      // Redirect to dashboard rather than login — the user is authenticated
      // but lacks the required role.
      return router.parseUrl('/dashboard');
    }),
  );
};
