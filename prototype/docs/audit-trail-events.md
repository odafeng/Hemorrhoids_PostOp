# Audit Trail Event Reference

All critical system events are logged to the `audit_trail` table.  
This document serves as reference for IRB applications and paper methods sections.

## Audited Events

| action                   | actor_role | trigger source             | description                               |
|--------------------------|------------|----------------------------|-------------------------------------------|
| `report.submit`          | patient    | DB trigger (INSERT/UPDATE) | Patient submits or updates a symptom report |
| `alert.create`           | system     | DB trigger (INSERT)        | Alert rule engine creates a new alert      |
| `alert.acknowledge`      | researcher | Client-side (RLS)          | Researcher acknowledges an alert           |
| `patient.onboard`        | patient    | Edge Function              | New patient record created via onboarding  |
| `ai.chat_request`        | patient    | Edge Function              | Patient uses AI 衛教 chatbot              |
| `researcher.review_chat` | researcher | Client-side (RLS)          | Researcher reviews an AI chat log          |
| `cron.check_adherence`   | system     | Edge Function (cron)       | Daily adherence check with reminder count  |

## Fields

Each `audit_trail` row contains:

- `actor_id` — UUID of the acting user (NULL for system events)
- `actor_role` — patient / researcher / pi / system
- `action` — event type (see table above)
- `resource` — target table name
- `resource_id` — study_id or record identifier
- `detail` — JSONB with action-specific data
- `ip_address` — client IP (where available)
- `created_at` — timestamp

## Events NOT yet audited (future)

| event              | notes                                          |
|--------------------|------------------------------------------------|
| `pii.access`       | PI decrypts patient PII — needs trigger on pii_access_log |
| `pii.export`       | Future CSV export tool                         |
| `patient.withdraw`  | Patient withdrawn from study                   |
