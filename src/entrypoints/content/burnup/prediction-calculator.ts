// GitHub Burnup Predictor - Prediction Calculator Module
// Responsibility: Calculate predictions

import type { BurnupChartData, Prediction } from './types';

/**
 * Calculate prediction
 * @param data Chart data
 * @param currentVelocity Current velocity per day
 * @param dueDate Due date
 */
export function calculatePrediction(
  data: BurnupChartData, 
  currentVelocity: number | null, 
  dueDate: Date | null
): Prediction {
  const remaining = Math.max(0, data.total - data.completed);
  const today = new Date();

  if (remaining === 0) {
    return {
      completionDate: today,
      dueDate,
      idealVelocity: 0,
      isOnTrack: true,
      daysAhead: dueDate ? Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null,
    };
  }

  let completionDate: Date | null = null;
  if (currentVelocity && currentVelocity > 0) {
    // Velocity is per day, so calculate days needed directly
    const daysToComplete = remaining / currentVelocity;
    completionDate = new Date(today.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
  }

  let idealVelocity: number | null = null;
  let isOnTrack: boolean | null = null;
  let daysAhead: number | null = null;

  if (dueDate) {
    const daysUntilDue = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilDue > 0) {
      // Calculate ideal velocity per day
      idealVelocity = remaining / daysUntilDue;
    }

    if (completionDate) {
      daysAhead = Math.round((dueDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
      isOnTrack = daysAhead >= 0;
    }
  }

  return {
    completionDate,
    dueDate,
    idealVelocity,
    isOnTrack,
    daysAhead,
  };
}
