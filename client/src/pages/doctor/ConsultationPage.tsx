import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Sparkles,
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Loader2,
  FileText,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { Appointment, CreatePrescriptionDto, PostVisitSummary } from '../../types';
import { appointmentApi, consultationApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { StatusBadge } from '../../components/StatusBadge';

export const ConsultationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error, warning } = useNotification();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Consultation State
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [prescriptions, setPrescriptions] = useState<CreatePrescriptionDto[]>([]);

  // AI Care Plan Preview
  const [generatingSummary, setGeneratingSummary] = useState<boolean>(false);
  const [summaryPreview, setSummaryPreview] = useState<PostVisitSummary | null>(null);

  // Submitting
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    const fetchAppt = async () => {
      setLoading(true);
      try {
        const res = await appointmentApi.getById(id);
        const appt = res.data.appointment;
        setAppointment(appt);
        if (appt.diagnosis) setDiagnosis(appt.diagnosis);
        if (appt.clinical_notes) setClinicalNotes(appt.clinical_notes);
        if (appt.post_visit_summary) setSummaryPreview(appt.post_visit_summary);
      } catch (err: any) {
        error('Failed to load consultation session');
      } finally {
        setLoading(false);
      }
    };
    fetchAppt();
  }, [id]);

  const handleAddPrescription = () => {
    const newRx: CreatePrescriptionDto = {
      medication_name: '',
      dosage: '',
      frequency: 'ONCE_DAILY',
      times_of_day: ['09:00'],
      duration_days: 7,
      special_instructions: '',
    };
    setPrescriptions([...prescriptions, newRx]);
  };

  const handleRemovePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handlePrescriptionChange = (index: number, field: keyof CreatePrescriptionDto, val: any) => {
    const updated = [...prescriptions];
    if (field === 'frequency') {
      const timesMap: Record<string, string[]> = {
        ONCE_DAILY: ['09:00'],
        TWICE_DAILY: ['09:00', '21:00'],
        THRICE_DAILY: ['08:00', '14:00', '20:00'],
        FOUR_TIMES_DAILY: ['08:00', '12:00', '16:00', '20:00'],
        AS_NEEDED: ['09:00'],
      };
      updated[index] = {
        ...updated[index],
        frequency: val,
        times_of_day: timesMap[val] || ['09:00'],
      };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setPrescriptions(updated);
  };

  const handleGenerateSummaryPreview = async () => {
    if (!clinicalNotes.trim()) {
      error('Please write clinical notes first to generate care summary');
      return;
    }
    setGeneratingSummary(true);
    try {
      const res = await consultationApi.previewSummary({
        clinicalNotes,
        diagnosis,
      });
      setSummaryPreview(res.data.summary);
      success('AI patient care plan generated', 'Care Plan Ready');
    } catch (err: any) {
      error('Failed to generate AI care summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!id) return;
    if (!diagnosis.trim()) {
      error('Please record a formal medical diagnosis');
      return;
    }
    if (!clinicalNotes.trim()) {
      error('Please enter physician clinical notes');
      return;
    }

    setSubmitting(true);
    try {
      await consultationApi.complete({
        appointmentId: id,
        diagnosis,
        clinicalNotes,
        prescriptions,
      });

      success('Consultation concluded, care plan delivered to patient', 'Completed');
      navigate('/doctor/dashboard');
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to complete consultation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-medical-600" />
        <span className="text-xs font-mono">Loading consultation session...</span>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <p className="text-xs text-slate-500">Consultation record not found.</p>
        <button
          onClick={() => navigate('/doctor/dashboard')}
          className="px-4 py-2 bg-medical-700 text-white rounded-xl text-xs font-medium"
        >
          Return to Agenda
        </button>
      </div>
    );
  }

  const isCompleted = appointment.status === 'COMPLETED';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <button
          type="button"
          onClick={() => navigate('/doctor/dashboard')}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Agenda</span>
        </button>

        <div className="flex items-center gap-2">
          <StatusBadge status={appointment.status} size="sm" />
          <span className="text-xs font-mono text-slate-400">
            #{appointment.appointment_number}
          </span>
        </div>
      </div>

      {/* Patient Intake Header */}
      <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-medical-700 font-bold">
              Patient Profile & Intake
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {appointment.patient_name}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              {appointment.patient_email} • {appointment.patient_phone || 'No phone recorded'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-surface-subtle text-xs font-mono text-slate-700">
            <span>Session: </span>
            <span className="font-bold text-slate-900">
              {new Date(appointment.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* AI Pre-Visit Triage Card */}
        {appointment.pre_visit_summary && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-surface-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3 h-3 text-medical-700" />
                Pre-Visit AI Urgency Assessment
              </span>
              <UrgencyBadge
                level={appointment.pre_visit_summary.urgency_level}
                size="sm"
              />
            </div>

            <p className="text-xs text-slate-800">
              <strong>Chief Complaint:</strong> {appointment.pre_visit_summary.chief_complaint}
            </p>
            <p className="text-xs text-slate-600">
              <strong>Raw Symptoms:</strong> {appointment.symptoms_raw}
            </p>

            {appointment.pre_visit_summary.suggested_questions?.length > 0 && (
              <div className="pt-2 border-t border-surface-subtle text-xs space-y-1">
                <span className="font-mono text-[10px] uppercase text-slate-400 font-bold">
                  Recommended Diagnostic Questions:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700 font-sans">
                  {appointment.pre_visit_summary.suggested_questions.map((q: string, idx: number) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Consultation Documentation Form */}
      <div className="space-y-6">
        {/* Diagnosis & Notes */}
        <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-5">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-medical-700" />
            Clinical Evaluation & Findings
          </h3>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-semibold">
              Medical Diagnosis *
            </label>
            <input
              type="text"
              disabled={isCompleted}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="E.g., Acute Sinusitis, Tension Headache, Essential Hypertension Grade 1..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:ring-2 focus:ring-medical-600 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-semibold">
              Physician Clinical Notes *
            </label>
            <textarea
              rows={4}
              disabled={isCompleted}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Document patient physical examination, diagnostic rationales, lifestyle guidance, and prognosis..."
              className="w-full p-4 bg-slate-50 border border-surface-border rounded-2xl text-xs font-sans text-slate-900 focus:bg-white focus:ring-2 focus:ring-medical-600 focus:outline-none disabled:opacity-60 leading-relaxed"
            />
          </div>
        </div>

        {/* Prescription Builder */}
        {!isCompleted && (
          <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-4 h-4 text-medical-700" />
                Medication Prescriptions ({prescriptions.length})
              </h3>

              <button
                type="button"
                onClick={handleAddPrescription}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-900 border border-surface-border rounded-xl text-xs font-medium transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-medical-700" /> Add Drug
              </button>
            </div>

            {prescriptions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No medications prescribed for this consultation.</p>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((rx, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 rounded-2xl border border-surface-border space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-semibold">
                          Medication Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={rx.medication_name}
                          onChange={(e) =>
                            handlePrescriptionChange(idx, 'medication_name', e.target.value)
                          }
                          placeholder="E.g., Metoprolol / Betaloc"
                          className="w-full px-3 py-1.5 bg-white border border-surface-border rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-medical-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-semibold">
                          Dosage *
                        </label>
                        <input
                          type="text"
                          required
                          value={rx.dosage}
                          onChange={(e) => handlePrescriptionChange(idx, 'dosage', e.target.value)}
                          placeholder="E.g., 25mg"
                          className="w-full px-3 py-1.5 bg-white border border-surface-border rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-medical-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-semibold">
                          Frequency
                        </label>
                        <select
                          value={rx.frequency}
                          onChange={(e) =>
                            handlePrescriptionChange(idx, 'frequency', e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-white border border-surface-border rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-medical-600"
                        >
                          <option value="ONCE_DAILY">Once Daily</option>
                          <option value="TWICE_DAILY">Twice Daily</option>
                          <option value="THRICE_DAILY">Thrice Daily</option>
                          <option value="FOUR_TIMES_DAILY">4 Times Daily</option>
                          <option value="AS_NEEDED">As Needed (PRN)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-semibold">
                          Course Duration (Days)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={rx.duration_days}
                          onChange={(e) =>
                            handlePrescriptionChange(idx, 'duration_days', parseInt(e.target.value, 10))
                          }
                          className="w-full px-3 py-1.5 bg-white border border-surface-border rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-medical-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1 font-semibold">
                          Instructions
                        </label>
                        <input
                          type="text"
                          value={rx.special_instructions}
                          onChange={(e) =>
                            handlePrescriptionChange(idx, 'special_instructions', e.target.value)
                          }
                          placeholder="Take after meals with water..."
                          className="w-full px-3 py-1.5 bg-white border border-surface-border rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-medical-600"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemovePrescription(idx)}
                        className="text-rose-600 hover:text-rose-800 text-xs font-medium flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Post-Visit Care Plan Generator */}
        <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-medical-700" />
                AI Post-Visit Patient Care Plan
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                Translates clinical notes into a clear, empathetic summary and follow-up regimen for the patient.
              </p>
            </div>

            {!isCompleted && (
              <button
                type="button"
                onClick={handleGenerateSummaryPreview}
                disabled={generatingSummary}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-900 border border-surface-border rounded-xl text-xs font-medium transition shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {generatingSummary ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-medical-700" />
                )}
                <span>Generate Care Plan</span>
              </button>
            )}
          </div>

          {summaryPreview && (
            <div className="p-5 bg-slate-50 rounded-2xl border border-surface-border space-y-4 text-xs">
              <div>
                <span className="font-mono text-[10px] uppercase text-slate-400 block mb-1 font-bold">
                  Empathetic Patient Summary
                </span>
                <p className="text-slate-800 leading-relaxed font-sans">{summaryPreview.patient_friendly_summary}</p>
              </div>

              {summaryPreview.follow_up_steps?.length > 0 && (
                <div>
                  <span className="font-mono text-[10px] uppercase text-slate-400 block mb-1 font-bold">
                    Recommended Follow-up Actions
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700 font-sans">
                    {summaryPreview.follow_up_steps.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Complete Session Action */}
        {!isCompleted && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCompleteConsultation}
              disabled={submitting}
              className="px-6 py-3 bg-medical-700 hover:bg-medical-800 disabled:opacity-50 text-white rounded-xl text-xs font-medium shadow-card transition flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Conclude Consultation & Deliver Care Plan</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
