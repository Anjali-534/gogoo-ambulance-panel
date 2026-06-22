'use client';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Search, RefreshCw, ChevronDown } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Pagination from '@/components/Pagination';

const API     = process.env.NEXT_PUBLIC_API_URL || 'https://gogobackend-production.up.railway.app';
const PER_PAGE = 15;

interface Booking {
  id: string; booking_id: string; hospital_id: string; hospital_name: string;
  rider_name: string; rider_phone: string; patient_name: string; patient_condition: string;
  pickup_address: string; drop_address: string; ambulance_type: string;
  estimated_fare: number; status: string; hospital_rejected_reason: string;
  notes: string; created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  dispatched:'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUSES = ['all', 'pending', 'confirmed', 'dispatched', 'completed', 'cancelled'];

export default function PaidBookingsPage() {
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [statusF,   setStatusF]   = useState('all');
  const [page,      setPage]      = useState(1);
  const [updating,  setUpdating]  = useState<string | null>(null);
  const [showNote,  setShowNote]  = useState<Booking | null>(null);

  const token = () => localStorage.getItem('ambulance_admin_token') ?? '';
  const hdrs  = () => ({ Authorization: `Bearer ${token()}` });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusF !== 'all'
        ? `${API}/gogoo/ambulance/bookings/hospital?status=${statusF}`
        : `${API}/gogoo/ambulance/bookings/hospital`;
      const { data } = await axios.get(url, { headers: hdrs() });
      setBookings(data || []);
      setPage(1);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  }, [statusF]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string, reason = '') {
    setUpdating(id);
    try {
      await axios.patch(`${API}/gogoo/ambulance/bookings/hospital/${id}/status`,
        { status, rejected_reason: reason }, { headers: hdrs() });
      toast.success(`Status → ${status}`);
      load();
    } catch { toast.error('Update failed'); }
    finally { setUpdating(null); }
  }

  const filtered = bookings.filter(b =>
    b.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.hospital_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.rider_phone?.includes(search)
  );
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="space-y-5">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hospital Ambulance Bookings</h1>
          <p className="text-xs text-gray-400">{bookings.length} total · {pendingCount} pending</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🚨</span>
            <p className="font-semibold text-amber-800">{pendingCount} booking{pendingCount > 1 ? 's' : ''} pending hospital confirmation</p>
          </div>
          <button onClick={() => setStatusF('pending')} className="text-sm text-amber-700 font-bold bg-amber-200 px-3 py-1.5 rounded-xl hover:bg-amber-300 transition-colors">
            Filter Pending
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search patient, hospital, phone…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" />
        </div>
        <div className="flex gap-1.5">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusF(s)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors capitalize ${statusF === s ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center"><p className="text-3xl mb-2">📋</p><p className="text-gray-500">No bookings found</p></div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-gray-50">
              {['Patient / Rider','Hospital','Pickup → Drop','Type','Fare','Status','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {paged.map(b => (
                <tr key={b.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 text-sm">{b.patient_name || 'Unknown patient'}</p>
                    <p className="text-xs text-gray-400">{b.rider_name} · {b.rider_phone}</p>
                    {b.patient_condition && <p className="text-xs text-red-500 mt-0.5">{b.patient_condition}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[130px] truncate">{b.hospital_name || '—'}</td>
                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="text-xs text-gray-600 truncate">{b.pickup_address}</p>
                    <p className="text-xs text-gray-400 truncate">{b.drop_address}</p>
                  </td>
                  <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{b.ambulance_type || 'BLS'}</span></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{b.estimated_fare || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                    {b.hospital_rejected_reason && <p className="text-[10px] text-red-400 mt-0.5">{b.hospital_rejected_reason}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {b.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(b.id, 'confirmed')} disabled={updating === b.id}
                            className="px-2.5 py-1 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-colors">
                            Confirm
                          </button>
                          <button onClick={() => {
                            const reason = window.prompt('Rejection reason (optional):') ?? '';
                            updateStatus(b.id, 'cancelled', reason);
                          }} disabled={updating === b.id}
                            className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-colors">
                            Cancel
                          </button>
                        </>
                      )}
                      {b.status === 'confirmed' && (
                        <>
                          <button onClick={() => updateStatus(b.id, 'dispatched')} disabled={updating === b.id}
                            className="px-2.5 py-1 bg-purple-500 text-white rounded-lg text-xs font-bold hover:bg-purple-600 disabled:opacity-50 transition-colors">
                            Dispatch
                          </button>
                        </>
                      )}
                      {b.status === 'dispatched' && (
                        <button onClick={() => updateStatus(b.id, 'completed')} disabled={updating === b.id}
                          className="px-2.5 py-1 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 disabled:opacity-50 transition-colors">
                          Complete
                        </button>
                      )}
                      {b.notes && (
                        <button onClick={() => setShowNote(b)} className="px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors">
                          Note
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-300 mt-1">{new Date(b.created_at).toLocaleDateString('en-IN')}</p>
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

      {/* Note modal */}
      {showNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-96">
            <h3 className="font-bold text-gray-900 mb-3">Booking Notes</h3>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed">{showNote.notes}</p>
            <button onClick={() => setShowNote(null)} className="w-full mt-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
