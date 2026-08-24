import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Save,
  CheckCircle2,
  FileText,
  Loader2,
  Stethoscope,
} from 'lucide-react';
import { DoctorProfile, WorkingHoursSchedule } from '../../types';
import { doctorApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

export const DoctorScheduleSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useNotification();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [specialization, setSpecialization] = useState<string>('General Medicine');
  const [bio, setBio] = useState<string>('');
  const [experienceYears, setExperienceYears] = useState<number>(5);
  const [consultationFee, setConsultationFee] = useState<number>(500);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(30);

  const [schedule, setSchedule] = useState<WorkingHoursSchedule>({
    monday: { start: '09:00', end: '17:00', is_available: true },
    tuesday: { start: '09:00', end: '17:00', is_available: true },
    wednesday: { start: '09:00', end: '17:00', is_available: true },
    thursday: { start: '09:00', end: '17:00', is_available: true },
    friday: { start: '09:00', end: '16:00', is_available: true },
    saturday: { start: '10:00', end: '14:00', is_available: false },
    sunday: { start: '10:00', end: '14:00', is_available: false },
  });

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await doctorApi.getById(user.id);
        const doc = res.data.doctor;
        setSpecialization(doc.specialization);
        setBio(doc.bio || '');
        setExperienceYears(doc.experience_years);
        setConsultationFee(doc.consultation_fee);
        setSlotDurationMinutes(doc.slot_duration_minutes);
        if (doc.working_hours) {
          setSchedule(doc.working_hours);
        }
      } catch (err: any) {
        error('Failed to load doctor profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleDayChange = (
    day: keyof WorkingHoursSchedule,
    field: 'start' | 'end' | 'is_available',
    value: any
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day]!,
        [field]: value,
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await doctorApi.updateProfile({
        specialization,
        bio,
        experience_years: experienceYears,
        consultation_fee: consultationFee,
        slot_duration_minutes: slotDurationMinutes,
        working_hours: schedule,
      });

      success('Availability schedule and practice parameters updated successfully!');
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const days: Array<keyof WorkingHoursSchedule> = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-medical-600" />
        <span className="text-xs font-mono">Loading schedule parameters...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-surface-border">
        <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
          Physician Practice Parameters
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Working Hours & Slot Durations
        </h1>
        <p className="text-xs text-slate-500 font-sans">
          Customize your weekly consultation hours, appointment duration intervals, and session fees.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Practice Parameters */}
        <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-5">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-medical-700" /> Clinical Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-semibold">
                Specialization
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-semibold">
                Consultation Fee (₹)
              </label>
              <input
                type="number"
                min={0}
                step={50}
                value={consultationFee}
                onChange={(e) => setConsultationFee(parseFloat(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-semibold">
                Slot Length
              </label>
              <select
                value={slotDurationMinutes}
                onChange={(e) => setSlotDurationMinutes(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-600 mb-1.5 font-semibold">
              Physician Biography
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Clinical focus, background, education..."
              className="w-full p-3.5 bg-slate-50 border border-surface-border rounded-2xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Weekly Working Hours Table */}
        <div className="bg-white p-6 rounded-3xl border border-surface-border shadow-card space-y-5">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-medical-700" /> Weekly Availability Schedule
          </h3>

          <div className="space-y-2.5">
            {days.map((day) => {
              const dayData = schedule[day] || { start: '09:00', end: '17:00', is_available: false };

              return (
                <div
                  key={day}
                  className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    dayData.is_available ? 'bg-slate-50 border-surface-border' : 'bg-slate-50/40 border-surface-subtle opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3 w-36">
                    <input
                      type="checkbox"
                      id={`avail-${day}`}
                      checked={dayData.is_available}
                      onChange={(e) => handleDayChange(day, 'is_available', e.target.checked)}
                      className="w-4 h-4 rounded text-medical-700 focus:ring-0"
                    />
                    <label htmlFor={`avail-${day}`} className="font-mono text-xs capitalize text-slate-900 font-bold cursor-pointer">
                      {day}
                    </label>
                  </div>

                  {dayData.is_available ? (
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Start:</span>
                        <input
                          type="time"
                          value={dayData.start}
                          onChange={(e) => handleDayChange(day, 'start', e.target.value)}
                          className="px-2 py-1 bg-white border border-surface-border rounded-lg text-xs font-mono focus:outline-none"
                        />
                      </div>

                      <span className="text-slate-400">to</span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">End:</span>
                        <input
                          type="time"
                          value={dayData.end}
                          onChange={(e) => handleDayChange(day, 'end', e.target.value)}
                          className="px-2 py-1 bg-white border border-surface-border rounded-lg text-xs font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-mono text-slate-400 italic">Unavailable / Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-medical-700 hover:bg-medical-800 disabled:opacity-50 text-white rounded-xl text-xs font-medium shadow-card transition flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Working Hours</span>
          </button>
        </div>
      </form>
    </div>
  );
};
