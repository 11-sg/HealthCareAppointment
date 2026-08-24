import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  User,
  LogOut,
  ChevronDown,
  Stethoscope,
  Shield,
  Pill,
  Menu,
  X,
  Layers,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { user, logout, switchDemoRole } = useAuth();
  const { success } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRoleSwitch = async (role: UserRole) => {
    await switchDemoRole(role);
    setDemoMenuOpen(false);
    setMobileMenuOpen(false);
    success(`Switched active persona to ${role.toLowerCase()}`);
    if (role === 'DOCTOR') navigate('/doctor/dashboard');
    else if (role === 'ADMIN') navigate('/admin/dashboard');
    else navigate('/patient/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-surface-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-medical-700 text-white flex items-center justify-center font-bold text-base shadow-card group-hover:bg-medical-800 transition-colors">
                C
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-ink-900 tracking-tight leading-none group-hover:text-medical-700 transition-colors">
                  CareFlow
                </span>
                <span className="text-[10px] font-mono tracking-wider text-ink-400 uppercase mt-0.5">
                  Clinical Practice
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            {user && (
              <nav className="hidden md:flex items-center gap-1">
                {user.role === 'PATIENT' && (
                  <>
                    <Link
                      to="/patient/dashboard"
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive('/patient/dashboard')
                          ? 'bg-medical-700 text-white shadow-card'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-muted'
                      }`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/patient/doctors"
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive('/patient/doctors')
                          ? 'bg-medical-700 text-white shadow-card'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-muted'
                      }`}
                    >
                      Physicians
                    </Link>
                    <Link
                      to="/patient/book"
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive('/patient/book')
                          ? 'bg-medical-700 text-white shadow-card'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-muted'
                      }`}
                    >
                      Book Session
                    </Link>
                    <Link
                      to="/patient/appointments"
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive('/patient/appointments')
                          ? 'bg-medical-700 text-white shadow-card'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-muted'
                      }`}
                    >
                      My Consultations
                    </Link>
                    <Link
                      to="/patient/prescriptions"
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive('/patient/prescriptions')
                          ? 'bg-medical-700 text-white shadow-card'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-muted'
                      }`}
                    >
                      Prescriptions
                    </Link>
                  </>
                )}

                {(user.role === 'DOCTOR' || user.role === 'ADMIN') && (
                  <>
                    <Link
                      to="/doctor/dashboard"
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive('/doctor/dashboard')
                          ? 'bg-medical-700 text-white shadow-card'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-muted'
                      }`}
                    >
                      Doctor Agenda
                    </Link>
                    <Link
                      to="/doctor/leaves"
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive('/doctor/leaves')
                          ? 'bg-medical-700 text-white shadow-card'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-muted'
                      }`}
                    >
                      Leaves & Absences
                    </Link>
                    <Link
                      to="/doctor/schedule-settings"
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive('/doctor/schedule-settings')
                          ? 'bg-medical-700 text-white shadow-card'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-muted'
                      }`}
                    >
                      Working Hours
                    </Link>
                  </>
                )}

                {user.role === 'ADMIN' && (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive('/admin/dashboard')
                          ? 'bg-medical-700 text-white shadow-card'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-muted'
                      }`}
                    >
                      Operations Hub
                    </Link>
                    <Link
                      to="/admin/doctors"
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive('/admin/doctors')
                          ? 'bg-medical-700 text-white shadow-card'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-muted'
                      }`}
                    >
                      Doctors
                    </Link>
                    <Link
                      to="/admin/appointments"
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive('/admin/appointments')
                          ? 'bg-medical-700 text-white shadow-card'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-muted'
                      }`}
                    >
                      All Bookings
                    </Link>
                    <Link
                      to="/admin/queue"
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive('/admin/queue')
                          ? 'bg-medical-700 text-white shadow-card'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-muted'
                      }`}
                    >
                      Outbox Queue
                    </Link>
                    <Link
                      to="/admin/system-design"
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive('/admin/system-design')
                          ? 'bg-medical-700 text-white shadow-card'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-muted'
                      }`}
                    >
                      Architecture
                    </Link>
                  </>
                )}
              </nav>
            )}
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-3">
            {/* 1-Click Demo Persona Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-ink-800 bg-surface-muted hover:bg-surface-subtle border border-surface-border rounded-xl transition shadow-card"
              >
                <Layers className="w-3.5 h-3.5 text-medical-700" />
                <span className="hidden sm:inline font-mono text-[11px] uppercase tracking-wider text-ink-500">
                  Persona:
                </span>
                <span className="font-semibold text-ink-900">{user?.role || 'Guest'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-ink-400" />
              </button>

              {demoMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-surface-border shadow-elevated p-2 space-y-1 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-ink-400 border-b border-surface-subtle mb-1">
                    Select Interactive Persona
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('PATIENT')}
                    className="w-full px-3 py-2 text-left rounded-xl text-xs hover:bg-surface-muted transition flex items-center justify-between text-ink-800"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-ink-600" />
                      <span>Patient (Aarav Mehta)</span>
                    </div>
                    {user?.role === 'PATIENT' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-medical-700"></span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('DOCTOR')}
                    className="w-full px-3 py-2 text-left rounded-xl text-xs hover:bg-surface-muted transition flex items-center justify-between text-ink-800"
                  >
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-ink-600" />
                      <span>Doctor (Dr. Rajesh Sharma)</span>
                    </div>
                    {user?.role === 'DOCTOR' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-medical-700"></span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('ADMIN')}
                    className="w-full px-3 py-2 text-left rounded-xl text-xs hover:bg-surface-muted transition flex items-center justify-between text-ink-800"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-ink-600" />
                      <span>Administrator</span>
                    </div>
                    {user?.role === 'ADMIN' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-medical-700"></span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Auth Actions */}
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-ink-400 hover:text-medical-700 hover:bg-surface-muted rounded-xl transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-medium text-ink-700 hover:text-ink-900 transition"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-medical-700 hover:bg-medical-800 rounded-xl shadow-card transition"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-ink-600 hover:text-ink-900 rounded-xl hover:bg-surface-muted transition"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-t border-surface-border bg-white px-4 pt-3 pb-6 space-y-2">
          {user.role === 'PATIENT' && (
            <>
              <Link
                to="/patient/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-medium text-ink-800 hover:bg-surface-muted"
              >
                Dashboard
              </Link>
              <Link
                to="/patient/doctors"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-medium text-ink-800 hover:bg-surface-muted"
              >
                Find Doctors
              </Link>
              <Link
                to="/patient/book"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-medium text-ink-800 hover:bg-surface-muted"
              >
                Book Appointment
              </Link>
              <Link
                to="/patient/appointments"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-medium text-ink-800 hover:bg-surface-muted"
              >
                My Consultations
              </Link>
              <Link
                to="/patient/prescriptions"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-medium text-ink-800 hover:bg-surface-muted"
              >
                Medications
              </Link>
            </>
          )}

          {(user.role === 'DOCTOR' || user.role === 'ADMIN') && (
            <>
              <Link
                to="/doctor/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-medium text-ink-800 hover:bg-surface-muted"
              >
                Doctor Agenda
              </Link>
              <Link
                to="/doctor/leaves"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-medium text-ink-800 hover:bg-surface-muted"
              >
                Leaves & Absences
              </Link>
              <Link
                to="/doctor/schedule-settings"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-medium text-ink-800 hover:bg-surface-muted"
              >
                Working Hours
              </Link>
            </>
          )}

          {user.role === 'ADMIN' && (
            <>
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-medium text-ink-800 hover:bg-surface-muted"
              >
                Admin Operations
              </Link>
              <Link
                to="/admin/doctors"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-medium text-ink-800 hover:bg-surface-muted"
              >
                Doctor Management
              </Link>
              <Link
                to="/admin/appointments"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-medium text-ink-800 hover:bg-surface-muted"
              >
                All Bookings
              </Link>
              <Link
                to="/admin/queue"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-medium text-ink-800 hover:bg-surface-muted"
              >
                Email Queue
              </Link>
              <Link
                to="/admin/system-design"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-medium text-ink-800 hover:bg-surface-muted"
              >
                System Design
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};
