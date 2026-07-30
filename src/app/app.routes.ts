import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { PendingChangesGuard } from './core/guards/pending-changes.guard';
import { UserRole } from './core/models/user.model';
import { DefaultLayoutComponent } from './shared/layouts/default-layout/default-layout';
import { AuthLayoutComponent } from './shared/layouts/auth-layout/auth-layout';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register').then((m) => m.RegisterComponent),
      },
    ],
  },
  {
    path: 'explore',
    loadComponent: () =>
      import('./features/explore/explore/explore').then((m) => m.ExploreComponent),
  },
  {
    path: '',
    component: DefaultLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'projects',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/projects/projects-list/projects-list').then(
                (m) => m.ProjectsListComponent,
              ),
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./features/projects/project-form/project-form').then(
                (m) => m.ProjectFormComponent,
              ),
            canDeactivate: [PendingChangesGuard],
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/projects/project-detail/project-detail').then(
                (m) => m.ProjectDetailComponent,
              ),
          },
          {
            path: ':id/edit',
            loadComponent: () =>
              import('./features/projects/project-form/project-form').then(
                (m) => m.ProjectFormComponent,
              ),
            canDeactivate: [PendingChangesGuard],
          },
        ],
      },
      {
        path: 'sensors',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/sensors/sensors-dashboard/sensors-dashboard').then(
                (m) => m.SensorsDashboardComponent,
              ),
          },
          {
            path: 'config',
            loadComponent: () =>
              import('./features/sensors/sensor-config/sensor-config').then(
                (m) => m.SensorConfigComponent,
              ),
          },
          {
            path: ':projectId',
            loadComponent: () =>
              import('./features/sensors/sensors-dashboard/sensors-dashboard').then(
                (m) => m.SensorsDashboardComponent,
              ),
          },
        ],
      },
      {
        path: 'credits',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/credits/credits-portfolio/credits-portfolio').then(
                (m) => m.CreditsPortfolioComponent,
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/credits/credit-detail/credit-detail').then(
                (m) => m.CreditDetailComponent,
              ),
          },
        ],
      },
      {
        path: 'marketplace',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/marketplace/marketplace-listings/marketplace-listings').then(
                (m) => m.MarketplaceListingsComponent,
              ),
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./features/marketplace/marketplace-create-listing/marketplace-create-listing').then(
                (m) => m.MarketplaceCreateListingComponent,
              ),
          },
          {
            path: 'orderbook/:projectId',
            loadComponent: () =>
              import('./features/marketplace/marketplace-order-book/marketplace-order-book').then(
                (m) => m.MarketplaceOrderBookComponent,
              ),
          },
          {
            path: 'chart',
            loadComponent: () =>
              import('./features/marketplace/marketplace-chart/marketplace-chart').then(
                (m) => m.MarketplaceChartComponent,
              ),
          },
          {
            path: ':id/buy',
            loadComponent: () =>
              import('./features/marketplace/marketplace-buy/marketplace-buy').then(
                (m) => m.MarketplaceBuyComponent,
              ),
          },
        ],
      },
      {
        path: 'retirement',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/retirement/retirement-history/retirement-history').then(
                (m) => m.RetirementHistoryComponent,
              ),
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./features/retirement/retirement-form/retirement-form').then(
                (m) => m.RetirementFormComponent,
              ),
          },
          {
            path: ':id/certificate',
            loadComponent: () =>
              import('./features/retirement/retirement-certificate/retirement-certificate').then(
                (m) => m.RetirementCertificateComponent,
              ),
          },
        ],
      },
      {
        path: 'farmers',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.FARMER] },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/farmers/farmer-dashboard/farmer-dashboard').then(
                (m) => m.FarmerDashboardComponent,
              ),
          },
          {
            path: 'parcels',
            loadComponent: () =>
              import('./features/farmers/farmer-parcels/farmer-parcels').then(
                (m) => m.FarmerParcelsComponent,
              ),
          },
          {
            path: 'practices',
            loadComponent: () =>
              import('./features/farmers/farmer-practices/farmer-practices').then(
                (m) => m.FarmerPracticesComponent,
              ),
          },
          {
            path: 'earnings',
            loadComponent: () =>
              import('./features/farmers/farmer-earnings/farmer-earnings').then(
                (m) => m.FarmerEarningsComponent,
              ),
          },
        ],
      },
      {
        path: 'governance',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/governance/governance-dashboard/governance-dashboard').then(
                (m) => m.GovernanceDashboardComponent,
              ),
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./features/governance/proposal-form/proposal-form').then(
                (m) => m.ProposalFormComponent,
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/governance/proposal-detail/proposal-detail').then(
                (m) => m.ProposalDetailComponent,
              ),
          },
        ],
      },
      {
        path: 'admin',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/admin/admin-dashboard/admin-dashboard').then(
                (m) => m.AdminDashboardComponent,
              ),
          },
          {
            path: 'oracles',
            loadComponent: () =>
              import('./features/admin/admin-oracles/admin-oracles').then(
                (m) => m.AdminOraclesComponent,
              ),
          },
          {
            path: 'fees',
            loadComponent: () =>
              import('./features/admin/admin-fees/admin-fees').then((m) => m.AdminFeesComponent),
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./features/admin/admin-users/admin-users').then((m) => m.AdminUsersComponent),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
