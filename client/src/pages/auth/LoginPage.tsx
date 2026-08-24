import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, User, Stethoscope, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const { login, switchDemoRole } = useAuth();
  const { success, error } = useNotification();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      success(`Welcome back, ${loggedUser.name}`);
      if (loggedUser.role === 'DOCTOR') navigate('/doctor/dashboard');
      else if (loggedUser.role === 'ADMIN') navigate('/admin/dashboard');
      else navigate('/patient/dashboard');
    } catch (err: any) {
      error(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    try {
      const loggedUser = await switchDemoRole(role);
      success(`Signed in as demo ${loggedUser.name} (${role.toLowerCase()})`);
      if (role === 'DOCTOR') navigate('/doctor/dashboard');
      else if (role === 'ADMIN') navigate('/admin/dashboard');
      else navigate('/patient/dashboard');
    } catch (err: any) {
      error('Demo login failed');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-canvas">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-medical-700 text-white flex items-center justify-center text-lg font-bold mx-auto shadow-card">
            C
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Sign In to CareFlow
          </h1>
          <p className="text-xs text-slate-500 font-sans">
            Access appointments, medical records, and physician dashboard.
          </p>
        </div>

        {/* 1-Click Demo Logins */}
        <div className="bg-white p-4 rounded-2xl border border-surface-border shadow-card space-y-2.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block text-center font-bold">
            ⚡ 1-Click Demo Personas
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('PATIENT')}
              className="px-2.5 py-2.5 rounded-xl bg-slate-50 hover:bg-medical-50 border border-surface-border hover:border-medical-300 text-slate-800 text-[11px] font-medium transition text-center shadow-sm"
            >
              <User className="w-3.5 h-3.5 mx-auto mb-1 text-slate-600" />
              Patient
              <span className="block text-[9px] text-slate-400 font-normal">Aarav</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('DOCTOR')}
              className="px-2.5 py-2.5 rounded-xl bg-slate-50 hover:bg-medical-50 border border-surface-border hover:border-medical-300 text-slate-800 text-[11px] font-medium transition text-center shadow-sm"
            >
              <Stethoscope className="w-3.5 h-3.5 mx-auto mb-1 text-medical-700" />
              Doctor
              <span className="block text-[9px] text-medical-700 font-bold">Dr. Sharma</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('ADMIN')}
              className="px-2.5 py-2.5 rounded-xl bg-slate-50 hover:bg-medical-50 border border-surface-border hover:border-medical-300 text-slate-800 text-[11px] font-medium transition text-center shadow-sm"
            >
              <Shield className="w-3.5 h-3.5 mx-auto mb-1 text-slate-600" />
              Admin
              <span className="block text-[9px] text-slate-400 font-normal">Clinic Admin</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white p-8 rounded-3xl border border-surface-border shadow-card space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-semibold">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@careflow.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:ring-2 focus:ring-medical-600 focus:border-medical-600 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-semibold">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:ring-2 focus:ring-medical-600 focus:border-medical-600 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-medical-700 hover:bg-medical-800 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-card transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-surface-subtle text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-medical-700 hover:text-medical-800 transition">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
