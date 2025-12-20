// GitHub Burnup Predictor - Velocity Calculator Module
// Responsibility: Calculate velocity

import type { DataPoint, VelocityResult } from './types';

/**
 * Calculate velocity (points per day)
 * @param completedData Array of completed data points
 * @param startDate Start date of the project
 * @param startValue Starting value at startDate
 * @param lookbackDays Number of days to look back for velocity calculation (default: 21)
 */
export function calculateVelocity(
  completedData: DataPoint[], 
  startDate: Date, 
  startValue: number,
  lookbackDays: number = 21
): VelocityResult {
  if (!completedData || completedData.length === 0) {
    return { 
      current: null,
      periodStartDate: null,
      periodEndDate: null,
      periodStartValue: null,
      periodEndValue: null,
    };
  }

  // Today's date (including time until end of day)
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const sortedData = completedData
    .map(p => ({
      date: p.date instanceof Date ? p.date : new Date(p.date),
      value: p.value,
    }))
    .filter(p => !isNaN(p.date.getTime()) && !isNaN(p.value))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sortedData.length === 0) {
    return { 
      current: null,
      periodStartDate: null,
      periodEndDate: null,
      periodStartValue: null,
      periodEndValue: null,
    };
  }

  // Get the latest point before or on today (same logic as rendering)
  let latestPoint: typeof sortedData[0] | null = null;
  for (const point of sortedData) {
    if (point.date.getTime() <= todayEnd.getTime()) {
      latestPoint = point;
    } else {
      break;
    }
  }

  // Use the first point if no point before today is found
  if (!latestPoint) {
    latestPoint = sortedData[0];
  }

  // Calculate lookback date (n days ago)
  const lookbackDate = new Date(todayEnd);
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  // Filter data points within the lookback period
  const recentPoints = sortedData.filter(p => p.date.getTime() >= lookbackDate.getTime() && p.date.getTime() <= todayEnd.getTime());

  // If we have less than 2 points in the lookback period, fall back to all-time average
  if (recentPoints.length < 2) {
    const totalDays = (latestPoint.date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (totalDays <= 0) {
      return { 
        current: null,
        periodStartDate: null,
        periodEndDate: null,
        periodStartValue: null,
        periodEndValue: null,
      };
    }

    const totalProgress = latestPoint.value - startValue;
    // Velocity per day
    const velocity = totalDays > 0 ? totalProgress / totalDays : null;

    return {
      current: velocity !== null && velocity > 0 ? velocity : null,
      periodStartDate: startDate,
      periodEndDate: latestPoint.date,
      periodStartValue: startValue,
      periodEndValue: latestPoint.value,
    };
  }

  // Calculate velocity using the first and last points in the lookback period
  const firstRecentPoint = recentPoints[0];
  const lastRecentPoint = recentPoints[recentPoints.length - 1];

  // Determine the start value for the period
  // If the lookback period starts before the project start, use the project start
  const periodStartDate = firstRecentPoint.date.getTime() < startDate.getTime() ? startDate : firstRecentPoint.date;
  
  // If period starts before project start, interpolate the start value
  let periodStartValue: number;
  if (firstRecentPoint.date.getTime() < startDate.getTime()) {
    periodStartValue = startValue;
  } else {
    // Find the value at the start of the period
    // Look for a point just before the period start, or use the first point's value
    const pointBeforePeriod = sortedData.find(p => p.date.getTime() < periodStartDate.getTime());
    if (pointBeforePeriod) {
      periodStartValue = pointBeforePeriod.value;
    } else {
      periodStartValue = firstRecentPoint.value;
    }
  }

  const daysDiff = (lastRecentPoint.date.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff <= 0) {
    return { 
      current: null,
      periodStartDate: null,
      periodEndDate: null,
      periodStartValue: null,
      periodEndValue: null,
    };
  }

  const progress = lastRecentPoint.value - periodStartValue;
  // Velocity per day
  const velocity = daysDiff > 0 ? progress / daysDiff : null;

  return {
    current: velocity !== null && velocity > 0 ? velocity : null,
    periodStartDate: periodStartDate,
    periodEndDate: lastRecentPoint.date,
    periodStartValue: periodStartValue,
    periodEndValue: lastRecentPoint.value,
  };
}
