import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  SimpleChanges,
} from '@angular/core';
import { NgIf } from '@angular/common';
import { Chart, registerables, type ChartConfiguration, type ChartDataset } from 'chart.js';
import { LucideAngularModule, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-angular';
import { Candle, CandlestickSeries } from '../../../core/models/candle.model';
import { NumberAbbreviatePipe } from '../../../shared/pipes/number-abbreviate.pipe';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';

Chart.register(...registerables);

/** Synthetic alias for any Lucide icon's structural type. */
type LucideIconData = typeof TrendingUp;

/** Per-point payload stored on Chart.js raw data — used by scriptable colors and tooltips. */
interface CandlePoint {
  x: number;
  /** Floating-bar range (wick: [low, high], body: [min(open,close), max(open,close)]). */
  y: [number, number];
  _o: number;
  _c: number;
  _isUp: boolean;
}

/** Direction of period change for the summary card. */
export type ChangeDir = 'up' | 'down' | 'flat';

@Component({
  selector: 'app-marketplace-chart',
  standalone: true,
  imports: [
    NgIf,
    LucideAngularModule,
    NumberAbbreviatePipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div
        *ngIf="series && series.candles.length > 0"
        class="flex items-baseline justify-between flex-wrap gap-2"
      >
        <div>
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
            {{ series.projectName }}
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ rangeLabel }}</p>
        </div>
        <span class="text-xs text-slate-500 dark:text-slate-400">{{ priceUnitLabel }}</span>
      </div>

      <div *ngIf="latest && first" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="card p-3">
          <p class="text-xs text-slate-500 dark:text-slate-400">Latest</p>
          <p
            class="text-base font-mono font-semibold"
            [class.text-emerald-600]="isBullish"
            [class.text-red-600]="!isBullish"
            [class.dark:text-emerald-400]="isBullish"
            [class.dark:text-red-400]="!isBullish"
          >
            {{ latest.close | numberAbbreviate }}
            <span class="text-xs text-slate-400 font-normal">XLM</span>
          </p>
        </div>
        <div class="card p-3">
          <p class="text-xs text-slate-500 dark:text-slate-400">Change</p>
          <p
            class="text-base font-mono font-semibold flex items-center gap-1"
            [class.text-emerald-600]="changeDisplay.dir === 'up'"
            [class.text-red-600]="changeDisplay.dir === 'down'"
            [class.text-slate-500]="changeDisplay.dir === 'flat'"
            [class.dark:text-emerald-400]="changeDisplay.dir === 'up'"
            [class.dark:text-red-400]="changeDisplay.dir === 'down'"
          >
            <lucide-angular [img]="changeDisplay.icon" class="w-4 h-4"></lucide-angular>
            {{ changeDisplay.label }}
          </p>
        </div>
        <div class="card p-3">
          <p class="text-xs text-slate-500 dark:text-slate-400">High</p>
          <p class="text-base font-mono font-semibold text-slate-700 dark:text-slate-300">
            {{ periodHigh | numberAbbreviate }}
          </p>
        </div>
        <div class="card p-3">
          <p class="text-xs text-slate-500 dark:text-slate-400">Low</p>
          <p class="text-base font-mono font-semibold text-slate-700 dark:text-slate-300">
            {{ periodLow | numberAbbreviate }}
          </p>
        </div>
      </div>

      <app-loading-spinner
        *ngIf="loading"
        size="lg"
        label="Loading price history..."
      ></app-loading-spinner>

      <app-empty-state
        *ngIf="!loading && (!series || series.candles.length === 0)"
        title="No price history yet"
        message="Once trades settle for this project, candlesticks will appear here."
      ></app-empty-state>

      <div *ngIf="!loading && series && series.candles.length > 0" class="card p-4">
        <div class="relative" [style.height.px]="height">
          <canvas #chartCanvas></canvas>
        </div>
        <div
          class="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs"
        >
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block w-3 h-1 rounded" style="background-color: #10b981"></span>
            Bullish (close ≥ open)
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="inline-block w-3 h-1 rounded" style="background-color: #ef4444"></span>
            Bearish (close &lt; open)
          </span>
          <span class="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 ml-auto">
            <lucide-angular [img]="ActivityIcon" class="w-3.5 h-3.5"></lucide-angular>
            OHLC bars: <span class="font-mono">O · H · L · C</span>
          </span>
        </div>
      </div>
    </div>
  `,
})
export class MarketplaceChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() series?: CandlestickSeries | null;
  @Input() loading = false;
  @Input() height = 320;

  @ViewChild('chartCanvas') canvas?: ElementRef<HTMLCanvasElement>;

  protected readonly TrendingUpIcon = TrendingUp;
  protected readonly TrendingDownIcon = TrendingDown;
  protected readonly MinusIcon = Minus;
  protected readonly ActivityIcon = Activity;

  /* ─────────────────────────────────────────────────────────────────────
   * The patterns that fix the original CI build failure.
   *
   * Original (rejected by strict null checks):
   *   const change = this.lastCandle.close - first.open;
   *
   * `lastCandle` may legitimately be `null` because data has not loaded
   * yet (or the loaded series was empty). Initialise to `null` rather than
   * relying on `undefined` so the type is precise.
   * ───────────────────────────────────────────────────────────────────── */
  private lastCandle: Candle | null = null;

  protected first: Candle | null = null;
  protected latest: Candle | null = null;
  protected isBullish = true;
  protected periodHigh = 0;
  protected periodLow = 0;
  protected rangeLabel = '';
  protected priceUnitLabel = '';
  protected changeDisplay: { dir: ChangeDir; icon: LucideIconData; label: string } = {
    dir: 'flat',
    icon: this.MinusIcon,
    label: '—',
  };

  private chart: Chart<'bar'> | null = null;
  private viewInitialised = false;

  constructor(private cdr: ChangeDetectorRef) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    this.viewInitialised = true;
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('series' in changes) {
      this.recomputeStats();
    }
    if (!this.viewInitialised) return;
    if ('series' in changes || 'height' in changes) {
      this.buildChart();
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  // ── Public API: the four safe-null-check patterns ──────────────────────

  /**
   * Pattern 1 (RECOMMENDED): explicit guard with early return.
   *
   * Returns `null` when there is no `lastCandle` so the caller can render
   * an "insufficient data" state instead of a misleading zero change.
   */
  public computePriceChange(first: Candle): number | null {
    if (!this.lastCandle) return null;
    return this.lastCandle.close - first.open;
  }

  /**
   * Pattern 2: optional chaining with default.
   *
   * Treats missing data as a 0 baseline. Useful when the consumer wants a
   * numeric result at all times (e.g. for charting/aggregation).
   */
  public computePriceChangeDefault(first: Candle): number {
    return (this.lastCandle?.close ?? 0) - first.open;
  }

  /**
   * Pattern 3: non-null assertion.
   *
   * Throws at runtime if the invariant is violated: caller MUST ensure
   * `lastCandle` is non-null before calling. Prefer Pattern 1 unless the
   * assertion genuinely documents an established pre-condition.
   */
  public computePriceChangeAsserted(first: Candle): number {
    return this.lastCandle!.close - first.open;
  }

  /** Pattern 4 (PREFERRED WHERE APPLICABLE): fix the type at the source. */
  public hasLastCandle(): boolean {
    return this.lastCandle !== null;
  }

  // ── Internal: derive stats from input ──────────────────────────────────

  private recomputeStats(): void {
    const candles = this.series?.candles ?? [];

    // Guard early — same shape as Pattern 1 in the public API.
    if (candles.length === 0) {
      this.lastCandle = null;
      this.first = null;
      this.latest = null;
      this.isBullish = true;
      this.periodHigh = 0;
      this.periodLow = 0;
      this.rangeLabel = '';
      this.changeDisplay = { dir: 'flat', icon: this.MinusIcon, label: '—' };
      return;
    }

    // Capture into locals so we never need a `!` non-null assertion.
    const firstCandle = candles[0];
    const latestCandle = candles[candles.length - 1];
    this.first = firstCandle;
    this.lastCandle = latestCandle;
    this.latest = latestCandle;
    this.isBullish = latestCandle.close >= latestCandle.open;

    let high = latestCandle.high;
    let low = latestCandle.low;
    for (const c of candles) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
    }
    this.periodHigh = high;
    this.periodLow = low;

    this.priceUnitLabel = this.series?.priceUnit ?? 'XLM / credit';
    this.rangeLabel = this.formatRange(candles);

    const change = this.computePriceChange(firstCandle);
    if (change === null) {
      this.changeDisplay = { dir: 'flat', icon: this.MinusIcon, label: '—' };
    } else if (change > 0) {
      const pct = firstCandle.open > 0 ? (change / firstCandle.open) * 100 : 0;
      this.changeDisplay = {
        dir: 'up',
        icon: this.TrendingUpIcon,
        label: `+${change.toFixed(2)} (${pct.toFixed(1)}%)`,
      };
    } else if (change < 0) {
      const pct = firstCandle.open > 0 ? (change / firstCandle.open) * 100 : 0;
      this.changeDisplay = {
        dir: 'down',
        icon: this.TrendingDownIcon,
        label: `${change.toFixed(2)} (${pct.toFixed(1)}%)`,
      };
    } else {
      this.changeDisplay = {
        dir: 'flat',
        icon: this.MinusIcon,
        label: '0.00 (0.0%)',
      };
    }
  }

  private formatRange(candles: Candle[]): string {
    if (candles.length < 2) {
      return `${candles.length} candle${candles.length === 1 ? '' : 's'}`;
    }
    const a = new Date(candles[0].timestamp);
    const b = new Date(candles[candles.length - 1].timestamp);
    const fmt = (d: Date): string =>
      d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    return `${fmt(a)} → ${fmt(b)} · ${candles.length} candles`;
  }

  // ── Chart.js rendering ─────────────────────────────────────────────────

  private buildChart(): void {
    this.destroyChart();

    const ctx = this.canvas?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const candles = this.series?.candles ?? [];
    if (!candles.length) return;

    const labels = candles.map((c) => this.formatAxisLabel(new Date(c.timestamp)));

    const toPoints = (range: (c: Candle) => [number, number]): CandlePoint[] =>
      candles.map((c) => ({
        x: c.timestamp,
        y: range(c),
        _o: c.open,
        _c: c.close,
        _isUp: c.close >= c.open,
      }));

    const wickData = toPoints((c) => [c.low, c.high]);
    const bodyData = toPoints((c) => [Math.min(c.open, c.close), Math.max(c.open, c.close)]);

    const bullish = 'rgba(16, 185, 129, 0.9)';
    const bearish = 'rgba(239, 68, 68, 0.9)';
    const wickBullish = 'rgba(16, 185, 129, 0.95)';
    const wickBearish = 'rgba(239, 68, 68, 0.95)';

    // Chart.js's static dataset type expects `(number | [number, number] | null)[]`,
    // but at runtime each element still carries `_o`/`_c`/`_isUp` for the scriptable
    // colour callbacks. The cast is structural-only.
    const asBarData = (points: CandlePoint[]): ChartDataset<'bar'>['data'] =>
      points as unknown as ChartDataset<'bar'>['data'];

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'High–Low (wick)',
            data: asBarData(wickData),
            backgroundColor: (ctx) =>
              (ctx.raw as CandlePoint | undefined)?._isUp ? wickBullish : wickBearish,
            borderColor: (ctx) =>
              (ctx.raw as CandlePoint | undefined)?._isUp ? wickBullish : wickBearish,
            borderWidth: 1,
            barPercentage: 0.18,
            categoryPercentage: 0.85,
            order: 2,
          },
          {
            label: 'Open–Close (body)',
            data: asBarData(bodyData),
            backgroundColor: (ctx) =>
              (ctx.raw as CandlePoint | undefined)?._isUp ? bullish : bearish,
            borderColor: (ctx) => ((ctx.raw as CandlePoint | undefined)?._isUp ? bullish : bearish),
            borderWidth: 1,
            barPercentage: 0.6,
            categoryPercentage: 0.85,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        // 'nearest' + intersect:true means hovering a wick fires only the wick
        // tooltip, and hovering a body fires only the body tooltip — no
        // duplicate OHLC rows.
        interaction: { intersect: true, mode: 'nearest' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const first = items[0];
                const ts = (first?.raw as CandlePoint | undefined)?.x;
                return ts ? new Date(ts).toLocaleString() : '';
              },
              label: (ctx) => {
                const raw = ctx.raw as CandlePoint | undefined;
                if (!raw) return '';
                // Wick dataset's y is [low, high]; show only that range here.
                if (ctx.dataset.label?.startsWith('High')) {
                  return [` Low:  ${raw.y[0].toFixed(2)}`, ` High: ${raw.y[1].toFixed(2)}`];
                }
                // Body dataset's y is [min(o,c), max(o,c)]; pair with raw open/close.
                return [
                  ` Open:  ${raw._o.toFixed(2)}`,
                  ` Close: ${raw._c.toFixed(2)}`,
                  ` Range: ${raw.y[0].toFixed(2)} – ${raw.y[1].toFixed(2)}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            type: 'category',
            grid: { display: false },
            ticks: { color: '#94A3B8', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          },
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(148, 163, 184, 0.15)' },
            ticks: { color: '#94A3B8' },
          },
        },
      },
    };

    this.chart = new Chart<'bar'>(ctx, config);
    this.cdr.markForCheck();
  }

  private formatAxisLabel(d: Date): string {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
