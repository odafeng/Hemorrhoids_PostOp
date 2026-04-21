import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SurgicalRecord from '../SurgicalRecord';

vi.mock('../../utils/supabaseService', () => ({
  getPatient: vi.fn().mockResolvedValue({
    study_id: 'HSF-003', surgery_date: '2026-04-21', surgery_type: 'LigaSure hemorrhoidectomy', surgeon_id: 'HSF',
  }),
  getSurgicalRecord: vi.fn().mockResolvedValue(null),
  saveSurgicalRecord: vi.fn().mockResolvedValue({}),
}));

const renderAt = (path, props = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/surgical-record/:studyId" element={
          <SurgicalRecord isDemo={false} userInfo={{ id: 'u1', role: 'researcher', surgeonId: 'HSF' }} {...props} />
        } />
      </Routes>
    </MemoryRouter>
  );

describe('SurgicalRecord', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders form header with study_id and surgery date', async () => {
    renderAt('/surgical-record/HSF-003');
    await waitFor(() => expect(screen.getByText('撰寫手術紀錄')).toBeInTheDocument());
    expect(screen.getByText(/HSF-003/)).toBeInTheDocument();
  });

  it('hemorrhoidectomy subtype block appears only when that procedure selected', async () => {
    renderAt('/surgical-record/HSF-003');
    await waitFor(() => expect(screen.getByText('撰寫手術紀錄')).toBeInTheDocument());

    expect(screen.queryByText(/Hemorrhoidectomy 分型/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('痔瘡切除術'));
    expect(screen.getByText(/Hemorrhoidectomy 分型/)).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('laser joules appear only when laser procedure selected', async () => {
    renderAt('/surgical-record/HSF-003');
    await waitFor(() => expect(screen.getByText('撰寫手術紀錄')).toBeInTheDocument());

    expect(screen.queryByText(/Laser energy/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Laser hemorrhoidoplasty'));
    expect(screen.getByText(/Laser energy/)).toBeInTheDocument();
    expect(screen.getByText('3 點鐘 (J)')).toBeInTheDocument();
    expect(screen.getByText('7 點鐘 (J)')).toBeInTheDocument();
    expect(screen.getByText('11 點鐘 (J)')).toBeInTheDocument();
  });

  it('clock-position chips toggle multi-select', async () => {
    renderAt('/surgical-record/HSF-003');
    await waitFor(() => expect(screen.getByText('撰寫手術紀錄')).toBeInTheDocument());

    const chip3 = screen.getByRole('button', { name: '3' });
    const chip7 = screen.getByRole('button', { name: '7' });

    fireEvent.click(chip3);
    fireEvent.click(chip7);
    expect(chip3.className).toContain('selected');
    expect(chip7.className).toContain('selected');
    fireEvent.click(chip3);
    expect(chip3.className).not.toContain('selected');
  });

  it('submit button disabled until procedure + grade chosen', async () => {
    renderAt('/surgical-record/HSF-003');
    await waitFor(() => expect(screen.getByText('撰寫手術紀錄')).toBeInTheDocument());

    const submit = screen.getByRole('button', { name: /儲存手術紀錄/ });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByText('痔瘡切除術'));
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Grade II' }));
    expect(submit).not.toBeDisabled();
  });

  it('submit calls saveSurgicalRecord with correct payload', async () => {
    const sb = await import('../../utils/supabaseService');
    renderAt('/surgical-record/HSF-003');
    await waitFor(() => expect(screen.getByText('撰寫手術紀錄')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Laser hemorrhoidoplasty'));
    fireEvent.click(screen.getByRole('button', { name: 'Grade III' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '7' }));

    const joules3 = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(joules3, { target: { value: '250' } });

    fireEvent.click(screen.getByRole('button', { name: /^儲存手術紀錄/ }));

    await waitFor(() => {
      expect(sb.saveSurgicalRecord).toHaveBeenCalled();
    });
    const [studyId, payload] = sb.saveSurgicalRecord.mock.calls[0];
    expect(studyId).toBe('HSF-003');
    expect(payload.procedure_type).toBe('laser_hemorrhoidoplasty');
    expect(payload.hemorrhoid_grade).toBe('III');
    expect(payload.clock_positions).toEqual([3, 7]);
    expect(payload.laser_joules['3']).toBe(250);
    expect(payload.surgeon_id).toBe('HSF');
    expect(payload.hemorrhoidectomy_subtype).toBeNull();
  });

  it('surfaces RLS error with friendly message', async () => {
    const sb = await import('../../utils/supabaseService');
    sb.saveSurgicalRecord.mockRejectedValueOnce({ code: '42501', message: 'row-level security policy' });
    renderAt('/surgical-record/HSF-003');
    await waitFor(() => expect(screen.getByText('撰寫手術紀錄')).toBeInTheDocument());

    fireEvent.click(screen.getByText('痔瘡切除術'));
    fireEvent.click(screen.getByRole('button', { name: 'Grade II' }));
    fireEvent.click(screen.getByRole('button', { name: /^儲存手術紀錄/ }));

    await waitFor(() => {
      expect(screen.getByText(/不屬於您的主刀醫師/)).toBeInTheDocument();
    });
  });

  it('patient role shows read-only banner + disabled inputs', async () => {
    render(
      <MemoryRouter initialEntries={['/surgical-record/HSF-003']}>
        <Routes>
          <Route path="/surgical-record/:studyId" element={
            <SurgicalRecord isDemo={false}
              userInfo={{ id: 'p1', role: 'patient', studyId: 'HSF-003' }} />
          } />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('檢視手術紀錄')).toBeInTheDocument());
    expect(screen.getByText(/此頁為唯讀檢視/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /儲存手術紀錄/ })).not.toBeInTheDocument();
  });

  it('demo mode shows not-supported placeholder', async () => {
    render(
      <MemoryRouter initialEntries={['/surgical-record/DEMO-001']}>
        <Routes>
          <Route path="/surgical-record/:studyId" element={
            <SurgicalRecord isDemo={true}
              userInfo={{ id: 'd1', role: 'researcher' }} />
          } />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Demo 模式不支援手術紀錄編輯/)).toBeInTheDocument();
    });
  });

  it('prefills form from existing record', async () => {
    const sb = await import('../../utils/supabaseService');
    sb.getSurgicalRecord.mockResolvedValueOnce({
      procedure_type: 'hemorrhoidectomy',
      hemorrhoidectomy_subtype: 'closed',
      hemorrhoid_grade: 'III',
      clock_positions: [3, 7, 11],
      blood_loss_ml: 25,
      duration_min: 35,
      patient_position: 'lithotomy',
      self_paid_items: ['quikclot'],
      notes: 'uneventful',
    });
    renderAt('/surgical-record/HSF-003');
    await waitFor(() => expect(screen.getByText('撰寫手術紀錄')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /痔瘡切除術/ }).className).toContain('selected');
    expect(screen.getByRole('button', { name: /^Closed/ }).className).toContain('selected');
    expect(screen.getByRole('button', { name: 'Grade III' }).className).toContain('selected');
    expect(screen.getByRole('button', { name: '7' }).className).toContain('selected');
  });
});
