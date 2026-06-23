'use client';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Search, RefreshCw } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Pagination from '@/components/Pagination';

const API      = process.env.NEXT_PUBLIC_API_URL || 'https://gogobackend-production.up.railway.app';
const PER_PAGE = 20;

interface Booking {
  id: string; status: string; pickup_address: string; drop_address: string;
  fare: number; created_at: string; rider_name: string; rider_phone: string;
  service_name: string; vehicle_type: string;
}

const STATUS_COLORS: Record<string, string> = {
  searching:   'bg-yellow-100 text-yellow-700',
  pending:     'bg-amber-100 text-amber-700',
  accepted:    'bg-blue-100 text-blue-700',
  arriving:    'bg-violet-100 text-violet-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-700',
};

export default function AllBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);

  const token = () => localStorage.getItem('ambulance_admin_token') ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/gogoo/ambulance/all-bookings`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      setBookings(data || []);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = bookings.filter(b =>
    b.rider_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.pickup_address?.toLowerCase().includes(search.toLowerCase()) ||
    b.rider_phone?.includes(search) ||
    b.service_name?.toLowerCase().includes(search.toLowerCase())
  );
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const completed = bookings.filter(b => b.status === 'completed').length;
  const revenue   = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.fare || 0), 0);

  return (
    <div className="space-y-5">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Ambulance Bookings</h1>
          <p className="text-xs text-gray-400">{bookings.length} total · {completed} completed · ₹{revenue.toLocaleString('en-IN')} revenue</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Calls',   value: bookings.length, icon: '📞', color: 'bg-gray-50'  },
          { label: 'Completed',     value: completed,       icon: '✅', color: 'bg-green-50' },
          { label: 'In Progress',   value: bookings.filter(b => b.status === 'in_progress').length, icon: '🚑', color: 'bg-blue-50' },
          { label: 'Revenue',       value: `₹${Math.round(revenue / 1000)}K`, icon: '💰', color: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-5 flex items-center gap-3`}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search rider, address, service…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center"><p className="text-3xl mb-2">🚑</p><p className="text-gray-500">No ambulance bookings found</p></div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-gray-50">
              {['Rider','Service','Hospital','Type','Free/Paid','Pickup → Drop','Fare','Status','Date'].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {paged.map((b: any) => (
                <tr key={b.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-gray-900 text-sm">{b.rider_name || '—'}</p>
                    <p className="text-xs text-gray-400">{b.rider_phone}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">{b.service_name || 'Ambulance'}</span>
                    {b.purpose_type && (
                      <p className="text-xs text-gray-400 mt-1 capitalize">{b.purpose_type.replace('_',' ')}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 max-w-[140px]">
                    {b.hospital_name
                      ? <p className="text-xs font-semibold text-gray-800 truncate">{b.hospital_name}</p>
                      : <p className="text-xs text-gray-400">—</p>
                    }
                  </td>
                  <td className="px-5 py-3">
                    {b.ambulance_sub_type
                      ? <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold uppercase">{b.ambulance_sub_type}</span>
                      : <span className="text-xs text-gray-400">—</span>
                    }
                  </td>
                  <td className="px-5 py-3">
                    {b.is_free_ambulance
                      ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">🆓 Free</span>
                      : <span className="bg-orange-50 text-orange-600 text-xs px-2 py-0.5 rounded-full font-semibold">💰 Paid</span>
                    }
                  </td>
                  <td className="px-5 py-3 max-w-[180px]">
                    <p className="text-xs text-gray-600 truncate">{b.pickup_address}</p>
                    <p className="text-xs text-gray-400 truncate">{b.drop_address}</p>
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                    {b.is_free_ambulance ? <span className="text-green-600 font-bold">FREE</span> : `₹${b.fare || 0}`}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="px-5 py-3 border-t border-gray-100">
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
