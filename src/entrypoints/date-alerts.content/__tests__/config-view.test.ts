import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createConfigView, mappingState, CONFIG_VIEW_CLASS } from '../config-view';
import type { DateFieldOption } from '../types';

const fields: DateFieldOption[] = [
  { id: '1', name: 'Start on' },
  { id: '2', name: 'End on' },
];
const fieldsById = new Map(fields.map((f) => [f.id, f.name]));

const statusOptions: DateFieldOption[] = [
  { id: 's1', name: 'Todo' },
  { id: 's2', name: 'In Progress' },
  { id: 's3', name: 'Review' },
  { id: 's4', name: 'Done' },
];

function dateSelects(view: HTMLElement): HTMLSelectElement[] {
  return Array.from(
    view.querySelectorAll<HTMLSelectElement>(
      `.${CONFIG_VIEW_CLASS}__select:not(.${CONFIG_VIEW_CLASS}__select--multi)`,
    ),
  );
}

function multiSelects(view: HTMLElement): HTMLSelectElement[] {
  return Array.from(view.querySelectorAll<HTMLSelectElement>(`.${CONFIG_VIEW_CLASS}__select--multi`));
}

function selectedValues(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions).map((o) => o.value);
}

describe('mappingState', () => {
  it('is unset when no mapping', () => {
    expect(mappingState(null, fieldsById)).toMatchObject({ kind: 'unset', buttonLabel: 'Configure' });
  });

  it('is valid and shows field names when both ids exist', () => {
    const state = mappingState({ startFieldId: '1', endFieldId: '2' }, fieldsById);
    expect(state).toMatchObject({ kind: 'valid', buttonLabel: 'Change' });
    expect(state.text).toBe('Date fields: Start on / End on');
  });

  it('is invalid when a mapped id no longer exists', () => {
    const state = mappingState({ startFieldId: '1', endFieldId: '999' }, fieldsById);
    expect(state).toMatchObject({ kind: 'invalid', buttonLabel: 'Configure again' });
  });
});

