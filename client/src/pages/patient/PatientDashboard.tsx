import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Pill,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Stethoscope,
  Loader2,
  CalendarCheck,
} from 'lucide-react';
import { Appointment, MedicationReminderItem } from '../../types';
import { appointmentApi, prescriptionApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { StatusBadge } from '../../components/StatusBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useNotification();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<MedicationReminderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apptRes, remRes] = await Promise.all([
        appointmentApi.getMy(),
        prescriptionApi.getTodayReminders(),
      ]);
      setAppointments(apptRes.data.appointments);
      setReminders(remRes.data.reminders);
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to load patient records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAcknowledgeDose = async (reminderId: string) => {
    try {
      await prescriptionApi.acknowledgeReminder(reminderId);
      success('Dose marked as taken', 'Medication Recorded');
      fetchData();
    } catch (err: any) {
      error('Failed to acknowledge dose');
    }
  };

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'CONFIRMED' || a.status === 'PENDING'
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Editorial Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-surface-border">
        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
            Patient Portal
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs text-slate-500 font-sans">
            Your clinical agenda, upcoming specialist appointments, and active medication schedule.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/patient/doctors"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-xl border border-surface-border transition shadow-card"
          >
            Find Specialists
          </Link>
          <Link
            to="/patient/book"
            className="px-4 py-2.5 bg-medical-700 hover:bg-medical-800 text-white text-xs font-medium rounded-xl shadow-card transition flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Book Session
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-medical-600" />
          <span className="text-xs font-mono">Loading patient data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column: Appointments */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-medical-700" />
                Upcoming Consultations
              </h2>
              <Link
                to="/patient/appointments"
                className="text-xs font-mono text-medical-700 hover:text-medical-800 flex items-center gap-1 font-semibold transition"
              >
                View History <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="bg-white rounded-3xl border border-surface-border p-10 text-center space-y-3 shadow-card">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-surface-border flex items-center justify-center mx-auto text-slate-400">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-slate-900">
                  No Upcoming Consultations
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You have no scheduled doctor visits. Schedule an appointment with our specialist directory.
                </p>
                <Link
                  to="/patient/book"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-medical-700 text-white rounded-xl text-xs font-medium shadow-card hover:bg-medical-800 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Book Consultation
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appt) => {
                  const date = new Date(appt.slot_start);
                  return (
                    <div
                      key={appt.id}
                      className="bg-white p-6 rounded-3xl border border-surface-border shadow-card hover:border-medical-400 transition space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-medical-50 border border-medical-200 flex items-center justify-center text-sm font-bold text-medical-800">
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

                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={appt.status} size="sm" />
                          <span className="text-[10px] font-mono text-slate-400">
                            #{appt.appointment_number}
                          </span>
                        </div>
                      </div>

                      {/* Date & Urgency Row */}
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-surface-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-800 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {date.toLocaleDateString('en-IN', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {appt.pre_visit_summary && (
                          <UrgencyBadge
                            level={appt.pre_visit_summary.urgency_level}
                            size="sm"
                          />
                        )}
                      </div>

                      {/* Symptoms & Actions */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <p className="text-slate-600 truncate max-w-sm">
                          <strong>Chief Complaint:</strong> {appt.symptoms_raw}
                        </p>
                        <Link
                          to="/patient/appointments"
                          className="font-mono text-xs text-medical-700 hover:text-medical-800 font-bold transition flex items-center gap-1"
                        >
                          Details <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Daily Medication Checklist */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-4 h-4 text-medical-700" />
                Today's Medications
              </h2>
              <Link
                to="/patient/prescriptions"
                className="text-xs font-mono text-medical-700 hover:text-medical-800 font-semibold transition"
              >
                All Doses
              </Link>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-4">
              {reminders.length === 0 ? (
                <div className="text-center py-8 space-y-2 text-slate-500">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-800">
                    All doses accounted for today
                  </p>
                  <p className="text-[11px] font-sans">No pending medication reminders.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reminders.map((item) => {
                    const isTaken = item.status === 'ACKNOWLEDGED';

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                          isTaken
                            ? 'bg-slate-50/50 border-surface-subtle opacity-60'
                            : 'bg-slate-50 border-surface-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">
                              {item.medication_name}
                            </h4>
                            <span className="text-[11px] font-mono text-slate-500">
                              {item.dosage} • {item.scheduled_time}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                              isTaken
                                ? 'bg-surface-subtle text-slate-600 border-surface-border'
                                : 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                            }`}
                          >
                            {isTaken ? 'Taken' : 'Scheduled'}
                          </span>
                        </div>

                        {item.special_instructions && (
                          <p className="text-[11px] text-slate-600 font-sans italic">
                            "{item.special_instructions}"
                          </p>
                        )}

                        {!isTaken && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeDose(item.id)}
                            className="w-full py-1.5 px-3 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-[11px] font-medium shadow-card transition flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Dose Taken</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
