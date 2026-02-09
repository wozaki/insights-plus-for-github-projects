// GitHub Burnup Predictor - Stats Panel Module
// Responsibility: Create and update statistics panel

import type { BurnupChartData, VelocityInfo, Prediction } from './types';
import { 
  getLookbackDays, 
  setLookbackDays, 
  getDefaultLookbackDays,
  getTargetDate,
  setTargetDate,
  clearTargetDate
} from './settings';

/**
 * Create statistics panel
 */
export function createStatsPanel(data: BurnupChartData): HTMLElement {
  const existing = document.querySelector('.burnup-predictor-stats');
  if (existing) {
    existing.remove();
  }

  const panel = document.createElement('div');
  panel.className = 'burnup-predictor-stats';

  const completedPercent = data.total > 0 
    ? Math.min(100, Math.max(0, Math.round((data.completed / data.total) * 100)))
    : 0;
  const remaining = Math.max(0, data.total - data.completed);

  panel.innerHTML = `
    <div class="burnup-predictor-stats-header">
      <span class="burnup-predictor-stats-title">Burnup Predictor</span>
      <div class="burnup-predictor-legend">
        <div class="burnup-predictor-legend-item">
          <div class="burnup-predictor-legend-line current-dashed"></div>
          <span>Current velocity</span>
        </div>
        <div class="burnup-predictor-legend-item">
          <div class="burnup-predictor-legend-line ideal"></div>
          <span>Ideal velocity</span>
        </div>
        <div class="burnup-predictor-legend-item">
          <div class="burnup-predictor-legend-line scope-target"></div>
          <span>Scope target</span>
        </div>
      </div>
      <div class="burnup-predictor-legend-hint">
        Scope target = Total excluding closed issues such as Duplicate and Not planned
      </div>
    </div>
    <div class="burnup-predictor-stats-grid">
      <div class="burnup-predictor-stat-item">
        <div class="burnup-predictor-stat-value green">${data.completed}</div>
        <div class="burnup-predictor-stat-label">Completed</div>
      </div>
      <div class="burnup-predictor-stat-item">
        <div class="burnup-predictor-stat-value">${remaining}</div>
        <div class="burnup-predictor-stat-label">Remaining</div>
      </div>
      <div class="burnup-predictor-stat-item">
        <div class="burnup-predictor-stat-value blue">${data.total}</div>
        <div class="burnup-predictor-stat-label">Total</div>
      </div>
      <div class="burnup-predictor-stat-item">
        <div class="burnup-predictor-stat-value orange">${completedPercent}%</div>
        <div class="burnup-predictor-stat-label">Progress</div>
      </div>
    </div>
    <div class="burnup-predictor-progress">
      <div class="burnup-predictor-progress-bar">
        <div class="burnup-predictor-progress-fill" style="width: ${completedPercent}%"></div>
      </div>
      <div class="burnup-predictor-progress-text">
        <span>${data.completed} / ${data.total} points</span>
        <span>${completedPercent}% completed</span>
      </div>
    </div>
    <div class="burnup-predictor-prediction" id="burnup-prediction">
      <div class="burnup-predictor-loading">Analyzing data...</div>
    </div>
    <div class="burnup-predictor-settings" id="burnup-predictor-settings">
    </div>
  `;

  const chartContainer = document.querySelector('.highcharts-container');
  if (chartContainer) {
    const parent = chartContainer.closest('[class*="insights"]') || chartContainer.parentElement;
    if (parent) {
      parent.appendChild(panel);
    }
  } else {
    const main = document.querySelector('main') || document.body;
    main.appendChild(panel);
  }

  // Initialize settings UI
  initializeSettings();

  return panel;
}

/**
 * Update prediction information
 */
