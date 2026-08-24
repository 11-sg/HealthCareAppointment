import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { UserRole } from '../../types';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { success, error } = useNotification();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('PATIENT');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newUser = await register({ name, email, password, phone, role });
      success(`Welcome to CareFlow, ${newUser.name}`);
      if (newUser.role === 'DOCTOR') navigate('/doctor/dashboard');
      else navigate('/patient/dashboard');
    } catch (err: any) {
      error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
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
            Create CareFlow Account
          </h1>
          <p className="text-xs text-slate-500 font-sans">
            Join the clinical portal as a patient or medical practitioner.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-surface-border shadow-card space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-semibold">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Mehta"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:ring-2 focus:ring-medical-600 focus:border-medical-600 focus:outline-none transition"
                />
              </div>
            </div>

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
                  placeholder="aarav.mehta@example.com"
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

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-semibold">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98123 45678"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:ring-2 focus:ring-medical-600 focus:border-medical-600 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-semibold">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('PATIENT')}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-medium transition text-center ${
                    role === 'PATIENT'
                      ? 'bg-medical-700 text-white border-medical-700 shadow-card font-bold'
                      : 'bg-slate-50 text-slate-700 border-surface-border hover:bg-slate-100'
                  }`}
                >
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => setRole('DOCTOR')}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-medium transition text-center ${
                    role === 'DOCTOR'
                      ? 'bg-medical-700 text-white border-medical-700 shadow-card font-bold'
                      : 'bg-slate-50 text-slate-700 border-surface-border hover:bg-slate-100'
                  }`}
                >
                  Doctor / Practitioner
                </button>
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
                  <span>Create Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-surface-subtle text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-medical-700 hover:text-medical-800 transition">
              Sign in to your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
