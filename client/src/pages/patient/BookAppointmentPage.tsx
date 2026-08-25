import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Shield,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { DoctorProfile, PreVisitSummary, SlotAvailability } from '../../types';
import { doctorApi, slotApi, appointmentApi, getApiUrl } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { SlotPicker } from '../../components/SlotPicker';
import { HoldTimer } from '../../components/HoldTimer';
import { UrgencyBadge } from '../../components/UrgencyBadge';

export const BookAppointmentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialDoctorId = searchParams.get('doctorId') || '';
  const navigate = useNavigate();
  const { success, error, warning } = useNotification();

  // Multi-step flow: 1 = Specialist & Slot, 2 = Intake & Pre-visit Triage, 3 = Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Doctor state
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDoctorId);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);

  // Slot calculation state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [slotsResult, setSlotsResult] = useState<{
    doctor?: DoctorProfile;
    isLeaveDay?: boolean;
    slots: SlotAvailability[];
  } | null>(null);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    slot_start: string;
    slot_end: string;
  } | null>(null);

  // Slot Hold State
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [holdingSlot, setHoldingSlot] = useState<boolean>(false);

  // Symptom intake & AI Pre-visit summary
  const [symptoms, setSymptoms] = useState<string>('');
  const [analyzingSymptoms, setAnalyzingSymptoms] = useState<boolean>(false);
  const [preVisitSummary, setPreVisitSummary] = useState<PreVisitSummary | null>(null);

  // Booking outcome
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [confirmedAppt, setConfirmedAppt] = useState<any | null>(null);

  const getDoctorPhoto = (name?: string, avatarUrl?: string) => {
    if (avatarUrl) return avatarUrl;
    if (!name) return null;
    const lower = name.toLowerCase();
    if (lower.includes('rajesh') || lower.includes('sharma')) return '/images/doc_1.png';
    if (lower.includes('arvind') || lower.includes('patel')) return '/images/doc_2.png';
    if (lower.includes('suresh') || lower.includes('menon')) return '/images/doc_3.png';
    if (lower.includes('amit') || lower.includes('verma')) return '/images/doc_4.jpg';
    if (lower.includes('soumya') || lower.includes('swaminathan')) return '/images/doc_soumya_swaminathan.jpg';
    if (lower.includes('devi') || lower.includes('shetty')) return '/images/doc_devi_shetty.jpg';
    if (lower.includes('randeep') || lower.includes('guleria')) return '/images/doc_randeep_guleria.jpg';
    if (lower.includes('soin') || lower.includes('arvinder')) return '/images/doc_as_soin.jpg';
    if (lower.includes('seth') || lower.includes('ashok')) return '/images/doc_ashok_seth.jpg';
    if (lower.includes('nageshwar') || lower.includes('reddy')) return '/images/doc_nageshwar_reddy.jpg';
    if (lower.includes('trehan') || lower.includes('naresh')) return '/images/doc_naresh_trehan.jpg';
    if (lower.includes('panda') || lower.includes('ramakanta')) return '/images/doc_ramakanta_panda.jpg';
    if (lower.includes('udwadia') || lower.includes('tehemton')) return '/images/doc_tehemton_udwadia.jpg';
    if (lower.includes('srinath')) return '/images/doc_srinath_reddy.jpg';
    return null;
  };

  // 1. Fetch all active doctors on load
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await doctorApi.list();
        setDoctors(res.data.doctors);
        if (initialDoctorId) {
          const found = res.data.doctors.find((d: DoctorProfile) => d.user_id === initialDoctorId);
          if (found) {
            setSelectedDoctor(found);
            setSelectedDoctorId(found.user_id);
          }
        }
      } catch (err: any) {
        error('Failed to load doctors list');
      }
    };
    fetchDoctors();
  }, [initialDoctorId]);

  // 2. Fetch slots whenever doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) return;

    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await slotApi.getDoctorSlots(selectedDoctorId, selectedDate);
        setSlotsResult(res.data);
        if (res.data.doctor) setSelectedDoctor(res.data.doctor);
        setSelectedSlot(null);
      } catch (err: any) {
        error('Failed to calculate slot availability');
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDoctorId, selectedDate]);

  // Handle Slot Selection with Atomic Hold Lock
  const handleSelectSlot = async (slot: { slot_start: string; slot_end: string }) => {
    setSelectedSlot(slot);
    setHoldingSlot(true);

    try {
      const res = await slotApi.holdSlot({
        doctorId: selectedDoctorId,
        slotStart: slot.slot_start,
        slotEnd: slot.slot_end,
      });

      setHoldToken(res.data.holdToken);
      setHoldExpiresAt(res.data.expiresAt);
      success('Temporary 5-minute hold lock acquired');
    } catch (err: any) {
      setSelectedSlot(null);
      setHoldToken(null);
      setHoldExpiresAt(null);
      error(err.response?.data?.error || 'Failed to acquire slot lock. It may have just been booked.');
    } finally {
      setHoldingSlot(false);
    }
  };

  const handleHoldExpired = () => {
    warning('Your 5-minute slot hold has expired. Please select a time slot again.');
    setHoldToken(null);
    setHoldExpiresAt(null);
    setSelectedSlot(null);
    setStep(1);
  };

  // Pre-visit Symptom Analysis
  const handleAnalyzeSymptoms = async () => {
    if (!symptoms.trim() || symptoms.length < 5) {
      warning('Please enter a brief description of your symptoms');
      return;
    }

    setAnalyzingSymptoms(true);
    try {
      const res = await appointmentApi.previewSymptoms(symptoms);
      setPreVisitSummary(res.data.summary);
    } catch (err: any) {
      error('Failed to generate pre-visit summary');
    } finally {
      setAnalyzingSymptoms(false);
    }
  };

  // Confirm Final Booking
  const handleConfirmBooking = async () => {
    if (!selectedSlot || !selectedDoctorId) return;

    setBookingLoading(true);
    try {
      const res = await appointmentApi.book({
        doctorId: selectedDoctorId,
        slotStart: selectedSlot.slot_start,
        slotEnd: selectedSlot.slot_end,
        symptoms,
        holdToken: holdToken || undefined,
      });

      setConfirmedAppt(res.data.appointment);
      setStep(3);
      success('Consultation booked and confirmed successfully!');
    } catch (err: any) {
      error(err.response?.data?.error || 'Booking reservation failed. Slot might be unavailable.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Steps Indicator */}
      <div className="space-y-4 pb-4 border-b border-surface-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
              Consultation Reservation
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Book Specialist Consultation
            </h1>
          </div>

          {holdExpiresAt && (
            <HoldTimer expiresAt={holdExpiresAt} onExpire={handleHoldExpired} />
          )}
        </div>

        {/* Step Progress Bar */}
        <div className="flex items-center gap-2 pt-2">
          <div
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              step >= 1 ? 'bg-medical-700' : 'bg-slate-200'
            }`}
          />
          <div
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              step >= 2 ? 'bg-medical-700' : 'bg-slate-200'
            }`}
          />
          <div
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              step >= 3 ? 'bg-medical-700' : 'bg-slate-200'
            }`}
          />
        </div>
      </div>

      {/* Step 1: Select Physician & Slot */}
      {step === 1 && (
        <div className="space-y-8">
          {/* Physician Picker */}
          <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-4">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
              1. Choose Clinical Specialist
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {doctors.map((doc) => {
                const isSelected = selectedDoctorId === doc.user_id;
                const photo = getDoctorPhoto(doc.name, doc.avatar_url);

                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedDoctorId(doc.user_id);
                      setSelectedDoctor(doc);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 ${
                      isSelected
                        ? 'border-medical-700 bg-medical-50/60 shadow-card ring-1 ring-medical-700'
                        : 'border-surface-border bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 border border-surface-border">
                      {photo ? (
                        <img src={photo} alt={doc.name} className="w-full h-full object-cover object-top" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-medical-800 text-xs bg-medical-100">
                          {doc.name ? doc.name.charAt(0) : 'D'}
                        </div>
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      <span className="font-bold text-xs text-slate-900 block truncate">
                        Dr. {doc.name}
                      </span>
                      <span className="text-[11px] font-mono text-medical-700 block truncate font-semibold">
                        {doc.specialization}
                      </span>
                      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 font-mono">
                        <span>{doc.slot_duration_minutes}m</span>
                        <span className="font-bold text-slate-900">₹{doc.consultation_fee}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slot Picker Component */}
          {selectedDoctor && (
            <SlotPicker
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              slotsResult={slotsResult}
              loading={slotsLoading || holdingSlot}
              selectedSlot={selectedSlot}
              onSelectSlot={handleSelectSlot}
            />
          )}

          {/* Step 1 Action Bar */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => navigate('/patient/doctors')}
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Directory
            </button>

            <button
              type="button"
              disabled={!selectedSlot || !holdToken}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-medical-700 hover:bg-medical-800 disabled:opacity-40 disabled:hover:bg-medical-700 text-white rounded-xl text-xs font-medium shadow-card transition"
            >
              <span>Continue to Symptom Intake</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Symptom Intake & AI Pre-visit Analysis */}
      {step === 2 && (
        <div className="space-y-8">
          {/* Reservation Summary Strip */}
          <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-200 flex-shrink-0 border border-surface-border">
                {getDoctorPhoto(selectedDoctor?.name, selectedDoctor?.avatar_url) ? (
                  <img
                    src={getDoctorPhoto(selectedDoctor?.name, selectedDoctor?.avatar_url)!}
                    alt={selectedDoctor?.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-medical-800 bg-medical-100">
                    Dr
                  </div>
                )}
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Selected Appointment Details
                </span>
                <h3 className="font-bold text-lg text-slate-900">
                  Dr. {selectedDoctor?.name} — {selectedDoctor?.specialization}
                </h3>
                <p className="text-xs font-mono text-slate-600">
                  {selectedSlot && new Date(selectedSlot.slot_start).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  at{' '}
                  {selectedSlot && new Date(selectedSlot.slot_start).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Consultation Fee</span>
              <span className="text-xl font-bold text-slate-900">₹{selectedDoctor?.consultation_fee}</span>
            </div>
          </div>

          {/* Symptom Input Form */}
          <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-bold">
                2. Describe Your Symptoms & Concerns
              </label>
              <p className="text-xs text-slate-500 font-sans mb-3">
                Providing accurate symptoms enables the clinician and our pre-visit triage system to assess urgency and prepare diagnostic questions.
              </p>
              <textarea
                rows={4}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="E.g., Experiencing recurring throbbing headaches on temples for 3 days, exacerbated by screen glare, mild nausea in mornings..."
                className="w-full p-4 bg-slate-50 border border-surface-border rounded-2xl text-xs font-sans text-slate-900 focus:bg-white focus:ring-2 focus:ring-medical-600 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleAnalyzeSymptoms}
                disabled={analyzingSymptoms || symptoms.length < 5}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-surface-border rounded-xl text-xs font-medium transition shadow-sm disabled:opacity-40"
              >
                {analyzingSymptoms ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-medical-600" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-medical-700" />
                )}
                <span>Generate AI Triage Assessment</span>
              </button>

              <span className="text-[11px] font-mono text-slate-400">
                {symptoms.length} characters
              </span>
            </div>

            {/* AI Triage Preview Card */}
            {preVisitSummary && (
              <div className="mt-4 p-5 bg-slate-50 rounded-2xl border border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-medical-700" />
                    AI Symptom Assessment Preview
                  </span>
                  <UrgencyBadge level={preVisitSummary.urgency_level} size="sm" />
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Chief Complaint</span>
                  <p className="text-xs text-slate-800 font-sans mt-0.5">{preVisitSummary.chief_complaint}</p>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Suggested Questions for Physician</span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 font-sans mt-1">
                    {preVisitSummary.suggested_questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Step 2 Action Bar */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" /> Change Time Slot
            </button>

            <button
              type="button"
              disabled={bookingLoading || !symptoms.trim()}
              onClick={handleConfirmBooking}
              className="inline-flex items-center gap-2 px-8 py-3 bg-medical-700 hover:bg-medical-800 disabled:opacity-40 text-white rounded-xl text-xs font-medium shadow-card transition"
            >
              {bookingLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Confirm & Finalize Booking</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation & Next Steps */}
      {step === 3 && confirmedAppt && (
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-surface-border shadow-card text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-medical-50 border border-medical-200 text-medical-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
              Booking Reference: #{confirmedAppt.appointment_number}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Consultation Successfully Confirmed!
            </h2>
            <p className="text-xs text-slate-500 font-sans max-w-md mx-auto">
              Your appointment is locked. A confirmation email with calendar invitation has been queued for delivery.
            </p>
          </div>

          {/* Quick Details Box */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-surface-border max-w-md mx-auto text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Physician:</span>
              <span className="font-bold text-slate-900">Dr. {selectedDoctor?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Specialty:</span>
              <span className="text-medical-700 font-semibold">{selectedDoctor?.specialization}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Scheduled Date:</span>
              <span className="font-bold text-slate-900">
                {new Date(confirmedAppt.slot_start).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time:</span>
              <span className="font-bold text-slate-900">
                {new Date(confirmedAppt.slot_start).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-surface-subtle">
              <span className="text-slate-500">Consultation Fee:</span>
              <span className="font-bold text-medical-700 text-sm">₹{selectedDoctor?.consultation_fee}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={getApiUrl(`/appointments/${confirmedAppt.id}/ics`)}
              download
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-surface-border rounded-xl text-xs font-medium transition shadow-sm flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4 text-medical-700" />
              <span>Download .ics Calendar Invite</span>
            </a>

            <button
              type="button"
              onClick={() => navigate('/patient/dashboard')}
              className="w-full sm:w-auto px-6 py-2.5 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-xs font-medium shadow-card transition"
            >
              Go to Patient Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
