import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import {
  LucideAngularModule,
  Leaf,
  CheckCircle,
  Circle,
  Info,
  Sprout,
  Wheat,
  Trees,
  Flower2,
  Sun,
} from 'lucide-angular';

interface Bmp {
  id: string;
  name: string;
  description: string;
  category: string;
  enrolled: boolean;
  estimatedCredits: number;
  icon: any;
  requirements: string[];
}

@Component({
  selector: 'app-farmer-practices',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, LucideAngularModule],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Best Management Practices</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enroll in BMP programs to earn water quality credits
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          *ngFor="let bmp of bmps"
          class="card p-5 border"
          [ngClass]="
            bmp.enrolled
              ? 'border-environmental-green/30'
              : 'border-slate-200 dark:border-slate-700'
          "
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div
                [ngClass]="
                  bmp.enrolled ? 'bg-environmental-green/10' : 'bg-slate-100 dark:bg-dark-bg'
                "
                class="w-10 h-10 rounded-xl flex items-center justify-center"
              >
                <lucide-angular
                  [img]="bmp.icon"
                  class="w-5 h-5"
                  [ngClass]="
                    bmp.enrolled ? 'text-environmental-green' : 'text-slate-500 dark:text-slate-400'
                  "
                ></lucide-angular>
              </div>
              <div>
                <h3 class="font-semibold text-slate-900 dark:text-white">{{ bmp.name }}</h3>
                <span class="text-xs text-slate-400 capitalize">{{ bmp.category }}</span>
              </div>
            </div>
            <button
              (click)="toggleBmp(bmp)"
              class="shrink-0"
              [ngClass]="
                bmp.enrolled
                  ? 'text-environmental-green'
                  : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'
              "
            >
              <lucide-angular
                [img]="bmp.enrolled ? CheckCircle : Circle"
                class="w-6 h-6"
              ></lucide-angular>
            </button>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">{{ bmp.description }}</p>

          <div class="mb-3">
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Requirements</p>
            <ul class="space-y-1">
              <li
                *ngFor="let req of bmp.requirements"
                class="text-xs text-slate-400 flex items-start gap-1.5"
              >
                <span class="mt-0.5">-</span>
                <span>{{ req }}</span>
              </li>
            </ul>
          </div>

          <div
            class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700"
          >
            <div class="flex items-center gap-1 text-sm">
              <lucide-angular
                [img]="Leaf"
                class="w-3.5 h-3.5 text-environmental-green"
              ></lucide-angular>
              <span class="font-semibold text-environmental-green">{{ bmp.estimatedCredits }}</span>
              <span class="text-xs text-slate-400">credits/yr</span>
            </div>
            <span
              *ngIf="bmp.enrolled"
              class="text-xs bg-environmental-green/10 text-environmental-green px-2 py-0.5 rounded-full font-medium"
              >Enrolled</span
            >
          </div>
        </div>
      </div>

      <div class="card p-5 bg-stellar-blue/5 border border-stellar-blue/10">
        <div class="flex items-start gap-3">
          <lucide-angular
            [img]="Info"
            class="w-5 h-5 text-stellar-blue mt-0.5 shrink-0"
          ></lucide-angular>
          <div>
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-1">About BMPs</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Best Management Practices (BMPs) are agricultural practices that improve water quality
              and soil health. Each enrolled BMP generates verified water quality credits based on
              estimated environmental impact. Credits are issued after verification and can be sold
              on the marketplace or retired.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class FarmerPracticesComponent implements OnInit {
  protected bmps: Bmp[] = [];

  protected readonly Leaf = Leaf;
  protected readonly CheckCircle = CheckCircle;
  protected readonly Circle = Circle;
  protected readonly Info = Info;
  protected readonly Sprout = Sprout;
  protected readonly Wheat = Wheat;
  protected readonly Trees = Trees;
  protected readonly Flower2 = Flower2;
  protected readonly Sun = Sun;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.bmps = [
      {
        id: 'cover-crops',
        name: 'Cover Crops',
        category: 'soil management',
        description:
          'Plant cover crops like rye, clover, or radish during fallow periods to reduce erosion, improve soil organic matter, and capture nutrients.',
        enrolled: false,
        estimatedCredits: 120,
        icon: Sprout,
        requirements: [
          'Minimum 2 months of cover crop coverage per year',
          'At least 3 species in rotation',
          'No-till termination preferred',
        ],
      },
      {
        id: 'no-till',
        name: 'No-Till Farming',
        category: 'soil management',
        description:
          'Eliminate tillage to preserve soil structure, reduce runoff, increase water infiltration, and sequester carbon.',
        enrolled: false,
        estimatedCredits: 85,
        icon: Sun,
        requirements: [
          'Zero tillage on enrolled acres',
          'Residue cover maintained at 30%+',
          '3-year minimum commitment',
        ],
      },
      {
        id: 'buffer-strips',
        name: 'Buffer Strips',
        category: 'water management',
        description:
          'Establish vegetated buffer strips along waterways to filter sediment, nutrients, and pesticides from surface runoff.',
        enrolled: false,
        estimatedCredits: 200,
        icon: Trees,
        requirements: [
          'Minimum 30 ft width along waterways',
          'Native perennial grasses or shrubs',
          'No fertilizer or pesticide application',
        ],
      },
      {
        id: 'managed-grazing',
        name: 'Managed Grazing',
        category: 'livestock management',
        description:
          'Implement rotational grazing systems to improve pasture health, reduce erosion, and enhance nutrient cycling.',
        enrolled: false,
        estimatedCredits: 150,
        icon: Wheat,
        requirements: [
          'Rotational grazing with minimum 4 paddocks',
          'Minimum 60-day rest period per paddock',
          'Stocking rate management plan',
        ],
      },
      {
        id: 'compost',
        name: 'Compost Application',
        category: 'nutrient management',
        description:
          'Apply compost to improve soil organic matter, water holding capacity, and reduce synthetic fertilizer needs.',
        enrolled: false,
        estimatedCredits: 95,
        icon: Flower2,
        requirements: [
          'Compost from certified sources',
          'Application rate based on soil testing',
          'Incorporation within 24 hours',
        ],
      },
    ];
  }

  toggleBmp(bmp: Bmp): void {
    bmp.enrolled = !bmp.enrolled;
    if (bmp.enrolled) {
      this.notificationService.success('Enrolled', `You are now enrolled in ${bmp.name}`);
    } else {
      this.notificationService.info('Unenrolled', `You have unenrolled from ${bmp.name}`);
    }
  }
}
