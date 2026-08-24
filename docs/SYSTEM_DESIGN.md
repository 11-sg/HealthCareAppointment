# System Design Write-Up: Healthcare Appointment & Follow-up Manager

**Word Count:** ~750 words (Strictly under the 800-word limit)

---

## 1. Double-Booking Prevention & Concurrency Control

Preventing double-booking in a multi-user healthcare platform requires multi-layered concurrency control at both the application and database engine layers.

```
                  ┌────────────────────────────────────────┐
                  │ Patient A & Patient B Click Same Slot  │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │ BEGIN IMMEDIATE TRANSACTION (SQLite / Postgres) │
             └────────────────────────┬────────────────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
  [Patient A Acquires Hold Lock]                [Patient B Encounters Lock]
  Status: 200 OK                                Status: 409 Conflict
  Hold Token Generated (5-min TTL)              "Slot held by another patient"
```

1. **Immediate Write-Lock Transactions:** 
   When an appointment booking or slot hold request arrives, the server initiates an atomic write transaction (`BEGIN IMMEDIATE TRANSACTION` in SQLite, or `SELECT ... FOR UPDATE` in PostgreSQL). This ensures that concurrent threads serialize their read-check-write cycle.
2. **Atomic Verification:**
   Before finalizing a reservation, the transaction verifies two invariants:
   - No confirmed/pending appointment exists for `(doctor_id, slot_start)`.
   - No unexpired hold (`expires_at > CURRENT_TIMESTAMP`) exists belonging to a different patient.
3. **Database Constraints:**
   An active composite index on `(doctor_id, slot_start)` provides sub-millisecond lookups and guarantees physical integrity. If a race condition occurs, only one transaction commits; the conflicting transaction rolls back and returns `HTTP 409 Conflict`.

---

## 2. Slot Hold Mechanism (Temporary Reservation Lock)

To avoid checkout frustration where two patients simultaneously fill out symptoms for the same slot, the system employs a two-phase reservation protocol:

```
[Available Slot] ──(Patient Click)──► [Held: 5-Min TTL] ──(Symptom Submit)──► [Confirmed Booking]
       ▲                                     │
       └───────────(5 Mins Expired)──────────┘
```

1. **Temporary Hold Allocation:** 
   When a patient selects an available slot, a record is inserted into `slot_holds` containing `(doctor_id, patient_id, slot_start, slot_end, hold_token, expires_at, status='ACTIVE')` with a default TTL of 5 minutes (`SLOT_HOLD_DURATION_MINUTES = 5`).
2. **Single Active Hold per Patient:**
   To prevent malicious slot hoarding, inserting a new hold automatically transitions any previous active holds for that patient to `RELEASED`.
3. **Hybrid Sweep & Lazy Reclaim:**
   - **Lazy Evaluation:** Slot availability queries automatically filter out active holds where `expires_at > NOW()`. Expired holds are treated as immediately available.
   - **Background Worker:** A cron worker runs every 60 seconds (`* * * * *`) executing `UPDATE slot_holds SET status = 'EXPIRED' WHERE status = 'ACTIVE' AND expires_at < NOW()`.

---

## 3. Doctor Leave Conflict Handling

When doctors take scheduled or emergency leaves, existing patient appointments must be safeguarded without manual administrative overhead.

```
       [Doctor Submits Leave: 2026-10-10 to 2026-10-12]
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ Atomic Conflict Scanner:                  │
        │ SELECT * FROM appointments                │
        │ WHERE doctor_id = ? AND status='CONFIRMED'│
        │ AND slot_start BETWEEN leave_start/end    │
        └─────────────────────┬─────────────────────┘
                              │
                              ▼
  ┌───────────────────────────────────────────────────────┐
  │ 1. Bulk Status Update: 'CANCELLED_DUE_TO_LEAVE'       │
  │ 2. Google Calendar API: Delete Event ID               │
  │ 3. Enqueue Priority Alert Email (Reschedule Link)     │
  │ 4. Block Future Slot Queries on Leave Dates           │
  └───────────────────────────────────────────────────────┘
```

1. **Transactional Conflict Sweep:**
   Upon leave submission (`doctor_leaves`), the service queries all active bookings (`CONFIRMED`, `PENDING`) for that doctor within `[start_date, end_date]`.
2. **Automated Cancellation & Calendar Cleanup:**
   Conflicting appointments are atomically transitioned to `CANCELLED_DUE_TO_LEAVE` with `cancellation_reason = 'Doctor on scheduled leave'`. Associated Google Calendar event IDs are deleted via `calendar.events.delete`.
3. **Priority Patient Alerts:**
   High-priority transactional emails are enqueued containing the leave notice and an automated 1-click priority rescheduling link (`/patient/book?doctorId=...&rescheduleApptId=...`).
4. **Availability Masking:**
   Future slot calculations evaluate approved leaves and immediately flag the entire date range as `isLeaveDay = true`, returning 0 slots.

---

## 4. Notification Failure Handling & Retry Architecture

Reliability in clinical communications (booking confirmations, doctor leave alerts, medication reminders) is achieved through an asynchronous **Transactional Outbox Pattern**:

```
[Trigger: Booking / Leave / Reminder]
                 │
                 ▼
 ┌───────────────────────────────┐
 │ INSERT INTO notification_queue│  (Status: PENDING, RetryCount: 0)
 └───────────────┬───────────────┘
                 │
                 ▼
 ┌───────────────────────────────┐
 │ Asynchronous Worker Dispatch  │
 └───────────────┬───────────────┘
                 ├──► [Success] ──► Status: 'SENT', SentAt: Timestamp
                 │
                 └──► [Failure] ──► Exponential Backoff (1m -> 5m -> 15m)
                                    Max Retries = 3 ──► Status: 'FAILED'
                                    Admin UI: 1-Click Manual Retry
```

1. **Decoupled Outbox Queue:**
   Notifications are written to the `notification_queue` database table inside the main business transaction. If the email transport is slow or temporarily unreachable, the user request is never blocked.
2. **Exponential Backoff & Retries:**
   The `EmailRetryWorker` runs every 2 minutes. Failed dispatches compute `next_retry_at` using backoff intervals (1m, 5m, 15m) up to `max_retries = 3`.
3. **Resilient Multi-Transport Provider:**
   The email service dynamically routes through SMTP, automatic Ethereal test mailboxes, or local structured JSON loggers based on environment configuration.
4. **Medication Cron Worker:**
   The `MedicationReminderWorker` executes every 15 minutes, matching active prescriptions against daily time-of-day slots, dispatching automated dose reminders to patient inboxes.
