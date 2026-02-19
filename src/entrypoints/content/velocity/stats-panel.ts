// GitHub Project Insights - Velocity Stats Panel Module
// Responsibility: Create and update velocity statistics panel

import type { VelocityChartData, IterationData } from './types';
import { 
  getSelectedIterations, 
  setSelectedIterations,
  getDefaultSelectedIterations,
  getDefaultIterationCount
} from './settings';
import { calculateAverageVelocity } from './average-calculator';
import { removeLoadingPlaceholder } from '../shared/loading-placeholder';

let currentIterations: IterationData[] = [];
let currentSelectedNames: string[] = [];

/**
 * Create velocity statistics panel
 */
export async function createVelocityStatsPanel(data: VelocityChartData): Promise<HTMLElement> {
  await removeLoadingPlaceholder();

  const existing = document.querySelector('.velocity-calculator-stats');
  if (existing) {
    existing.remove();
  }

  currentIterations = data.iterations;

  // Get saved selections or use defaults
  const savedSelections = await getSelectedIterations();
  const iterationNames = data.iterations.map(iter => iter.name);
  
  if (savedSelections.length > 0 && savedSelections.some(name => iterationNames.includes(name))) {
    // Use saved selections if they match current iterations
    currentSelectedNames = savedSelections.filter(name => iterationNames.includes(name));
  } else {
    // Use default selections (last N iterations)
    currentSelectedNames = getDefaultSelectedIterations(iterationNames, getDefaultIterationCount());
  }

  const panel = document.createElement('div');
  panel.className = 'velocity-calculator-stats';

  panel.innerHTML = `
    <div class="velocity-calculator-header">
      <span class="velocity-calculator-title">Velocity Calculator</span>
      <div class="velocity-calculator-hint">
        Select iterations to include in average calculation
      </div>
    </div>
    <div class="velocity-calculator-table-container">
      <table class="velocity-calculator-table">
        <thead>
          <tr>
            <th class="velocity-calculator-th-checkbox">
              <input type="checkbox" id="velocity-select-all" class="velocity-calculator-checkbox" />
            </th>
            <th class="velocity-calculator-th-iteration">Iteration</th>
            <th class="velocity-calculator-th-estimate">Estimate</th>
            ${data.iterations.some(iter => iter.groupName) ? '<th class="velocity-calculator-th-group">Group</th>' : ''}
          </tr>
        </thead>
        <tbody id="velocity-iterations-body">
        </tbody>
      </table>
    </div>
    <div class="velocity-calculator-result" id="velocity-result">
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

  // Render iterations table
  renderIterationsTable(data.iterations);
  
  // Update average display
  updateAverageDisplay();

  // Setup select all checkbox
  setupSelectAllCheckbox();

  return panel;
}

/**
 * Render iterations table rows
 */
function renderIterationsTable(iterations: IterationData[]): void {
  const tbody = document.getElementById('velocity-iterations-body');
  if (!tbody) return;

  const hasGroupColumn = iterations.some(iter => iter.groupName);

  // Sort iterations by index (descending - newest first)
  const sortedIterations = [...iterations].sort((a, b) => b.index - a.index);

  tbody.innerHTML = sortedIterations.map(iter => `
    <tr class="velocity-calculator-row ${currentSelectedNames.includes(iter.name) ? 'selected' : ''}">
      <td class="velocity-calculator-td-checkbox">
        <input 
          type="checkbox" 
          class="velocity-calculator-checkbox velocity-iteration-checkbox" 
          data-iteration="${iter.name}"
          ${currentSelectedNames.includes(iter.name) ? 'checked' : ''}
        />
      </td>
      <td class="velocity-calculator-td-iteration">${escapeHtml(iter.name)}</td>
      <td class="velocity-calculator-td-estimate">${iter.estimate.toFixed(1)}</td>
      ${hasGroupColumn ? `<td class="velocity-calculator-td-group">${escapeHtml(iter.groupName || '-')}</td>` : ''}
    </tr>
  `).join('');

  // Add event listeners to checkboxes
  const checkboxes = tbody.querySelectorAll('.velocity-iteration-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', handleIterationCheckboxChange);
  });
}

/**
 * Handle iteration checkbox change
 */
async function handleIterationCheckboxChange(event: Event): Promise<void> {
  const checkbox = event.target as HTMLInputElement;
  const iterationName = checkbox.dataset.iteration;
  
  if (!iterationName) return;

  const row = checkbox.closest('tr');
  
  if (checkbox.checked) {
    if (!currentSelectedNames.includes(iterationName)) {
      currentSelectedNames.push(iterationName);
    }
    row?.classList.add('selected');
  } else {
    currentSelectedNames = currentSelectedNames.filter(name => name !== iterationName);
    row?.classList.remove('selected');
  }

  // Save selection
  await setSelectedIterations(currentSelectedNames);
  
  // Update displays
  updateAverageDisplay();
  updateSelectAllCheckbox();
}

/**
 * Setup select all checkbox
 */
function setupSelectAllCheckbox(): void {
  const selectAllCheckbox = document.getElementById('velocity-select-all') as HTMLInputElement;
  if (!selectAllCheckbox) return;

  selectAllCheckbox.addEventListener('change', async () => {
    const checkboxes = document.querySelectorAll('.velocity-iteration-checkbox') as NodeListOf<HTMLInputElement>;
    
    if (selectAllCheckbox.checked) {
      currentSelectedNames = currentIterations.map(iter => iter.name);
      checkboxes.forEach(cb => {
        cb.checked = true;
        cb.closest('tr')?.classList.add('selected');
      });
    } else {
      currentSelectedNames = [];
      checkboxes.forEach(cb => {
        cb.checked = false;
        cb.closest('tr')?.classList.remove('selected');
      });
    }

    // Save selection
    await setSelectedIterations(currentSelectedNames);
    
    // Update average display
    updateAverageDisplay();
  });

  // Initial state
  updateSelectAllCheckbox();
}

/**
 * Update select all checkbox state
 */
function updateSelectAllCheckbox(): void {
  const selectAllCheckbox = document.getElementById('velocity-select-all') as HTMLInputElement;
  if (!selectAllCheckbox) return;

  const totalCount = currentIterations.length;
  const selectedCount = currentSelectedNames.length;

  if (selectedCount === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  } else if (selectedCount === totalCount) {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
  } else {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = true;
  }
}

/**
 * Update average display
 */
function updateAverageDisplay(): void {
  const container = document.getElementById('velocity-result');
  if (!container) return;

  const result = calculateAverageVelocity(currentIterations, currentSelectedNames);

  if (result.average === null || result.count === 0) {
    container.innerHTML = `
      <div class="velocity-calculator-no-selection">
        Select at least one iteration to calculate average
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="velocity-calculator-result-grid">
      <div class="velocity-calculator-result-item">
        <span class="velocity-calculator-result-label">Selected Iterations</span>
        <span class="velocity-calculator-result-value">${result.count}</span>
      </div>
      <div class="velocity-calculator-result-item">
        <span class="velocity-calculator-result-label">Total Points</span>
        <span class="velocity-calculator-result-value">${result.total.toFixed(1)}</span>
      </div>
      <div class="velocity-calculator-result-item highlight">
        <span class="velocity-calculator-result-label">Average Velocity</span>
        <span class="velocity-calculator-result-value">${result.average.toFixed(2)} / Iteration</span>
      </div>
    </div>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
