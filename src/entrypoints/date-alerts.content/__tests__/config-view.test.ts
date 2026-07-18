import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createConfigView, mappingState, CONFIG_VIEW_CLASS } from '../config-view';
import type { DateFieldOption } from '../types';

const fields: DateFieldOption[] = [
  { id: '1', name: 'Start on' },
  { id: '2', name: 'End on' },
];
const fieldsById = new Map(fields.map((f) => [f.id, f.name]));

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
    const view = createConfigView({ dateFields: fields, currentMapping: null, guessedMapping: { startFieldId: null, endFieldId: null }, onSave: vi.fn() });
    document.body.appendChild(view);

    expect(view.querySelector(`.${CONFIG_VIEW_CLASS}__summary`)?.textContent).toBe('Date fields are not configured');
    const panel = view.querySelector<HTMLElement>(`.${CONFIG_VIEW_CLASS}__panel`)!;
    expect(panel.hidden).toBe(true);

    view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();
    expect(panel.hidden).toBe(false);
  });

  it('pre-selects guessed fields when unconfigured', () => {
    const view = createConfigView({ dateFields: fields, currentMapping: null, guessedMapping: { startFieldId: '1', endFieldId: '2' }, onSave: vi.fn() });
    document.body.appendChild(view);
    view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();

    const selects = view.querySelectorAll<HTMLSelectElement>(`.${CONFIG_VIEW_CLASS}__select`);
    expect(selects[0].value).toBe('1');
    expect(selects[1].value).toBe('2');
  });

  it('saves a valid selection and updates the summary', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const view = createConfigView({ dateFields: fields, currentMapping: null, guessedMapping: { startFieldId: '1', endFieldId: '2' }, onSave });
    document.body.appendChild(view);
    view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();

    view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__save`)!.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(onSave).toHaveBeenCalledWith({ startFieldId: '1', endFieldId: '2' });
    expect(view.querySelector(`.${CONFIG_VIEW_CLASS}__summary`)?.textContent).toBe('Date fields: Start on / End on');
  });

  it('rejects saving the same field for both roles', () => {
    const onSave = vi.fn();
    const view = createConfigView({ dateFields: fields, currentMapping: null, guessedMapping: { startFieldId: null, endFieldId: null }, onSave });
    document.body.appendChild(view);
    view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__button`)!.click();

    const selects = view.querySelectorAll<HTMLSelectElement>(`.${CONFIG_VIEW_CLASS}__select`);
    selects[0].value = '1';
    selects[1].value = '1';
    view.querySelector<HTMLButtonElement>(`.${CONFIG_VIEW_CLASS}__save`)!.click();

    expect(onSave).not.toHaveBeenCalled();
    expect(view.querySelector(`.${CONFIG_VIEW_CLASS}__error`)?.textContent).toContain('different');
  });
});
