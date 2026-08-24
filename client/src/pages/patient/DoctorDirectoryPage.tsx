import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope,
  Search,
  Calendar,
  Clock,
  Award,
  Loader2,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { DoctorProfile } from '../../types';
import { doctorApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

export const DoctorDirectoryPage: React.FC = () => {
  const { error } = useNotification();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Map doctor names to uploaded photos
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [docsRes, specsRes] = await Promise.all([
          doctorApi.list({
            specialization: selectedSpec === 'all' ? undefined : selectedSpec,
            search: searchQuery || undefined,
          }),
          doctorApi.getSpecializations(),
        ]);
        setDoctors(docsRes.data.doctors);
        setSpecializations(specsRes.data.specializations);
      } catch (err: any) {
        error(err.response?.data?.error || 'Failed to fetch medical directory');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSpec, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-surface-border">
        <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
          Medical Directory
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Clinical Specialists & Physicians
        </h1>
        <p className="text-xs text-slate-500 font-sans">
          Browse verified Indian clinical specialists, review qualifications, and reserve consultation intervals.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by doctor name or specialty..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-surface-border rounded-xl text-xs font-sans focus:ring-2 focus:ring-medical-600 focus:outline-none shadow-card"
          />
        </div>

        {/* Specialization Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedSpec('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition border ${
              selectedSpec === 'all'
                ? 'bg-medical-700 text-white border-medical-700 shadow-card font-bold'
                : 'bg-white text-slate-700 border-surface-border hover:bg-surface-muted'
            }`}
          >
            All Specializations
          </button>
          {specializations.map((spec) => (
            <button
              key={spec}
              type="button"
              onClick={() => setSelectedSpec(spec)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition border ${
                selectedSpec === spec
                  ? 'bg-medical-700 text-white border-medical-700 shadow-card font-bold'
                  : 'bg-white text-slate-700 border-surface-border hover:bg-surface-muted'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-medical-600" />
          <span className="text-xs font-mono">Loading specialists...</span>
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-3xl border border-surface-border p-12 text-center space-y-3 shadow-card">
          <Stethoscope className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="font-bold text-lg text-slate-900">No Specialists Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria or selecting a different medical field.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => {
            const photo = getDoctorPhoto(doc.name, doc.avatar_url);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl border border-surface-border shadow-card hover:border-medical-400 transition flex flex-col justify-between overflow-hidden group"
              >
                {photo ? (
                  <div className="relative h-60 w-full overflow-hidden bg-slate-100">
                    <img
                      src={photo}
                      alt={`Dr. ${doc.name}`}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[10px] font-mono font-bold text-medical-800 shadow-card border border-white/40">
                        {doc.specialization}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 pb-0 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-medical-50 border border-medical-200 flex items-center justify-center text-lg font-bold text-medical-800">
                      {doc.name ? doc.name.charAt(0) : 'D'}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">Dr. {doc.name}</h3>
                      <span className="text-xs font-mono text-medical-700 font-semibold">{doc.specialization}</span>
                    </div>
                  </div>
                )}

                <div className="p-6 space-y-4 flex flex-col justify-between flex-grow">
                  <div>
                    {photo && (
                      <div className="mb-2">
                        <h3 className="font-bold text-lg text-slate-900 leading-tight">
                          Dr. {doc.name}
                        </h3>
                        <span className="text-xs font-mono text-medical-700 block mt-0.5 font-semibold">
                          {doc.specialization}
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-slate-600 font-sans leading-relaxed line-clamp-3">
                      {doc.bio || 'Experienced clinician providing comprehensive diagnostic and preventive healthcare.'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* Metadata Row */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-surface-subtle text-center text-xs">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Experience</span>
                        <span className="font-bold text-slate-900">{doc.experience_years} yrs</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Duration</span>
                        <span className="font-bold text-slate-900">{doc.slot_duration_minutes}m</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Session Fee</span>
                        <span className="font-bold text-medical-700">₹{doc.consultation_fee}</span>
                      </div>
                    </div>

                    {/* Book CTA */}
                    <Link
                      to={`/patient/book?doctorId=${doc.user_id}`}
                      className="w-full py-2.5 px-4 bg-medical-700 hover:bg-medical-800 text-white rounded-xl text-xs font-medium shadow-card transition flex items-center justify-center gap-2 group/btn"
                    >
                      <span>Reserve Consultation Slot</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
