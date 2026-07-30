import { CanDeactivateFn } from '@angular/router';

/**
 * Interface that wizard components implement so the guard can ask
 * whether navigation away is safe.
 */
export interface PendingChanges {
  /** Return false (or a confirmation prompt result) to block navigation. */
  canDeactivate(): boolean | Promise<boolean>;
}

/**
 * Functional CanDeactivate guard.
 *
 * Applied to any route whose component may have unsaved form state.
 * The component must implement the {@link PendingChanges} interface.
 * If the component has no `canDeactivate` method (e.g. lazy-loaded
 * stub that hasn't been upgraded yet) the guard allows navigation.
 */
export const PendingChangesGuard: CanDeactivateFn<PendingChanges> = (
  component: PendingChanges,
): boolean | Promise<boolean> => {
  if (!component || typeof component.canDeactivate !== 'function') {
    return true;
  }
  return component.canDeactivate();
};
