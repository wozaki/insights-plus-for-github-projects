// GitHub Burnup Predictor - Burnup Specific Type Definitions

import type { ChartInfo, PixelPoint, DateRange, DataPoint } from '../shared/types';

export interface BurnupChartData {
  chartType: 'burnup';
  completed: number;
  total: number;
  completedData: DataPoint[];
  openData?: DataPoint[];
  chartInfo?: ChartInfo;
  dateRange?: DateRange;
  completedStartPixel?: PixelPoint;
  completedLastPixel?: PixelPoint;
}

export interface VelocityResult {
  current: number | null;
  periodStartDate?: Date | null;
  periodEndDate?: Date | null;
  periodStartValue?: number | null;
  periodEndValue?: number | null;
}

export interface Velocity extends VelocityResult {
  startDate: Date;
  startValue: number;
}

export interface Prediction {
  completionDate: Date | null;
  dueDate: Date | null;
  idealVelocity: number | null;
  isOnTrack: boolean | null;
  daysAhead: number | null;
}

export interface VelocityInfo {
  current: number | null; // Average velocity over lookback period (points/day)
  ideal?: number | null;
}

export interface CompletedDataPoints {
  first: DataPoint | null;
  today: DataPoint | null;
}

// Re-export shared types for convenience
export type { ChartInfo, PixelPoint, DateRange, DataPoint } from '../shared/types';
