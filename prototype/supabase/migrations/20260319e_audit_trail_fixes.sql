-- Fix audit_trail:
-- 1. Allow INSERT from all authenticated roles (patients, researchers, PI)
--    Currently only SELECT for researchers exists — inserts from client-side fail silently
-- 2. Report audit trigger should fire on INSERT OR UPDATE (matches alert trigger fix)

---------------------------------------------------------------------
-- 1. RLS: all authenticated users can INSERT audit entries
---------------------------------------------------------------------
CREATE POLICY "all_roles_insert_audit" ON audit_trail
    FOR INSERT
    WITH CHECK (get_user_role() IN ('patient', 'researcher', 'pi'));

---------------------------------------------------------------------
-- 2. Report audit trigger: INSERT OR UPDATE
---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_report ON symptom_reports;

CREATE TRIGGER trg_audit_report
    AFTER INSERT OR UPDATE ON symptom_reports
    FOR EACH ROW EXECUTE FUNCTION fn_audit_report_submit();
