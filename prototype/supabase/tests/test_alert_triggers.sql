-- ============================================================
-- DB Trigger Integration Test — fn_check_alerts()
-- ============================================================
-- Usage: 在 Supabase SQL Editor 貼上執行
--        全部在 TRANSACTION 內，最後 ROLLBACK 不留資料
-- ============================================================

BEGIN;

-- ── Cleanup helper ──
DELETE FROM alerts WHERE study_id LIKE 'TEST-%';
DELETE FROM symptom_reports WHERE study_id LIKE 'TEST-%';

-- 結果追蹤
CREATE TEMP TABLE _test_results (
  test_name TEXT,
  passed BOOLEAN
);

-- ============================================================
-- Test 1: 高度疼痛 (pain ≥ 8 連續 3 天)
-- ============================================================
INSERT INTO symptom_reports (study_id, report_date, pod, pain_nrs, bleeding, bowel, fever, urinary, continence) VALUES
  ('TEST-PAIN-H', '2026-03-16', 1, 9, '無', '正常', false, '正常', '正常'),
  ('TEST-PAIN-H', '2026-03-17', 2, 8, '無', '正常', false, '正常', '正常'),
  ('TEST-PAIN-H', '2026-03-18', 3, 10, '無', '正常', false, '正常', '正常');
INSERT INTO _test_results
  SELECT 'high_pain: NRS≥8 x3 days',
    (SELECT COUNT(*) = 1 FROM alerts WHERE study_id = 'TEST-PAIN-H' AND alert_type = 'high_pain');

-- ============================================================
-- Test 2: 疼痛遞增 (ascending pain 3 天)
-- ============================================================
INSERT INTO symptom_reports (study_id, report_date, pod, pain_nrs, bleeding, bowel, fever, urinary, continence) VALUES
  ('TEST-PAIN-A', '2026-03-16', 1, 3, '無', '正常', false, '正常', '正常'),
  ('TEST-PAIN-A', '2026-03-17', 2, 5, '無', '正常', false, '正常', '正常'),
  ('TEST-PAIN-A', '2026-03-18', 3, 7, '無', '正常', false, '正常', '正常');
INSERT INTO _test_results
  SELECT 'ascending_pain: 3→5→7',
    (SELECT COUNT(*) = 1 FROM alerts WHERE study_id = 'TEST-PAIN-A' AND alert_type = 'ascending_pain');

-- ============================================================
-- Test 3: 持續出血 (連續 2 天)
-- ============================================================
INSERT INTO symptom_reports (study_id, report_date, pod, pain_nrs, bleeding, bowel, fever, urinary, continence) VALUES
  ('TEST-BLEED', '2026-03-17', 1, 3, '持續', '正常', false, '正常', '正常'),
  ('TEST-BLEED', '2026-03-18', 2, 3, '持續', '正常', false, '正常', '正常');
INSERT INTO _test_results
  SELECT 'persistent_bleeding: 持續 x2',
    (SELECT COUNT(*) = 1 FROM alerts WHERE study_id = 'TEST-BLEED' AND alert_type = 'persistent_bleeding');

-- ============================================================
-- Test 4: 血塊 (單次)
-- ============================================================
INSERT INTO symptom_reports (study_id, report_date, pod, pain_nrs, bleeding, bowel, fever, urinary, continence) VALUES
  ('TEST-CLOT', '2026-03-18', 1, 3, '血塊', '正常', false, '正常', '正常');
INSERT INTO _test_results
  SELECT 'blood_clot: single instance',
    (SELECT COUNT(*) = 1 FROM alerts WHERE study_id = 'TEST-CLOT' AND alert_type = 'blood_clot');

-- ============================================================
-- Test 5: 未排便 (連續 3 天)
-- ============================================================
INSERT INTO symptom_reports (study_id, report_date, pod, pain_nrs, bleeding, bowel, fever, urinary, continence) VALUES
  ('TEST-BOWEL', '2026-03-16', 1, 3, '無', '未排', false, '正常', '正常'),
  ('TEST-BOWEL', '2026-03-17', 2, 3, '無', '未排', false, '正常', '正常'),
  ('TEST-BOWEL', '2026-03-18', 3, 3, '無', '未排', false, '正常', '正常');
