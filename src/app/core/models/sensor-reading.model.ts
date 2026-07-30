export interface SensorDevice {
  id: string;
  projectId: string;
  deviceId: string;
  manufacturer: string;
  model: string;
  parameters: string[];
  publicKey: string;
  lastReadingAt?: string;
  isActive: boolean;
  createdAt: string;
}

export type SensorParameterKey =
  'ph' | 'turbidity' | 'dissolvedOxygen' | 'flowRate' | 'nitrogen' | 'phosphorus' | 'temperature';

export interface SensorReading {
  id: string;
  deviceId: string;
  projectId: string;
  timestamp: string;
  ph?: number;
  turbidity?: number;
  dissolvedOxygen?: number;
  flowRate?: number;
  nitrogen?: number;
  phosphorus?: number;
  temperature?: number;
  signature: string;
  isVerified: boolean;
  batchId?: string;
}

export interface ReadingBatch {
  id: string;
  projectId: string;
  status: string;
  readingCount: number;
  creditsGenerated?: number;
  submittedAt?: string;
  confirmedAt?: string;
}

export interface ReadingSummary {
  totalReadings: number;
  verifiedCount: number;
  pendingCount: number;
  latestReading?: SensorReading;
  averageValues: {
    ph?: number;
    turbidity?: number;
    dissolvedOxygen?: number;
    flowRate?: number;
    nitrogen?: number;
    phosphorus?: number;
    temperature?: number;
  };
}

export interface SensorReadingSubmission {
  deviceId: string;
  projectId: string;
  ph?: number;
  turbidity?: number;
  dissolvedOxygen?: number;
  flowRate?: number;
  nitrogen?: number;
  phosphorus?: number;
  temperature?: number;
  signature: string;
}

export interface SensorAlert {
  id: string;
  projectId: string;
  deviceId: string;
  parameter: string;
  value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}
