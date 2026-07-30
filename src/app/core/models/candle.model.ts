/** Single open-high-low-close (OHLC) price snapshot. */
export interface Candle {
  /** Unix epoch milliseconds at which this candle's window opened. */
  timestamp: number;
  /** Price at the start of the window. */
  open: number;
  /** Highest price traded during the window. */
  high: number;
  /** Lowest price traded during the window. */
  low: number;
  /** Price at the end of the window. */
  close: number;
  /** Optional units of credit traded during the window. */
  volume?: number;
}

/** Inclusive window describing the period a candlestick series covers. */
export interface CandleWindow {
  start: number;
  end: number;
}

/** Aggregated OHLC price history for a single project. */
export interface CandlestickSeries {
  projectId: string;
  projectName: string;
  window: CandleWindow;
  /** Time-ordered candles, oldest first. */
  candles: Candle[];
  /** Display unit for prices (e.g. 'XLM'). */
  priceUnit?: string;
}
