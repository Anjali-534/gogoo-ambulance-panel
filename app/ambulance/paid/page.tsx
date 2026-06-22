'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Building2, BookOpen, TrendingUp, Star, Phone, MapPin, Clock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://gogobackend-production.up.railway.app';

interface Hospital {
  id: string; name: string; phone: string; area: string; city: string;
  vehicle_count: number; base_fare: number; per_km_rate: number;
  is_active: boolean; is_verified: boolean; rating: number; total_bookings: number;
  ambulance_types: string[];
}

interface Booking {
  id: string; status: string; created_at: string; estimated_fare: number;
  hospital_name: string; ambulance_type: string;
}

export default function PaidAmbulancePage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [loading,   setLoading]   = useState(true);

  const token = () => localStorage.getItem('ambulance_admin_token') ?? '';

  const load = useCallback(async () => {
    try {
      const hdrs = { Authorization: `Bearer ${token()}` };
      const [hRes, bRes] = await Promise.all([
        axios.get(`${API}/gogoo/ambulance/hospitals`,         { headers: hdrs }),
        axios.get(`${API}/gogoo/ambulance/bookings/hospital`, { headers: hdrs }),
      ]);
      setHospitals(hRes.data || []);
      setBookings(bRes.data  || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active   = hospitals.filter(h => h.is_active).length;
  const vehicles = hospitals.reduce((s, h) => s + (h.vehicle_count || 0), 0);
  const pending  = bookings.filter(b => b.status === 'pending').length;
  const today    = new Date().toDateString();
  const todayBk  = bookings.filter(b => new Date(b.created_at).toDateString() === today).length;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center"><Building2 size={14} className="text-red-500" /></div>
            <h1 className="text-xl font-bold text-gray-900">Paid Ambulance</h1>
          </div>
          <p className="text-sm text-gray-400">Hospitals & private ambulance providers with booking management</p>
        </div>
        <div className="flex gap-2">
          <Link href="/ambulance/paid/bookings" className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            <BookOpen size={14} /> Bookings
          </Link>
          <Link href="/ambulance/paid/hospitals" className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">
            <Building2 size={14} /> Manage Hospitals
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Hospitals',  value: hospitals.length, icon: '🏥', color: 'bg-gray-50'  },
          { label: 'Active',           value: active,           icon: '✅', color: 'bg-green-50' },
          { label: 'Bookings Today',   value: todayBk,          icon: '📋', color: 'bg-blue-50'  },
          { label: 'Pending Confirm',  value: pending,          icon: '⏳', color: pending > 0 ? 'bg-red-50' : 'bg-gray-50' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-5 flex items-center gap-3`}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className={`text-2xl font-bold ${s.label === 'Pending Confirm' && pending > 0 ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</p>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Emergency alert */}
      {pending > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white text-lg animate-pulse">🚨</div>
            <div>
              <p className="font-bold text-red-800">{pending} booking{pending > 1 ? 's' : ''} waiting for hospital confirmation</p>
              <p className="text-sm text-red-600">Action required — patients are waiting</p>
            </div>
          </div>
          <Link href="/ambulance/paid/bookings" className="bg-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">
            Manage Bookings →
          </Link>
        </div>
      )}

      {/* Hospital cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-52 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : hospitals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-4xl mb-3">🏥</p>
          <p className="font-semibold text-gray-700">No hospitals added yet</p>
          <Link href="/ambulance/paid/hospitals" className="mt-4 inline-block bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">
            Add First Hospital →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {hospitals.slice(0, 9).map(h => (
            <Link key={h.id} href={`/ambulance/paid/hospitals/${h.id}`} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-red-100 transition-all block">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl">🏥</div>
                <div className="flex flex-col items-end gap-1">
                  {h.is_verified && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">✓ Verified</span>}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {h.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <p className="font-bold text-gray-900 mb-0.5">{h.name}</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                <MapPin size={11} />{h.area || h.city}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="font-bold text-gray-900">₹{h.base_fare}</p>
                  <p className="text-gray-400">Base Fare</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="font-bold text-gray-900">{h.vehicle_count}</p>
                  <p className="text-gray-400">Vehicles</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {(h.ambulance_types || []).slice(0, 3).map(t => (
                  <span key={t} className="bg-red-50 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-medium">{t}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}

      {hospitals.length > 9 && (
        <div className="text-center">
          <Link href="/ambulance/paid/hospitals" className="inline-flex items-center gap-2 px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            View all {hospitals.length} hospitals →
          </Link>
        </div>
      )}
    </div>
  );
}
