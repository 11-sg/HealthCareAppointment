# CareFlow - Enterprise Healthcare Appointment & Follow-Up Manager

> A production-grade healthcare appointment and clinical follow-up platform with role-based portals (Patients, Doctors, Admins), AI-powered pre-visit symptom triage and post-visit care plan generation (Google Gemini 1.5 Flash), concurrency-safe slot holds, physician leave conflict resolution, automated medication reminders, transactional outbox queue with exponential backoff, and Google Calendar OAuth 2.0 / RFC-5545 `.ics` sync.

---

## 📑 Table of Contents
- [✨ Key Features](#-key-features)
- [🛠️ Technology Stack](#️-technology-stack)
- [🚀 Quick Start Guide](#-quick-start-guide)
- [🔑 Demo Credentials](#-demo-credentials)
- [🛡️ Security Hardening & Environment Config](#️-security-hardening--environment-config)
- [🤖 LLM Usage & Graceful Failure Resilience](#-llm-usage--graceful-failure-resilience)
- [📐 Core System Design Architecture](#-core-system-design-architecture)
- [📅 Google Calendar & .ics Sync](#-google-calendar--ics-sync)
- [✉️ Transactional Outbox & Email Retry Queue](#️-transactional-outbox--email-retry-queue)
- [📊 Database Schema](#-database-schema)
- [🧪 Automated Testing & Verification](#-automated-testing--verification)
- [🐳 Docker & Production Deployment](#-docker--production-deployment)

---

## ✨ Key Features

### 1. Role-Based Clinical Portals
- **Patient Portal**:
  - Browse Indian medical specialists by department (AIIMS Delhi, NIMHANS Bengaluru, MS Ortho).
  - Real-time slot availability with a live **5-minute atomic reservation countdown**.
  - Structured symptom submission with instant **AI Pre-Visit Triage assessment**.
  - Comprehensive medical history, 1-click reschedule/cancel workflows, and `.ics` / Google Calendar download.
  - Daily scheduled pharmacotherapy checklist with interactive dose completion logging.
- **Doctor Portal**:
  - Live daily consultation agenda with Indian date formatting (`en-IN`) and patient queue counter.
  - Pre-visit triage insights (Urgency badge: *Low / Medium / High*, chief complaint, and 3 suggested diagnostic questions).
  - In-session clinical notes editor and multi-drug prescription builder with dosage/frequency timetable generator.
  - 1-click **AI Post-Visit Care Plan generator** translating doctor notes into an empathetic patient summary.
  - Absence & leave management with automatic booking conflict detection and patient notification cascade.
  - Custom weekly working hours, appointment slot lengths (15/30/45/60m), and consultation fees in INR (`₹`).
- **Admin Operations Center**:
  - Real-time clinic telemetry (total bookings, active specialists, registered patients, outbox dispatches).
  - Staff management: provision physician credentials, adjust fees, and configure active status.
  - Master consultations ledger with global search, triage filter, and status auditing.
  - Outbox monitor with manual background cron triggers, failed notification retries, and full HTML email previews.
  - Interactive System Architecture and concurrency documentation.

### 2. Concurrency Safety & Concurrency Control
- **5-Minute Slot Holds**: Prevents booking collisions when multiple patients view the same slot concurrently.
- **Atomic Transactions**: Strict serialization (`BEGIN IMMEDIATE`) prevents double-booking at the database level.
- **Single Active Hold Per User**: Guards against slot monopolization across multiple doctors.

### 3. Doctor Leave Conflict Handling
- Scheduled doctor leaves automatically query all conflicting bookings within the interval `[start_date, end_date]`.
- Atomically transitions affected appointments to `CANCELLED_DUE_TO_LEAVE` and removes calendar entries.
- Dispatches priority email notifications to affected patients with a 1-click priority rescheduling link.

### 4. Background Cron Routines
- **Medication Reminders**: Scans active prescriptions every 15 minutes and dispatches daily dosage alerts.
- **Email Retry Outbox**: Processes pending/failed outbound emails with exponential backoff (1m, 5m, 15m).
- **Slot Hold Sweeper**: Cleans expired slot reservations every 60 seconds.
- **24h Visit Alerts**: Automatically notifies patients 24 hours prior to their upcoming consultation.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons | Universal Arial typography, Medical Blue & Clinical Slate theme, responsive UI |
| **Backend** | Node.js, Express.js, TypeScript, Zod | RESTful architecture, Zod request/environment validation, Helmet security |
| **Database** | SQLite via `better-sqlite3` (or PostgreSQL) | Atomic immediate write transactions, relational schema |
| **AI / LLM** | Google Gemini 1.5 Flash (`@google/genai`) | Deterministic clinical prompts with local rule-based heuristic fallback |
| **Security** | Helmet, CORS origin whitelisting, JWT, bcryptjs | OWASP-compliant security headers and payload size limits |
| **Email / Outbox** | Nodemailer, Ethereal Test Mailer | Transactional outbox pattern with exponential backoff retry queue |
| **Calendar** | Google Calendar API OAuth 2.0 & RFC-5545 `.ics` | Direct `.ics` downloads and Google Calendar event synchronization |
| **Testing** | Jest, Supertest, ts-jest | Concurrency, leave conflict, and LLM fallback test suites |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Step-by-Step Installation

1. **Clone or Navigate to the Repository**:
   ```bash
   cd healthcare-appointment-manager
   ```

2. **Install Dependencies for Both Server and Client**:
   ```bash
   npm install --prefix server
   npm install --prefix client
   ```

3. **Configure Environment Variables**:
   ```bash
   # Copy environment template to root and server directory
   cp .env.example .env
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

4. **Seed Database with Indian Specialists & Test Data**:
   ```bash
   npm run seed
   ```

5. **Start Full-Stack Development Servers**:
   ```bash
   # Option A: Run concurrently from root
   npm run dev

   # Option B: Run in separate terminals
   npm run dev:server   # Starts backend on http://localhost:5000
   npm run dev:client   # Starts frontend on http://localhost:5173
   ```

6. **Open the Application in Your Browser**:
   - Web App: `http://localhost:5173`
   - Backend API: `http://localhost:5000/api/health`

---

## 🔑 Demo Credentials

You can use the 1-click **"Sign In with Demo Role"** buttons on the login page, or log in manually with the credentials below:

| Role | Name / Specialization | Email | Password |
| :--- | :--- | :--- | :--- |
| **Doctor (Cardiology)** | Dr. Rajesh Sharma (AIIMS New Delhi) | `dr.sharma@careflow.com` | `doctor123` |
| **Doctor (Neurology)** | Dr. Arvind Patel (NIMHANS Bengaluru) | `dr.patel@careflow.com` | `doctor123` |
| **Doctor (Orthopedics)** | Dr. Suresh Menon (MS Ortho, MCh) | `dr.menon@careflow.com` | `doctor123` |
| **Doctor (General Medicine)** | Dr. Amit Verma (MBBS, MD Medicine) | `dr.verma@careflow.com` | `doctor123` |
| **Patient** | Aarav Mehta (Active Prescriptions) | `aarav.mehta@example.com` | `patient123` |
| **Admin** | Practice Administrator (Full Privileges) | `admin@careflow.com` | `admin123` |

---

## 🛡️ Security Hardening & Environment Config

CareFlow implements enterprise-grade security standards:

1. **Strict Zod Environment Schema Validation**:
   - Validated on server bootstrap via [`server/src/config/env.ts`](file:///server/src/config/env.ts).
   - Automated startup audit `auditSecurityEnvironment()` warns of weak secrets or insecure configurations.

2. **HTTP Security Headers with Helmet**:
   - Cross-Site Scripting (XSS) filter, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`.
   - Content Security Policy (CSP) and HSTS enabled in production.

3. **CORS Origin Whitelisting**:
   - Strict matching against `CORS_ORIGIN` (defaults to `http://localhost:5173`).

4. **Payload Size & Rate Limiting**:
   - JSON body limits restricted to `1mb` to prevent denial-of-service payload attacks.

5. **Safe Credential Handling**:
   - Passwords hashed with `bcryptjs` (salt rounds: 10).
   - JWT tokens signed with expiring HMAC-SHA256 secrets.
   - `.gitignore` strictly excludes all `.env`, `.env.*.local`, `*.db`, and sensitive credentials.

---

## 🤖 LLM Usage & Graceful Failure Resilience

CareFlow utilizes **Google Gemini 1.5 Flash** with deterministic prompt contracts and a robust local fallback mechanism:

### 1. Pre-Visit Symptom Triage Prompt
```text
"Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>"
```
- **Output**: JSON schema with `urgency_level` (`Low` | `Medium` | `High`), `chief_complaint`, and `suggested_questions` (array of 3 strings).

### 2. Post-Visit Patient Care Plan Prompt
```text
"Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>"
```
- **Output**: Plain-language empathetic summary, structured medication schedule table with timings, actionable follow-up steps, and red-flag warning signs.

### 3. Graceful Local Fallback Engine
When `GEMINI_API_KEY` is omitted, throttled, or offline:
- The system automatically engages an internal **Clinical Heuristic NLP Parser**.
- Detects red-flag emergency keywords (`chest pain`, `shortness of breath`, `acute weakness` -> `High` urgency; persistent symptoms -> `Medium`; routine checks -> `Low`).
- **The platform never crashes, hangs, or blocks checkout/consultation flows.**

---

## 📐 Core System Design Architecture

```
                                  [ Patient / Doctor / Admin Client (Vite React) ]
                                                         │
                                               HTTPS / REST API + JWT
                                                         ▼
                                          [ Express.js Security Gateway ]
                                  (Helmet + CORS Whitelist + Rate Limiter + Zod)
                                                         │
                             ┌───────────────────────────┼───────────────────────────┐
                             ▼                           ▼                           ▼
                   [ Appointment Engine ]      [ Consultation Room ]       [ Outbox Queue Worker ]
                    - 5-Min TTL Slot Hold       - Clinical Notes Editor     - Exponential Retries
                    - Concurrency Write Locks   - Rx Builder & Reminders    - Ethereal / SMTP
                    - Leave Conflict Cascade    - Gemini AI Care Plan       - Slot Sweeper Cron
                             │                           │                           │
                             └───────────────────────────┼───────────────────────────┘
                                                         ▼
                                            [ Database Storage Layer ]
                                          (Atomic Transactions & Indexes)
```

Read the complete technical specification in [`docs/SYSTEM_DESIGN.md`](file:///docs/SYSTEM_DESIGN.md) covering:
1. **Double-Booking Prevention**: Transactional write-lock serialization and unique composite constraints.
2. **Doctor Leave Conflict Resolution**: Automatic conflict detection, status transitions, and patient alert dispatch.
3. **Slot Hold Architecture**: 5-minute TTL memory locks, atomic hold tables, and lazy/cron sweeping.
4. **Notification Outbox Reliability**: Decoupled asynchronous delivery with exponential retry backoff (1m, 5m, 15m).

---

## 📅 Google Calendar & .ics Sync

1. **Google Calendar API OAuth 2.0**:
   - Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.
   - Set Authorized Redirect URI: `http://localhost:5000/api/calendar/callback`.
   - Visit `http://localhost:5000/api/calendar/auth-url` to link your Google account.
2. **Zero-Config RFC-5545 `.ics` Fallback**:
   - If Google credentials are not configured, CareFlow dynamically generates standard `.ics` calendar invitation files with full meeting metadata, clinic address, and consultation details downloadable directly from the patient portal.

---

## ✉️ Transactional Outbox & Email Retry Queue

- **Development Mode**: Uses **Ethereal Mail** out-of-the-box. Generated emails print instant preview links in the console and are viewable in the Admin Outbox Log.
- **Production Mode**: Set `EMAIL_SERVICE_MODE=smtp` with your `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` in `.env`.
- All outbound communications (booking confirmations, cancellation alerts, leave rescheduling links, dosage reminders) are recorded in `notification_queue` with status tracking (`PENDING`, `SENT`, `FAILED`) and retry counters.

---

## 📊 Database Schema

For detailed database documentation and entity diagrams, see [`docs/DB_SCHEMA.md`](file:///docs/DB_SCHEMA.md).

- **`users`**: Authentication credentials, roles (`PATIENT`, `DOCTOR`, `ADMIN`), and contact info.
- **`doctor_profiles`**: Physician specializations, bio, consultation fees (INR), slot duration, and weekly schedule JSON.
- **`doctor_leaves`**: Approved leave date intervals and absence reasons.
- **`slot_holds`**: 5-minute atomic slot reservations with timestamps.
- **`appointments`**: Bookings, triage classifications, clinical notes, and AI post-visit summaries.
- **`prescriptions`**: Drug names, dosages, frequencies, daily timings JSON, and durations.
- **`medication_reminders`**: Daily scheduled dosage items with patient acknowledgment timestamps.
- **`notification_queue`**: Asynchronous email outbox entries with retry backoff metadata.

---

## 🧪 Automated Testing & Verification

Run the full automated test suite covering all critical workflows:

```bash
# Run Jest test suites across server
npm test
```

### Verified Test Suites (10/10 Passing):
- `tests/concurrency.test.ts`: Validates atomic slot holds, concurrent lock contention, and double-booking prevention under load.
- `tests/leave-conflict.test.ts`: Validates leave creation, conflict queries, atomic status cascading, and patient alert enqueuing.
- `tests/llm-fallback.test.ts`: Validates pre-visit triage prompts, care plan generation, and graceful offline heuristic NLP fallback.

---

## 🐳 Docker & Production Deployment

### Docker Compose
Run the full-stack multi-container application with a single command:
```bash
docker-compose up --build
```

### Standalone Production Build
```bash
# Build both client and server for production
npm run build:all

# Start production server
npm run start --prefix server
```

### Self-Contained Zip Archive
A pre-packaged, zero-dependency zip archive is available at:
```bash
healthcare-appointment-manager.zip
```
*(To regenerate: run `node scripts/package-zip.js`)*

---

## 📄 License
This project is released under the **MIT License**.
