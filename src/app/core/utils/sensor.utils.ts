import { SensorReading, SensorParameterKey } from '../models/sensor-reading.model';

/**
 * Safely access numeric sensor reading values without using 'any' casts.
 * Handles the fact that sensor readings have optional numeric properties.
 *
 * @param reading The sensor reading object
 * @param key The specific sensor parameter key (e.g., 'ph', 'temperature')
 * @returns The numeric value if present and of type number, otherwise null
 */
export function getSensorValue(reading: SensorReading, key: SensorParameterKey): number | null {
  const value = reading[key];
  return typeof value === 'number' ? value : null;
}
