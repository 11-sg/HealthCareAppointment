import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Plus,
  Edit2,
  Clock,
  Award,
  Loader2,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { DoctorProfile } from '../../types';
import { adminApi, doctorApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { Modal } from '../../components/Modal';

export const AdminDoctorsPage: React.FC = () => {
  const { success, error } = useNotification();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Add Doctor Modal
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('doctor123');
  const [addPhone, setAddPhone] = useState('');
  const [addSpec, setAddSpec] = useState('General Medicine');
  const [addFee, setAddFee] = useState('800');
  const [addDuration, setAddDuration] = useState('30');
  const [addBio, setAddBio] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit Doctor Modal
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorProfile | null>(null);
  const [editSpec, setEditSpec] = useState('');
  const [editFee, setEditFee] = useState('');
  const [editDuration, setEditDuration] = useState('30');
  const [editBio, setEditBio] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await doctorApi.list();
      setDoctors(res.data.doctors);
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await adminApi.createDoctor({
        name: addName,
        email: addEmail,
        password: addPassword,
        phone: addPhone,
        specialization: addSpec,
        bio: addBio,
        consultation_fee: parseFloat(addFee),
        slot_duration_minutes: parseInt(addDuration, 10),
      });

      success('New physician profile created successfully');
      setAddModalOpen(false);
      setAddName('');
      setAddEmail('');
      setAddBio('');
      fetchDoctors();
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to create doctor');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (doc: DoctorProfile) => {
    setEditingDoctor(doc);
    setEditSpec(doc.specialization);
    setEditFee(String(doc.consultation_fee));
    setEditDuration(String(doc.slot_duration_minutes));
    setEditBio(doc.bio || '');
    setEditIsActive(doc.is_active);
    setEditModalOpen(true);
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;

    setEditLoading(true);
    try {
      await adminApi.updateDoctor(editingDoctor.user_id, {
        specialization: editSpec,
        bio: editBio,
        consultation_fee: parseFloat(editFee),
        slot_duration_minutes: parseInt(editDuration, 10),
        is_active: editIsActive,
      });

      success('Physician profile updated successfully');
      setEditModalOpen(false);
      fetchDoctors();
    } catch (err: any) {
      error(err.response?.data?.error || 'Failed to update doctor profile');
    } finally {
      setEditLoading(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    return (
      !search ||
      doc.name?.toLowerCase().includes(search.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(search.toLowerCase()) ||
      doc.email?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-surface-border">
        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-widest text-medical-700 font-bold">
            Staff Directory
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Physician Staff Management
          </h1>
          <p className="text-xs text-slate-500 font-sans">
            Provision physician credentials, configure consultation fees in INR (₹), and adjust slot durations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-medical-700 hover:bg-medical-800 text-white font-medium text-xs rounded-xl shadow-card transition flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Add New Physician
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name or specialty..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-surface-border rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-medical-600 shadow-card"
        />
      </div>

      {/* Doctors Table */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-medical-600" />
          <span className="text-xs font-mono">Loading doctors list...</span>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-surface-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-surface-border text-slate-500 font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Physician</th>
                  <th className="py-3 px-4">Specialization</th>
                  <th className="py-3 px-4">Slot Length</th>
                  <th className="py-3 px-4">Fee (₹)</th>
                  <th className="py-3 px-4">Experience</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-subtle font-sans text-slate-700">
                {filteredDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-medical-50 border border-medical-200 text-medical-800 font-bold flex items-center justify-center">
                          {doc.name ? doc.name.charAt(0) : 'D'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            Dr. {doc.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">{doc.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-medical-700 font-semibold">
                      {doc.specialization}
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-900">{doc.slot_duration_minutes}m</td>
                    <td className="py-4 px-4 font-bold text-slate-900">₹{doc.consultation_fee}</td>
                    <td className="py-4 px-4">{doc.experience_years} yrs</td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono border font-bold ${
                          doc.is_active
                            ? 'bg-slate-100 text-slate-800 border-surface-border'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {doc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(doc)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-medium border border-surface-border transition inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Doctor Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Physician Profile"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateDoctor} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Dr. Priya Nair"
                className="w-full px-3 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="dr.nair@careflow.com"
                className="w-full px-3 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
                Password *
              </label>
              <input
                type="text"
                required
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
                Phone Number
              </label>
              <input
                type="tel"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
                Specialization *
              </label>
              <input
                type="text"
                required
                value={addSpec}
                onChange={(e) => setAddSpec(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
                Fee (₹)
              </label>
              <input
                type="number"
                min={0}
                step={50}
                value={addFee}
                onChange={(e) => setAddFee(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
                Slot Length
              </label>
              <select
                value={addDuration}
                onChange={(e) => setAddDuration(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
              Physician Biography
            </label>
            <textarea
              rows={2}
              value={addBio}
              onChange={(e) => setAddBio(e.target.value)}
              placeholder="Clinical credentials, specialities..."
              className="w-full p-3 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-subtle">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addLoading}
              className="px-4 py-2 bg-medical-700 hover:bg-medical-800 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-card transition flex items-center gap-2"
            >
              {addLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Physician'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Doctor Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Profile: Dr. ${editingDoctor?.name}`}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateDoctor} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
                Specialization
              </label>
              <input
                type="text"
                value={editSpec}
                onChange={(e) => setEditSpec(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
                Fee (₹)
              </label>
              <input
                type="number"
                min={0}
                step={50}
                value={editFee}
                onChange={(e) => setEditFee(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
                Slot Length
              </label>
              <select
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-600 mb-1 font-semibold">
              Physician Biography
            </label>
            <textarea
              rows={3}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-surface-border rounded-xl text-xs font-sans text-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-is-active"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-medical-700 focus:ring-0"
            />
            <label htmlFor="edit-is-active" className="text-xs font-medium text-slate-800 cursor-pointer">
              Active in Clinic Directory
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-subtle">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editLoading}
              className="px-4 py-2 bg-medical-700 hover:bg-medical-800 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-card transition flex items-center gap-2"
            >
              {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
