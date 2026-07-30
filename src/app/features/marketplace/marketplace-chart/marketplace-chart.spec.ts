import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChanges, SimpleChange } from '@angular/core';
import { Candle, CandlestickSeries } from '../../../core/models/candle.model';
import { MarketplaceChartComponent, type ChangeDir } from './marketplace-chart';

function mkCandle(
  timestamp: number,
  open: number,
  high: number,
  low: number,
  close: number,
): Candle {
  return { timestamp, open, high, low, close };
}

function mkSeries(candles: Candle[]): CandlestickSeries {
  return {
    projectId: 'p1',
    projectName: 'Test Project',
    window: {
      start: candles[0]?.timestamp ?? 0,
      end: candles[candles.length - 1]?.timestamp ?? 0,
    },
    candles,
    priceUnit: 'XLM',
  };
}

/**
 * Drives the component's `ngOnChanges` lifecycle with a synthetic `SimpleChanges` literal.
 * Also assigns the input binding, since `ngOnChanges` reads from `this.series`.
 */
function triggerSeries(
  component: MarketplaceChartComponent,
  series: CandlestickSeries | null,
  isFirstChange = true,
): void {
  component.series = series;
  const change: SimpleChange = {
    previousValue: null,
    currentValue: series,
    firstChange: isFirstChange,
    isFirstChange: () => isFirstChange,
  };
  const changes: SimpleChanges = { series: change };
  component.ngOnChanges(changes);
}

/**
 * Test-only typed view of the component internals.
 *
 * The fields are deliberately `private`/`protected` on the component — public
 * accessors would inflate the public surface area. Tests need to verify
 * reconciliation behaviour, so we cast through a narrow structural type.
 */
interface ComponentInternals {
  periodHigh: number;
  periodLow: number;
  rangeLabel: string;
  priceUnitLabel: string;
  isBullish: boolean;
  latest: Candle | null;
  first: Candle | null;
  lastCandle: Candle | null;
  changeDisplay: { dir: ChangeDir; label: string; icon: unknown };
}
function internals(c: MarketplaceChartComponent): ComponentInternals {
  return c as unknown as ComponentInternals;
}

describe('MarketplaceChartComponent', () => {
  let fixture: ComponentFixture<MarketplaceChartComponent>;
  let component: MarketplaceChartComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplaceChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketplaceChartComponent);
    component = fixture.componentInstance;
  });

  it('should create with no data and not throw under strict null checks', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(internals(component).latest).toBeNull();
    expect(internals(component).first).toBeNull();
  });

  describe('recomputeStats + safe-pattern API', () => {
    it('updates latest, first, isBullish, periodHigh and periodLow', () => {
      const candles = [
        mkCandle(1, 10, 12, 9, 11),
        mkCandle(2, 11, 14, 10, 14),
        mkCandle(3, 14, 15, 7, 8),
      ];
      triggerSeries(component, mkSeries(candles));
      expect(internals(component).first?.timestamp).toBe(1);
      expect(internals(component).latest?.timestamp).toBe(3);
      expect(internals(component).isBullish).toBe(false);
      expect(internals(component).periodHigh).toBe(15);
      expect(internals(component).periodLow).toBe(7);
      expect(internals(component).changeDisplay.dir).toBe('down');
    });

    it('resets to a clean null state when the series is emptied', () => {
      triggerSeries(component, mkSeries([mkCandle(1, 10, 12, 9, 11), mkCandle(2, 11, 14, 10, 14)]));
      expect(internals(component).latest).not.toBeNull();

      triggerSeries(component, mkSeries([]), false);
      expect(internals(component).lastCandle).toBeNull();
      expect(internals(component).first).toBeNull();
      expect(internals(component).latest).toBeNull();
      expect(component.computePriceChange(mkCandle(1, 10, 12, 9, 11))).toBeNull();
    });
  });

  describe('computePriceChange (Pattern 1: explicit guard)', () => {
    it('returns null when there is no lastCandle (no series yet)', () => {
      const first = mkCandle(1, 10, 12, 9, 11);
      expect(component.computePriceChange(first)).toBeNull();
    });

    it('returns the close-minus-open difference when data is present', () => {
      const candles = [mkCandle(1, 10, 12, 9, 11), mkCandle(2, 11, 14, 10, 14)];
      triggerSeries(component, mkSeries(candles));
      expect(component.computePriceChange(candles[0])).toBe(4);
    });

    it('returns the net difference when net change is flat (lastCandle.close === firstCandle.open ± 1)', () => {
      const candles = [mkCandle(1, 12, 14, 11, 13), mkCandle(2, 13, 13, 13, 13)];
      triggerSeries(component, mkSeries(candles));
      expect(component.computePriceChange(candles[0])).toBe(1);
    });
  });

  describe('computePriceChangeDefault (Pattern 2: ?? fallback)', () => {
    it('returns -first.open when lastCandle is null (treated as zero baseline)', () => {
      const first = mkCandle(1, 10, 12, 9, 11);
      expect(component.computePriceChangeDefault(first)).toBe(-10);
    });

    it('returns the close-minus-open difference when data is present', () => {
      const candles = [mkCandle(1, 10, 12, 9, 11), mkCandle(2, 11, 14, 10, 14)];
      triggerSeries(component, mkSeries(candles));
      expect(component.computePriceChangeDefault(candles[0])).toBe(4);
    });
  });

  describe('computePriceChangeAsserted (Pattern 3: non-null assertion)', () => {
    it('returns the correct value AFTER an invariant has been populated', () => {
      const candles = [mkCandle(1, 10, 12, 9, 11), mkCandle(2, 11, 14, 10, 14)];
      triggerSeries(component, mkSeries(candles));
      expect(component.hasLastCandle()).toBe(true);
      expect(component.computePriceChangeAsserted(candles[0])).toBe(4);
    });

    it('throws when the invariant is violated (lastCandle null) — documented behaviour', () => {
      const first = mkCandle(1, 10, 12, 9, 11);
      expect(() => component.computePriceChangeAsserted(first)).toThrow();
    });
  });
});
