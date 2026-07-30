import { CacheInvalidationService, CACHE_INVALIDATION_MAP } from './cache-invalidation.service';
import * as ProjectsActions from './projects/projects.actions';
import * as MarketplaceActions from './marketplace/marketplace.actions';
import * as GovernanceActions from './governance/governance.actions';
import * as FarmersActions from './farmers/farmers.actions';
import * as RetirementActions from './retirement/retirement.actions';
import * as AuthActions from './auth/auth.actions';

describe('CacheInvalidationService', () => {
  let service: CacheInvalidationService;

  beforeEach(() => {
    service = new CacheInvalidationService();
  });

  it('maps createProjectSuccess to analytics and projects', () => {
    const action = ProjectsActions.createProjectSuccess({ project: {} as any });
    expect(service.getDependentSlices(action)).toEqual(['analytics', 'projects']);
  });

  it('maps retirementConfirmed to credits, analytics, and retirement', () => {
    const action = RetirementActions.retirementConfirmed({ retirement: {} as any });
    expect(service.getDependentSlices(action)).toEqual(['credits', 'analytics', 'retirement']);
  });

  it('maps createListingSuccess to marketplace', () => {
    const action = MarketplaceActions.createListingSuccess({ listing: {} as any });
    expect(service.getDependentSlices(action)).toEqual(['marketplace']);
  });

  it('maps castVoteSuccess to governance', () => {
    const action = GovernanceActions.castVoteSuccess({
      proposalId: 'p1',
      proposal: {} as any,
      vote: 'for',
    });
    expect(service.getDependentSlices(action)).toEqual(['governance']);
  });

  it('maps registerParcelSuccess to farmers and analytics', () => {
    const action = FarmersActions.registerParcelSuccess({ parcel: {} as any });
    expect(service.getDependentSlices(action)).toEqual(['farmers', 'analytics']);
  });

  it('returns an empty array for actions with no registered mapping', () => {
    const action = AuthActions.login();
    expect(service.getDependentSlices(action)).toEqual([]);
  });

  it('every mapped slice list is non-empty (no dead entries)', () => {
    Object.values(CACHE_INVALIDATION_MAP).forEach((slices) => {
      expect(slices.length).toBeGreaterThan(0);
    });
  });
});
