/**
 * Type alias for Lucide icon data.
 * Matches the internal LucideIconData type from lucide-angular.
 */
export type LucideIconData = readonly (readonly [string, Record<string, string | number>])[];

export interface NavItem {
  label: string;
  route: string;
  icon: LucideIconData;
  roles?: string[];
}

export interface FormStep {
  label: string;
  icon: LucideIconData;
  description: string;
}

import { SensorParameterKey } from './sensor-reading.model';

export interface ParameterConfig {
  key: SensorParameterKey;
  label: string;
  unit: string;
  icon: LucideIconData;
  color: string;
  decimals: number;
}

export interface AlertThreshold {
  key: string;
  label: string;
  unit: string;
  enabled: boolean;
  min: number;
  max: number;
  warningMin: number;
  warningMax: number;
}
