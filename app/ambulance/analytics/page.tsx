'use client';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';

const API  = process.env.NEXT_PUBLIC_API_URL || 'https://gogobackend-production.up.railway.app';
const RED  = '#EF4444';
const GREEN = '#22C55E';
const BLUE  = '#3B82F6';
const COLORS = [RED, GREEN, BLUE, '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899'];

export default function AnalyticsPage() {
  const [hospitals, setHospitals] = useState<{ name: string; total_bookings: number; rating: number; base_fare: number }[]>([]);
  const [ngos,      setNgos]      = useState<{ vehicle_count: number; is_active: boolean; type: string; coverage_areas: string[] }[]>([]);
  const [bookings,  setBookings]  = useState<{ status: string; created_at: string; ambulance_type: string; estimated_fare: number }[]>([]);
  const [loading,   setLoading]   = useState(true);

  const token = () => localStorage.getItem('ambulance_admin_token') ?? '';

  const load = useCallback(async () => {
    try {
      const hdrs = { Authorization: `Bearer ${token()}` };
      const [hRes, nRes, bRes] = await Promise.all([
        axios.get(`${API}/gogoo/ambulance/hospitals`,         { headers: hdrs }),
        axios.get(`${API}/gogoo/ambulance/ngos`,              { headers: hdrs }),
        axios.get(`${API}/gogoo/ambulance/bookings/hospital`, { headers: hdrs }),
      ]);
      setHospitals(hRes.data || []);
      setNgos(nRes.data      || []);
      setBookings(bRes.data  || []);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Last 30 days booking trend
  const trend30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const ds = d.toDateString();
    const count = bookings.filter(b => new Date(b.created_at).toDateString() === ds).length;
    return { day: d.getDate() + '/' + (d.getMonth() + 1), count };
  });

  // By ambulance type
  const typeMap: Record<string, number> = {};
  bookings.forEach(b => { const t = b.ambulance_type || 'Unknown'; typeMap[t] = (typeMap[t] || 0) + 1; });
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Status split
  const statusMap: Record<string, number> = {};
  bookings.forEach(b => { statusMap[b.status] = (statusMap[b.status] || 0) + 1; });
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // Top hospitals by bookings
  const topHosp = [...hospitals].sort((a, b) => (b.total_bookings || 0) - (a.total_bookings || 0)).slice(0, 8);

  // NGO type split
  const ngoMap: Record<string, number> = {};
  ngos.forEach(n => { const t = (n as { type: string }).type || 'ngo'; ngoMap[t] = (ngoMap[t] || 0) + 1; });
  const ngoTypeData = Object.entries(ngoMap).map(([name, value]) => ({ name: name.replace('_',' '), value }));

  // Revenue data
  const totalRevenue = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.estimated_fare || 0), 0);
  const completionRate = bookings.length ? Math.round((bookings.filter(b => b.status === 'completed').length / bookings.length) * 100) : 0;

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-56 bg-gray-100 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-xs text-gray-400">Ambulance operations performance overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Hospitals',  value: hospitals.length, icon: '🏥' },
          { label: 'Total NGOs',       value: ngos.length,      icon: '❤️' },
          { label: 'Total Bookings',   value: bookings.length,  icon: '📋' },
          { label: 'Completion Rate',  value: `${completionRate}%`, icon: '✅' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 30-day trend */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <p className="font-bold text-gray-900 mb-5">Booking Trend — Last 30 Days</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trend30}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke={RED} strokeWidth={2.5} dot={false} name="Bookings" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Ambulance type split */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="font-bold text-gray-900 mb-4">By Ambulance Type</p>
          {typeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" labelLine={false}
                    label={({ name, percent }) => percent > 0.08 ? `${name}\n${(percent*100).toFixed(0)}%` : ''}>
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {typeData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />{d.name}</div>
                    <span className="font-semibold text-gray-700">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-gray-400 text-sm text-center py-8">No data yet</p>}
        </div>

        {/* Status split */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="font-bold text-gray-900 mb-4">Booking Status Split</p>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={65} />
                <Tooltip />
                <Bar dataKey="value" fill={RED} radius={[0, 6, 6, 0]} name="Count">
                  {statusData.map((d, i) => (
                    <Cell key={i} fill={
                      d.name === 'completed' ? GREEN :
                      d.name === 'pending'   ? '#F59E0B' :
                      d.name === 'cancelled' ? RED : BLUE
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-8">No data yet</p>}
        </div>

        {/* NGO types */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="font-bold text-gray-900 mb-4">NGO Types</p>
          {ngoTypeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={ngoTypeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" labelLine={false}>
                    {ngoTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {ngoTypeData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} /><span className="capitalize">{d.name}</span></div>
                    <span className="font-semibold text-gray-700">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-gray-400 text-sm text-center py-8">No NGOs yet</p>}
        </div>
      </div>

      {/* Top hospitals */}
      {topHosp.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="font-bold text-gray-900 mb-5">Top Hospitals by Bookings</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topHosp.map(h => ({ name: h.name.length > 20 ? h.name.slice(0,20)+'…' : h.name, bookings: h.total_bookings || 0, rating: h.rating || 0 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="bookings" fill={RED} radius={[6,6,0,0]} name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue */}
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-red-700">Total Estimated Revenue (Completed Bookings)</p>
          <p className="text-3xl font-bold text-red-600 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-xs text-red-400 mt-0.5">From {bookings.filter(b => b.status === 'completed').length} completed hospital bookings</p>
        </div>
        <div className="text-6xl opacity-20">💰</div>
      </div>
    </div>
  );
}
