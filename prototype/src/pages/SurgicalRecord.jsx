import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as sb from '../utils/supabaseService';
import * as I from '../components/Icons';

const HEM_SUBTYPES = [
  { v: 'open',        label: 'Open',        d: '傷口不縫合' },
  { v: 'closed',      label: 'Closed',      d: '傷口完全縫合（Ferguson）' },
  { v: 'semi_open',   label: 'Semi-open',   d: '部分縫合，中央開放' },
  { v: 'semi_closed', label: 'Semi-closed', d: '大部分縫合，末端開放' },
];
const GRADES = ['I', 'II', 'III', 'IV'];
const CLOCK_POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const POSITIONS = [
  { v: 'lithotomy',       label: 'Lithotomy' },
  { v: 'prone_jackknife', label: 'Prone jackknife' },
  { v: 'left_lateral',    label: 'Left lateral' },
  { v: 'other',           label: '其他' },
];
const SELF_PAID = [
  { v: 'quikclot', label: 'Quikclot 止血紗' },
  { v: 'prp',      label: 'PRP' },
  { v: 'healiaid', label: 'Healiaid' },
  { v: 'newepi',   label: 'NewEpi' },
  { v: 'other',    label: '其他' },
];

export default function SurgicalRecord({ isDemo, userInfo }) {
  const { studyId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isReadOnly = userInfo?.role === 'patient' || isDemo;

  // Form state
  const [procedureType, setProcedureType] = useState('');
  const [subtype, setSubtype] = useState('');
  const [grade, setGrade] = useState('');
  const [clockPositions, setClockPositions] = useState([]);
  const [joules, setJoules] = useState({ 3: '', 7: '', 11: '' });
  const [bloodLoss, setBloodLoss] = useState('');
  const [duration, setDuration] = useState('');
  const [position, setPosition] = useState('');
  const [selfPaid, setSelfPaid] = useState([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const load = async () => {
      if (isDemo || !studyId) {
        setLoading(false);
        return;
      }
      try {
        const [p, rec] = await Promise.all([
          sb.getPatient(studyId),
          sb.getSurgicalRecord(studyId),
        ]);
        setPatient(p);
        if (rec) {
          setProcedureType(rec.procedure_type || '');
          setSubtype(rec.hemorrhoidectomy_subtype || '');
          setGrade(rec.hemorrhoid_grade || '');
          setClockPositions(rec.clock_positions || []);
          if (rec.laser_joules) {
            setJoules({
              3: rec.laser_joules['3'] ?? '',
              7: rec.laser_joules['7'] ?? '',
              11: rec.laser_joules['11'] ?? '',
            });
          }
          setBloodLoss(rec.blood_loss_ml ?? '');
          setDuration(rec.duration_min ?? '');
          setPosition(rec.patient_position || '');
          setSelfPaid(rec.self_paid_items || []);
          setNotes(rec.notes || '');
        }
      } catch (err) {
        setError(err?.message || '載入失敗');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [studyId, isDemo]);

  const toggleClock = (n) => {
    setClockPositions((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b)
    );
  };
  const toggleSelfPaid = (v) => {
    setSelfPaid((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const canSubmit = !!procedureType && !!grade && !isReadOnly && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    setSuccess('');

    const payload = {
      procedure_type: procedureType,
      hemorrhoidectomy_subtype: procedureType === 'hemorrhoidectomy' ? (subtype || null) : null,
      hemorrhoid_grade: grade,
      clock_positions: clockPositions,
      laser_joules: procedureType === 'laser_hemorrhoidoplasty'
        ? {
            3: joules[3] ? Number(joules[3]) : null,
            7: joules[7] ? Number(joules[7]) : null,
            11: joules[11] ? Number(joules[11]) : null,
          }
        : null,
      blood_loss_ml: bloodLoss === '' ? null : Number(bloodLoss),
      duration_min: duration === '' ? null : Number(duration),
      patient_position: position || null,
      self_paid_items: selfPaid,
      notes: notes.trim() || null,
      recorded_by: userInfo?.id || null,
      surgeon_id: patient?.surgeon_id || userInfo?.surgeonId || null,
    };

    try {
      await sb.saveSurgicalRecord(studyId, payload);
      setSuccess('手術紀錄已儲存');
      setTimeout(() => navigate(-1), 1200);
    } catch (err) {
      if (err?.code === '42501' || /row-level|policy/i.test(err?.message || '')) {
        setError('此病人不屬於您的主刀醫師，無法儲存紀錄');
      } else {
        setError(err?.message || '儲存失敗');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--ink-2)', animation: 'pulse 1s infinite', fontFamily: 'var(--font-mono)' }}>載入中…</p>
      </div>
    );
  }

  if (isDemo) {
    return (
      <div className="page">
        <div className="topbar">
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="返回">
            <I.ArrowLeft width={17} height={17} />
          </button>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
            OPERATIVE RECORD
          </div>
          <div style={{ width: 36 }} />
        </div>
        <div className="page-head">
          <div className="eyebrow">OPERATIVE RECORD</div>
          <h1 className="page-title">手術紀錄</h1>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Demo 模式不支援手術紀錄編輯。</p>
        </div>
      </div>
    );
  }

  const surgeryDate = patient?.surgery_date
    ? new Date(patient.surgery_date).toLocaleDateString('zh-TW')
    : '—';

  return (
    <div className="page">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="返回">
          <I.ArrowLeft width={17} height={17} />
        </button>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
          {studyId} · {surgeryDate}
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div className="page-head">
        <div className="eyebrow">OPERATIVE RECORD</div>
        <h1 className="page-title">{isReadOnly ? '檢視手術紀錄' : '撰寫手術紀錄'}</h1>
        <p className="page-sub">
          {patient?.surgeon_id && <>主刀：{patient.surgeon_id}　·　</>}
          術式：{patient?.surgery_type || '—'}
        </p>
      </div>

      {isReadOnly && (
        <div className="alert-banner info" style={{ marginBottom: 12 }}>
          <div className="al-icon"><I.Info width={18} height={18} /></div>
          <div><div className="al-msg">此頁為唯讀檢視</div></div>
        </div>
      )}

      {/* Procedure type */}
      <div className="field">
        <div className="field-lbl">手術術式</div>
        <div className="opt-row">
          <button type="button"
            className={`opt ${procedureType === 'hemorrhoidectomy' ? 'selected' : ''}`}
            onClick={() => !isReadOnly && setProcedureType('hemorrhoidectomy')}
            disabled={isReadOnly}>
            <span className="opt-main">痔瘡切除術</span>
          </button>
          <button type="button"
            className={`opt ${procedureType === 'laser_hemorrhoidoplasty' ? 'selected' : ''}`}
            onClick={() => !isReadOnly && setProcedureType('laser_hemorrhoidoplasty')}
            disabled={isReadOnly}>
            <span className="opt-main">Laser hemorrhoidoplasty</span>
          </button>
        </div>
      </div>

      {/* Subtype (hemorrhoidectomy only) */}
      {procedureType === 'hemorrhoidectomy' && (
        <div className="field">
          <div className="field-lbl">Hemorrhoidectomy 分型</div>
          <div className="opt-stack">
            {HEM_SUBTYPES.map((o) => (
              <button key={o.v} type="button"
                className={`opt ${subtype === o.v ? 'selected' : ''}`}
                onClick={() => !isReadOnly && setSubtype(o.v)}
                disabled={isReadOnly}>
                <span className="opt-main">{o.label}</span>
                <span className="opt-desc">{o.d}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grade */}
      <div className="field">
        <div className="field-lbl">痔瘡分級 <span className="hint">Goligher</span></div>
        <div className="opt-row">
          {GRADES.map((g) => (
            <button key={g} type="button"
              className={`opt ${grade === g ? 'selected' : ''}`}
              onClick={() => !isReadOnly && setGrade(g)}
              disabled={isReadOnly}>
              <span className="opt-main">Grade {g}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Clock positions */}
      <div className="field">
        <div className="field-lbl">位置 <span className="hint">時鐘方向 · 可複選</span></div>
        <div className="chip-grid">
          {CLOCK_POSITIONS.map((n) => (
            <button key={n} type="button"
              className={`chip ${clockPositions.includes(n) ? 'selected' : ''}`}
              onClick={() => !isReadOnly && toggleClock(n)}
              disabled={isReadOnly}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Laser joules */}
      {procedureType === 'laser_hemorrhoidoplasty' && (
        <div className="field">
          <div className="field-lbl">Laser energy (J) <span className="hint">3 / 7 / 11 點鐘方向</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[3, 7, 11].map((h) => (
              <div key={h}>
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 4 }}>
                  {h} 點鐘 (J)
                </div>
                <input className="input" type="number" min="0" step="1"
                  value={joules[h]}
                  onChange={(e) => !isReadOnly && setJoules((prev) => ({ ...prev, [h]: e.target.value }))}
                  disabled={isReadOnly} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blood loss */}
      <div className="field">
        <div className="field-lbl">出血量 <span className="hint">ml</span></div>
        <input className="input" type="number" min="0" step="1" placeholder="0"
          value={bloodLoss}
          onChange={(e) => !isReadOnly && setBloodLoss(e.target.value)}
          disabled={isReadOnly} />
      </div>

      {/* Duration */}
      <div className="field">
        <div className="field-lbl">手術時長 <span className="hint">分鐘</span></div>
        <input className="input" type="number" min="0" step="1" placeholder="0"
          value={duration}
          onChange={(e) => !isReadOnly && setDuration(e.target.value)}
          disabled={isReadOnly} />
      </div>

      {/* Patient position */}
      <div className="field">
        <div className="field-lbl">擺位</div>
        <div className="opt-row" style={{ flexWrap: 'wrap' }}>
          {POSITIONS.map((o) => (
            <button key={o.v} type="button"
              className={`opt ${position === o.v ? 'selected' : ''}`}
              onClick={() => !isReadOnly && setPosition(o.v)}
              disabled={isReadOnly}>
              <span className="opt-main">{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Self-paid items */}
      <div className="field">
        <div className="field-lbl">自費品項 <span className="hint">可複選</span></div>
        <div className="chip-grid">
          {SELF_PAID.map((o) => (
            <button key={o.v} type="button"
              className={`chip ${selfPaid.includes(o.v) ? 'selected' : ''}`}
              onClick={() => !isReadOnly && toggleSelfPaid(o.v)}
              disabled={isReadOnly}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="field">
        <div className="field-lbl">其他備註 <span className="hint">特殊狀況</span></div>
        <textarea className="survey-textarea"
          placeholder="例如：合併肛裂切除、困難止血、術中併發症等…"
          value={notes}
          onChange={(e) => !isReadOnly && setNotes(e.target.value)}
          disabled={isReadOnly}
          rows={3} />
      </div>

      {error && (
        <div className="alert-banner danger" style={{ marginBottom: 12 }}>
          <div className="al-icon"><I.Alert width={18} height={18} /></div>
          <div><div className="al-msg">{error}</div></div>
        </div>
      )}
      {success && (
        <div className="alert-banner" style={{ marginBottom: 12, borderColor: 'var(--ok)', background: 'var(--ok-soft)' }}>
          <div className="al-icon" style={{ color: 'var(--ok)' }}><I.Check width={18} height={18} /></div>
          <div><div className="al-msg" style={{ color: 'var(--ok)' }}>{success}</div></div>
        </div>
      )}

      {!isReadOnly && (
        <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? '儲存中…' : <>儲存手術紀錄 <I.Check width={16} height={16} /></>}
        </button>
      )}
    </div>
  );
}
