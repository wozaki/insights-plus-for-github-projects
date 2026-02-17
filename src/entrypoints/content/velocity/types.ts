// GitHub Project Insights - Velocity Specific Type Definitions

import type { ChartInfo } from '../shared/types';

export interface IterationData {
  name: string;        // "Iteration 5"
  estimate: number;    // 13.5
  groupName?: string;   // "awesome-team"
  index: number;       // Original index for ordering
}

export interface VelocityChartData {
  chartType: 'velocity';
  iterations: IterationData[];
  chartInfo?: ChartInfo;
}

export interface VelocitySettings {
  selectedIterations: string[];  // Names of selected iterations for average calculation
}

// Re-export shared types for convenience
export type { ChartInfo } from '../shared/types';