describe('createConfigView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the unset summary and opens the panel on click', () => {
    const view = createConfigView({
      dateFields: fields,
      currentMapping: null,
      guessedMapping: { startFieldId: null, endFieldId: null },
      statusOptions: [],
      onSave: vi.fn(),
    });
    document.body.appendChild(view);

    expect(view.querySelector(`.${CONFIG_VIEW_CLASS}__summary`)?.textContent).toBe('Date fields are not configured');
    const panel = view.querySelector<HTMLElement>(`.${CONFIG_VIEW_CLASS}__panel`)!;
    expect(panel.hidden).toBe(true);

    view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();
    expect(panel.hidden).toBe(false);
  });

  it('pre-selects guessed fields when unconfigured', () => {
    const view = createConfigView({
      dateFields: fields,
      currentMapping: null,
      guessedMapping: { startFieldId: '1', endFieldId: '2' },
      statusOptions: [],
      onSave: vi.fn(),
    });
    document.body.appendChild(view);
    view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();

    const selects = dateSelects(view);
    expect(selects[0].value).toBe('1');
    expect(selects[1].value).toBe('2');
  });

  it('saves a valid selection and updates the summary', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const view = createConfigView({
      dateFields: fields,
      currentMapping: null,
      guessedMapping: { startFieldId: '1', endFieldId: '2' },
      statusOptions: [],
      onSave,
    });
    document.body.appendChild(view);
    view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();

    view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__save`)!.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(onSave).toHaveBeenCalledWith({
      startFieldId: '1',
      endFieldId: '2',
      inProgressStatusIds: [],
      doneStatusIds: [],
    });
    expect(view.querySelector(`.${CONFIG_VIEW_CLASS}__summary`)?.textContent).toBe('Date fields: Start on / End on');
  });

  it('rejects saving the same field for both roles', () => {
    const onSave = vi.fn();
    const view = createConfigView({
      dateFields: fields,
      currentMapping: null,
      guessedMapping: { startFieldId: null, endFieldId: null },
      statusOptions: [],
      onSave,
    });
    document.body.appendChild(view);
    view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();

    const selects = dateSelects(view);
    selects[0].value = '1';
    selects[1].value = '1';
    view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__save`)!.click();

    expect(onSave).not.toHaveBeenCalled();
    expect(view.querySelector(`.${CONFIG_VIEW_CLASS}__error`)?.textContent).toContain('different');
  });

  describe('status pickers', () => {
    it('pre-selects In Progress/Done statuses by keyword guess when nothing is saved', () => {
      const view = createConfigView({
        dateFields: fields,
        currentMapping: null,
        guessedMapping: { startFieldId: '1', endFieldId: '2' },
        statusOptions,
        onSave: vi.fn(),
      });
      document.body.appendChild(view);
      view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();

      const [inProgressSelect, doneSelect] = multiSelects(view);
      expect(selectedValues(inProgressSelect).sort()).toEqual(['s2', 's3']); // In Progress, Review
      expect(selectedValues(doneSelect)).toEqual(['s4']); // Done
    });

    it('uses the saved status mapping instead of the keyword guess when present', () => {
      const view = createConfigView({
        dateFields: fields,
        currentMapping: {
          startFieldId: '1',
          endFieldId: '2',
          inProgressStatusIds: ['s2'],
          doneStatusIds: ['s3', 's4'],
        },
        guessedMapping: { startFieldId: '1', endFieldId: '2' },
        statusOptions,
        onSave: vi.fn(),
      });
      document.body.appendChild(view);
      view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();

      const [inProgressSelect, doneSelect] = multiSelects(view);
      expect(selectedValues(inProgressSelect)).toEqual(['s2']);
      expect(selectedValues(doneSelect).sort()).toEqual(['s3', 's4']);
    });

    it('the Clear button empties a status picker, including any keyword-guessed pre-selection', () => {
      const view = createConfigView({
        dateFields: fields,
        currentMapping: null,
        guessedMapping: { startFieldId: '1', endFieldId: '2' },
        statusOptions,
        onSave: vi.fn(),
      });
      document.body.appendChild(view);
      view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();

      const [inProgressSelect] = multiSelects(view);
      expect(selectedValues(inProgressSelect).length).toBeGreaterThan(0); // guess pre-selected something

      const [inProgressClear] = Array.from(view.querySelectorAll<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__clear`));
      inProgressClear.click();

      expect(selectedValues(inProgressSelect)).toEqual([]);
    });

    it('persists deselecting everything, and shows it empty when reopened (same instance)', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const view = createConfigView({
        dateFields: fields,
        currentMapping: {
          startFieldId: '1',
          endFieldId: '2',
          inProgressStatusIds: ['s2'],
          doneStatusIds: ['s4'],
        },
        guessedMapping: { startFieldId: '1', endFieldId: '2' },
        statusOptions,
        onSave,
      });
      document.body.appendChild(view);
      view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();

      let [inProgressSelect, doneSelect] = multiSelects(view);
      expect(selectedValues(inProgressSelect)).toEqual(['s2']);
      expect(selectedValues(doneSelect)).toEqual(['s4']);

      // Deselect everything in both pickers.
      Array.from(inProgressSelect.options).forEach((o) => (o.selected = false));
      Array.from(doneSelect.options).forEach((o) => (o.selected = false));

      view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__save`)!.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(onSave).toHaveBeenCalledWith({
        startFieldId: '1',
        endFieldId: '2',
        inProgressStatusIds: [],
        doneStatusIds: [],
      });

      // Reopen (same createConfigView instance, no re-mount) and confirm it
      // still shows empty rather than the original ['s2']/['s4'].
      view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click(); // open
      view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click(); // close
      view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click(); // open again

      [inProgressSelect, doneSelect] = multiSelects(view);
      expect(selectedValues(inProgressSelect)).toEqual([]);
      expect(selectedValues(doneSelect)).toEqual([]);
    });

    it('keeps an intentionally empty saved status mapping empty, instead of re-showing the guess', () => {
      // Regression: reopening after saving with nothing selected must not
      // silently re-apply the keyword guess — that would misrepresent what's
      // actually saved (both empty = pure keyword mode) as if something had
      // been explicitly picked.
      const view = createConfigView({
        dateFields: fields,
        currentMapping: {
          startFieldId: '1',
          endFieldId: '2',
          inProgressStatusIds: [],
          doneStatusIds: [],
        },
        guessedMapping: { startFieldId: '1', endFieldId: '2' },
        statusOptions,
        onSave: vi.fn(),
      });
      document.body.appendChild(view);
      view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();

      const [inProgressSelect, doneSelect] = multiSelects(view);
      expect(selectedValues(inProgressSelect)).toEqual([]);
      expect(selectedValues(doneSelect)).toEqual([]);
    });

    it('includes the chosen status ids when saving', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const view = createConfigView({
        dateFields: fields,
        currentMapping: null,
        guessedMapping: { startFieldId: '1', endFieldId: '2' },
        statusOptions,
        onSave,
      });
      document.body.appendChild(view);
      view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();

      const [inProgressSelect, doneSelect] = multiSelects(view);
      // Replace the guessed selection with a manual one.
      Array.from(inProgressSelect.options).forEach((o) => (o.selected = o.value === 's3'));
      Array.from(doneSelect.options).forEach((o) => (o.selected = o.value === 's4'));

      view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__save`)!.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(onSave).toHaveBeenCalledWith({
        startFieldId: '1',
        endFieldId: '2',
        inProgressStatusIds: ['s3'],
        doneStatusIds: ['s4'],
      });
    });
  });
});
