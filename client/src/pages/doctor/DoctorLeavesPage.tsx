import React, { useState, useEffect } from 'react';
import {
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { DoctorLeave } from '../../types';
import { leaveApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Modal } from '../../components/Modal';

export const DoctorLeavesPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useNotification();

  const [leaves, setLeaves] = useState<DoctorLeave[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Leave Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [conflictResult, setConflictResult] = useState<any | null>(null);

  const fetchLeaves = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await leaveApi.getDoctorLeaves(user.id);
      setLeaves(res.data.leaves);
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to fetch doctor leaves');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [user]);

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      error('Please enter a reason for leave');
      return;
    }
    if (startDate > endDate) {
      error('Start date cannot be after end date');
      return;
    }

    setSubmitting(true);
    try {
      const res = await leaveApi.create({
        startDate,
        endDate,
        reason,
      });

      setConflictResult(res.data);
      success(
        `Leave scheduled successfully. ${res.data.affectedCount} conflicting appointment(s) resolved and patients alerted.`,
        'Leave Recorded'
      );
      fetchLeaves();
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to create leave');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLeave = async (id: string) => {
    try {
      await leaveApi.deleteLeave(id);
      success('Leave record cancelled');
      fetchLeaves();
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to cancel leave');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-surface-border">
        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
            Physician Absence Management
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Leaves & Non-Working Dates
          </h1>
          <p className="text-xs text-slate-500 font-sans">
            Schedule absences. The engine automatically cancels booking conflicts and sends priority rescheduling alerts to patients.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setConflictResult(null);
            setReason('');
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-medical-700 hover:bg-medical-800 text-white font-medium text-xs rounded-xl shadow-card transition flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Schedule New Leave
        </button>
      </div>

      {/* Info Callout */}
      <div className="p-5 bg-slate-50 border border-surface-border rounded-3xl flex items-start gap-3.5 text-xs text-slate-800">
        <AlertCircle className="w-4 h-4 text-medical-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-slate-900">Automated Patient Conflict Protection</h4>
          <p className="text-slate-600 leading-relaxed font-sans">
            When you mark leave dates, all existing bookings within the interval are safely updated to <code className="text-medical-700 font-mono font-bold">CANCELLED_DUE_TO_LEAVE</code>, calendar invites are deleted, and affected patients receive immediate email notifications with a 1-click priority rescheduling link.
          </p>
        </div>
      </div>

      {/* Leaves List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-medical-700" />
          Scheduled Leave Dates ({leaves.length})
        </h2>

        {loading ? (
          <div className="min-h-[30vh] flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-medical-600" />
            <span className="text-xs font-mono">Loading leave records...</span>
          </div>
        ) : leaves.length === 0 ? (
          <div className="bg-white rounded-3xl border border-surface-border p-10 text-center space-y-2 shadow-card">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="font-bold text-base text-slate-900">No Scheduled Leaves</h4>
            <p className="text-xs text-slate-500">
              You are currently marked available according to your regular weekly schedule.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaves.map((leave) => {
              const isPast = leave.end_date < new Date().toISOString().split('T')[0];

              return (
                <div
                  key={leave.id}
                  className={`bg-white p-6 rounded-3xl border transition shadow-card space-y-3 ${
                    isPast ? 'border-surface-subtle opacity-60' : 'border-surface-border hover:border-medical-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-medical-700" />
                      {leave.start_date === leave.end_date
                        ? leave.start_date
                        : `${leave.start_date} to ${leave.end_date}`}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-surface-border font-bold">
                      Approved
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-surface-subtle font-sans">
                    <strong>Reason:</strong> {leave.reason}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-slate-400">
                    <span>Recorded: {new Date(leave.created_at).toLocaleDateString('en-IN')}</span>
                    {!isPast && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLeave(leave.id)}
                        className="text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Cancel Leave
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Leave Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Leave Date Range"
        maxWidth="lg"
      >
        {!conflictResult ? (
          <form onSubmit={handleCreateLeave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1 font-semibold">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-mono focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1 font-semibold">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-mono focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1 font-semibold">
                Reason for Leave *
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="E.g., Medical conference, personal leave, research..."
                className="w-full p-3 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <span>
                Applying this leave will automatically resolve conflicting patient bookings and alert affected patients.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-subtle">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-medical-700 hover:bg-medical-800 disabled:opacity-50 text-white rounded-xl text-xs font-medium shadow-card transition flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm & Apply Leave'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5 text-center py-2">
            <div className="w-10 h-10 rounded-2xl bg-medical-50 border border-medical-200 text-medical-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Leave Applied Successfully</h3>
              <p className="text-xs text-slate-500 font-mono">
                {conflictResult.affectedCount} conflicting booking(s) automatically resolved.
              </p>
            </div>

            {conflictResult.affectedAppointments?.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-2xl text-left text-xs space-y-2 border border-surface-border">
                <span className="font-mono text-[10px] uppercase text-slate-400 block font-bold">
                  Patients Alerted with Priority Reschedule Link:
                </span>
                <ul className="space-y-1 text-slate-700 font-sans">
                  {conflictResult.affectedAppointments.map((a: any) => (
                    <li key={a.id} className="flex justify-between items-center py-1 border-b border-surface-subtle last:border-0">
                      <span>{a.patient_name} (#{a.appointment_number})</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {new Date(a.slot_start).toLocaleDateString('en-IN')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setConflictResult(null);
              }}
              className="w-full py-2.5 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-xs font-medium shadow-card transition"
            >
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
