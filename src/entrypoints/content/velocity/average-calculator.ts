// GitHub Project Insights - Velocity Average Calculator Module
// Responsibility: Calculate average velocity from selected iterations

import type { IterationData } from './types';

export interface AverageResult {
  average: number | null;
  count: number;
  total: number;
  selectedIterations: IterationData[];
}

/**
 * Calculate the average velocity from selected iterations
 * @param iterations All iteration data
 * @param selectedNames Names of iterations to include in the average
 * @returns Average calculation result
 */
export function calculateAverageVelocity(
  iterations: IterationData[],
  selectedNames: string[]
): AverageResult {
  if (!iterations || iterations.length === 0 || !selectedNames || selectedNames.length === 0) {
    return {
      average: null,
      count: 0,
      total: 0,
      selectedIterations: [],
    };
  }

  // Filter iterations by selected names
  const selectedIterations = iterations.filter(iter => 
    selectedNames.includes(iter.name)
  );

  if (selectedIterations.length === 0) {
    return {
      average: null,
      count: 0,
      total: 0,
      selectedIterations: [],
    };
  }

  // Calculate total and average
  const total = selectedIterations.reduce((sum, iter) => sum + iter.estimate, 0);
  const average = total / selectedIterations.length;

  return {
    average,
    count: selectedIterations.length,
    total,
    selectedIterations,
  };
}
