import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Navbar } from './components/Navbar';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LandingPage } from './pages/LandingPage';

// Patient Pages
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { DoctorDirectoryPage } from './pages/patient/DoctorDirectoryPage';
import { BookAppointmentPage } from './pages/patient/BookAppointmentPage';
import { MyAppointmentsPage } from './pages/patient/MyAppointmentsPage';
import { PrescriptionsPage } from './pages/patient/PrescriptionsPage';

// Doctor Pages
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { ConsultationPage } from './pages/doctor/ConsultationPage';
import { DoctorLeavesPage } from './pages/doctor/DoctorLeavesPage';
import { DoctorScheduleSettingsPage } from './pages/doctor/DoctorScheduleSettingsPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminDoctorsPage } from './pages/admin/AdminDoctorsPage';
import { AdminAppointmentsPage } from './pages/admin/AdminAppointmentsPage';
import { AdminQueuePage } from './pages/admin/AdminQueuePage';
import { AdminSystemDesignPage } from './pages/admin/AdminSystemDesignPage';

import { UserRole } from './types';

// Protected Route Guard
const ProtectedRoute: React.FC<{
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'DOCTOR') return <Navigate to="/doctor/dashboard" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/patient/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-canvas flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Patient Routes */}
                <Route
                  path="/patient/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                      <PatientDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/patient/doctors"
                  element={
                    <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                      <DoctorDirectoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/patient/book"
                  element={
                    <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                      <BookAppointmentPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/patient/appointments"
                  element={
                    <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                      <MyAppointmentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/patient/prescriptions"
                  element={
                    <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                      <PrescriptionsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Doctor Routes */}
                <Route
                  path="/doctor/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                      <DoctorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/consultation/:id"
                  element={
                    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                      <ConsultationPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/leaves"
                  element={
                    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                      <DoctorLeavesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/doctor/schedule-settings"
                  element={
                    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                      <DoctorScheduleSettingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/doctors"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminDoctorsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/appointments"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminAppointmentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/queue"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminQueuePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/system-design"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminSystemDesignPage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
};
