// GitHub Project Insights - Loading Placeholder Module
// Responsibility: Show/remove a loading placeholder while data is being fetched

const LOADING_CLASS = 'insights-plus-loading';
const MIN_DISPLAY_MS = 400;

let shownAt = 0;

export function showLoadingPlaceholder(): void {
  if (document.querySelector(`.${LOADING_CLASS}`)) return;

  const placeholder = document.createElement('div');
  placeholder.className = LOADING_CLASS;
  placeholder.innerHTML = `
    <div class="insights-plus-loading-spinner"></div>
    <span>Loading...</span>
  `;

  const chartContainer = document.querySelector('.highcharts-container');
  let parent: Element | null;

  if (chartContainer) {
    parent = chartContainer.closest('[class*="insights"]') || chartContainer.parentElement;
  } else {
    parent = document.querySelector('[class*="ChartContainer"]')
      || document.querySelector('main');
  }

  if (parent) {
    parent.appendChild(placeholder);
    shownAt = Date.now();
  }
}

export async function removeLoadingPlaceholder(): Promise<void> {
  const el = document.querySelector(`.${LOADING_CLASS}`);
  if (!el) return;

  const elapsed = Date.now() - shownAt;
  if (elapsed < MIN_DISPLAY_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_DISPLAY_MS - elapsed));
  }

  el.remove();
  shownAt = 0;
}
