import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  Stethoscope,
  Mail,
  Activity,
  Plus,
  RefreshCw,
  Loader2,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

export const AdminDashboard: React.FC = () => {
  const { error } = useNotification();
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getStats();
      setStats(res.data.stats);
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to fetch admin statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-medical-600" />
        <span className="text-xs font-mono">Loading operations metrics...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-surface-border">
        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
            Clinic Operations Center
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Executive Practice Administration
          </h1>
          <p className="text-xs text-slate-500 font-sans">
            Real-time monitoring of appointment volume, specialist availability, and transactional notification delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/doctors"
            className="px-4 py-2.5 bg-medical-700 hover:bg-medical-800 text-white font-medium text-xs rounded-xl shadow-card transition flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Add Doctor Profile
          </Link>
          <button
            type="button"
            onClick={fetchStats}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-surface-border transition shadow-card"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Total Bookings</span>
            <div className="w-7 h-7 rounded-lg bg-medical-50 border border-medical-200 flex items-center justify-center text-medical-700">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats?.totalAppointments || 0}</p>
          <p className="text-xs font-mono text-medical-700 font-bold">{stats?.todayAppointments || 0} scheduled today</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Active Doctors</span>
            <div className="w-7 h-7 rounded-lg bg-medical-50 border border-medical-200 flex items-center justify-center text-medical-700">
              <Stethoscope className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats?.totalDoctors || 0}</p>
          <p className="text-xs font-mono text-slate-500">{stats?.activeLeaves || 0} away on leave today</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Patients Registered</span>
            <div className="w-7 h-7 rounded-lg bg-medical-50 border border-medical-200 flex items-center justify-center text-medical-700">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats?.totalPatients || 0}</p>
          <p className="text-xs font-mono text-slate-500">{stats?.completedAppointments || 0} visits completed</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Outbox Dispatches</span>
            <div className="w-7 h-7 rounded-lg bg-medical-50 border border-medical-200 flex items-center justify-center text-medical-700">
              <Mail className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats?.emailQueue?.sent || 0}</p>
          <p className="text-xs font-mono text-amber-800 font-semibold">
            {stats?.emailQueue?.pending || 0} pending • {stats?.emailQueue?.failed || 0} failed
          </p>
        </div>
      </div>

      {/* Quick Operations Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/admin/doctors"
          className="bg-white p-6 rounded-3xl border border-surface-border shadow-card hover:border-medical-400 transition space-y-3 group"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-surface-border flex items-center justify-center text-slate-800 group-hover:border-medical-600 transition">
            <Stethoscope className="w-4 h-4 text-medical-700" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 group-hover:text-medical-700 transition">
            Physician Management
          </h3>
          <p className="text-xs text-slate-500 font-sans leading-relaxed">
            Register new physicians, adjust consultation fees, alter slot duration intervals, and manage status.
          </p>
        </Link>

        <Link
          to="/admin/appointments"
          className="bg-white p-6 rounded-3xl border border-surface-border shadow-card hover:border-medical-400 transition space-y-3 group"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-surface-border flex items-center justify-center text-slate-800 group-hover:border-medical-600 transition">
            <Calendar className="w-4 h-4 text-medical-700" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 group-hover:text-medical-700 transition">
            Clinic Master Bookings
          </h3>
          <p className="text-xs text-slate-500 font-sans leading-relaxed">
            Examine all bookings across the platform, search by reference number, and monitor cancellation reasons.
          </p>
        </Link>

        <Link
          to="/admin/queue"
          className="bg-white p-6 rounded-3xl border border-surface-border shadow-card hover:border-medical-400 transition space-y-3 group"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-surface-border flex items-center justify-center text-slate-800 group-hover:border-medical-600 transition">
            <Activity className="w-4 h-4 text-medical-700" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 group-hover:text-medical-700 transition">
            Outbox Queue & Cron Workers
          </h3>
          <p className="text-xs text-slate-500 font-sans leading-relaxed">
            Monitor outbound transactional email delivery, retry failed notifications, and trigger cron sweeps.
          </p>
        </Link>
      </div>
    </div>
  );
};
