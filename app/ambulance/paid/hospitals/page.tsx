'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Plus, Search, Upload, Download, Pencil, Trash2, X, Key, Eye } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Pagination from '@/components/Pagination';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://gogobackend-production.up.railway.app';
const PER_PAGE = 10;

interface Hospital {
  id: string; name: string; type: string; phone: string; whatsapp: string; email: string;
  address: string; area: string; city: string; pincode: string;
  latitude: number; longitude: number; ambulance_types: string[];
  vehicle_count: number; base_fare: number; per_km_rate: number;
  login_email: string; is_active: boolean; is_verified: boolean; rating: number; total_bookings: number;
}

const EMPTY: Omit<Hospital, 'id' | 'rating' | 'total_bookings'> & { password: string } = {
  name: '', type: 'hospital', phone: '', whatsapp: '', email: '',
  address: '', area: '', city: 'Delhi', pincode: '', latitude: 0, longitude: 0,
  ambulance_types: [], vehicle_count: 2, base_fare: 500, per_km_rate: 30,
  login_email: '', password: '', is_active: true, is_verified: false,
};

const AMB_TYPES = ['BLS', 'ALS', 'ICU', 'Neonatal', 'Cardiac', 'Transport', 'Dead Body'];
const HOSP_TYPES = ['hospital', 'clinic', 'nursing_home', 'trauma_center', 'private_provider'];

