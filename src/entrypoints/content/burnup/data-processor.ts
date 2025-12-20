// GitHub Burnup Predictor - Data Processor Module
// Responsibility: Retrieve and process data points

import type { DataPoint, CompletedDataPoints } from './types';

/**
 * Get the value from Open data at the end date
 */
export function getOpenValueAtEndDate(openData: DataPoint[], endDate: Date): number | null {
  if (!openData || openData.length === 0) {
    return null;
  }

  const sortedData = openData
    .map(p => ({
      date: p.date instanceof Date ? p.date : new Date(p.date),
      value: p.value,
    }))
    .filter(p => !isNaN(p.date.getTime()) && !isNaN(p.value))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sortedData.length === 0) {
    return null;
  }

  // Get the last value before or at the end date
  const endTime = endDate.getTime();
  let lastValue = sortedData[sortedData.length - 1].value;
  
  for (const point of sortedData) {
    if (point.date.getTime() <= endTime) {
      lastValue = point.value;
    } else {
      break;
    }
  }

  return lastValue;
}

/**
 * Get the first point and today's point from Completed data
 */
export function getCompletedDataPoints(completedData: DataPoint[]): CompletedDataPoints {
  if (!completedData || completedData.length === 0) {
    return { first: null, today: null };
  }

  const sortedData = completedData
    .map(p => ({
      date: p.date instanceof Date ? p.date : new Date(p.date),
      value: p.value,
    }))
    .filter(p => !isNaN(p.date.getTime()) && !isNaN(p.value))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sortedData.length === 0) {
    return { first: null, today: null };
  }

  const first = sortedData[0];
  
  // Today's date (including time until end of day)
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  // Get the latest point before or on today
  let todayPoint: typeof sortedData[0] | null = null;
  for (const point of sortedData) {
    if (point.date.getTime() <= todayEnd.getTime()) {
      todayPoint = point;
    } else {
      break;
    }
  }

  // Use the first point if today's point is not found
  if (!todayPoint) {
    todayPoint = first;
  }

  return {
    first,
    today: todayPoint,
  };
}
