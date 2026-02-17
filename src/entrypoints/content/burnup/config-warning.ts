// GitHub Burnup Predictor - Config Warning Panel Module
// Responsibility: Display a warning panel when chart configuration is not suitable

import { CONFIG_ERROR_TYPE_PERIOD, type ConfigError } from './chart-config-validator';

const WARNING_PANEL_CLASS = 'burnup-config-warning';

/**
 * Show a warning panel prompting the user to fix their chart configuration.
 */
export function showConfigWarning(errors: ConfigError[]): void {
  // Remove existing warning if present
  const existing = document.querySelector(`.${WARNING_PANEL_CLASS}`);
  if (existing) {
    existing.remove();
  }

  const panel = document.createElement('div');
  panel.className = WARNING_PANEL_CLASS;

  const errorItems = errors
    .map((error) => {
      const icon = error.type === CONFIG_ERROR_TYPE_PERIOD ? '📅' : '⚙️';
      return `<li class="${WARNING_PANEL_CLASS}__item">${icon} ${escapeHtml(error.message)}</li>`;
    })
    .join('');

  panel.innerHTML = `
    <div class="${WARNING_PANEL_CLASS}__header">
      <span class="${WARNING_PANEL_CLASS}__title">Burnup Predictor - Configuration Required</span>
    </div>
    <div class="${WARNING_PANEL_CLASS}__body">
      <p class="${WARNING_PANEL_CLASS}__description">
        To use the Burnup Predictor, please update your chart settings:
      </p>
      <ul class="${WARNING_PANEL_CLASS}__list">
        ${errorItems}
      </ul>
      <div class="${WARNING_PANEL_CLASS}__steps">
        <p class="${WARNING_PANEL_CLASS}__step-title">How to configure:</p>
        <ol class="${WARNING_PANEL_CLASS}__step-list">
          <li>Click <strong>"Configure"</strong> and set <strong>X-axis</strong> to <strong>"Time"</strong></li>
          <li>Select <strong>"Custom range"</strong> from the period navigation and set an end date beyond today</li>
        </ol>
      </div>
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
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
