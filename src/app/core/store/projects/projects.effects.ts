import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, from } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import * as ProjectsActions from './projects.actions';
import { ProjectsService } from '../../services/projects.service';

@Injectable()
export class ProjectsEffects {
  loadProjects$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectsActions.loadProjects),
      switchMap(({ filters }) =>
        from(this.projectsService.getProjects(filters)).pipe(
          map((response) => ProjectsActions.loadProjectsSuccess({ response })),
          catchError((error) =>
            of(
              ProjectsActions.loadProjectsFailure({
                error: error.message || 'Failed to load projects',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  loadProject$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectsActions.loadProject),
      switchMap(({ id }) =>
        from(this.projectsService.getProject(id)).pipe(
          map((project) => ProjectsActions.loadProjectSuccess({ project })),
          catchError((error) =>
            of(
              ProjectsActions.loadProjectFailure({
                error: error.message || 'Failed to load project',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  createProject$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectsActions.createProject),
      switchMap(({ data }) =>
        from(this.projectsService.createProject(data)).pipe(
          map((project) => ProjectsActions.createProjectSuccess({ project })),
          catchError((error) =>
            of(
              ProjectsActions.createProjectFailure({
                error: error.message || 'Failed to create project',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  /**
   * After a project is successfully created, navigate to its detail page.
   * Using a non-dispatching effect (dispatch: false) for the side-navigation.
   */
  createProjectSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ProjectsActions.createProjectSuccess),
        tap(({ project }) => {
          this.router.navigate(['/projects', project.id]);
        }),
      ),
    { dispatch: false },
  );

  updateProject$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectsActions.updateProject),
      switchMap(({ id, data }) =>
        from(this.projectsService.updateProject(id, data)).pipe(
          map((project) => ProjectsActions.updateProjectSuccess({ project })),
          catchError((error) =>
            of(
              ProjectsActions.updateProjectFailure({
                error: error.message || 'Failed to update project',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  constructor(
    private actions$: Actions,
    private projectsService: ProjectsService,
    private router: Router,
  ) {}
}
