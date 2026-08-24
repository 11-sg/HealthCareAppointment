import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Shield,
  Sparkles,
  ArrowRight,
  Stethoscope,
  Lock,
  Mail,
  Pill,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export const LandingPage: React.FC = () => {
  const { user, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const { success } = useNotification();

  const handleQuickLogin = async (role: 'PATIENT' | 'DOCTOR' | 'ADMIN') => {
    const loggedUser = await switchDemoRole(role);
    success(`Signed in as ${loggedUser.name} (${role})`);
    if (role === 'DOCTOR') navigate('/doctor/dashboard');
    else if (role === 'ADMIN') navigate('/admin/dashboard');
    else navigate('/patient/dashboard');
  };

  const featuredDoctors = [
    {
      name: 'Dr. Rajesh Sharma',
      role: 'MD, DM Cardiology (AIIMS New Delhi)',
      desc: 'Senior Consultant Cardiologist specializing in preventive heart health, hypertension, and arrhythmia.',
      fee: '₹1,200',
      image: '/images/doc_1.png',
    },
    {
      name: 'Dr. Arvind Patel',
      role: 'MD, DM Neurology (NIMHANS Bengaluru)',
      desc: 'Lead Neurologist with expertise in migraine therapies, peripheral neuropathy, and vertigo management.',
      fee: '₹1,000',
      image: '/images/doc_2.png',
    },
    {
      name: 'Dr. Suresh Menon',
      role: 'MS Orthopedics, MCh Joint Surgery',
      desc: 'Chief Orthopedic Surgeon focused on joint preservation, arthroscopy, and sports rehabilitation.',
      fee: '₹1,500',
      image: '/images/doc_3.png',
    },
    {
      name: 'Dr. Amit Verma',
      role: 'MBBS, MD General Medicine',
      desc: 'Senior Physician & Diabetologist specializing in diabetes reversal, adult wellness, and lifestyle health.',
      fee: '₹800',
      image: '/images/doc_4.jpg',
    },
    {
      name: 'Dr. Soumya Swaminathan',
      role: 'MD Pediatrics, DNB (Clinical Pulmonology)',
      desc: 'Senior Pediatric Specialist with deep expertise in childhood asthma, respiratory allergies, and child health.',
      fee: '₹1,400',
      image: '/images/doc_soumya_swaminathan.jpg',
    },
    {
      name: 'Dr. Devi Shetty',
      role: 'MS, FRCS Cardiothoracic Surgery',
      desc: 'Pioneering Senior Cardiac Surgeon specializing in coronary bypass, valve repair, and complex heart care.',
      fee: '₹2,000',
      image: '/images/doc_devi_shetty.jpg',
    },
    {
      name: 'Dr. Randeep Guleria',
      role: 'MD, DM Pulmonary Medicine (AIIMS)',
      desc: 'Senior Pulmonologist specializing in chronic respiratory disorders, sleep apnea, and lung wellness.',
      fee: '₹1,600',
      image: '/images/doc_randeep_guleria.jpg',
    },
    {
      name: 'Dr. Arvinder Singh Soin',
      role: 'MS, FRCS Hepatobiliary Surgery',
      desc: 'Chief Liver Transplant & Hepatobiliary Surgeon renowned for liver disease management and digestive health.',
      fee: '₹1,800',
      image: '/images/doc_as_soin.jpg',
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 text-center">
          <div className="space-y-4 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-medical-50 border border-medical-200 text-medical-800 text-xs font-mono font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-medical-700" />
              Next-Generation Indian Healthcare Platform
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.12]">
              Clinical Precision. <br className="hidden sm:inline" />
              Empathetic Patient Care.
            </h1>

            <p className="text-base text-slate-600 font-sans max-w-2xl mx-auto leading-relaxed">
              Experience seamless appointment reservations with concurrency-safe slot holds, automated physician leave conflict resolution, AI pre-visit triage assessment, and comprehensive post-consultation care plans.
            </p>
          </div>

          {/* Real Hospital Lobby Hero Image */}
          <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden border border-surface-border shadow-2xl group">
            <img
              src="/images/clinic_hero.png"
              alt="CareFlow Healthcare Reception and Waiting Lounge"
              className="w-full h-80 sm:h-[440px] object-cover object-center group-hover:scale-[1.01] transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent flex flex-col justify-end p-6 sm:p-10 text-white">
              <div className="max-w-xl space-y-2 text-left">
                <span className="text-xs font-mono uppercase tracking-wider text-medical-300 font-bold">
                  CareFlow Multispeciality Centre
                </span>
                <p className="text-xl sm:text-2xl font-bold leading-snug">
                  "Compassionate Indian healthcare with seamless scheduling and verified specialist continuity."
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Persona Cards */}
          <div className="max-w-3xl mx-auto pt-2">
            <div className="bg-surface-muted p-6 sm:p-8 rounded-3xl border border-surface-border shadow-card space-y-4 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-surface-subtle">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  Quick Access — Choose Persona
                </span>
                <span className="text-xs font-mono text-medical-700 font-bold">1-Click Fast Login</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('PATIENT')}
                  className="p-5 rounded-2xl bg-white hover:bg-medical-50/50 border border-surface-border hover:border-medical-300 text-slate-900 transition flex flex-col justify-between gap-4 group text-left shadow-card"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-9 h-9 rounded-xl bg-medical-100 border border-medical-200 flex items-center justify-center text-sm font-bold text-medical-800 group-hover:bg-medical-700 group-hover:text-white transition-colors">
                      P
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-medical-700 group-hover:translate-x-0.5 transition" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900">Patient Portal</h4>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      Reserve slots, check symptoms & take daily medications (Aarav Mehta).
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('DOCTOR')}
                  className="p-5 rounded-2xl bg-white hover:bg-medical-50/50 border border-surface-border hover:border-medical-300 text-slate-900 transition flex flex-col justify-between gap-4 group text-left shadow-card"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-9 h-9 rounded-xl bg-medical-100 border border-medical-200 flex items-center justify-center text-sm font-bold text-medical-800 group-hover:bg-medical-700 group-hover:text-white transition-colors">
                      D
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-medical-700 group-hover:translate-x-0.5 transition" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900">Doctor Portal</h4>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      Review pre-visit triage, prescribe & conduct consultations (Dr. Rajesh Sharma).
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('ADMIN')}
                  className="p-5 rounded-2xl bg-white hover:bg-medical-50/50 border border-surface-border hover:border-medical-300 text-slate-900 transition flex flex-col justify-between gap-4 group text-left shadow-card"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-sm font-bold text-slate-800 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      A
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900">Admin Portal</h4>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      Clinic metrics, doctor directory & outbox email queue.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Clinical Staff Showcase */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-left border-b border-surface-border pb-4">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
              Medical Specialists
            </span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Consult Our Senior Indian Specialists
            </h2>
            <p className="text-xs text-slate-500 font-sans">
              Verified clinical experts from AIIMS, NIMHANS, and premier Indian medical institutions.
            </p>
          </div>
          <Link
            to="/patient/doctors"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-medical-700 hover:text-medical-800 transition"
          >
            <span>View All Specialists</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredDoctors.map((doc, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-surface-border overflow-hidden shadow-card flex flex-col justify-between hover:border-medical-400 transition-colors group"
            >
              <div className="relative h-60 w-full overflow-hidden bg-slate-100">
                <img
                  src={doc.image}
                  alt={doc.name}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5 space-y-1.5 flex flex-col justify-between flex-grow">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{doc.name}</h3>
                  <p className="text-xs font-mono text-medical-700 font-semibold">{doc.role}</p>
                  <p className="text-xs text-slate-500 font-sans pt-1 leading-relaxed line-clamp-2">
                    {doc.desc}
                  </p>
                </div>
                <div className="pt-3 border-t border-surface-subtle flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{doc.fee} / session</span>
                  <Link
                    to="/patient/doctors"
                    className="text-[11px] font-bold text-medical-700 hover:text-medical-800 flex items-center gap-1"
                  >
                    <span>Book</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-left space-y-1 border-b border-surface-border pb-4">
          <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
            System Capabilities
          </span>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Engineered for Clinical Reliability
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-7 rounded-3xl border border-surface-border shadow-card space-y-4">
            <div className="w-10 h-10 rounded-xl bg-medical-50 border border-medical-200 flex items-center justify-center text-medical-700">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">
              5-Minute Slot Hold Lock
            </h3>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Atomic transaction locks hold your selected consultation interval for 5 minutes during symptom checkout, strictly preventing concurrent double-booking collisions.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-surface-border shadow-card space-y-4">
            <div className="w-10 h-10 rounded-xl bg-medical-50 border border-medical-200 flex items-center justify-center text-medical-700">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">
              Doctor Leave Conflict Resolution
            </h3>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              When a physician marks leave dates, conflicting bookings are safely cancelled, calendar invites cleaned up, and patients alerted with 1-click priority rescheduling.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-surface-border shadow-card space-y-4">
            <div className="w-10 h-10 rounded-xl bg-medical-50 border border-medical-200 flex items-center justify-center text-medical-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">
              Pre & Post-Visit Summaries
            </h3>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Clinical heuristics and Gemini models evaluate patient symptoms to deliver urgency ratings, chief complaints, diagnostic questions, and patient-friendly care plans.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-surface-border shadow-card space-y-4">
            <div className="w-10 h-10 rounded-xl bg-medical-50 border border-medical-200 flex items-center justify-center text-medical-700">
              <Pill className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">
              Medication Reminder Worker
            </h3>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Automated background cron sweeps scan active prescriptions every 15 minutes, delivering timely dosage reminders and tracking dose acknowledgement.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-surface-border shadow-card space-y-4">
            <div className="w-10 h-10 rounded-xl bg-medical-50 border border-medical-200 flex items-center justify-center text-medical-700">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">
              Transactional Outbox & Retries
            </h3>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Email notifications are safely queued in database records with exponential backoff (1m, 5m, 15m) ensuring zero lost communications during outages.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-surface-border shadow-card space-y-4">
            <div className="w-10 h-10 rounded-xl bg-medical-50 border border-medical-200 flex items-center justify-center text-medical-700">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">
              Google Calendar & iCal Sync
            </h3>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Direct Google Calendar sync with OAuth 2.0 and downloadable RFC-5545 `.ics` invitations compatible with Apple Calendar and Outlook.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
