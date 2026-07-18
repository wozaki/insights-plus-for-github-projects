// Date Field Alerts - Memex Embedded Data Reader
// Responsibility: read GitHub Projects' embedded JSON (rendered as <script
// type="application/json"> tags) to obtain field definitions and item values
// without any extra permissions or API calls.
//
// Data source contract (see the "list view memex" reference):
// - #memex-columns-data: field definitions [{id, name, dataType, settings.options}]
// - #memex-paginated-items-data: {nodes:[{contentId, memexProjectColumnValues}]} when
//   the view has no grouping, or {groupedItems:[{groupId, nodes:[...]}]} when the view
//   groups by a field (e.g. "Group by: Assignees") — item nodes are then split across
//   each group's own `nodes` array instead of one flat top-level array.
//
// Limitation: this JSON is a load-time snapshot of the first page of items.
// Edits are reflected only after a reload, and items beyond the first page are
// absent. Field value reading is kept behind this module so it can later be
// swapped for a live DOM reader.

import type { DateFieldOption, ItemFieldData } from './types';
import { toDateOnly } from './date-utils';

const COLUMNS_SCRIPT_ID = 'memex-columns-data';
const ITEMS_SCRIPT_ID = 'memex-paginated-items-data';

/** dataType values that hold a date value: user-defined Date fields plus GitHub's built-in date fields. */
const DATE_LIKE_DATA_TYPES = new Set(['date', 'created', 'updated', 'closed']);

interface MemexColumn {
  id: string | number;
  name: string;
  dataType: string;
  settings?: { options?: Array<{ id: string; name: string }> };
}

interface MemexColumnValue {
  memexProjectColumnId: string | number;
  value: unknown;
}

interface MemexNode {
  contentId: number;
  memexProjectColumnValues?: MemexColumnValue[];
}

/** Everything this feature needs from the embedded page data. */
export interface MemexData {
  dateFields: DateFieldOption[];
  /** Status option id -> option name. */
  statusOptions: Map<string, string>;
  /** contentId -> resolved values for the configured start/end/status fields. */
  itemsByContentId: Map<number, ItemFieldData>;
  /** Raw columns, exposed for callers that need field names by id. */
  columns: MemexColumn[];
}

/** Parse the columns JSON string into typed column definitions. */
export function parseColumns(json: string): MemexColumn[] {
  const parsed = JSON.parse(json);
  return Array.isArray(parsed) ? (parsed as MemexColumn[]) : [];
}

/** Parse the items JSON string into a flat list of raw nodes, regardless of grouping. */
export function parseNodes(json: string): MemexNode[] {
  const parsed = JSON.parse(json);

  if (Array.isArray(parsed)) return parsed as MemexNode[];
  if (Array.isArray(parsed?.nodes)) return parsed.nodes as MemexNode[];

  // Grouped view: items live under groupedItems[].nodes, one bucket per group.
  if (Array.isArray(parsed?.groupedItems)) {
    return (parsed.groupedItems as Array<{ nodes?: unknown }>).flatMap((group) =>
      Array.isArray(group?.nodes) ? (group.nodes as MemexNode[]) : [],
    );
  }

  return [];
}

/** Extract date-valued fields (custom Date fields plus Created/Updated/Closed) as selectable options. */
export function getDateFields(columns: MemexColumn[]): DateFieldOption[] {
  return columns
    .filter((column) => DATE_LIKE_DATA_TYPES.has(column.dataType))
    .map((column) => ({ id: String(column.id), name: column.name }));
}

/** Build an option-id -> name map from the Status (singleSelect) column. */
export function getStatusOptions(columns: MemexColumn[]): Map<string, string> {
  const map = new Map<string, string>();
  const statusColumn = columns.find(
    (column) => column.id === 'Status' || column.dataType === 'singleSelect',
  );
  for (const option of statusColumn?.settings?.options ?? []) {
    map.set(String(option.id), option.name);
  }
  return map;
}

/**
 * Resolve per-item Start/End/Status values keyed by contentId.
 * `startFieldId`/`endFieldId` may be null when unconfigured.
 */
export function extractItems(
  nodes: MemexNode[],
  startFieldId: string | null,
  endFieldId: string | null,
  statusOptions: Map<string, string>,
): Map<number, ItemFieldData> {
  const result = new Map<number, ItemFieldData>();

  for (const node of nodes) {
    const values = node.memexProjectColumnValues ?? [];
    result.set(node.contentId, {
      contentId: node.contentId,
      startDate: startFieldId ? readDate(values, startFieldId) : null,
      endDate: endFieldId ? readDate(values, endFieldId) : null,
      statusName: readStatusName(values, statusOptions),
    });
  }

  return result;
}

function findValue(values: MemexColumnValue[], fieldId: string): unknown {
  const entry = values.find((value) => String(value.memexProjectColumnId) === fieldId);
  return entry ? entry.value : undefined;
}

function readDate(values: MemexColumnValue[], fieldId: string): string | null {
  const value = findValue(values, fieldId) as { value?: string } | null | undefined;
  if (!value || typeof value.value !== 'string') return null;
  return toDateOnly(value.value);
}

function readStatusName(values: MemexColumnValue[], statusOptions: Map<string, string>): string | null {
  const value = findValue(values, 'Status') as { id?: string } | null | undefined;
  if (!value || value.id == null) return null;
  return statusOptions.get(String(value.id)) ?? null;
}

/** Read the embedded JSON from the document. Returns null if not present. */
export function readMemexData(
  startFieldId: string | null,
  endFieldId: string | null,
  doc: Document = document,
): MemexData | null {
  const columnsJson = doc.getElementById(COLUMNS_SCRIPT_ID)?.textContent;
  if (!columnsJson) return null;

  let columns: MemexColumn[];
  try {
    columns = parseColumns(columnsJson);
  } catch {
    return null;
  }

  const statusOptions = getStatusOptions(columns);
  let itemsByContentId = new Map<number, ItemFieldData>();
  const itemsJson = doc.getElementById(ITEMS_SCRIPT_ID)?.textContent;
  if (itemsJson) {
    try {
      itemsByContentId = extractItems(parseNodes(itemsJson), startFieldId, endFieldId, statusOptions);
    } catch {
      // Leave items empty; field metadata is still usable for the config UI.
    }
  }

  return {
    dateFields: getDateFields(columns),
    statusOptions,
    itemsByContentId,
    columns,
  };
}