export default function HospitalsPage() {
  const [hospitals,  setHospitals]  = useState<Hospital[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<Hospital | null>(null);
  const [form,       setForm]       = useState<typeof EMPTY>(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [pwModal,    setPwModal]    = useState<Hospital | null>(null);
  const [newPw,      setNewPw]      = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const token = () => localStorage.getItem('ambulance_admin_token') ?? '';
  const hdrs  = () => ({ Authorization: `Bearer ${token()}` });

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/gogoo/ambulance/hospitals`, { headers: hdrs() });
      setHospitals(data || []);
    } catch { toast.error('Failed to load hospitals'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = hospitals.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.area.toLowerCase().includes(search.toLowerCase()) ||
    h.phone.includes(search)
  );
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function openCreate() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(h: Hospital) {
    setEditing(h);
    setForm({ name: h.name, type: h.type, phone: h.phone, whatsapp: h.whatsapp, email: h.email,
      address: h.address, area: h.area, city: h.city, pincode: h.pincode,
      latitude: h.latitude, longitude: h.longitude, ambulance_types: h.ambulance_types || [],
      vehicle_count: h.vehicle_count, base_fare: h.base_fare, per_km_rate: h.per_km_rate,
      login_email: h.login_email, password: '', is_active: h.is_active, is_verified: h.is_verified });
    setShowModal(true);
  }

  function toggleAmbType(t: string) {
    setForm(f => {
      const has = f.ambulance_types.includes(t);
      return { ...f, ambulance_types: has ? f.ambulance_types.filter(x => x !== t) : [...f.ambulance_types, t] };
    });
  }

  async function save() {
    if (!form.name || !form.phone) { toast.error('Name and phone required'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...form };
      if (!body.password) delete body.password;
      if (editing) {
        await axios.patch(`${API}/gogoo/ambulance/hospitals/${editing.id}`, body, { headers: hdrs() });
        toast.success('Hospital updated');
      } else {
        await axios.post(`${API}/gogoo/ambulance/hospitals`, body, { headers: hdrs() });
        toast.success('Hospital created');
      }
      setShowModal(false);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Save failed');
    } finally { setSaving(false); }
  }

  async function del(id: string) {
    try {
      await axios.delete(`${API}/gogoo/ambulance/hospitals/${id}`, { headers: hdrs() });
      toast.success('Hospital deleted');
      setDeleteId(null);
      load();
    } catch { toast.error('Delete failed'); }
  }

  async function resetPw() {
    if (!newPw || newPw.length < 6) { toast.error('Password must be 6+ chars'); return; }
    try {
      await axios.patch(`${API}/gogoo/ambulance/hospitals/${pwModal!.id}/password`, { password: newPw }, { headers: hdrs() });
      toast.success('Password reset');
      setPwModal(null); setNewPw('');
    } catch { toast.error('Reset failed'); }
  }

  function exportXLSX() {
    const ws = XLSX.utils.json_to_sheet(hospitals.map(h => ({
      Name: h.name, Type: h.type, Phone: h.phone, Email: h.email,
      Address: h.address, Area: h.area, City: h.city, Pincode: h.pincode,
      Latitude: h.latitude, Longitude: h.longitude,
      AmbulanceTypes: h.ambulance_types?.join(', '),
      Vehicles: h.vehicle_count, BaseFare: h.base_fare, PerKmRate: h.per_km_rate,
      LoginEmail: h.login_email, Active: h.is_active, Verified: h.is_verified,
      Rating: h.rating, TotalBookings: h.total_bookings,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hospitals');
    XLSX.writeFile(wb, `gogoo_hospitals_${Date.now()}.xlsx`);
    toast.success('Exported!');
  }

  return (
    <div className="space-y-5">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hospital Management</h1>
          <p className="text-xs text-gray-400">{hospitals.length} hospitals registered</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search hospital, area…"
              className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 w-52" />
          </div>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" />
          <button onClick={exportXLSX} className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"><Download size={14} />Export</button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"><Plus size={14} />Add Hospital</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center"><p className="text-3xl mb-2">🏥</p><p className="text-gray-500">No hospitals found</p></div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-gray-50">
              {['Hospital','Type','Contact','Fare','Vehicles','Status','Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {paged.map(h => (
                <tr key={h.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-gray-900 text-sm">{h.name}</p>
                    <p className="text-xs text-gray-400">{h.area || h.city}</p>
                    {h.rating > 0 && <p className="text-[10px] text-amber-500">★ {h.rating.toFixed(1)}</p>}
                  </td>
                  <td className="px-5 py-3"><span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full capitalize">{h.type.replace('_',' ')}</span></td>
                  <td className="px-5 py-3 text-xs text-gray-600">
                    <p>{h.phone}</p>
                    {h.login_email && <p className="text-blue-500 truncate max-w-[120px]">{h.login_email}</p>}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <p className="font-semibold text-gray-900">₹{h.base_fare} base</p>
                    <p className="text-gray-400">+₹{h.per_km_rate}/km</p>
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-900 text-center">{h.vehicle_count}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${h.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {h.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/ambulance/paid/hospitals/${h.id}`} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"><Eye size={13} /></Link>
                      <button onClick={() => openEdit(h)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => setPwModal(h)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors"><Key size={13} /></button>
                      <button onClick={() => setDeleteId(h.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="px-5 py-3 border-t border-gray-100">
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </div>

      {/* Hospital modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Edit Hospital' : 'Add Hospital'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Hospital Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400" placeholder="AIIMS Delhi" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 bg-white">
                  {HOSP_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Vehicles</label>
                <input type="number" min="0" value={form.vehicle_count} onChange={e => setForm(f => ({ ...f, vehicle_count: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone *</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Base Fare (₹)</label>
                <input type="number" min="0" value={form.base_fare} onChange={e => setForm(f => ({ ...f, base_fare: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Per KM Rate (₹)</label>
                <input type="number" min="0" value={form.per_km_rate} onChange={e => setForm(f => ({ ...f, per_km_rate: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Area</label>
                <input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">City</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Login Email (portal)</label>
                <input type="email" value={form.login_email} onChange={e => setForm(f => ({ ...f, login_email: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400" placeholder="hospital@example.com" />
              </div>
              {!editing && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Portal Password</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400" />
                </div>
              )}
              {/* Ambulance types */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-2">Ambulance Types Available</label>
                <div className="flex flex-wrap gap-2">
                  {AMB_TYPES.map(t => (
                    <button key={t} onClick={() => toggleAmbType(t)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${form.ambulance_types.includes(t) ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {/* Toggles */}
              <div className="flex items-center gap-3">
                <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-red-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-gray-700 font-medium">Active</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setForm(f => ({ ...f, is_verified: !f.is_verified }))} className={`relative w-11 h-6 rounded-full transition-colors ${form.is_verified ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_verified ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-gray-700 font-medium">Verified</span>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : editing ? 'Update Hospital' : 'Create Hospital'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {pwModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-96">
            <h3 className="font-bold text-gray-900 mb-1">Reset Portal Password</h3>
            <p className="text-sm text-gray-400 mb-5">{pwModal.name}</p>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (6+ chars)"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setPwModal(null); setNewPw(''); }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={resetPw} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-96 text-center">
            <p className="text-4xl mb-3">🗑️</p>
            <p className="font-bold text-gray-900 mb-2">Delete this hospital?</p>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => del(deleteId)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
