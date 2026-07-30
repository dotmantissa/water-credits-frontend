import { createReducer, on } from '@ngrx/store';
import * as ProjectsActions from './projects.actions';
import * as AuthActions from '../auth/auth.actions';
import { Project } from '../../models/project.model';
import { ProjectFilters } from '../../models/project.model';

export interface ProjectsState {
  projects: Project[];
  selectedProject: Project | null;
  filters: ProjectFilters;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Timestamp (ms) of the last successful list fetch, for cache expiration checks. */
  lastFetched: number | null;
  loading: boolean;
  error: string | null;
}

export const initialState: ProjectsState = {
  projects: [],
  selectedProject: null,
  filters: {},
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
  lastFetched: null,
  loading: false,
  error: null,
};

export const projectsReducer = createReducer(
  initialState,
  on(ProjectsActions.loadProjects, (state) => ({ ...state, loading: true, error: null })),
  on(ProjectsActions.loadProjectsSuccess, (state, { response }) => ({
    ...state,
    loading: false,
    projects: response.data,
    total: response.total,
    page: response.page,
    limit: response.limit,
    totalPages: response.totalPages,
    lastFetched: Date.now(),
  })),
  on(ProjectsActions.loadProjectsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(ProjectsActions.loadProject, (state) => ({ ...state, loading: true, error: null })),
  on(ProjectsActions.loadProjectSuccess, (state, { project }) => ({
    ...state,
    loading: false,
    selectedProject: project,
  })),
  on(ProjectsActions.loadProjectFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(ProjectsActions.createProjectSuccess, (state, { project }) => ({
    ...state,
    projects: [project, ...state.projects],
    total: state.total + 1,
  })),
  on(ProjectsActions.updateProjectSuccess, (state, { project }) => ({
    ...state,
    projects: state.projects.map((p) => (p.id === project.id ? project : p)),
    selectedProject: state.selectedProject?.id === project.id ? project : state.selectedProject,
  })),
  on(ProjectsActions.setProjectFilters, (state, { filters }) => ({ ...state, filters, page: 1 })),
  on(ProjectsActions.clearProjectFilters, (state) => ({ ...state, filters: {}, page: 1 })),
  on(ProjectsActions.setProjectPage, (state, { page }) => ({ ...state, page })),
  // Full cache reset on forced logout, per the cache-invalidation strategy.
  on(AuthActions.forceLogout, () => initialState),
);
