import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { NgIf, NgFor, NgClass, DecimalPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { ApiService } from '../../../core/services/api.service';
import { ProjectsService } from '../../../core/services/projects.service';
import { MapViewComponent, MapLocation } from '../../../shared/components/map-view/map-view';
import { PendingChanges } from '../../../core/guards/pending-changes.guard';
import * as ProjectsActions from '../../../core/store/projects/projects.actions';
import {
  LucideAngularModule,
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  FileText,
  ClipboardList,
  Settings,
  Upload,
  X,
  AlertCircle,
} from 'lucide-angular';

export interface UploadedDoc {
  fileId: string;
  filename: string;
  size: number;
  uploading: boolean;
  error?: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;
const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    NgIf,
    NgFor,
    NgClass,
    DecimalPipe,
    LucideAngularModule,
    MapViewComponent,
  ],
  template: `
    <div class="max-w-3xl mx-auto">
      <a
        routerLink="/projects"
        class="inline-flex items-center gap-1 text-sm text-stellar-blue hover:text-stellar-blue-light mb-6"
      >
        <lucide-angular [img]="ChevronLeft" class="w-4 h-4"></lucide-angular>
        Back to Projects
      </a>
      <div class="card p-6">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-1">New Project</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Register a new water credit project.
        </p>
        <!-- Stepper -->
        <div class="flex items-center mb-8 overflow-x-auto pb-1">
          <ng-container *ngFor="let label of stepLabels; let i = index">
            <button
              type="button"
              (click)="goToStep(i)"
              [disabled]="i > maxVisitedStep"
              class="flex flex-col items-center gap-1 min-w-[56px] focus:outline-none"
            >
              <div
                [ngClass]="{
                  'bg-stellar-blue text-white': i === currentStep,
                  'bg-environmental-green text-white': i < currentStep,
                  'bg-slate-200 dark:bg-slate-700 text-slate-400': i > currentStep,
                }"
                class="w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0"
              >
                <lucide-angular
                  *ngIf="i < currentStep"
                  [img]="CheckIcon"
                  class="w-4 h-4"
                ></lucide-angular>
                <lucide-angular
                  *ngIf="i >= currentStep"
                  [img]="stepIcons[i]"
                  class="w-4 h-4"
                ></lucide-angular>
              </div>
              <span class="text-[10px] text-slate-500 hidden sm:block">{{ label }}</span>
            </button>
            <div
              *ngIf="i < stepLabels.length - 1"
              [ngClass]="
                i < currentStep ? 'bg-environmental-green' : 'bg-slate-200 dark:bg-slate-700'
              "
              class="h-0.5 flex-1 mx-1 transition-colors min-w-[12px]"
            ></div>
          </ng-container>
        </div>
        <div class="mb-5">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
            {{ stepLabels[currentStep] }}
          </h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            {{ stepDescriptions[currentStep] }}
          </p>
        </div>
        <div
          *ngIf="storeError"
          class="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm"
        >
          <lucide-angular [img]="AlertCircleIcon" class="w-4 h-4 shrink-0"></lucide-angular>
          {{ storeError }}
        </div>
        <!-- Step 0: Basic Info -->
        <ng-container *ngIf="currentStep === 0">
          <form [formGroup]="step0" class="space-y-4">
            <div>
              <label class="label">Project Name <span class="text-red-400">*</span></label>
              <input
                formControlName="name"
                type="text"
                class="input"
                placeholder="e.g., Clear Water Valley Restoration"
                maxlength="120"
              />
              <p
                *ngIf="f0['name'].touched && f0['name'].errors?.['required']"
                class="mt-1 text-xs text-red-500"
              >
                Name is required.
              </p>
              <p
                *ngIf="f0['name'].touched && f0['name'].errors?.['maxlength']"
                class="mt-1 text-xs text-red-500"
              >
                Max 120 characters.
              </p>
              <p class="mt-1 text-xs text-slate-400">{{ f0['name'].value?.length || 0 }}/120</p>
            </div>
            <div>
              <label class="label">Description <span class="text-red-400">*</span></label>
              <textarea
                formControlName="description"
                class="input min-h-[100px]"
                placeholder="Describe the project location, methods, and expected impact..."
                maxlength="1000"
              ></textarea>
              <p
                *ngIf="f0['description'].touched && f0['description'].errors?.['required']"
                class="mt-1 text-xs text-red-500"
              >
                Description is required.
              </p>
              <p class="mt-1 text-xs text-slate-400">
                {{ f0['description'].value?.length || 0 }}/1000
              </p>
            </div>
            <div>
              <label class="label">Methodology <span class="text-red-400">*</span></label>
              <select formControlName="methodology" class="input">
                <option value="">Select methodology...</option>
                <option *ngFor="let m of methodologies" [value]="m.value">{{ m.label }}</option>
              </select>
              <p
                *ngIf="f0['methodology'].touched && f0['methodology'].errors?.['required']"
                class="mt-1 text-xs text-red-500"
              >
                Methodology is required.
              </p>
            </div>
          </form>
        </ng-container>

        <!-- Step 1: Location -->
        <ng-container *ngIf="currentStep === 1">
          <div class="space-y-4">
            <app-map-view
              drawMode="pin+polygon"
              [height]="380"
              [centerLat]="20"
              [centerLng]="0"
              [zoom]="2"
              (locationPicked)="onLocationPicked($event)"
            />
            <div *ngIf="step1.get('latitude')?.value" class="grid grid-cols-2 gap-3 text-sm">
              <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-3">
                <p class="text-xs text-slate-400 mb-0.5">Latitude</p>
                <p class="font-medium">{{ step1.get('latitude')?.value | number: '1.5-5' }}</p>
              </div>
              <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-3">
                <p class="text-xs text-slate-400 mb-0.5">Longitude</p>
                <p class="font-medium">{{ step1.get('longitude')?.value | number: '1.5-5' }}</p>
              </div>
            </div>
            <p *ngIf="!locationComplete" class="text-xs text-amber-500">
              Both a pin and a polygon boundary are required to proceed.
            </p>
          </div>
        </ng-container>

        <!-- Step 2: Details -->
        <ng-container *ngIf="currentStep === 2">
          <form [formGroup]="step2" class="space-y-4">
            <div>
              <label class="label">Area (hectares) <span class="text-red-400">*</span></label>
              <input
                formControlName="areaHectares"
                type="number"
                class="input"
                placeholder="e.g., 100"
                min="0.01"
                step="0.01"
              />
              <p class="mt-1 text-xs text-slate-400">
                Auto-calculated from polygon boundary, editable.
              </p>
              <p
                *ngIf="f2['areaHectares'].touched && f2['areaHectares'].errors?.['required']"
                class="mt-1 text-xs text-red-500"
              >
                Area is required.
              </p>
              <p
                *ngIf="f2['areaHectares'].touched && f2['areaHectares'].errors?.['min']"
                class="mt-1 text-xs text-red-500"
              >
                Must be greater than 0.
              </p>
            </div>
            <div>
              <label class="label"
                >Expected Annual Credits <span class="text-red-400">*</span></label
              >
              <input
                formControlName="expectedAnnualCredits"
                type="number"
                class="input"
                placeholder="e.g., 500"
                min="1"
                step="1"
              />
              <p
                *ngIf="
                  f2['expectedAnnualCredits'].touched &&
                  f2['expectedAnnualCredits'].errors?.['required']
                "
                class="mt-1 text-xs text-red-500"
              >
                Expected credits is required.
              </p>
            </div>
            <div>
              <label class="label">Verifier Organisation</label>
              <input
                formControlName="verifierOrg"
                type="text"
                class="input"
                placeholder="e.g., Verra, Gold Standard"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label">Baseline Start <span class="text-red-400">*</span></label>
                <input formControlName="baselineStart" type="date" class="input" />
                <p
                  *ngIf="f2['baselineStart'].touched && f2['baselineStart'].errors?.['required']"
                  class="mt-1 text-xs text-red-500"
                >
                  Start date is required.
                </p>
              </div>
              <div>
                <label class="label">Project Start Date <span class="text-red-400">*</span></label>
                <input formControlName="projectStartDate" type="date" class="input" />
                <p
                  *ngIf="
                    f2['projectStartDate'].touched && f2['projectStartDate'].errors?.['required']
                  "
                  class="mt-1 text-xs text-red-500"
                >
                  Start date is required.
                </p>
              </div>
            </div>
            <p *ngIf="step2.errors?.['dateOrder']" class="text-xs text-red-500">
              Baseline start must be before project start date.
            </p>
          </form>
        </ng-container>

        <!-- Step 3: Documents -->
        <ng-container *ngIf="currentStep === 3">
          <div class="space-y-4">
            <div
              class="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center transition-colors"
              [ngClass]="{ 'border-stellar-blue bg-stellar-blue/5': dragOver }"
              (dragover)="onDragOver($event)"
              (dragleave)="dragOver = false"
              (drop)="onDrop($event)"
            >
              <lucide-angular
                [img]="UploadIcon"
                class="w-10 h-10 mx-auto mb-3 text-slate-400"
              ></lucide-angular>
              <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Drag &amp; drop files here, or
                <label class="text-stellar-blue cursor-pointer hover:underline">
                  browse
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx"
                    class="sr-only"
                    (change)="onFileInput($event)"
                  />
                </label>
              </p>
              <p class="text-xs text-slate-400">
                PDF or DOCX · max {{ maxFileSizeMb }} MB each · up to {{ maxFiles }} files
              </p>
            </div>

            <div *ngIf="docs.length > 0" class="space-y-2">
              <div
                *ngFor="let doc of docs; let i = index"
                class="flex items-center justify-between p-3 bg-slate-50 dark:bg-dark-bg rounded-lg text-sm"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <lucide-angular
                    [img]="FileTextIcon"
                    class="w-4 h-4 text-stellar-blue shrink-0"
                  ></lucide-angular>
                  <span class="truncate text-slate-700 dark:text-slate-300">{{
                    doc.filename
                  }}</span>
                  <span class="text-xs text-slate-400 shrink-0"
                    >{{ (doc.size / 1024 / 1024).toFixed(1) }} MB</span
                  >
                </div>
                <div class="flex items-center gap-2 shrink-0 ml-2">
                  <span *ngIf="doc.uploading" class="text-xs text-stellar-blue animate-pulse"
                    >Uploading...</span
                  >
                  <span
                    *ngIf="!doc.uploading && !doc.error"
                    class="text-xs text-environmental-green"
                    >✓ Uploaded</span
                  >
                  <span *ngIf="doc.error" class="text-xs text-red-500">{{ doc.error }}</span>
                  <button
                    type="button"
                    (click)="removeDoc(i)"
                    class="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <lucide-angular [img]="XIcon" class="w-4 h-4"></lucide-angular>
                  </button>
                </div>
              </div>
            </div>
            <p class="text-xs text-slate-400">
              Documents are optional but recommended for verification.
            </p>
          </div>
        </ng-container>

        <!-- Step 4: Review -->
        <ng-container *ngIf="currentStep === 4">
          <div class="space-y-4">
            <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-4 space-y-3">
              <h3
                class="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wider"
              >
                Basic Info
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span class="text-slate-400">Name: </span
                  ><span class="font-medium">{{ step0.get('name')?.value }}</span>
                </div>
                <div>
                  <span class="text-slate-400">Methodology: </span
                  ><span class="font-medium">{{ step0.get('methodology')?.value }}</span>
                </div>
                <div class="col-span-2">
                  <span class="text-slate-400">Description: </span
                  ><span>{{ step0.get('description')?.value }}</span>
                </div>
              </div>
            </div>
            <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-4 space-y-3">
              <h3
                class="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wider"
              >
                Location
              </h3>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span class="text-slate-400">Lat: </span
                  ><span class="font-medium">{{
                    step1.get('latitude')?.value | number: '1.5-5'
                  }}</span>
                </div>
                <div>
                  <span class="text-slate-400">Lng: </span
                  ><span class="font-medium">{{
                    step1.get('longitude')?.value | number: '1.5-5'
                  }}</span>
                </div>
                <div>
                  <span class="text-slate-400">Boundary: </span
                  ><span class="font-medium">{{ boundaryVertices }} vertices</span>
                </div>
              </div>
            </div>
            <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-4 space-y-3">
              <h3
                class="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wider"
              >
                Details
              </h3>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span class="text-slate-400">Area: </span
                  ><span class="font-medium">{{ step2.get('areaHectares')?.value }} ha</span>
                </div>
                <div>
                  <span class="text-slate-400">Annual Credits: </span
                  ><span class="font-medium">{{ step2.get('expectedAnnualCredits')?.value }}</span>
                </div>
                <div>
                  <span class="text-slate-400">Verifier: </span
                  ><span class="font-medium">{{ step2.get('verifierOrg')?.value || '—' }}</span>
                </div>
                <div>
                  <span class="text-slate-400">Baseline Start: </span
                  ><span class="font-medium">{{ step2.get('baselineStart')?.value }}</span>
                </div>
                <div>
                  <span class="text-slate-400">Project Start: </span
                  ><span class="font-medium">{{ step2.get('projectStartDate')?.value }}</span>
                </div>
              </div>
            </div>
            <div class="bg-slate-50 dark:bg-dark-bg rounded-lg p-4 space-y-2">
              <h3
                class="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wider"
              >
                Documents
              </h3>
              <p *ngIf="docs.length === 0" class="text-sm text-slate-400">No documents attached.</p>
              <div *ngFor="let doc of docs" class="flex items-center gap-2 text-sm">
                <lucide-angular
                  [img]="FileTextIcon"
                  class="w-4 h-4 text-stellar-blue"
                ></lucide-angular>
                <span class="truncate">{{ doc.filename }}</span>
                <span *ngIf="doc.error" class="text-xs text-red-500">(upload failed)</span>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- Navigation buttons -->
        <div class="flex justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button
            *ngIf="currentStep > 0"
            type="button"
            (click)="prevStep()"
            class="btn btn-outline"
          >
            <lucide-angular [img]="ChevronLeft" class="w-4 h-4 mr-1"></lucide-angular> Previous
          </button>
          <button
            *ngIf="currentStep === 0"
            type="button"
            (click)="cancel()"
            class="btn btn-outline"
          >
            Cancel
          </button>

          <div class="flex gap-3 ml-auto">
            <button
              *ngIf="currentStep < 4"
              type="button"
              (click)="nextStep()"
              [disabled]="!canProceed"
              class="btn btn-primary flex items-center gap-1"
            >
              Next <lucide-angular [img]="ChevronRight" class="w-4 h-4"></lucide-angular>
            </button>
            <button
              *ngIf="currentStep === 4"
              type="button"
              (click)="submit()"
              [disabled]="saving || hasFailedUploads"
              class="btn btn-primary flex items-center gap-2"
            >
              <svg
                *ngIf="saving"
                class="animate-spin w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
              {{ saving ? 'Submitting...' : 'Submit for Approval' }}
            </button>
          </div>
        </div>
      </div>
      <!-- /card -->
    </div>
    <!-- /max-w -->
  `,
})
export class ProjectFormComponent implements OnInit, OnDestroy, PendingChanges {
  protected currentStep = 0;
  protected maxVisitedStep = 0;
  protected saving = false;
  protected submitted = false;
  protected storeError: string | null = null;
  protected dragOver = false;
  protected docs: UploadedDoc[] = [];
  protected locationComplete = false;
  protected boundaryVertices = 0;
  private drawnBoundary: GeoJSON.Polygon | null = null;

