'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeft, Phone, MapPin, Star, Truck, DollarSign, Mail, CheckCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://gogobackend-production.up.railway.app';

interface Hospital {
  id: string; name: string; type: string; phone: string; whatsapp: string; email: string;
  address: string; area: string; city: string; pincode: string;
  latitude: number; longitude: number; ambulance_types: string[];
  vehicle_count: number; base_fare: number; per_km_rate: number;
  login_email: string; is_active: boolean; is_verified: boolean; rating: number; total_bookings: number;
}

interface Booking {
  id: string; status: string; created_at: string; estimated_fare: number;
  patient_name: string; pickup_address: string; ambulance_type: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

export default function HospitalDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const [hosp,  setHosp]     = useState<Hospital | null>(null);
  const [bks,   setBks]      = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem('ambulance_admin_token') ?? '';

  useEffect(() => {
    const hdrs = { Authorization: `Bearer ${token()}` };
    Promise.all([
      axios.get(`${API}/gogoo/ambulance/hospitals/${id}`, { headers: hdrs }),
      axios.get(`${API}/gogoo/ambulance/bookings/hospital?hospital_id=${id}`, { headers: hdrs }),
    ]).then(([h, b]) => {
      setHosp(h.data);
      setBks(b.data || []);
    }).catch(() => toast.error('Failed to load hospital'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!hosp)  return <div className="text-center py-16 text-gray-500">Hospital not found</div>;

  const completed = bks.filter(b => b.status === 'completed').length;
  const pending   = bks.filter(b => b.status === 'pending').length;
  const revenue   = bks.filter(b => b.status === 'completed').reduce((s, b) => s + (b.estimated_fare || 0), 0);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{hosp.name}</h1>
            {hosp.is_verified && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">✓ Verified</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${hosp.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{hosp.is_active ? 'Active' : 'Inactive'}</span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{hosp.type.replace('_',' ')} · {hosp.area}, {hosp.city}</p>
        </div>
        <Link href="/ambulance/paid/hospitals" className="text-sm text-red-500 font-semibold hover:text-red-700">← All Hospitals</Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings',  value: bks.length,   icon: '📋' },
          { label: 'Completed',       value: completed,    icon: '✅' },
          { label: 'Pending',         value: pending,      icon: '⏳' },
          { label: 'Est. Revenue',    value: `₹${revenue.toLocaleString('en-IN')}`, icon: '💰' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Info card */}
        <div className="col-span-1 bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <p className="font-bold text-gray-900">Hospital Details</p>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2"><Phone size={14} className="text-gray-400 mt-0.5 flex-shrink-0" /><span className="text-gray-700">{hosp.phone}</span></div>
            {hosp.email && <div className="flex items-start gap-2"><Mail size={14} className="text-gray-400 mt-0.5 flex-shrink-0" /><span className="text-gray-700 break-all">{hosp.email}</span></div>}
            <div className="flex items-start gap-2"><MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" /><span className="text-gray-700">{hosp.address || `${hosp.area}, ${hosp.city} ${hosp.pincode}`}</span></div>
            <div className="flex items-center gap-2"><Truck size={14} className="text-gray-400" /><span className="text-gray-700">{hosp.vehicle_count} ambulances</span></div>
            <div className="flex items-center gap-2"><DollarSign size={14} className="text-gray-400" /><span className="text-gray-700">₹{hosp.base_fare} + ₹{hosp.per_km_rate}/km</span></div>
            {hosp.rating > 0 && <div className="flex items-center gap-2"><Star size={14} className="text-amber-400" /><span className="text-gray-700">{hosp.rating.toFixed(1)} / 5</span></div>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">Ambulance Types</p>
            <div className="flex flex-wrap gap-1.5">
              {(hosp.ambulance_types || []).map(t => <span key={t} className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">{t}</span>)}
            </div>
          </div>
          {hosp.login_email && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 mb-1">Portal Login</p>
              <p className="text-xs text-blue-600 break-all">{hosp.login_email}</p>
            </div>
          )}
          {hosp.latitude !== 0 && (
            <a
              href={`https://www.google.com/maps?q=${hosp.latitude},${hosp.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-xs text-red-500 font-semibold bg-red-50 py-2 rounded-xl hover:bg-red-100 transition-colors"
            >
              📍 View on Google Maps
            </a>
          )}
        </div>

        {/* Bookings table */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="font-bold text-gray-900">Bookings History</p>
            <span className="text-xs text-gray-400">{bks.length} total</span>
          </div>
          {bks.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No bookings yet</div>
          ) : (
            <table className="w-full">
              <thead><tr className="bg-gray-50">
                {['Patient','Pickup','Type','Fare','Status','Date'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {bks.slice(0, 20).map(b => (
                  <tr key={b.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{b.patient_name || '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 max-w-[120px] truncate">{b.pickup_address || '—'}</td>
                    <td className="px-5 py-3"><span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{b.ambulance_type || 'BLS'}</span></td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">₹{b.estimated_fare || 0}</td>
                    <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-3 text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