export async function updatePrediction(velocity: VelocityInfo, prediction: Prediction): Promise<void> {
  const container = document.getElementById('burnup-prediction');
  if (!container) return;

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Cannot calculate';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatVelocity = (v: number | null | undefined): string => {
    if (v === null || v === undefined || isNaN(v)) return '-';
    return v.toFixed(2) + ' / Day';
  };

  let predictionClass = '';
  if (prediction.isOnTrack === true) {
    predictionClass = 'success';
  } else if (prediction.isOnTrack === false) {
    predictionClass = 'danger';
  } else {
    predictionClass = 'warning';
  }

  // Get lookback days for display
  const lookbackDays = await getLookbackDays();

  container.innerHTML = `
    <div class="burnup-predictor-prediction-group">
      <div class="burnup-predictor-prediction-item">
        <span class="burnup-predictor-prediction-label">Average Velocity (${lookbackDays} Days)</span>
        <span class="burnup-predictor-prediction-value">${formatVelocity(velocity.current)}</span>
      </div>
      <div class="burnup-predictor-prediction-item">
        <span class="burnup-predictor-prediction-label">Ideal Velocity</span>
        <span class="burnup-predictor-prediction-value">${formatVelocity(velocity.ideal)}</span>
      </div>
    </div>
    <div class="burnup-predictor-prediction-group">
      <div class="burnup-predictor-prediction-item">
        <span class="burnup-predictor-prediction-label">Predicted end date</span>
        <span class="burnup-predictor-prediction-value ${predictionClass}">${formatDate(prediction.completionDate)}</span>
      </div>
      <div class="burnup-predictor-prediction-item">
        <span class="burnup-predictor-prediction-label">Due Date</span>
        <span class="burnup-predictor-prediction-value ${!prediction.dueDate ? 'empty' : ''}">${prediction.dueDate ? formatDate(prediction.dueDate) : '-'}</span>
      </div>
      <div class="burnup-predictor-prediction-item">
        <span class="burnup-predictor-prediction-label">Days Difference</span>
        <span class="burnup-predictor-prediction-value ${prediction.daysAhead !== undefined && prediction.daysAhead !== null ? predictionClass : 'empty'}">
          ${prediction.daysAhead !== undefined && prediction.daysAhead !== null 
            ? (prediction.daysAhead > 0 ? `${prediction.daysAhead} days ahead` : prediction.daysAhead === 0 ? 'On time' : `${Math.abs(prediction.daysAhead)} days behind`)
            : '-'}
        </span>
      </div>
    </div>
  `;
}

/**
 * Format date to YYYY-MM-DD string for input[type="date"]
 */
function formatDateForInput(date: Date | null): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Initialize settings UI
 */
