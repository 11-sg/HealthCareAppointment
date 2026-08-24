# CareFlow Health - REST API Documentation

Base URL: `http://localhost:5000/api`

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Creates a new user account (Patient, Doctor, or Admin).

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "password": "password123",
  "role": "PATIENT",
  "phone": "+1 (555) 019-2831"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "uuid-1234",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "role": "PATIENT"
  },
  "token": "jwt-token-string"
}
```

---

### `POST /api/auth/login`
Authenticates existing users.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "patient123"
}
```

---

### `GET /api/auth/me`
*Requires `Authorization: Bearer <token>`*
Returns current authenticated user profile.

---

## 2. Doctors & Specializations

### `GET /api/doctors`
Query Parameters: `specialization` (string), `search` (string).
Returns active doctors with their profiles, working hours, and fees.

### `GET /api/doctors/:id`
Returns a specific doctor's detailed profile.

### `GET /api/doctors/specializations`
Returns list of unique active medical specializations.

### `PUT /api/doctors/profile`
*Requires Doctor Role*
Updates bio, fees, slot duration, or working hours.

---

## 3. Dynamic Slots & Hold Management

### `GET /api/slots/doctor/:doctorId?date=YYYY-MM-DD`
Calculates available slots dynamically based on working hours, existing bookings, active holds, and leaves.

**Response (200 OK):**
```json
{
  "doctor": { "name": "Sarah Smith", "slot_duration_minutes": 30 },
  "isLeaveDay": false,
  "slots": [
    {
      "slot_start": "2026-09-10T09:00:00.000Z",
      "slot_end": "2026-09-10T09:30:00.000Z",
      "is_available": true,
      "status": "AVAILABLE"
    }
  ]
}
```

---

### `POST /api/slots/hold`
*Requires Patient Role*
Places an atomic 5-minute reservation hold on a slot.

**Request Body:**
```json
{
  "doctorId": "doc-uuid",
  "slotStart": "2026-09-10T09:00:00.000Z",
  "slotEnd": "2026-09-10T09:30:00.000Z"
}
```

**Response (200 OK):**
```json
{
  "holdToken": "token-uuid",
  "expiresAt": "2026-09-10T09:05:00.000Z",
  "holdId": "hold-uuid"
}
```

---

### `POST /api/slots/release`
Releases an active hold.

---

## 4. Appointment Management

### `POST /api/appointments/book`
*Requires Patient Role*
Books an appointment atomically, triggers LLM pre-visit symptom analysis, syncs Google Calendar, and queues confirmation emails.

**Request Body:**
```json
{
  "doctorId": "doc-uuid",
  "slotStart": "2026-09-10T09:00:00.000Z",
  "slotEnd": "2026-09-10T09:30:00.000Z",
  "symptoms": "Severe left temple throbbing headache with photophobia",
  "holdToken": "hold-token-optional"
}
```

---

### `GET /api/appointments/my`
Returns logged-in user's appointments (Patient: their bookings, Doctor: their schedule).

### `POST /api/appointments/:id/reschedule`
Reschedules an appointment to a new slot.

### `POST /api/appointments/:id/cancel`
Cancels an appointment, deletes Google Calendar event, and emails patient.

### `GET /api/appointments/:id/ics`
Downloads standard `.ics` calendar invitation file.

---

## 5. Doctor Consultations & AI Care Plans

### `POST /api/consultations/preview-summary`
*Requires Doctor Role*
Pre-evaluates clinical notes with AI to preview patient-friendly summary.

### `POST /api/consultations/complete`
*Requires Doctor Role*
Concludes consultation, saves diagnosis, creates prescriptions with dosage schedules, generates AI patient summary, and emails patient.

**Request Body:**
```json
{
  "appointmentId": "appt-uuid",
  "clinicalNotes": "Patient diagnosed with Acute Pharyngitis. Prescribed Amoxicillin 500mg TID.",
  "diagnosis": "Acute Pharyngitis",
  "prescriptions": [
    {
      "medication_name": "Amoxicillin",
      "dosage": "500mg",
      "frequency": "THRICE_DAILY",
      "times_of_day": ["08:00", "14:00", "20:00"],
      "duration_days": 10,
      "special_instructions": "Take with meals. Complete full 10-day course."
    }
  ]
}
```

---

## 6. Doctor Leave Management

### `POST /api/leaves`
*Requires Doctor / Admin Role*
Records doctor leave, scans conflicts, cancels affected bookings (`CANCELLED_DUE_TO_LEAVE`), deletes calendar events, and sends priority reschedule alerts to patients.

**Request Body:**
```json
{
  "startDate": "2026-10-15",
  "endDate": "2026-10-16",
  "reason": "Attending Annual Neurological Conference"
}
```

---

## 7. Prescriptions & Medication Reminders

### `GET /api/prescriptions/my`
Returns patient's active and historical prescriptions.

### `GET /api/prescriptions/reminders/today`
Returns today's medication dose schedule for patient.

### `POST /api/prescriptions/reminders/:id/ack`
Marks medication dose as taken (`ACKNOWLEDGED`).

---

## 8. Admin & Background Job Monitoring

### `GET /api/admin/stats`
Returns total bookings, completed visits, active doctors, and queue health.

### `GET /api/admin/email-queue`
Inspects notification queue (`notification_queue` table).

### `POST /api/admin/email-queue/:id/retry`
Manually triggers immediate retry on a specific email.

### `POST /api/admin/workers/trigger`
Manually executes background cron jobs (`email_queue`, `medication_reminders`, `slot_hold_cleanup`, `appointment_reminders`).
