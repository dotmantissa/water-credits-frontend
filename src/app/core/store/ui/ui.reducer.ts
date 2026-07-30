import { createReducer, on } from '@ngrx/store';
import * as UIActions from './ui.actions';

export interface Notification {
  id: string;
  notificationType: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface UIState {
  sidebarOpen: boolean;
  isDarkMode: boolean;
  isLoading: boolean;
  notifications: Notification[];
  unreadNotificationCount: number;
}

export const initialState: UIState = {
  sidebarOpen: true,
  isDarkMode: true,
  isLoading: false,
  notifications: [],
  unreadNotificationCount: 0,
};

const MAX_NOTIFICATIONS = 50;

export const uiReducer = createReducer(
  initialState,
  on(UIActions.toggleSidebar, (state) => ({ ...state, sidebarOpen: !state.sidebarOpen })),
  on(UIActions.setDarkMode, (state, { isDark }) => ({ ...state, isDarkMode: isDark })),
  on(UIActions.setLoading, (state, { isLoading }) => ({ ...state, isLoading })),
  on(UIActions.addNotification, (state, { id, notificationType, title, message }) => {
    const notification: Notification = {
      id,
      notificationType,
      title,
      message,
      timestamp: Date.now(),
      read: false,
    };
    const notifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
    return { ...state, notifications, unreadNotificationCount: state.unreadNotificationCount + 1 };
  }),
  on(UIActions.removeNotification, (state, { id }) => ({
    ...state,
    notifications: state.notifications.filter((n) => n.id !== id),
  })),
  on(UIActions.markNotificationsRead, (state) => ({
    ...state,
    unreadNotificationCount: 0,
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
  })),
);
