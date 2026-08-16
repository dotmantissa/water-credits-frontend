import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideStore, Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { Component } from '@angular/core';
import { RoleGuard } from './role.guard';
import { reducers, AppState } from '../store/app.state';
import * as AuthActions from '../store/auth/auth.actions';
import { UserRole } from '../models/user.model';

@Component({ standalone: true, template: '' })
class StubComponent {}

const buildUser = (role: UserRole) => ({
  id: 'u1',
  wallet: 'GABC123',
  role,
  isKycVerified: false,
  isActive: true,
  createdAt: '',
  updatedAt: '',
});

describe('RoleGuard', () => {
  let store: Store<AppState>;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard', component: StubComponent },
          { path: 'admin', component: StubComponent },
          { path: 'farmers', component: StubComponent },
        ]),
        provideStore(reducers),
      ],
    });

    store = TestBed.inject(Store);
  });

  function buildRoute(roles?: UserRole[]): ActivatedRouteSnapshot {
    return { data: roles ? { roles } : {} } as unknown as ActivatedRouteSnapshot;
  }

  function executeGuard(roles?: UserRole[]): Promise<boolean | UrlTree> {
    const route = buildRoute(roles);
    return TestBed.runInInjectionContext(async () => {
      const result = RoleGuard(route, {} as RouterStateSnapshot);
      return firstValueFrom(result as import('rxjs').Observable<boolean | UrlTree>);
    });
  }

  it('allows an admin user to access an admin-only route', async () => {
    store.dispatch(AuthActions.loginSuccess({ user: buildUser(UserRole.ADMIN), token: 't' }));

    const result = await executeGuard([UserRole.ADMIN]);

    expect(result).toBe(true);
  });

  it('blocks a buyer from accessing an admin-only route and redirects to /dashboard', async () => {
    store.dispatch(AuthActions.loginSuccess({ user: buildUser(UserRole.BUYER), token: 't' }));

    const result = await executeGuard([UserRole.ADMIN]);

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/dashboard');
  });

  it('allows a farmer user to access farmer-only routes', async () => {
    store.dispatch(AuthActions.loginSuccess({ user: buildUser(UserRole.FARMER), token: 't' }));

    const result = await executeGuard([UserRole.FARMER]);

    expect(result).toBe(true);
  });

  it('blocks an admin from accessing farmer-only routes', async () => {
    store.dispatch(AuthActions.loginSuccess({ user: buildUser(UserRole.ADMIN), token: 't' }));

    const result = await executeGuard([UserRole.FARMER]);

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/dashboard');
  });

  it('blocks a user with no role (null) and redirects to /dashboard', async () => {
    // Session ready but no user in store
    store.dispatch(AuthActions.sessionReady());

    const result = await executeGuard([UserRole.ADMIN]);

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/dashboard');
  });

  it('warns and blocks when the route has an empty roles array', async () => {
    store.dispatch(AuthActions.loginSuccess({ user: buildUser(UserRole.BUYER), token: 't' }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await executeGuard([]);

    // Empty roles are a route misconfiguration. The guard deliberately fails
    // closed while warning developers why every user is being blocked.
    expect(warnSpy).toHaveBeenCalledWith(
      '[RoleGuard] Route has no allowed roles configured. All users will be blocked.',
    );
    expect(result).toBeInstanceOf(UrlTree);
  });

  it('warns and blocks when the route has no roles configured', async () => {
    store.dispatch(AuthActions.loginSuccess({ user: buildUser(UserRole.ADMIN), token: 't' }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await executeGuard();

    expect(warnSpy).toHaveBeenCalledWith(
      '[RoleGuard] Route has no allowed roles configured. All users will be blocked.',
    );
    expect(result).toBeInstanceOf(UrlTree);
  });
});