INSERT INTO _test_results
  SELECT 'no_bowel: 未排 x3 days',
    (SELECT COUNT(*) = 1 FROM alerts WHERE study_id = 'TEST-BOWEL' AND alert_type = 'no_bowel');

-- ============================================================
-- Test 6: 發燒 (單次)
-- ============================================================
INSERT INTO symptom_reports (study_id, report_date, pod, pain_nrs, bleeding, bowel, fever, urinary, continence) VALUES
  ('TEST-FEVER', '2026-03-18', 1, 3, '無', '正常', true, '正常', '正常');
INSERT INTO _test_results
  SELECT 'fever: single instance',
    (SELECT COUNT(*) = 1 FROM alerts WHERE study_id = 'TEST-FEVER' AND alert_type = 'fever');

-- ============================================================
-- Test 7: 完全尿不出來 (單次)
-- ============================================================
INSERT INTO symptom_reports (study_id, report_date, pod, pain_nrs, bleeding, bowel, fever, urinary, continence) VALUES
  ('TEST-UR-R', '2026-03-18', 1, 3, '無', '正常', false, '尿不出來', '正常');
INSERT INTO _test_results
  SELECT 'urinary_retention: single instance',
    (SELECT COUNT(*) = 1 FROM alerts WHERE study_id = 'TEST-UR-R' AND alert_type = 'urinary_retention');

-- ============================================================
-- Test 8: 排尿困難 (連續 2 天)
-- ============================================================
INSERT INTO symptom_reports (study_id, report_date, pod, pain_nrs, bleeding, bowel, fever, urinary, continence) VALUES
  ('TEST-UR-D', '2026-03-17', 1, 3, '無', '正常', false, '困難', '正常'),
  ('TEST-UR-D', '2026-03-18', 2, 3, '無', '正常', false, '困難', '正常');
INSERT INTO _test_results
  SELECT 'urinary_difficulty: 困難 x2',
    (SELECT COUNT(*) = 1 FROM alerts WHERE study_id = 'TEST-UR-D' AND alert_type = 'urinary_difficulty');

-- ============================================================
-- Test 9: 肛門失禁 (單次)
-- ============================================================
INSERT INTO symptom_reports (study_id, report_date, pod, pain_nrs, bleeding, bowel, fever, urinary, continence) VALUES
  ('TEST-INCONT', '2026-03-18', 1, 3, '無', '正常', false, '正常', '失禁');
INSERT INTO _test_results
  SELECT 'incontinence: single instance',
    (SELECT COUNT(*) = 1 FROM alerts WHERE study_id = 'TEST-INCONT' AND alert_type = 'incontinence');

-- ============================================================
-- Test 10: 持續滲便 (連續 2 天)
-- ============================================================
INSERT INTO symptom_reports (study_id, report_date, pod, pain_nrs, bleeding, bowel, fever, urinary, continence) VALUES
  ('TEST-SOIL', '2026-03-17', 1, 3, '無', '正常', false, '正常', '滲便'),
  ('TEST-SOIL', '2026-03-18', 2, 3, '無', '正常', false, '正常', '滲便');
INSERT INTO _test_results
  SELECT 'soiling: 滲便 x2',
    (SELECT COUNT(*) = 1 FROM alerts WHERE study_id = 'TEST-SOIL' AND alert_type = 'soiling');

-- ============================================================
-- Test 11 (negative): 正常資料不應產生 alert
-- ============================================================
INSERT INTO symptom_reports (study_id, report_date, pod, pain_nrs, bleeding, bowel, fever, urinary, continence) VALUES
  ('TEST-NORM', '2026-03-18', 1, 3, '無', '正常', false, '正常', '正常');
INSERT INTO _test_results
  SELECT 'negative: normal → no alerts',
    (SELECT COUNT(*) = 0 FROM alerts WHERE study_id = 'TEST-NORM');

-- ============================================================
-- RESULTS
-- ============================================================
SELECT test_name, CASE WHEN passed THEN '✅ PASS' ELSE '❌ FAIL' END AS result
FROM _test_results ORDER BY test_name;

SELECT
  COUNT(*) FILTER (WHERE passed) AS "✅ passed",
  COUNT(*) FILTER (WHERE NOT passed) AS "❌ failed",
  COUNT(*) AS total
FROM _test_results;

-- Undo everything
ROLLBACK;
