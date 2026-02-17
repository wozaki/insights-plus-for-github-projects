// GitHub Burnup Predictor - Chart Configuration Validator Module
// Responsibility: Validate that the chart configuration is suitable for the burnup predictor

export const CONFIG_ERROR_TYPE_XAXIS = 'xaxis' as const;
export const CONFIG_ERROR_TYPE_PERIOD = 'period' as const;

export type ConfigErrorType = typeof CONFIG_ERROR_TYPE_XAXIS | typeof CONFIG_ERROR_TYPE_PERIOD;

export interface ConfigError {
  type: ConfigErrorType;
  message: string;
}

/**
 * Validate that X-axis is set to "Time".
 * 
 * When X-axis is "Time", the DatePickerContainer element exists in the DOM
 * (containing period navigation: "2 weeks", "1 month", "3 months", "Max", "Custom range").
 * When X-axis is something else (e.g., "Iteration"), this element is absent.
 * 
 * @returns ConfigError if X-axis is not "Time", null if valid
 */
export function validateXAxis(): ConfigError | null {
  const datePickerContainer = document.querySelector('[class*="DatePickerContainer"]');
  if (!datePickerContainer) {
    return {
      type: CONFIG_ERROR_TYPE_XAXIS,
      message: 'X-axis must be set to "Time".',
    };
  }
  return null;
}

/**
 * Validate that the period is "Custom range" by checking whether the chart extends beyond today.
 * 
 * - Preset periods (2 weeks, 1 month, 3 months, Max) end at today.
 * - Custom range can extend into the future (the user sets an end date beyond today).
 * 
 * @param xMax The chart's maximum X-axis value (timestamp in milliseconds)
 * @returns ConfigError if period is not "Custom range", null if valid
 */
export function validatePeriod(xMax: number): ConfigError | null {
  const chartEndDate = new Date(xMax);
  const today = new Date();

  // Compare at the date level (ignore time)
  const chartEndDay = new Date(chartEndDate.getFullYear(), chartEndDate.getMonth(), chartEndDate.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (chartEndDay.getTime() <= todayDay.getTime()) {
    return {
      type: CONFIG_ERROR_TYPE_PERIOD,
      message: 'Period must be set to "Custom range" with an end date beyond today.',
    };
  }

  return null;
}
