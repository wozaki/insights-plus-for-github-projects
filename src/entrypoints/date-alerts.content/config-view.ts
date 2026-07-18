// Date Field Alerts - Config View
// Responsibility: a small always-on settings bar shown above the list view, with
// an expandable panel to map the Start/End date fields. Field names are shown to
// the user; field ids are used internally. Vanilla DOM, namespaced classes.

import type { DateFieldMapping, DateFieldOption } from './types';
import { classifyStatus } from './status-classifier';

export const CONFIG_VIEW_CLASS = 'iplus-date-config';

export interface ConfigViewOptions {
  dateFields: DateFieldOption[];
  currentMapping: DateFieldMapping | null;
  /** Auto-guessed defaults used to pre-select the dropdowns on first configure. */
  guessedMapping: { startFieldId: string | null; endFieldId: string | null };
  /** All Status options, for the optional In Progress/Done status pickers. */
  statusOptions: DateFieldOption[];
  onSave: (mapping: DateFieldMapping) => void | Promise<void>;
}

/** Build the config view element. Caller mounts it above the grid. */
export function createConfigView(options: ConfigViewOptions): HTMLElement {
  const { dateFields, currentMapping, guessedMapping, statusOptions, onSave } = options;
  const fieldsById = new Map(dateFields.map((f) => [f.id, f.name]));

  const container = document.createElement('div');
  container.className = CONFIG_VIEW_CLASS;

  // --- Summary bar ---
  const bar = document.createElement('div');
  bar.className = `${CONFIG_VIEW_CLASS}__bar`;

  const summary = document.createElement('span');
  summary.className = `${CONFIG_VIEW_CLASS}__summary`;

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = `${CONFIG_VIEW_CLASS}__button`;

  bar.append(summary, toggleButton);

  // --- Panel ---
  const panel = document.createElement('div');
  panel.className = `${CONFIG_VIEW_CLASS}__panel`;
  panel.hidden = true;

  const startSelect = buildSelect('Start date field', dateFields);
  const endSelect = buildSelect('End date field', dateFields);
  const inProgressStatusSelect = buildMultiSelect('In Progress statuses (optional)', statusOptions);
  const doneStatusSelect = buildMultiSelect('Done statuses (optional)', statusOptions);

  const actions = document.createElement('div');
  actions.className = `${CONFIG_VIEW_CLASS}__actions`;

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = `${CONFIG_VIEW_CLASS}__save`;
  saveButton.textContent = 'Save';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = `${CONFIG_VIEW_CLASS}__cancel`;
  cancelButton.textContent = 'Cancel';

  const error = document.createElement('span');
  error.className = `${CONFIG_VIEW_CLASS}__error`;

  actions.append(saveButton, cancelButton, error);
  panel.append(
    startSelect.wrapper,
    endSelect.wrapper,
    inProgressStatusSelect.wrapper,
    doneStatusSelect.wrapper,
    actions,
  );

  container.append(bar, panel);

  // --- State & rendering ---
  let mapping = currentMapping;

  function renderSummary(): void {
    const state = mappingState(mapping, fieldsById);
    summary.classList.toggle(`${CONFIG_VIEW_CLASS}__summary--invalid`, state.kind === 'invalid');
    summary.textContent = state.text;
    toggleButton.textContent = state.buttonLabel;
  }

  function resetSelects(): void {
    const preset = mappingState(mapping, fieldsById).kind === 'valid' && mapping
      ? { start: mapping.startFieldId, end: mapping.endFieldId }
      : { start: guessedMapping.startFieldId, end: guessedMapping.endFieldId };
    startSelect.select.value = preset.start && fieldsById.has(preset.start) ? preset.start : '';
    endSelect.select.value = preset.end && fieldsById.has(preset.end) ? preset.end : '';

    const savedInProgress = mapping?.inProgressStatusIds ?? [];
    const savedDone = mapping?.doneStatusIds ?? [];
    if (savedInProgress.length > 0 || savedDone.length > 0) {
      setSelectedValues(inProgressStatusSelect.select, savedInProgress);
      setSelectedValues(doneStatusSelect.select, savedDone);
    } else {
      // Nothing saved yet: pre-select using the same keyword guess the
      // extension falls back to, as a starting point to fine-tune.
      setSelectedValues(
        inProgressStatusSelect.select,
        statusOptions.filter((o) => classifyStatus(o.name) === 'inProgress').map((o) => o.id),
      );
      setSelectedValues(
        doneStatusSelect.select,
        statusOptions.filter((o) => classifyStatus(o.name) === 'done').map((o) => o.id),
      );
    }

    error.textContent = '';
  }

  function openPanel(): void {
    resetSelects();
    panel.hidden = false;
  }

  function closePanel(): void {
    panel.hidden = true;
  }

  toggleButton.addEventListener('click', () => {
    if (panel.hidden) openPanel();
    else closePanel();
  });

  cancelButton.addEventListener('click', closePanel);

  saveButton.addEventListener('click', async () => {
    const startFieldId = startSelect.select.value;
    const endFieldId = endSelect.select.value;
    if (!startFieldId || !endFieldId) {
      error.textContent = 'Select both a start and end field.';
      return;
    }
    if (startFieldId === endFieldId) {
      error.textContent = 'Start and end must be different fields.';
      return;
    }
    const next: DateFieldMapping = {
      startFieldId,
      endFieldId,
      inProgressStatusIds: getSelectedValues(inProgressStatusSelect.select),
      doneStatusIds: getSelectedValues(doneStatusSelect.select),
    };
    try {
      await onSave(next);
      mapping = next;
      renderSummary();
      closePanel();
    } catch {
      error.textContent = 'Failed to save. Please try again.';
    }
  });

  renderSummary();
  return container;
}

