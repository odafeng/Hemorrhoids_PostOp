/**
 * Schema contract — single source of truth for symptom_reports fields.
 * Both the frontend (SymptomReport, hooks, alerts) and the DB migration
 * must agree on these field names and allowed values.
 *
 * If you add/remove a field, update this file and re-run tests.
 */

export const SYMPTOM_FIELDS = {
  // DB column → { frontendKey, allowedValues (null = any) }
  pain_nrs:    { frontendKey: 'pain',       type: 'number', range: [0, 10] },
  bleeding:    { frontendKey: 'bleeding',   type: 'enum',   values: ['無', '少量', '持續', '血塊'] },
  bowel:       { frontendKey: 'bowel',      type: 'enum',   values: ['正常', '困難', '未排'] },
  fever:       { frontendKey: 'fever',      type: 'boolean' },
  urinary:     { frontendKey: 'urinary',    type: 'enum',   values: ['正常', '困難', '尿不出來'] },
  continence:  { frontendKey: 'continence', type: 'enum',   values: ['正常', '滲便', '失禁'] },
  wound:       { frontendKey: 'wound',      type: 'text' },
};

// DB columns expected in symptom_reports (excluding auto-managed ones)
export const DB_COLUMNS = [
  'study_id', 'report_date', 'pod',
  ...Object.keys(SYMPTOM_FIELDS),
  'report_source',
];

// Frontend report keys (what SymptomReport.jsx puts in the report object)
export const FRONTEND_REPORT_KEYS = Object.values(SYMPTOM_FIELDS).map(f => f.frontendKey);
