export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  doctorProfile?: DoctorProfile;
}

export interface WorkingHoursDay {
  start: string;
  end: string;
  is_available: boolean;
}

export type WorkingHoursSchedule = {
  [day in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']?: WorkingHoursDay;
};

export interface DoctorProfile {
  id: string;
  user_id: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  specialization: string;
  bio: string;
  experience_years: number;
  consultation_fee: number;
  slot_duration_minutes: number;
  working_hours: WorkingHoursSchedule;
  is_active: boolean;
}

export type UrgencyLevel = 'Low' | 'Medium' | 'High';

export interface PreVisitSummary {
  urgency_level: UrgencyLevel;
  chief_complaint: string;
  suggested_questions: string[];
  generated_at: string;
  is_fallback?: boolean;
}

export interface PostVisitMedicationScheduleItem {
  medication: string;
  dosage: string;
  frequency: string;
  time_of_day: string;
  instructions: string;
}

export interface PostVisitSummary {
  patient_friendly_summary: string;
  medication_schedule: PostVisitMedicationScheduleItem[];
  follow_up_steps: string[];
  warning_signs_to_watch: string[];
  generated_at: string;
  is_fallback?: boolean;
}

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED_BY_PATIENT'
  | 'CANCELLED_BY_DOCTOR'
  | 'CANCELLED_DUE_TO_LEAVE'
  | 'RESCHEDULED'
  | 'NO_SHOW';

export interface Appointment {
  id: string;
  appointment_number: string;
  patient_id: string;
  doctor_id: string;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  doctor_name?: string;
  doctor_specialization?: string;
  slot_start: string;
  slot_end: string;
  status: AppointmentStatus;
  cancellation_reason?: string;
  symptoms_raw: string;
  pre_visit_summary?: PreVisitSummary;
  clinical_notes?: string;
  diagnosis?: string;
  post_visit_summary?: PostVisitSummary;
  google_calendar_event_id?: string;
  google_calendar_link?: string;
  created_at: string;
  updated_at: string;
}

export interface SlotAvailability {
  slot_start: string;
  slot_end: string;
  is_available: boolean;
  status: 'AVAILABLE' | 'HELD' | 'HELD_BY_CURRENT_USER' | 'BOOKED' | 'ON_LEAVE' | 'OUTSIDE_HOURS';
  held_by_current_user?: boolean;
  hold_expires_at?: string;
}

export interface SlotCalculationResult {
  doctor?: DoctorProfile;
  isLeaveDay?: boolean;
  slots: SlotAvailability[];
}

export type MedicationFrequency =
  | 'ONCE_DAILY'
  | 'TWICE_DAILY'
  | 'THRICE_DAILY'
  | 'FOUR_TIMES_DAILY'
  | 'EVERY_8_HOURS'
  | 'EVERY_12_HOURS'
  | 'AS_NEEDED';

export interface CreatePrescriptionDto {
  medication_name: string;
  dosage: string;
  frequency: MedicationFrequency;
  times_of_day: string[];
  duration_days: number;
  special_instructions?: string;
}

export interface Prescription {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name?: string;
  doctor_specialization?: string;
  medication_name: string;
  dosage: string;
  frequency: MedicationFrequency;
  times_of_day: string[];
  duration_days: number;
  start_date: string;
  end_date: string;
  special_instructions?: string;
  is_active: boolean;
  created_at: string;
}

export interface MedicationReminder {
  id: string;
  prescription_id: string;
  patient_id: string;
  medication_name?: string;
  dosage?: string;
  special_instructions?: string;
  scheduled_time: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'ACKNOWLEDGED';
  sent_at?: string;
  created_at: string;
}

export type MedicationReminderItem = MedicationReminder;

export interface DoctorLeave {
  id: string;
  doctor_id: string;
  doctor_name?: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  affected_appointments_count?: number;
  created_at: string;
}

export interface NotificationQueueItem {
  id: string;
  recipient_email: string;
  recipient_name: string;
  recipient_role: UserRole;
  type: string;
  subject: string;
  body_html: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  retry_count: number;
  max_retries: number;
  last_error?: string;
  next_retry_at?: string;
  sent_at?: string;
  created_at: string;
}