interface BuiltSelect {
  wrapper: HTMLElement;
  select: HTMLSelectElement;
}

function buildSelect(label: string, fields: DateFieldOption[]): BuiltSelect {
  const wrapper = document.createElement('label');
  wrapper.className = `${CONFIG_VIEW_CLASS}__field`;

  const caption = document.createElement('span');
  caption.className = `${CONFIG_VIEW_CLASS}__label`;
  caption.textContent = label;

  const select = document.createElement('select');
  select.className = `${CONFIG_VIEW_CLASS}__select`;

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '—';
  select.appendChild(placeholder);

  for (const field of fields) {
    const option = document.createElement('option');
    option.value = field.id;
    option.textContent = field.name;
    select.appendChild(option);
  }

  wrapper.append(caption, select);
  return { wrapper, select };
}

function buildMultiSelect(label: string, options: DateFieldOption[]): BuiltSelect {
  const wrapper = document.createElement('label');
  wrapper.className = `${CONFIG_VIEW_CLASS}__field`;

  const caption = document.createElement('span');
  caption.className = `${CONFIG_VIEW_CLASS}__label`;
  caption.textContent = label;

  const select = document.createElement('select');
  select.className = `${CONFIG_VIEW_CLASS}__select ${CONFIG_VIEW_CLASS}__select--multi`;
  select.multiple = true;
  select.size = Math.min(Math.max(options.length, 2), 6);

  for (const option of options) {
    const el = document.createElement('option');
    el.value = option.id;
    el.textContent = option.name;
    select.appendChild(el);
  }

  wrapper.append(caption, select);
  return { wrapper, select };
}

function getSelectedValues(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions).map((option) => option.value);
}

function setSelectedValues(select: HTMLSelectElement, values: string[]): void {
  const set = new Set(values);
  for (const option of Array.from(select.options)) {
    option.selected = set.has(option.value);
  }
}

interface MappingState {
  kind: 'unset' | 'invalid' | 'valid';
  text: string;
  buttonLabel: string;
}

/** Derive the summary bar state from the mapping and the fields that still exist. */
export function mappingState(
  mapping: DateFieldMapping | null,
  fieldsById: Map<string, string>,
): MappingState {
  if (!mapping) {
    return { kind: 'unset', text: 'Date fields are not configured', buttonLabel: 'Configure' };
  }
  const startName = fieldsById.get(mapping.startFieldId);
  const endName = fieldsById.get(mapping.endFieldId);
  if (!startName || !endName) {
    return { kind: 'invalid', text: 'Date field mapping is invalid', buttonLabel: 'Configure again' };
  }
  return { kind: 'valid', text: `Date fields: ${startName} / ${endName}`, buttonLabel: 'Change' };
}