  readonly stepLabels = ['Basic Info', 'Location', 'Details', 'Documents', 'Review'];
  readonly stepDescriptions = [
    'Name, description and methodology.',
    'Drop a pin and draw the project boundary on the map.',
    'Area, expected annual credits and timeline.',
    'Upload methodology docs and permits (optional).',
    'Review all details before submitting.',
  ];
  readonly stepIcons = [ClipboardList, MapPin, Settings, Upload, Check];
  readonly maxFileSizeMb = 10;
  readonly maxFiles = MAX_FILES;
  readonly methodologies = [
    { value: 'water-quality-credits-v1', label: 'Water Quality Credits v1' },
    { value: 'nutrient-reduction-v1', label: 'Nutrient Reduction v1' },
    { value: 'sediment-reduction-v1', label: 'Sediment Reduction v1' },
  ];

  // ── icon refs ───────────────────────────────────────────────────────────
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly CheckIcon = Check;
  readonly FileTextIcon = FileText;
  readonly UploadIcon = Upload;
  readonly XIcon = X;
  readonly AlertCircleIcon = AlertCircle;

  // ── reactive forms ──────────────────────────────────────────────────────
  step0!: FormGroup;
  step1!: FormGroup;
  step2!: FormGroup;

  readonly dateOrderValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    const baselineStart = control.get('baselineStart')?.value as string | null | undefined;
    const projectStartDate = control.get('projectStartDate')?.value as string | null | undefined;
    if (
      baselineStart &&
      projectStartDate &&
      new Date(baselineStart) >= new Date(projectStartDate)
    ) {
      return { dateOrder: true };
    }
    return null;
  };

  get f0() {
    return this.step0.controls;
  }
  get f2() {
    return this.step2.controls;
  }

  get hasFailedUploads(): boolean {
    return this.docs.some((d) => !!d.error);
  }

  // ── lifecycle ───────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private actions$: Actions,
    private apiService: ApiService,
    private projectsService: ProjectsService,
    private notificationService: NotificationService,
  ) {
    this.step0 = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
      description: ['', [Validators.required, Validators.maxLength(1000)]],
      methodology: ['', Validators.required],
    });
    this.step1 = this.fb.group({
      latitude: [null as number | null, Validators.required],
      longitude: [null as number | null, Validators.required],
    });
    this.step2 = this.fb.group(
      {
        areaHectares: [null as number | null, [Validators.required, Validators.min(0.001)]],
        expectedAnnualCredits: [null as number | null, [Validators.required, Validators.min(1)]],
        verifierOrg: [''],
        baselineStart: ['', Validators.required],
        projectStartDate: ['', Validators.required],
      },
      { validators: this.dateOrderValidator },
    );
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      try {
        const project = await this.projectsService.getProject(id);
        this.step0.patchValue({
          name: project.name,
          description: project.description,
          methodology: project.methodology,
        });
        this.step1.patchValue({ latitude: project.latitude, longitude: project.longitude });
        this.step2.patchValue({
          areaHectares: project.areaHectares,
          baselineStart: project.baselineStart?.split('T')[0] ?? '',
          projectStartDate: project.baselineEnd?.split('T')[0] ?? '',
        });
        this.locationComplete = true;
      } catch {
        this.notificationService.error('Error', 'Failed to load project for editing');
        this.router.navigate(['/projects']);
      }
    }

    // Navigate to the new project page after a successful create dispatched via the store.
    this.actions$
      .pipe(ofType(ProjectsActions.createProjectSuccess), takeUntil(this.destroy$))
      .subscribe(({ project }) => {
        this.notificationService.success(
          'Project created',
          `${project.name} has been registered successfully`,
        );
        this.saving = false;
        this.router.navigate(['/projects', project.id]);
      });

    // Surface field-level API errors back to the form.
    this.actions$
      .pipe(ofType(ProjectsActions.createProjectFailure), takeUntil(this.destroy$))
      .subscribe(({ error }) => {
        this.notificationService.error('Failed to create project', error);
        this.saving = false;
        this.submitted = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── PendingChanges interface ────────────────────────────────────────────
  canDeactivate(): boolean | Promise<boolean> {
    if (this.submitted) return true;
    const dirty = this.step0.dirty || this.step1.dirty || this.step2.dirty || this.docs.length > 0;
    if (!dirty) return true;
    return window.confirm('You have unsaved changes. Leave this page and discard them?');
  }

  // ── step navigation ─────────────────────────────────────────────────────
  get canProceed(): boolean {
    switch (this.currentStep) {
      case 0:
        return this.step0.valid;
      case 1:
        return this.locationComplete;
      case 2:
        return this.step2.valid;
      case 3:
        return true; // documents are optional
      default:
        return true;
    }
  }

  nextStep(): void {
    if (!this.canProceed) {
      // Touch all controls on current step so errors show
      if (this.currentStep === 0) this.step0.markAllAsTouched();
      if (this.currentStep === 2) this.step2.markAllAsTouched();
      return;
    }
    this.currentStep++;
    if (this.currentStep > this.maxVisitedStep) {
      this.maxVisitedStep = this.currentStep;
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) this.currentStep--;
  }

  goToStep(i: number): void {
    if (i <= this.maxVisitedStep) this.currentStep = i;
  }

  cancel(): void {
    this.router.navigate(['/projects']);
  }

  submit(): void {
    if (this.saving) return;
    this.saving = true;
    this.submitted = true;
    // Dispatch through the store; success/failure are handled via Actions stream above.
    this.store.dispatch(
      ProjectsActions.createProject({
        data: {
          name: this.step0.get('name')!.value as string,
          description: this.step0.get('description')!.value as string,
          methodology: this.step0.get('methodology')!.value as string,
          latitude: this.step1.get('latitude')!.value as number,
          longitude: this.step1.get('longitude')!.value as number,
          areaHectares: this.step2.get('areaHectares')!.value as number,
          baselineStart: this.step2.get('baselineStart')!.value as string,
          baselineEnd: this.step2.get('projectStartDate')!.value as string,
        },
      }),
    );
  }

  // ── map location handler ─────────────────────────────────────────────────
  onLocationPicked(loc: MapLocation): void {
    this.step1.patchValue({ latitude: loc.center.lat, longitude: loc.center.lng });
    this.step1.markAllAsTouched();
    this.drawnBoundary = loc.boundary;
    if (loc.boundary) {
      this.boundaryVertices = loc.boundary.coordinates[0].length;
    }
    this.locationComplete = true;
  }

  // ── drag/drop file upload ────────────────────────────────────────────────
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) {
      await this.handleFiles(files);
    }
  }

  async onFileInput(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const files = Array.from(input.files);
    input.value = ''; // allow re-uploading the same file
    await this.handleFiles(files);
  }

  private async handleFiles(files: File[]): Promise<void> {
    for (const file of files) {
      if (this.docs.length >= this.maxFiles) {
        this.notificationService.error(
          'Upload limit reached',
          `Maximum ${this.maxFiles} files allowed.`,
        );
        break;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        this.notificationService.error(
          'File too large',
          `${file.name} exceeds ${this.maxFileSizeMb} MB limit.`,
        );
        continue;
      }
      if (!ALLOWED_MIME.includes(file.type)) {
        this.notificationService.error(
          'Unsupported file type',
          `${file.name} must be a PDF or DOCX.`,
        );
        continue;
      }

      const doc: UploadedDoc = {
        fileId: '',
        filename: file.name,
        size: file.size,
        uploading: true,
      };
      this.docs.push(doc);
      try {
        const res = await this.apiService.uploadFile(file);
        doc.fileId = res.fileId;
        doc.uploading = false;
      } catch (err) {
        doc.uploading = false;
        doc.error = (err as { message?: string })?.message ?? 'Upload failed';
      }
    }
  }

  removeDoc(index: number): void {
    this.docs.splice(index, 1);
  }
}
