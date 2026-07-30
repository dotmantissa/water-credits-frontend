export type TimeRange = '24h' | '7d' | '30d' | 'custom';

export interface SensorParameter {
  /** Field key matching SensorReading property (e.g. 'ph', 'turbidity') */
  key: string;
  /** Human-readable label */
  label: string;
  /** Unit of measurement (e.g. 'NTU', 'mg/L') — empty string for dimensionless */
  unit: string;
  /** Hex colour for this parameter's dataset line */
  color: string;
  /** Decimal places for tooltip/axis formatting */
  decimals: number;
}

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7d' },
  { value: '30d', label: 'Last 30d' },
  { value: 'custom', label: 'Custom' },
];

/** Parameters whose units are considered incompatible for a single Y-axis */
export const INCOMPATIBLE_UNIT_GROUPS: string[][] = [
  ['ph'],
  ['turbidity'],
  ['dissolvedOxygen', 'nitrogen', 'phosphorus'],
  ['flowRate'],
  ['temperature'],
];

/**
 * Returns true when the selected parameters span more than one
 * incompatible-unit group, requiring a secondary Y-axis.
 */
export function needsDualAxis(paramKeys: string[]): boolean {
  const groups = INCOMPATIBLE_UNIT_GROUPS.filter((g) => g.some((k) => paramKeys.includes(k)));
  return groups.length >= 2;
}
