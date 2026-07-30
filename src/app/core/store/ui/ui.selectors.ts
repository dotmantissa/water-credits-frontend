import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UIState } from './ui.reducer';

export const selectUIState = createFeatureSelector<UIState>('ui');

export const selectSidebarOpen = createSelector(selectUIState, (state) => state.sidebarOpen);
export const selectIsDarkMode = createSelector(selectUIState, (state) => state.isDarkMode);
export const selectIsUILoading = createSelector(selectUIState, (state) => state.isLoading);
export const selectNotifications = createSelector(selectUIState, (state) => state.notifications);
export const selectUnreadNotificationCount = createSelector(
  selectUIState,
  (state) => state.unreadNotificationCount,
);
