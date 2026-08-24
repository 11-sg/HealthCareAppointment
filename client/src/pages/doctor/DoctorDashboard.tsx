import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  FileText,
  CheckCircle2,
  Stethoscope,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Appointment } from '../../types';
import { appointmentApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { StatusBadge } from '../../components/StatusBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { error } = useNotification();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentApi.getMy();
      setAppointments(res.data.appointments);
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to load doctor appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const todayAppointments = appointments.filter((a) => {
    return a.slot_start.startsWith(selectedDate);
  });

  const pendingCount = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-surface-border">
        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
            Physician Agenda
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Dr. {user?.name}'s Consultations
          </h1>
          <p className="text-xs text-slate-500 font-sans">
            Review incoming patient symptoms, pre-visit triage urgency ratings, and start clinical sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/doctor/leaves"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-xl border border-surface-border transition shadow-card"
          >
            Manage Leaves
          </Link>
          <Link
            to="/doctor/schedule-settings"
            className="px-4 py-2.5 bg-medical-700 hover:bg-medical-800 text-white text-xs font-medium rounded-xl shadow-card transition"
          >
            Working Hours
          </Link>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-surface-border shadow-card space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Scheduled on Date
          </span>
          <p className="text-3xl font-bold text-slate-900">{todayAppointments.length}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-surface-border shadow-card space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Pending Consultations
          </span>
          <p className="text-3xl font-bold text-medical-700">{pendingCount}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-surface-border shadow-card space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Completed Visits
          </span>
          <p className="text-3xl font-bold text-slate-900">{completedCount}</p>
        </div>
      </div>

      {/* Agenda Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-medical-700" />
            Clinical Agenda for {new Date(selectedDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h2>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-white border border-surface-border rounded-xl text-xs font-mono text-slate-800 focus:outline-none shadow-card"
          />
        </div>

        {loading ? (
          <div className="min-h-[30vh] flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-medical-600" />
            <span className="text-xs font-mono">Loading physician schedule...</span>
          </div>
        ) : todayAppointments.length === 0 ? (
          <div className="bg-white rounded-3xl border border-surface-border p-12 text-center space-y-2 shadow-card">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="font-bold text-base text-slate-900">No Consultations Scheduled</h4>
            <p className="text-xs text-slate-500">
              No appointments are booked for this date.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayAppointments.map((appt) => {
              const time = new Date(appt.slot_start).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={appt.id}
                  className="bg-white p-6 rounded-3xl border border-surface-border shadow-card hover:border-medical-400 transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-subtle">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-medical-50 border border-medical-200 flex items-center justify-center text-base font-bold text-medical-800">
                        {appt.patient_name ? appt.patient_name.charAt(0) : 'P'}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900">
                          {appt.patient_name}
                        </h3>
                        <span className="text-xs font-mono text-slate-500">
                          {appt.patient_email} • #{appt.appointment_number}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={appt.status} size="sm" />
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-xl border border-surface-border">
                        {time}
                      </span>
                    </div>
                  </div>

                  {/* AI Triage Card */}
                  {appt.pre_visit_summary && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-surface-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-bold">
                          <Sparkles className="w-3 h-3 text-medical-700" />
                          Pre-Visit Triage Symptom Summary
                        </span>
                        <UrgencyBadge
                          level={appt.pre_visit_summary.urgency_level}
                          size="sm"
                        />
                      </div>

                      <p className="text-xs text-slate-800">
                        <strong>Chief Complaint:</strong> {appt.pre_visit_summary.chief_complaint}
                      </p>

                      {appt.pre_visit_summary.suggested_questions?.length > 0 && (
                        <div className="pt-1.5 border-t border-surface-subtle text-xs space-y-1">
                          <span className="font-mono text-[10px] uppercase text-slate-400 font-bold">
                            Suggested Diagnostic Inquiries:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-700 font-sans">
                            {appt.pre_visit_summary.suggested_questions.map((q: string, idx: number) => (
                              <li key={idx}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-500 truncate max-w-sm">
                      <strong>Raw Symptoms:</strong> {appt.symptoms_raw}
                    </span>

                    <Link
                      to={`/doctor/consultation/${appt.id}`}
                      className="px-4 py-2 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-xs font-medium shadow-card transition flex items-center gap-1.5"
                    >
                      <span>{appt.status === 'COMPLETED' ? 'View Record' : 'Begin Consultation'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
