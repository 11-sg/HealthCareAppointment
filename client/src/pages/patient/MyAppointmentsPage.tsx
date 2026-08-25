import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Download,
  CalendarX,
  FileText,
  RotateCcw,
  Sparkles,
  Loader2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Appointment } from '../../types';
import { appointmentApi, getApiUrl } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { StatusBadge } from '../../components/StatusBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { Modal } from '../../components/Modal';

export const MyAppointmentsPage: React.FC = () => {
  const { success, error } = useNotification();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Summary Modal
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [activeSummaryAppt, setActiveSummaryAppt] = useState<Appointment | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentApi.getMy();
      setAppointments(res.data.appointments);
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;
    setCancelLoading(true);
    try {
      await appointmentApi.cancel(selectedAppt.id, { reason: cancelReason });
      success('Consultation cancelled successfully');
      setCancelModalOpen(false);
      setCancelReason('');
      fetchAppointments();
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to cancel consultation');
    } finally {
      setCancelLoading(false);
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    if (filter === 'UPCOMING') return appt.status === 'CONFIRMED' || appt.status === 'PENDING';
    if (filter === 'COMPLETED') return appt.status === 'COMPLETED';
    if (filter === 'CANCELLED')
      return (
        appt.status === 'CANCELLED_BY_PATIENT' ||
        appt.status === 'CANCELLED_BY_DOCTOR' ||
        appt.status === 'CANCELLED_DUE_TO_LEAVE'
      );
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-surface-border">
        <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
          Medical History
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          My Consultations & Visits
        </h1>
        <p className="text-xs text-slate-500 font-sans">
          Review previous sessions, download calendar invites, inspect post-visit care plans, or reschedule appointments.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(['ALL', 'UPCOMING', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition border ${
              filter === tab
                ? 'bg-medical-700 text-white border-medical-700 shadow-card font-bold'
                : 'bg-white text-slate-700 border-surface-border hover:bg-slate-50'
            }`}
          >
            {tab === 'ALL' ? 'All Sessions' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-medical-600" />
          <span className="text-xs font-mono">Loading sessions...</span>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-surface-border p-12 text-center space-y-3 shadow-card">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="font-bold text-lg text-slate-900">No Consultations Recorded</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are no appointments matching the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appt) => {
            const date = new Date(appt.slot_start);
            const isUpcoming = appt.status === 'CONFIRMED' || appt.status === 'PENDING';

            return (
              <div
                key={appt.id}
                className="bg-white p-6 rounded-3xl border border-surface-border shadow-card hover:border-medical-400 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-medical-50 border border-medical-200 flex items-center justify-center text-sm font-bold text-medical-800">
                      Dr
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">
                        Dr. {appt.doctor_name}
                      </h3>
                      <span className="text-xs font-mono text-medical-700 font-semibold">
                        {appt.doctor_specialization}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={appt.status} size="sm" />
                    <span className="text-xs font-mono text-slate-400">
                      #{appt.appointment_number}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-surface-subtle space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                      Scheduled Session
                    </span>
                    <span className="font-mono font-medium text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {date.toLocaleDateString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-surface-subtle space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                      Triage Assessment
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 truncate max-w-[200px]">
                        {appt.pre_visit_summary?.chief_complaint || appt.symptoms_raw}
                      </span>
                      {appt.pre_visit_summary && (
                        <UrgencyBadge
                          level={appt.pre_visit_summary.urgency_level}
                          size="sm"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    {appt.post_visit_summary && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSummaryAppt(appt);
                          setSummaryModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-900 border border-surface-border font-medium transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-medical-700" />
                        <span>View Care Plan</span>
                      </button>
                    )}

                    <a
                      href={getApiUrl(`/appointments/${appt.id}/ics`)}
                      download
                      className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-surface-border font-mono text-[11px] transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>.ics</span>
                    </a>
                  </div>

                  {isUpcoming && (
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/patient/book?doctorId=${appt.doctor_id}&rescheduleApptId=${appt.id}`}
                        className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-surface-border font-medium transition flex items-center gap-1.5 shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reschedule</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAppt(appt);
                          setCancelModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-medium transition flex items-center gap-1.5"
                      >
                        <CalendarX className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title={`Cancel Consultation #${selectedAppt?.appointment_number}`}
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            Please provide a cancellation reason. The physician will be notified and your time slot released.
          </p>

          <div>
            <textarea
              rows={3}
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="E.g., Conflict in personal schedule, symptoms resolved..."
              className="w-full p-3 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:ring-2 focus:ring-medical-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-subtle">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={cancelLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium shadow-card transition flex items-center gap-2"
            >
              {cancelLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Post-Visit Care Plan Modal */}
      <Modal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        title={`Post-Visit Care Plan #${activeSummaryAppt?.appointment_number}`}
        maxWidth="lg"
      >
        {activeSummaryAppt?.post_visit_summary && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-surface-border space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                Clinical Care Summary
              </span>
              <p className="text-slate-800 leading-relaxed font-sans">
                {activeSummaryAppt.post_visit_summary.patient_friendly_summary}
              </p>
            </div>

            {activeSummaryAppt.post_visit_summary.medication_schedule?.length > 0 && (
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                  Prescribed Medication Schedule
                </span>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-surface-border space-y-2">
                  {activeSummaryAppt.post_visit_summary.medication_schedule.map((m: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs pb-1.5 border-b border-surface-subtle last:border-0 last:pb-0">
                      <span className="font-bold text-slate-900">{m.medication || m.medication_name} ({m.dosage})</span>
                      <span className="font-mono text-slate-600">{m.instructions || m.frequency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSummaryAppt.post_visit_summary.follow_up_steps?.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                  Follow-up Action Steps
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-700 font-sans">
                  {activeSummaryAppt.post_visit_summary.follow_up_steps.map((step: string, i: number) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
