import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Search,
  Stethoscope,
  User,
  Activity,
  Loader2,
  Filter,
} from 'lucide-react';
import { Appointment } from '../../types';
import { appointmentApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { StatusBadge } from '../../components/StatusBadge';
import { UrgencyBadge } from '../../components/UrgencyBadge';

export const AdminAppointmentsPage: React.FC = () => {
  const { error } = useNotification();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  const filteredAppointments = appointments.filter((appt) => {
    const matchesStatus = statusFilter === 'all' || appt.status === statusFilter;
    const matchesSearch =
      !search ||
      appt.appointment_number.toLowerCase().includes(search.toLowerCase()) ||
      appt.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      appt.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
      appt.doctor_specialization?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-surface-border">
        <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
          Clinic Ledger
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Master Consultations Ledger
        </h1>
        <p className="text-xs text-slate-500 font-sans">
          Audit all patient visits, triage classifications, and cancellation statuses across the platform.
        </p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ref #, patient, doctor..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-surface-border rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-medical-600 shadow-card"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-surface-border rounded-xl text-xs font-mono text-slate-800 focus:outline-none shadow-card"
          >
            <option value="all">All Statuses ({appointments.length})</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED_BY_PATIENT">Cancelled by Patient</option>
            <option value="CANCELLED_BY_DOCTOR">Cancelled by Doctor</option>
            <option value="CANCELLED_DUE_TO_LEAVE">Cancelled Due to Leave</option>
          </select>
        </div>
      </div>

      {/* Appointments Table */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-medical-600" />
          <span className="text-xs font-mono">Loading ledger entries...</span>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-surface-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-surface-border text-slate-500 font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Ref #</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Specialist</th>
                  <th className="py-3 px-4">Slot Time</th>
                  <th className="py-3 px-4">Triage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Chief Complaint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-subtle font-sans text-slate-700">
                {filteredAppointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-4 font-mono text-slate-900 font-bold">
                      #{appt.appointment_number}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 block text-xs">
                        {appt.patient_name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{appt.patient_email}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 block text-xs">
                        Dr. {appt.doctor_name}
                      </span>
                      <span className="text-[11px] font-mono text-medical-700 font-semibold">
                        {appt.doctor_specialization}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-900">
                      {new Date(appt.slot_start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}{' '}
                      {new Date(appt.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-4">
                      {appt.pre_visit_summary ? (
                        <UrgencyBadge level={appt.pre_visit_summary.urgency_level} size="sm" />
                      ) : (
                        <span className="text-slate-400 text-[11px] font-mono">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={appt.status} size="sm" />
                    </td>
                    <td className="py-4 px-4 max-w-xs truncate text-slate-600">
                      {appt.symptoms_raw}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
