import { ActionReducerMap } from '@ngrx/store';
import { authReducer, AuthState } from './auth/auth.reducer';
import { walletReducer, WalletState } from './wallet/wallet.reducer';
import { uiReducer, UIState } from './ui/ui.reducer';
import { projectsReducer, ProjectsState } from './projects/projects.reducer';
import { sensorsReducer, SensorsState } from './sensors/sensors.reducer';
import { creditsReducer, CreditsState } from './credits/credits.reducer';
import { retirementReducer, RetirementState } from './retirement/retirement.reducer';
import { governanceReducer, GovernanceState } from './governance/governance.reducer';
import { marketplaceReducer, MarketplaceState } from './marketplace/marketplace.reducer';
import { farmersReducer, FarmersState } from './farmers/farmers.reducer';
import { analyticsReducer, AnalyticsState } from './analytics/analytics.reducer';
import { adminReducer, AdminState } from './admin/admin.reducer';

export interface AppState {
  auth: AuthState;
  wallet: WalletState;
  ui: UIState;
  projects: ProjectsState;
  sensors: SensorsState;
  credits: CreditsState;
  retirement: RetirementState;
  governance: GovernanceState;
  marketplace: MarketplaceState;
  farmers: FarmersState;
  analytics: AnalyticsState;
  admin: AdminState;
}

export const reducers: ActionReducerMap<AppState> = {
  auth: authReducer,
  wallet: walletReducer,
  ui: uiReducer,
  projects: projectsReducer,
  sensors: sensorsReducer,
  credits: creditsReducer,
  retirement: retirementReducer,
  governance: governanceReducer,
  marketplace: marketplaceReducer,
  farmers: farmersReducer,
  analytics: analyticsReducer,
  admin: adminReducer,
};
