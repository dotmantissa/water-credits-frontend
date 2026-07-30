import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Chart, ChartConfiguration, ChartDataset, ChartOptions, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { SensorReading, SensorParameterKey } from '../../../core/models/sensor-reading.model';
import { getSensorValue } from '../../../core/utils/sensor.utils';
import {
  SensorParameter,
  TimeRange,
  TIME_RANGE_OPTIONS,
  needsDualAxis,
} from './sensor-parameter.model';

// chartjs-plugin-annotation provides its own PluginOptionsByType augmentation via its
// bundled types — no additional declare-module block needed here.
Chart.register(...registerables, annotationPlugin);

/** Legacy interface kept for backward compatibility with sensors-dashboard */
export interface ChartSeries {
  label: string;
  data: { x: number; y: number }[];
  color?: string;
}

@Component({
  selector: 'app-sensor-chart',
  standalone: true,
  imports: [NgFor, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-white dark:bg-dark-bg-lighter rounded-xl border border-slate-200 dark:border-slate-700 p-4"
    >
      <!-- Header: title + time-range picker -->
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ title }}</h3>

        <div class="flex items-center gap-1">
          <!-- New TimeRange picker when using data/parameters API -->
          <ng-container *ngIf="data !== undefined">
            <button
              *ngFor="let opt of rangeOptions"
              (click)="onRangeSelect(opt.value)"
              [class.bg-stellar-blue]="timeRange === opt.value"
              [class.text-white]="timeRange === opt.value"
              [class.text-slate-500]="timeRange !== opt.value"
              [class.hover:bg-slate-100]="timeRange !== opt.value"
              class="px-2 py-1 text-xs rounded-md transition-colors dark:hover:bg-slate-700"
            >
              {{ opt.label }}
            </button>
          </ng-container>

          <!-- Legacy timeRanges string array when using series API -->
          <ng-container *ngIf="data === undefined && timeRanges?.length">
            <button
              *ngFor="let range of timeRanges"
              (click)="legacySelectRange(range)"
              [class.bg-stellar-blue]="selectedLegacyRange === range"
              [class.text-white]="selectedLegacyRange === range"
              [class.text-slate-500]="selectedLegacyRange !== range"
              [class.hover:bg-slate-100]="selectedLegacyRange !== range"
              class="px-2 py-1 text-xs rounded-md transition-colors dark:hover:bg-slate-700"
            >
              {{ range }}
            </button>
          </ng-container>
        </div>
      </div>

      <!-- Canvas -->
      <div class="relative" [style.height.px]="height">
        <canvas #chartCanvas></canvas>
      </div>

      <!-- Parameter legend (new API only) -->
      <div
        *ngIf="parameters?.length"
        class="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700"
      >
        <button
          *ngFor="let p of parameters"
          (click)="toggleParameter(p.key)"
          class="flex items-center gap-1.5 text-xs transition-opacity"
          [class.opacity-40]="hiddenParams.has(p.key)"
        >
          <span class="inline-block w-3 h-3 rounded-full" [style.background]="p.color"></span>
          {{ p.label }}
          <span *ngIf="p.unit" class="text-slate-400">({{ p.unit }})</span>
        </button>
      </div>
    </div>
  `,
})
export class SensorChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  // ── New API ──────────────────────────────────────────────────────────────
  @Input() data?: SensorReading[];
  @Input() parameters?: SensorParameter[];
  @Input() timeRange?: TimeRange = '24h';
  @Input() thresholds?: Record<string, { low?: number; high?: number }>;
  @Output() rangeChange = new EventEmitter<TimeRange>();

  // ── Shared / legacy API ──────────────────────────────────────────────────
  @Input() title = 'Sensor Readings';
  @Input() height = 300;

  /** Legacy: pass pre-computed series directly */
  @Input() series?: ChartSeries[];
  /** Legacy: arbitrary string range labels */
  @Input() timeRanges?: string[];

  @ViewChild('chartCanvas') canvas!: ElementRef<HTMLCanvasElement>;

  protected rangeOptions = TIME_RANGE_OPTIONS;
  protected selectedLegacyRange = '24H';
  protected hiddenParams = new Set<string>();

  private chart: Chart | null = null;
  private viewInitialised = false;

  constructor(private cdr: ChangeDetectorRef) {}

  // ── Lifecycle ────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    this.viewInitialised = true;
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewInitialised) return;

    const rebuildTriggers = ['data', 'parameters', 'timeRange', 'thresholds', 'series'];
    if (rebuildTriggers.some((k) => k in changes)) {
      this.buildChart();
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  // ── Public actions ───────────────────────────────────────────────────────

  onRangeSelect(range: TimeRange): void {
    this.rangeChange.emit(range);
    // Parent updates [timeRange] input; we react in ngOnChanges
  }

  legacySelectRange(range: string): void {
    this.selectedLegacyRange = range;
    this.buildChart();
  }

  toggleParameter(key: string): void {
    if (this.hiddenParams.has(key)) {
      this.hiddenParams.delete(key);
    } else {
      this.hiddenParams.add(key);
    }
    this.updateDatasetVisibility();
    this.cdr.markForCheck();
  }

  // ── Chart construction ───────────────────────────────────────────────────

  private buildChart(): void {
    this.destroyChart();

    const ctx = this.canvas?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const useNewApi = this.data !== undefined && this.parameters !== undefined;
    const config = useNewApi ? this.buildNewApiConfig(ctx) : this.buildLegacyConfig(ctx);
    if (!config) return;

    this.chart = new Chart(ctx, config);
    this.cdr.markForCheck();
  }

  // New API: SensorReading[] + SensorParameter[]
  private buildNewApiConfig(_ctx: CanvasRenderingContext2D): ChartConfiguration<'line'> | null {
    const data = this.data ?? [];
    const params = this.parameters ?? [];
    if (!params.length) return null;

    const dual = needsDualAxis(params.map((p) => p.key));

    // Build one dataset per parameter
    const datasets: ChartDataset<'line'>[] = params.map((p, i) => ({
      label: p.label + (p.unit ? ` (${p.unit})` : ''),
      data: data
        .map((r) => ({
          x: new Date(r.timestamp).getTime(),
          y: getSensorValue(r, p.key as SensorParameterKey),
        }))
        .filter((point): point is { x: number; y: number } => point.y !== null),
      borderColor: p.color,
      backgroundColor: p.color + '1A',
      fill: false,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2,
      yAxisID: dual && i > 0 ? 'y1' : 'y',
      hidden: this.hiddenParams.has(p.key),
    }));

    // Annotation lines for thresholds
    const annotationEntries: Record<string, object> = {};
    if (this.thresholds) {
      for (const [key, bounds] of Object.entries(this.thresholds)) {
        const param = params.find((p) => p.key === key);
        if (!param) continue;
        if (bounds.low != null) {
          annotationEntries[`${key}-low`] = {
            type: 'line',
            yMin: bounds.low,
            yMax: bounds.low,
            borderColor: param.color,
            borderWidth: 1,
            borderDash: [4, 4],
            label: {
              content: `${param.label} min (${bounds.low})`,
              display: true,
              position: 'start',
              backgroundColor: 'rgba(0,0,0,0.6)',
              font: { size: 10 },
            },
          };
        }
        if (bounds.high != null) {
          annotationEntries[`${key}-high`] = {
            type: 'line',
            yMin: bounds.high,
            yMax: bounds.high,
            borderColor: param.color,
            borderWidth: 1,
            borderDash: [4, 4],
            label: {
              content: `${param.label} max (${bounds.high})`,
              display: true,
              position: 'start',
              backgroundColor: 'rgba(0,0,0,0.6)',
              font: { size: 10 },
            },
          };
        }
      }
    }

    const scales: NonNullable<ChartOptions<'line'>['scales']> = {
      x: {
        type: 'time',
        time: { tooltipFormat: 'MMM d, HH:mm', displayFormats: { hour: 'HH:mm', day: 'MMM d' } },
        grid: { display: false },
        ticks: { color: '#94A3B8', maxTicksLimit: 8 },
      },
      y: {
        beginAtZero: false,
        grid: { color: '#F1F5F920' },
        ticks: { color: '#94A3B8' },
        position: 'left',
      },
    };

    if (dual) {
      scales['y1'] = {
        beginAtZero: false,
        grid: { drawOnChartArea: false },
        ticks: { color: '#94A3B8' },
        position: 'right',
      };
    }

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false }, // custom legend in template
        annotation: { annotations: annotationEntries },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const param = params[ctx.datasetIndex];
              const val = (ctx.parsed.y as number).toFixed(param?.decimals ?? 2);
              return ` ${param?.label ?? ''}: ${val}${param?.unit ? ' ' + param.unit : ''}`;
            },
          },
        },
      },
      scales,
    };

    return {
      type: 'line',
      data: { datasets },
      options,
    };
  }

  // Legacy API: ChartSeries[]
  private buildLegacyConfig(_ctx: CanvasRenderingContext2D): ChartConfiguration<'line'> | null {
    const series = this.series ?? [];

    return {
      type: 'line',
      data: {
        datasets: series.map((s) => ({
          label: s.label,
          data: s.data.map((d) => ({ x: d.x, y: d.y })),
          borderColor: s.color ?? '#7B2FBE',
          backgroundColor: (s.color ?? '#7B2FBE') + '20',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            display: series.length > 1,
            position: 'bottom',
            labels: { boxWidth: 12, padding: 16, usePointStyle: true },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94A3B8', maxTicksLimit: 10 },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#F1F5F9' },
            ticks: { color: '#94A3B8' },
          },
        },
      },
    };
  }

  private updateDatasetVisibility(): void {
    if (!this.chart || !this.parameters) return;
    this.parameters.forEach((p, i) => {
      const meta = this.chart!.getDatasetMeta(i);
      meta.hidden = this.hiddenParams.has(p.key);
    });
    this.chart.update();
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