async function initializeSettings(): Promise<void> {
  const container = document.getElementById('burnup-predictor-settings');
  if (!container) return;

  const currentLookbackDays = await getLookbackDays();
  const currentTargetDate = await getTargetDate();

  container.innerHTML = `
    <div class="burnup-predictor-settings-row">
      <label class="burnup-predictor-settings-label" for="burnup-target-date">
        Target Date
      </label>
      <div class="burnup-predictor-settings-input-group">
        <input 
          type="date" 
          id="burnup-target-date" 
          class="burnup-predictor-settings-input burnup-predictor-settings-input-date" 
          value="${formatDateForInput(currentTargetDate)}"
        />
        <button 
          id="burnup-save-target-date" 
          class="burnup-predictor-settings-button"
        >
          Save
        </button>
        <button 
          id="burnup-clear-target-date" 
          class="burnup-predictor-settings-button burnup-predictor-settings-button-secondary"
        >
          Clear
        </button>
      </div>
      <div class="burnup-predictor-settings-hint">
        Set a target date for ideal velocity calculation. If not set, uses the chart's right edge.
      </div>
    </div>
    <div class="burnup-predictor-settings-row">
      <label class="burnup-predictor-settings-label" for="burnup-lookback-days">
        Velocity calculation period (Days)
      </label>
      <div class="burnup-predictor-settings-input-group">
        <input 
          type="number" 
          id="burnup-lookback-days" 
          class="burnup-predictor-settings-input" 
          min="1" 
          max="365" 
          value="${currentLookbackDays}"
        />
        <button 
          id="burnup-save-lookback-days" 
          class="burnup-predictor-settings-button"
        >
          Save
        </button>
      </div>
      <div class="burnup-predictor-settings-hint">
        Number of days to look back for velocity calculation (default: ${getDefaultLookbackDays()})
      </div>
    </div>
  `;

  // Target date elements
  const targetDateInput = document.getElementById('burnup-target-date') as HTMLInputElement;
  const targetDateSaveButton = document.getElementById('burnup-save-target-date') as HTMLButtonElement;
  const targetDateClearButton = document.getElementById('burnup-clear-target-date') as HTMLButtonElement;

  // Lookback days elements
  const lookbackDaysInput = document.getElementById('burnup-lookback-days') as HTMLInputElement;
  const lookbackDaysSaveButton = document.getElementById('burnup-save-lookback-days') as HTMLButtonElement;

  if (!lookbackDaysInput || !lookbackDaysSaveButton) return;

  // Target date save handler
  if (targetDateInput && targetDateSaveButton) {
    targetDateSaveButton.addEventListener('click', async () => {
      const dateValue = targetDateInput.value;
      
      if (!dateValue) {
        targetDateInput.classList.add('burnup-predictor-settings-input-error');
        setTimeout(() => {
          targetDateInput.classList.remove('burnup-predictor-settings-input-error');
        }, 2000);
        return;
      }

      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        targetDateInput.classList.add('burnup-predictor-settings-input-error');
        setTimeout(() => {
          targetDateInput.classList.remove('burnup-predictor-settings-input-error');
        }, 2000);
        return;
      }

      try {
        await setTargetDate(date);
        targetDateSaveButton.textContent = 'Saved!';
        targetDateSaveButton.classList.add('burnup-predictor-settings-button-success');
        setTimeout(() => {
          targetDateSaveButton.textContent = 'Save';
          targetDateSaveButton.classList.remove('burnup-predictor-settings-button-success');
        }, 2000);
      } catch (error) {
        console.error('Failed to save target date setting:', error);
        targetDateSaveButton.textContent = 'Error';
        targetDateSaveButton.classList.add('burnup-predictor-settings-button-error');
        setTimeout(() => {
          targetDateSaveButton.textContent = 'Save';
          targetDateSaveButton.classList.remove('burnup-predictor-settings-button-error');
        }, 2000);
      }
    });

    // Save on Enter key
    targetDateInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        targetDateSaveButton.click();
      }
    });
  }

  // Target date clear handler
  if (targetDateClearButton && targetDateInput) {
    targetDateClearButton.addEventListener('click', async () => {
      try {
        await clearTargetDate();
        targetDateInput.value = '';
        targetDateClearButton.textContent = 'Cleared!';
        targetDateClearButton.classList.add('burnup-predictor-settings-button-success');
        setTimeout(() => {
          targetDateClearButton.textContent = 'Clear';
          targetDateClearButton.classList.remove('burnup-predictor-settings-button-success');
        }, 2000);
      } catch (error) {
        console.error('Failed to clear target date setting:', error);
        targetDateClearButton.textContent = 'Error';
        targetDateClearButton.classList.add('burnup-predictor-settings-button-error');
        setTimeout(() => {
          targetDateClearButton.textContent = 'Clear';
          targetDateClearButton.classList.remove('burnup-predictor-settings-button-error');
        }, 2000);
      }
    });
  }

  // Save lookback days on button click
  lookbackDaysSaveButton.addEventListener('click', async () => {
    const days = parseInt(lookbackDaysInput.value, 10);
    
    if (isNaN(days) || days < 1 || days > 365) {
      lookbackDaysInput.classList.add('burnup-predictor-settings-input-error');
      setTimeout(() => {
        lookbackDaysInput.classList.remove('burnup-predictor-settings-input-error');
      }, 2000);
      return;
    }

    try {
      await setLookbackDays(days);
      lookbackDaysSaveButton.textContent = 'Saved!';
      lookbackDaysSaveButton.classList.add('burnup-predictor-settings-button-success');
      setTimeout(() => {
        lookbackDaysSaveButton.textContent = 'Save';
        lookbackDaysSaveButton.classList.remove('burnup-predictor-settings-button-success');
      }, 2000);
    } catch (error) {
      console.error('Failed to save lookback days setting:', error);
      lookbackDaysSaveButton.textContent = 'Error';
      lookbackDaysSaveButton.classList.add('burnup-predictor-settings-button-error');
      setTimeout(() => {
        lookbackDaysSaveButton.textContent = 'Save';
        lookbackDaysSaveButton.classList.remove('burnup-predictor-settings-button-error');
      }, 2000);
    }
  });

  // Save on Enter key
  lookbackDaysInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      lookbackDaysSaveButton.click();
    }
  });
}
