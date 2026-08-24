import React, { useState, useEffect } from 'react';
import { Pill, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Prescription, MedicationReminderItem } from '../../types';
import { prescriptionApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

export const PrescriptionsPage: React.FC = () => {
  const { success, error } = useNotification();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [reminders, setReminders] = useState<MedicationReminderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [presRes, remRes] = await Promise.all([
        prescriptionApi.getMy(),
        prescriptionApi.getTodayReminders(),
      ]);
      setPrescriptions(presRes.data.prescriptions);
      setReminders(remRes.data.reminders);
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to fetch prescription records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      await prescriptionApi.acknowledgeReminder(id);
      success('Medication dose recorded as taken');
      fetchData();
    } catch (err: any) {
      error('Failed to acknowledge reminder');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-surface-border">
        <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
          Pharmacotherapy
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Active Prescriptions & Regimens
        </h1>
        <p className="text-xs text-slate-500 font-sans">
          Track daily medication dosage timings, special dietary instructions, and active prescription courses.
        </p>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-medical-600" />
          <span className="text-xs font-mono">Loading prescriptions...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Today's Dose Checklist */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-medical-700" />
              Today's Scheduled Dosages
            </h2>

            {reminders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-surface-border p-8 text-center space-y-2 shadow-card">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="font-bold text-base text-slate-900">All Dosages Logged</h4>
                <p className="text-xs text-slate-500">No pending doses remaining for today.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {reminders.map((rem) => {
                  const isTaken = rem.status === 'ACKNOWLEDGED';
                  return (
                    <div
                      key={rem.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isTaken
                          ? 'bg-slate-50/50 border-surface-subtle opacity-60'
                          : 'bg-white border-surface-border shadow-card'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">
                            {rem.medication_name}
                          </h4>
                          <span className="text-xs font-mono text-medical-700 block font-semibold">
                            {rem.dosage}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {rem.scheduled_time}
                        </span>
                      </div>

                      {rem.special_instructions && (
                        <p className="text-[11px] text-slate-600 font-sans italic">
                          "{rem.special_instructions}"
                        </p>
                      )}

                      {!isTaken ? (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(rem.id)}
                          className="w-full py-2 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-xs font-medium shadow-card transition flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Acknowledge Dose</span>
                        </button>
                      ) : (
                        <div className="text-center py-1 text-[11px] font-mono text-slate-500 font-bold">
                          ✓ Completed
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Active Prescription Records */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Pill className="w-4 h-4 text-medical-700" />
              All Prescribed Medications ({prescriptions.length})
            </h2>

            {prescriptions.length === 0 ? (
              <div className="bg-white rounded-3xl border border-surface-border p-10 text-center space-y-2 shadow-card">
                <Pill className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="font-bold text-base text-slate-900">No Prescriptions Found</h4>
                <p className="text-xs text-slate-500">
                  Your prescribed regimens will be listed here after clinical consultations.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {prescriptions.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white p-5 rounded-3xl border border-surface-border shadow-card space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-subtle">
                      <div>
                        <h3 className="font-bold text-base text-slate-900">
                          {p.medication_name}
                        </h3>
                        <span className="text-xs font-mono text-slate-500">
                          Dosage: {p.dosage} • Frequency: {p.frequency.replace('_', ' ')}
                        </span>
                      </div>

                      <span className="text-xs font-mono text-slate-400">
                        {p.duration_days} Day Course ({p.start_date} to {p.end_date})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 font-mono text-slate-700">
                        <span className="text-slate-400">Daily Timing:</span>
                        {p.times_of_day.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-50 border border-surface-border text-slate-800 font-semibold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      {p.special_instructions && (
                        <p className="text-slate-600 font-sans italic">
                          "{p.special_instructions}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
