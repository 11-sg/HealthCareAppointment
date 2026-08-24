import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

const dbPath = env.DATABASE_FILE;
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Enable WAL mode & foreign keys for concurrency and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

export function initDatabase() {
  db.exec(`
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('PATIENT', 'DOCTOR', 'ADMIN')),
      phone TEXT,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Doctor Profiles Table
    CREATE TABLE IF NOT EXISTS doctor_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      specialization TEXT NOT NULL,
      bio TEXT DEFAULT '',
      experience_years INTEGER DEFAULT 0,
      consultation_fee REAL DEFAULT 50.0,
      slot_duration_minutes INTEGER DEFAULT 30,
      working_hours TEXT NOT NULL, -- JSON string of schedule
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Doctor Leaves Table
    CREATE TABLE IF NOT EXISTS doctor_leaves (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_date TEXT NOT NULL, -- YYYY-MM-DD
      end_date TEXT NOT NULL,   -- YYYY-MM-DD
      reason TEXT DEFAULT '',
      status TEXT DEFAULT 'APPROVED' CHECK(status IN ('APPROVED', 'PENDING', 'REJECTED')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Slot Holds Table (Atomic 5-minute hold mechanism)
    CREATE TABLE IF NOT EXISTS slot_holds (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slot_start TEXT NOT NULL, -- ISO 8601
      slot_end TEXT NOT NULL,   -- ISO 8601
      hold_token TEXT NOT NULL,
      expires_at TEXT NOT NULL, -- ISO 8601
      status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'RELEASED', 'CONVERTED')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Appointments Table
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      appointment_number TEXT UNIQUE NOT NULL,
      patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      slot_start TEXT NOT NULL, -- ISO 8601
      slot_end TEXT NOT NULL,   -- ISO 8601
      status TEXT DEFAULT 'CONFIRMED' CHECK(status IN (
        'PENDING', 'CONFIRMED', 'COMPLETED', 
        'CANCELLED_BY_PATIENT', 'CANCELLED_BY_DOCTOR', 
        'CANCELLED_DUE_TO_LEAVE', 'RESCHEDULED', 'NO_SHOW'
      )),
      cancellation_reason TEXT,
      symptoms_raw TEXT NOT NULL,
      pre_visit_summary TEXT,   -- JSON string
      clinical_notes TEXT,
      diagnosis TEXT,
      post_visit_summary TEXT,  -- JSON string
      google_calendar_event_id TEXT,
      google_calendar_link TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Prescriptions Table
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      medication_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      times_of_day TEXT NOT NULL, -- JSON array e.g. ["08:00", "20:00"]
      duration_days INTEGER NOT NULL DEFAULT 7,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      special_instructions TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Medication Reminders Table
    CREATE TABLE IF NOT EXISTS medication_reminders (
      id TEXT PRIMARY KEY,
      prescription_id TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scheduled_time TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SENT', 'FAILED', 'ACKNOWLEDGED')),
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Notification & Email Queue Table (with exponential retry tracking)
    CREATE TABLE IF NOT EXISTS notification_queue (
      id TEXT PRIMARY KEY,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_role TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SENT', 'FAILED')),
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      last_error TEXT,
      next_retry_at TEXT DEFAULT (datetime('now')),
      sent_at TEXT,
      metadata TEXT, -- JSON string
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Critical Performance & Integrity Indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_doctor_profiles_spec ON doctor_profiles(specialization);
    CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id, status);
    CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id, status);
    CREATE INDEX IF NOT EXISTS idx_appointments_slots ON appointments(doctor_id, slot_start, slot_end);
    CREATE INDEX IF NOT EXISTS idx_slot_holds_lookup ON slot_holds(doctor_id, slot_start, status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_doctor_leaves_range ON doctor_leaves(doctor_id, start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_notif_queue_retry ON notification_queue(status, next_retry_at);
  `);
}
