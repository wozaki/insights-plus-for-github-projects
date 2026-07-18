// Date Field Alerts - Shared Types

/** A Date-typed custom field the user can map to Start/End. */
export interface DateFieldOption {
  /** Field id as string (system fields use string ids, user-defined use numeric databaseId stringified). */
  id: string;
  name: string;
}

/** Per-project mapping of which field is Start and which is End. */
export interface DateFieldMapping {
  startFieldId: string;
  endFieldId: string;
}

/** Normalized status category derived from the Status field name. */
export type StatusCategory = 'todo' | 'inProgress' | 'done' | 'unknown';

/** Resolved field values for a single project item, keyed elsewhere by contentId. */
export interface ItemFieldData {
  contentId: number;
  /** Date-only string 'YYYY-MM-DD', or null when unset. */
  startDate: string | null;
  endDate: string | null;
  /** Raw Status option name, or null when unset. */
  statusName: string | null;
}

/** Visual severity used to style an annotation. */
export type AlertLevel = 'normal' | 'caution' | 'warning';

/** A single annotation to render inside a date cell. */
export interface CellAlert {
  /** Machine type, also used as the data attribute value for dedup. */
  type: 'missingStart' | 'age' | 'overdue' | 'missingEnd';
  /** Text shown to the user, e.g. 'Age 8d', '⚠ Missing', 'Overdue 3d'. */
  text: string;
  level: AlertLevel;
}

/** Result of evaluating one item: at most one alert per date cell. */
export interface EvaluationResult {
  start: CellAlert | null;
  end: CellAlert | null;
}
