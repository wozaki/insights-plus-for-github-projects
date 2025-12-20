// GitHub Project Insights - Shared Type Definitions

export type ChartType = 'burnup' | 'velocity' | 'unknown';

export interface ChartAxes {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface PlotBox {
  plotLeft: number;
  plotTop: number;
  plotWidth: number;
  plotHeight: number;
}

export interface ChartInfo {
  plotBox: PlotBox;
  axes: ChartAxes;
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface DateRange {
  start: number | string;
  end: number | string;
}

export interface DataPoint {
  date: Date | string;
  value: number;
}

// Base chart data interface
export interface BaseChartData {
  chartType: ChartType;
  chartInfo?: ChartInfo;
}
