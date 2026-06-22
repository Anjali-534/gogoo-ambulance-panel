'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { Plus, Search, Upload, Download, Pencil, Trash2, X, Check } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Pagination from '@/components/Pagination';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://gogobackend-production.up.railway.app';
const PER_PAGE = 12;

interface NGO {
  id: string; name: string; type: string; phone: string; whatsapp: string; email: string;
  address: string; area: string; city: string; pincode: string; coverage_areas: string[];
  vehicle_count: number; is_active: boolean; is_verified: boolean; notes: string;
}

const EMPTY: Omit<NGO, 'id'> = {
  name: '', type: 'ngo', phone: '', whatsapp: '', email: '',
  address: '', area: '', city: 'Delhi', pincode: '', coverage_areas: [],
  vehicle_count: 1, is_active: true, is_verified: false, notes: '',
};

const NGO_TYPES = ['ngo','trust','society','sewa_org','government','private'];

export default function NGOsPage() {
  const [ngos,       setNgos]       = useState<NGO[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<NGO | null>(null);
  const [form,       setForm]       = useState<Omit<NGO,'id'>>(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [coverageIn, setCoverageIn] = useState('');
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const token = () => localStorage.getItem('ambulance_admin_token') ?? '';
  const hdrs  = () => ({ Authorization: `Bearer ${token()}` });

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/gogoo/ambulance/ngos`, { headers: hdrs() });
      setNgos(data || []);
    } catch { toast.error('Failed to load NGOs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = ngos.filter(n =>
    n.name.toLowerCase().includes(search.toLowerCase()) ||
    n.area.toLowerCase().includes(search.toLowerCase()) ||
    n.phone.includes(search)
  );
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function openCreate() { setEditing(null); setForm(EMPTY); setCoverageIn(''); setShowModal(true); }
  function openEdit(n: NGO) {
    setEditing(n);
    setForm({ name: n.name, type: n.type, phone: n.phone, whatsapp: n.whatsapp, email: n.email,
      address: n.address, area: n.area, city: n.city, pincode: n.pincode,
      coverage_areas: n.coverage_areas || [], vehicle_count: n.vehicle_count,
      is_active: n.is_active, is_verified: n.is_verified, notes: n.notes });
    setCoverageIn('');
    setShowModal(true);
  }

  async function save() {
    if (!form.name || !form.phone) { toast.error('Name and phone required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await axios.patch(`${API}/gogoo/ambulance/ngos/${editing.id}`, form, { headers: hdrs() });
        toast.success('NGO updated');
      } else {
        await axios.post(`${API}/gogoo/ambulance/ngos`, form, { headers: hdrs() });
        toast.success('NGO created');
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
      await axios.delete(`${API}/gogoo/ambulance/ngos/${id}`, { headers: hdrs() });
      toast.success('NGO deleted');
      setDeleteId(null);
      load();
    } catch { toast.error('Delete failed'); }
  }

  function exportXLSX() {
    const ws = XLSX.utils.json_to_sheet(ngos.map(n => ({
      Name: n.name, Type: n.type, Phone: n.phone, Whatsapp: n.whatsapp,
      Email: n.email, Address: n.address, Area: n.area, City: n.city,
      Pincode: n.pincode, CoverageAreas: n.coverage_areas?.join(', '),
      Vehicles: n.vehicle_count, Active: n.is_active, Verified: n.is_verified, Notes: n.notes,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NGOs');
    XLSX.writeFile(wb, `gogoo_ngos_${Date.now()}.xlsx`);
    toast.success('Exported!');
  }

  function importXLSX(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async evt => {
      const wb  = XLSX.read(evt.target?.result, { type: 'binary' });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as Record<string, string>[];
      let ok = 0;
      for (const r of rows) {
        try {
          await axios.post(`${API}/gogoo/ambulance/ngos`, {
            name: r.Name, type: r.Type || 'ngo', phone: String(r.Phone),
            whatsapp: r.Whatsapp || '', email: r.Email || '',
            address: r.Address || '', area: r.Area || '',
            city: r.City || 'Delhi', pincode: r.Pincode || '',
            coverage_areas: r.CoverageAreas ? String(r.CoverageAreas).split(',').map(s => s.trim()) : [],
            vehicle_count: Number(r.Vehicles) || 1,
            is_active: r.Active !== 'false', is_verified: r.Verified === 'true',
            notes: r.Notes || '',
          }, { headers: hdrs() });
          ok++;
        } catch {}
      }
      toast.success(`Imported ${ok}/${rows.length} NGOs`);
      load();
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  }

  function addCoverage() {
    const v = coverageIn.trim(); if (!v) return;
    setForm(f => ({ ...f, coverage_areas: [...(f.coverage_areas || []), v] }));
    setCoverageIn('');
  }
  function removeCoverage(i: number) {
    setForm(f => ({ ...f, coverage_areas: f.coverage_areas.filter((_, j) => j !== i) }));
  }

  return (
    <div className="space-y-5">
      <Toaster position="top-right" />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">NGO Management</h1>
          <p className="text-xs text-gray-400">{ngos.length} organisations</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, area, phone…"
              className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 w-56" />
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importXLSX} />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"><Upload size={14} />Import</button>
          <button onClick={exportXLSX} className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"><Download size={14} />Export</button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-colors"><Plus size={14} />Add NGO</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center"><p className="text-3xl mb-2">🏢</p><p className="text-gray-500">No NGOs found</p></div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-gray-50">
              {['Organisation','Type','Contact','Area / City','Vehicles','Status','Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {paged.map(n => (
                <tr key={n.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-gray-900 text-sm">{n.name}</p>
                    {n.is_verified && <span className="text-[10px] text-blue-600 font-semibold">✓ Verified</span>}
                  </td>
                  <td className="px-5 py-3"><span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full capitalize">{n.type.replace('_',' ')}</span></td>
                  <td className="px-5 py-3 text-xs text-gray-600">
                    <p>{n.phone}</p>
                    {n.whatsapp && <p className="text-green-600">{n.whatsapp}</p>}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{n.area || '—'}, {n.city}</td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-900 text-center">{n.vehicle_count}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${n.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {n.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(n)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteId(n.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Edit NGO' : 'Add New NGO'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {/* Basic */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Organisation Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" placeholder="Sewa Foundation" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 bg-white">
                  {NGO_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ambulance Vehicles</label>
                <input type="number" min="0" value={form.vehicle_count} onChange={e => setForm(f => ({ ...f, vehicle_count: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone *</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">WhatsApp</label>
                <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" placeholder="+91 98765 43210" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Area</label>
                <input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" placeholder="Karol Bagh" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">City</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
              </div>
              {/* Coverage */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Coverage Areas</label>
                <div className="flex gap-2 mb-2">
                  <input value={coverageIn} onChange={e => setCoverageIn(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCoverage(); }}}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-green-400" placeholder="Add area (press Enter)" />
                  <button onClick={addCoverage} className="px-3 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-200 transition-colors">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(form.coverage_areas || []).map((a, i) => (
                    <span key={i} className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium">
                      {a}<button onClick={() => removeCoverage(i)} className="hover:text-red-500"><X size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>
              {/* Notes */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 resize-none" />
              </div>
              {/* Toggles */}
              <div className="flex items-center gap-3">
                <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
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
              <button onClick={save} disabled={saving} className="flex-1 py-3 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : editing ? 'Update NGO' : 'Create NGO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-96 text-center">
            <p className="text-4xl mb-3">🗑️</p>
            <p className="font-bold text-gray-900 mb-2">Delete this NGO?</p>
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
