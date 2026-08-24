import axios from 'axios';
import {
  Appointment,
  DoctorLeave,
  DoctorProfile,
  MedicationReminder,
  NotificationQueueItem,
  Prescription,
  SlotAvailability,
  User,
  WorkingHoursSchedule,
} from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to all outbound requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('careflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle unauth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Clear token on 401
      localStorage.removeItem('careflow_token');
      localStorage.removeItem('careflow_user');
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Auth API
// ============================================================================
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post<{ user: User; token: string }>('/auth/login', data),
  register: (data: any) =>
    api.post<{ user: User; token: string }>('/auth/register', data),
  getMe: () => api.get<{ user: User }>('/auth/me'),
};

// ============================================================================
// Doctors API
// ============================================================================
export const doctorApi = {
  list: (params?: { specialization?: string; search?: string }) =>
    api.get<{ doctors: DoctorProfile[] }>('/doctors', { params }),
  getById: (id: string) =>
    api.get<{ doctor: DoctorProfile }>(`/doctors/${id}`),
  getSpecializations: () =>
    api.get<{ specializations: string[] }>('/doctors/specializations'),
  updateProfile: (data: Partial<DoctorProfile>) =>
    api.put<{ message: string }>('/doctors/profile', data),
};

// ============================================================================
// Slots API
// ============================================================================
export const slotApi = {
  getDoctorSlots: (doctorId: string, date: string) =>
    api.get<{
      slots: SlotAvailability[];
      doctor: DoctorProfile;
      isLeaveDay: boolean;
      leaveReason?: string;
    }>(`/slots/doctor/${doctorId}`, { params: { date } }),
  holdSlot: (data: { doctorId: string; slotStart: string; slotEnd: string }) =>
    api.post<{ holdToken: string; expiresAt: string; holdId: string }>('/slots/hold', data),
  releaseHold: (data: { holdToken: string }) =>
    api.post<{ success: boolean; message: string }>('/slots/release', data),
};

// ============================================================================
// Appointments API
// ============================================================================
export const appointmentApi = {
  book: (data: {
    doctorId: string;
    slotStart: string;
    slotEnd: string;
    symptoms: string;
    holdToken?: string;
  }) => api.post<{ appointment: Appointment }>('/appointments/book', data),
  getMy: (params?: { date?: string }) =>
    api.get<{ appointments: Appointment[] }>('/appointments/my', { params }),
  getById: (id: string) =>
    api.get<{ appointment: Appointment }>(`/appointments/${id}`),
  reschedule: (id: string, data: { newSlotStart: string; newSlotEnd: string }) =>
    api.post<{ appointment: Appointment; message: string }>(`/appointments/${id}/reschedule`, data),
  cancel: (id: string, data?: { reason?: string }) =>
    api.post<{ appointment: Appointment; message: string }>(`/appointments/${id}/cancel`, data),
  previewSymptoms: (symptoms: string) =>
    api.post<{ summary: any }>('/appointments/pre-visit-preview', { symptoms }),
  getIcsDownloadUrl: (id: string) => `/api/appointments/${id}/ics`,
};

// ============================================================================
// Consultations API
// ============================================================================
export const consultationApi = {
  previewSummary: (data: { clinicalNotes: string; diagnosis?: string }) =>
    api.post<{ summary: any }>('/consultations/preview-summary', data),
  complete: (data: {
    appointmentId: string;
    clinicalNotes: string;
    diagnosis: string;
    prescriptions: any[];
  }) =>
    api.post<{
      message: string;
      appointment: Appointment;
      prescriptions: Prescription[];
    }>('/consultations/complete', data),
};

// ============================================================================
// Leaves API
// ============================================================================
export const leaveApi = {
  create: (data: { startDate: string; endDate: string; reason: string; doctorId?: string }) =>
    api.post<{
      message: string;
      leave: DoctorLeave;
      affectedCount: number;
      affectedAppointments: any[];
    }>('/leaves', data),
  getDoctorLeaves: (doctorId: string) =>
    api.get<{ leaves: DoctorLeave[] }>(`/leaves/doctor/${doctorId}`),
  getAllLeaves: () =>
    api.get<{ leaves: DoctorLeave[] }>('/leaves/all'),
  deleteLeave: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/leaves/${id}`),
};

// ============================================================================
// Prescriptions & Reminders API
// ============================================================================
export const prescriptionApi = {
  getMy: () =>
    api.get<{ prescriptions: Prescription[] }>('/prescriptions/my'),
  getTodayReminders: (date?: string) =>
    api.get<{ reminders: MedicationReminder[] }>('/prescriptions/reminders/today', { params: { date } }),
  acknowledgeReminder: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/prescriptions/reminders/${id}/ack`),
  getByAppointment: (appointmentId: string) =>
    api.get<{ prescriptions: Prescription[] }>(`/prescriptions/appointment/${appointmentId}`),
};

// ============================================================================
// Admin API
// ============================================================================
export const adminApi = {
  getStats: () =>
    api.get<{
      stats: {
        totalAppointments: number;
        todayAppointments: number;
        completedAppointments: number;
        cancelledAppointments: number;
        totalDoctors: number;
        totalPatients: number;
        activeLeaves: number;
        emailQueue: {
          total: number;
          sent: number;
          pending: number;
          failed: number;
        };
      };
    }>('/admin/stats'),
  createDoctor: (data: any) =>
    api.post<{ message: string; doctor: User }>('/admin/doctors', data),
  updateDoctor: (id: string, data: any) =>
    api.put<{ message: string }>(`/admin/doctors/${id}`, data),
  getEmailQueue: (params?: { status?: string; limit?: number }) =>
    api.get<{ queue: NotificationQueueItem[] }>('/admin/email-queue', { params }),
  retryEmail: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/admin/email-queue/${id}/retry`),
  triggerWorker: (worker: 'email_queue' | 'medication_reminders' | 'slot_hold_cleanup' | 'appointment_reminders') =>
    api.post<{ message: string; result: any }>('/admin/workers/trigger', { worker }),
};

// ============================================================================
// Calendar API
// ============================================================================
export const calendarApi = {
  getStatus: () =>
    api.get<{
      configured: boolean;
      hasClientId: boolean;
      hasClientSecret: boolean;
      hasRefreshToken: boolean;
      redirectUri: string;
      message: string;
    }>('/calendar/status'),
  getAuthUrl: () =>
    api.get<{ authUrl: string }>('/calendar/auth-url'),
};
