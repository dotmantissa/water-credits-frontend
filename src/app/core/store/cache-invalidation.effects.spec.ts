import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { firstValueFrom, Observable, of } from 'rxjs';
import { toArray } from 'rxjs/operators';

import { CacheInvalidationEffects } from './cache-invalidation.effects';
import { CacheInvalidationService } from './cache-invalidation.service';
import * as ProjectsActions from './projects/projects.actions';
import * as FarmersActions from './farmers/farmers.actions';
import * as RetirementActions from './retirement/retirement.actions';

describe('CacheInvalidationEffects', () => {
  let actions$: Observable<any>;
  let effects: CacheInvalidationEffects;

  function setup(source$: Observable<any>) {
    actions$ = source$;
    TestBed.configureTestingModule({
      providers: [
        CacheInvalidationEffects,
        CacheInvalidationService,
        provideMockActions(() => actions$),
      ],
    });
    effects = TestBed.inject(CacheInvalidationEffects);
  }

  it('dispatches a load action for a single-slice trigger', async () => {
    setup(of(FarmersActions.registerParcelSuccess({ parcel: {} as any })));

    const actions = await firstValueFrom(effects.invalidateDependentSlices$.pipe(toArray()));
    // registerParcelSuccess -> farmers, analytics
    expect(actions.length).toBe(2);
  });

  it('dispatches load actions for every dependent slice on retirementConfirmed (fan-out)', async () => {
    setup(of(RetirementActions.retirementConfirmed({ retirement: {} as any })));

    const actions = await firstValueFrom(effects.invalidateDependentSlices$.pipe(toArray()));
    // retirementConfirmed -> credits, analytics, retirement
    expect(actions.length).toBe(3);
  });

  it('emits nothing for an action with no registered mapping', async () => {
    setup(of(ProjectsActions.loadProjectsFailure({ error: 'boom' })));

    const actions = await firstValueFrom(effects.invalidateDependentSlices$.pipe(toArray()));
    expect(actions.length).toBe(0);
  });

  it('handles concurrent triggers without dropping either (mergeMap, not switchMap)', async () => {
    // Two independent trigger actions arriving back-to-back must both fan out
    // fully — this is the behavior mergeMap guarantees and switchMap would break.
    setup(
      of(
        FarmersActions.registerParcelSuccess({ parcel: {} as any }),
        ProjectsActions.createProjectSuccess({ project: {} as any }),
      ),
    );

    const actions = await firstValueFrom(effects.invalidateDependentSlices$.pipe(toArray()));
    // farmers+analytics (2) + analytics+projects (2) = 4 total, none dropped
    expect(actions.length).toBe(4);
  });
});
