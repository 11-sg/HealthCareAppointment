import React from 'react';
import { Lock, Calendar, Mail, Zap, Sparkles, Layers, ShieldCheck } from 'lucide-react';

export const AdminSystemDesignPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-surface-border">
        <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
          Engineering Specification
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          System Design & Architectural Pillars
        </h1>
        <p className="text-xs text-slate-500 font-sans">
          Technical specifications for double-booking prevention, leave conflict resolution, slot hold TTL locks, and notification reliability.
        </p>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1: Double-Booking Prevention */}
        <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-3">
          <div className="flex items-center gap-2.5 text-slate-900">
            <div className="w-8 h-8 rounded-xl bg-medical-50 border border-medical-200 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4 text-medical-700" />
            </div>
            <h3 className="font-bold text-lg">1. Double-Booking Prevention</h3>
          </div>
          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            Double-booking prevention is enforced at both the <strong>application layer</strong> and the <strong>database transaction layer</strong>:
          </p>
          <ul className="text-xs text-slate-700 font-sans space-y-1.5 list-disc list-inside bg-slate-50 p-4 rounded-2xl border border-surface-subtle">
            <li><strong>Immediate SQLite/Postgres Transactions:</strong> Write locks prevent race conditions during simultaneous booking checkouts.</li>
            <li><strong>Unique Composite Lookups:</strong> Enforces that no active booking (<code className="font-mono text-medical-700 font-bold">CONFIRMED</code>, <code className="font-mono text-medical-700 font-bold">PENDING</code>) can coexist for the same <code className="font-mono text-medical-700 font-bold">(doctor_id, slot_start)</code>.</li>
            <li><strong>Concurrent Hold Verification:</strong> Confirms that no other user holds an unexpired lock before finalizing reservation.</li>
          </ul>
        </div>

        {/* Pillar 2: Slot Hold Mechanism */}
        <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-3">
          <div className="flex items-center gap-2.5 text-slate-900">
            <div className="w-8 h-8 rounded-xl bg-medical-50 border border-medical-200 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4 text-medical-700" />
            </div>
            <h3 className="font-bold text-lg">2. Slot Hold Mechanism</h3>
          </div>
          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            Temporary reservations ensure a seamless checkout experience while preventing slot hogging:
          </p>
          <ul className="text-xs text-slate-700 font-sans space-y-1.5 list-disc list-inside bg-slate-50 p-4 rounded-2xl border border-surface-subtle">
            <li><strong>5-Minute TTL:</strong> When a patient selects a slot, an atomic 5-minute hold is recorded in the <code className="font-mono text-medical-700 font-bold">slot_holds</code> table.</li>
            <li><strong>Single Active Hold Per User:</strong> Prevents a single patient from monopolizing multiple slots across doctors.</li>
            <li><strong>Lazy & Periodic Sweep:</strong> Expired holds are cleared both on slot lookup requests and via a 1-minute background cron worker.</li>
          </ul>
        </div>

        {/* Pillar 3: Doctor Leave Conflict Handling */}
        <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-3">
          <div className="flex items-center gap-2.5 text-slate-900">
            <div className="w-8 h-8 rounded-xl bg-medical-50 border border-medical-200 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4 text-medical-700" />
            </div>
            <h3 className="font-bold text-lg">3. Doctor Leave Conflict Handling</h3>
          </div>
          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            When a doctor or administrator registers a scheduled or unexpected leave date range:
          </p>
          <ul className="text-xs text-slate-700 font-sans space-y-1.5 list-disc list-inside bg-slate-50 p-4 rounded-2xl border border-surface-subtle">
            <li><strong>Conflict Scanner:</strong> Finds all existing active appointments within the leave interval <code className="font-mono text-medical-700 font-bold">[start_date, end_date]</code>.</li>
            <li><strong>Bulk Atomic Status Update:</strong> Transitions affected bookings to <code className="font-mono text-medical-700 font-bold">CANCELLED_DUE_TO_LEAVE</code>.</li>
            <li><strong>Automated Patient Alerts:</strong> Enqueues high-priority notifications with doctor leave context and 1-click priority reschedule links.</li>
            <li><strong>Calendar Deletion:</strong> Automatically deletes corresponding Google Calendar events.</li>
          </ul>
        </div>

        {/* Pillar 4: Notification Reliability & Retries */}
        <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-3">
          <div className="flex items-center gap-2.5 text-slate-900">
            <div className="w-8 h-8 rounded-xl bg-medical-50 border border-medical-200 flex items-center justify-center font-bold">
              <Mail className="w-4 h-4 text-medical-700" />
            </div>
            <h3 className="font-bold text-lg">4. Notification Outbox & Retries</h3>
          </div>
          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            Transactional email reliability is decoupled from HTTP request cycles:
          </p>
          <ul className="text-xs text-slate-700 font-sans space-y-1.5 list-disc list-inside bg-slate-50 p-4 rounded-2xl border border-surface-subtle">
            <li><strong>Transactional Outbox Pattern:</strong> Emails are written to <code className="font-mono text-medical-700 font-bold">notification_queue</code> synchronously.</li>
            <li><strong>Exponential Backoff Retries:</strong> Failed deliveries retry after 1 min, 5 mins, and 15 mins up to max retries.</li>
            <li><strong>Fallback Transports:</strong> Automatically switches between Nodemailer SMTP, Ethereal test mailboxes, and local audit logs.</li>
            <li><strong>Medication Scheduler:</strong> Background cron queries daily prescription schedules and dispatches timely dosage alerts.</li>
          </ul>
        </div>
      </div>

      {/* AI Triage & Fallback Spec */}
      <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-4">
        <div className="flex items-center gap-2 text-slate-900">
          <Sparkles className="w-4 h-4 text-medical-700" />
          <h3 className="font-bold text-lg">5. LLM Integration & Graceful Failure Resilience</h3>
        </div>

        <p className="text-xs text-slate-600 font-sans leading-relaxed">
          The system integrates Google Gemini 1.5 Flash with deterministic prompt contracts and emergency heuristic fallback parsers:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-surface-subtle space-y-1.5 text-xs font-sans">
            <span className="font-mono text-[10px] uppercase text-medical-700 font-bold block">
              Pre-Visit Symptom Triage Prompt:
            </span>
            <p className="font-mono text-[11px] text-slate-800 bg-white p-3 rounded-xl border border-surface-border leading-relaxed">
              "Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: &lt;symptoms&gt;"
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-surface-subtle space-y-1.5 text-xs font-sans">
            <span className="font-mono text-[10px] uppercase text-medical-700 font-bold block">
              Post-Visit Care Plan Prompt:
            </span>
            <p className="font-mono text-[11px] text-slate-800 bg-white p-3 rounded-xl border border-surface-border leading-relaxed">
              "Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: &lt;notes&gt;"
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 font-sans pt-1">
          <strong>Graceful Heuristic Fallback:</strong> When the Gemini API key is omitted, throttled, or offline, the platform automatically switches to an internal rule-based clinical parser that detects danger symptoms and formats care plans without crashing or blocking user checkout.
        </p>
      </div>
    </div>
  );
};
