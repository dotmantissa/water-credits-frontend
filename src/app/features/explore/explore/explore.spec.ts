import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ExploreComponent } from './explore';
import { ProjectsService } from '../../../core/services/projects.service';
import { Project, ProjectStatus } from '../../../core/models/project.model';
import { PaginatedResponse } from '../../../core/models/pagination.model';

const PROJECTS: Project[] = [
  {
    id: 'p1',
    ownerId: 'o1',
    name: 'Rio Verde Wetland',
    description: 'Wetland restoration project.',
    latitude: 10,
    longitude: 20,
    methodology: 'VM0033',
    status: ProjectStatus.ACTIVE,
    areaHectares: 120,
    baselineStart: '2024-01-01',
    baselineEnd: '2025-01-01',
    totalCreditsMinted: 500,
    totalCreditsRetired: 100,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'p2',
    ownerId: 'o2',
    name: 'Blue Delta',
    description: 'Delta conservation project.',
    latitude: 15,
    longitude: 25,
    methodology: 'VM0033',
    status: ProjectStatus.REGISTERED,
    areaHectares: 80,
    baselineStart: '2024-01-01',
    baselineEnd: '2025-01-01',
    totalCreditsMinted: 0,
    totalCreditsRetired: 0,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

const PAGE_RESPONSE: PaginatedResponse<Project> = {
  data: PROJECTS,
  page: 1,
  limit: 12,
  total: 2,
  totalPages: 1,
};

describe('ExploreComponent', () => {
  let fixture: ComponentFixture<ExploreComponent>;
  let component: ExploreComponent;
  let getProjectsSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getProjectsSpy = vi.fn().mockResolvedValue(PAGE_RESPONSE);

    await TestBed.configureTestingModule({
      imports: [ExploreComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectsService, useValue: { getProjects: getProjectsSpy } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load projects on init without requiring auth', () => {
    expect(getProjectsSpy).toHaveBeenCalled();
    expect((component as any).projects.length).toBe(2);
  });

  it('should render a map-view element', () => {
    const map = fixture.nativeElement.querySelector('app-map-view');
    expect(map).toBeTruthy();
  });

  it('should render the project list', () => {
    const cards = fixture.nativeElement.querySelectorAll('aside .card');
    expect(cards.length).toBe(2);
  });

  it('should re-fetch with search term when search is triggered', async () => {
    (component as any).onSearch('Rio');
    await fixture.whenStable();
    expect(getProjectsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Rio', page: 1 }),
    );
  });

  it('should re-fetch with status filter when status filter changes', async () => {
    (component as any).statusFilter = ProjectStatus.ACTIVE;
    (component as any).onFilterChange();
    await fixture.whenStable();
    expect(getProjectsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: ProjectStatus.ACTIVE, page: 1 }),
    );
  });

  it('should filter client-side by credits availability', () => {
    (component as any).creditsAvailableOnly = true;
    (component as any).onFilterChange.call(component);
    (component as any)['applyClientFilters']?.();
    const filtered = (component as any).filteredProjects as Project[];
    expect(
      filtered.every(
        (p: Project) => (p.totalCreditsMinted || 0) - (p.totalCreditsRetired || 0) > 0,
      ),
    ).toBe(true);
  });

  it('should open the detail card when a project is selected', async () => {
    const firstCard = fixture.nativeElement.querySelector('aside .card');
    firstCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect((component as any).selectedProject).toEqual(PROJECTS[0]);
    const modal = fixture.nativeElement.querySelector('.fixed.inset-0');
    expect(modal).toBeTruthy();
  });

  it('should open the detail card when a marker is clicked', () => {
    component['onMarkerClick']({ id: 'p2', latitude: 15, longitude: 25 });
    expect((component as any).selectedProject?.id).toBe('p2');
  });

  it('should close the detail card', () => {
    component['onProjectSelect'](PROJECTS[0]);
    component['closeDetail']();
    expect((component as any).selectedProject).toBeNull();
  });

  it('should compute credits available as minted minus retired', () => {
    expect(component['creditsAvailable'](PROJECTS[0])).toBe(400);
    expect(component['creditsAvailable'](PROJECTS[1])).toBe(0);
  });
});
