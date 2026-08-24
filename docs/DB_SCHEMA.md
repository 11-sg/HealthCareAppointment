# CareFlow Health - Database Schema & ER Diagram

The database utilizes SQLite with WAL (Write-Ahead Logging) and strict foreign key constraints enabled for high performance, transactional safety, and concurrent reads/writes.

```mermaid
erDiagram
    USERS ||--o{ DOCTOR_PROFILES : "has profile"
    USERS ||--o{ DOCTOR_LEAVES : "schedules leave"
    USERS ||--o{ SLOT_HOLDS : "holds slot"
    USERS ||--o{ APPOINTMENTS : "books / conducts"
    USERS ||--o{ PRESCRIPTIONS : "receives / issues"
    USERS ||--o{ MEDICATION_REMINDERS : "reminded"
    APPOINTMENTS ||--o{ PRESCRIPTIONS : "contains"
    PRESCRIPTIONS ||--o{ MEDICATION_REMINDERS : "schedules"

    USERS {
        text id PK
        text name
        text email UK
        text password_hash
        text role "PATIENT | DOCTOR | ADMIN"
        text phone
        text avatar_url
        text created_at
        text updated_at
    }

    DOCTOR_PROFILES {
        text id PK
        text user_id FK,UK
        text specialization
        text bio
        integer experience_years
        real consultation_fee
        integer slot_duration_minutes
        text working_hours "JSON schedule"
        integer is_active
    }

    DOCTOR_LEAVES {
        text id PK
        text doctor_id FK
        text start_date "YYYY-MM-DD"
        text end_date "YYYY-MM-DD"
        text reason
        text status "APPROVED | PENDING"
        text created_at
    }

    SLOT_HOLDS {
        text id PK
        text doctor_id FK
        text patient_id FK
        text slot_start "ISO 8601"
        text slot_end "ISO 8601"
        text hold_token
        text expires_at "ISO 8601 (5-min TTL)"
        text status "ACTIVE | EXPIRED | RELEASED | CONVERTED"
    }

    APPOINTMENTS {
        text id PK
        text appointment_number UK
        text patient_id FK
        text doctor_id FK
        text slot_start "ISO 8601"
        text slot_end "ISO 8601"
        text status "CONFIRMED | COMPLETED | CANCELLED..."
        text symptoms_raw
        text pre_visit_summary "JSON AI triage"
        text clinical_notes
        text diagnosis
        text post_visit_summary "JSON AI care plan"
        text google_calendar_event_id
        text google_calendar_link
    }

    PRESCRIPTIONS {
        text id PK
        text appointment_id FK
        text patient_id FK
        text doctor_id FK
        text medication_name
        text dosage
        text frequency "ONCE_DAILY | TWICE_DAILY..."
        text times_of_day "JSON array"
        integer duration_days
        text start_date
        text end_date
        text special_instructions
        integer is_active
    }

    MEDICATION_REMINDERS {
        text id PK
        text prescription_id FK
        text patient_id FK
        text scheduled_time "ISO 8601"
        text status "PENDING | SENT | ACKNOWLEDGED"
        text sent_at
    }

    NOTIFICATION_QUEUE {
        text id PK
        text recipient_email
        text recipient_name
        text recipient_role
        text type
        text subject
        text body_html
        text status "PENDING | SENT | FAILED"
        integer retry_count
        integer max_retries
        text last_error
        text next_retry_at
        text sent_at
    }
```
