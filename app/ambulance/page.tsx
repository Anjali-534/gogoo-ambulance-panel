'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Heart, Building2, Activity, TrendingUp, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://gogobackend-production.up.railway.app';
const RED = '#EF4444';

function StatCard({ icon, label, value, sub, color = 'red' }: { icon: string; label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = { red: 'bg-red-50 text-red-600', green: 'bg-green-50 text-green-600', blue: 'bg-blue-50 text-blue-600', gray: 'bg-gray-50 text-gray-600' };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AmbulanceOverview() {
  const [ngos,       setNgos]       = useState<{ vehicle_count: number; is_active: boolean }[]>([]);
  const [hospitals,  setHospitals]  = useState<{ vehicle_count: number; is_active: boolean; total_bookings: number }[]>([]);
  const [hBookings,  setHBookings]  = useState<{ status: string; created_at: string; ambulance_type: string }[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const token = () => typeof window !== 'undefined' ? localStorage.getItem('ambulance_admin_token') ?? '' : '';

  const load = useCallback(async () => {
    try {
      const hdrs = { Authorization: `Bearer ${token()}` };
      const [ngoRes, hospRes, bkRes] = await Promise.all([
        axios.get(`${API}/gogoo/ambulance/ngos`,              { headers: hdrs }),
        axios.get(`${API}/gogoo/ambulance/hospitals`,          { headers: hdrs }),
        axios.get(`${API}/gogoo/ambulance/bookings/hospital`,  { headers: hdrs }),
      ]);
      setNgos(ngoRes.data     || []);
      setHospitals(hospRes.data  || []);
      setHBookings(bkRes.data   || []);
      setLastRefresh(new Date());
    } catch { toast.error('Failed to refresh data'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const activeNgos    = ngos.filter(n => n.is_active).length;
  const activeHosp    = hospitals.filter(h => h.is_active).length;
  const ngoVehicles   = ngos.reduce((s, n) => s + (n.vehicle_count || 0), 0);
  const hospVehicles  = hospitals.reduce((s, h) => s + (h.vehicle_count || 0), 0);
  const today         = new Date().toDateString();
  const todayBk       = hBookings.filter(b => new Date(b.created_at).toDateString() === today);
  const pendingBk     = hBookings.filter(b => b.status === 'pending').length;
  const completedToday = todayBk.filter(b => b.status === 'completed').length;

  // Chart data — type distribution
  const typeData = ['BLS', 'ALS', 'ICU', 'Neonatal', 'Cardiac', 'Transport'].map(t => ({
    name: t,
    value: hBookings.filter(b => b.ambulance_type === t).length || 0,
  })).filter(d => d.value > 0);

  // Last 7 days trend
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toDateString();
    return { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), calls: hBookings.filter(b => new Date(b.created_at).toDateString() === ds).length };
  });

  const COLORS = [RED, '#22C55E', '#3B82F6', '#F59E0B', '#8B5CF6', '#06B6D4'];

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ambulance Operations</h1>
          <p className="text-xs text-gray-400 mt-0.5">Last updated {lastRefresh.toLocaleTimeString('en-IN')}</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      {/* Emergency stats bar */}
      {pendingBk > 0 && (
        <div className="bg-red-500 rounded-2xl p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-pulse">🚨</div>
            <div>
              <p className="font-bold">{pendingBk} bookings waiting for hospital confirmation</p>
              <p className="text-red-100 text-xs">Immediate action required</p>
            </div>
          </div>
          <Link href="/ambulance/paid/bookings" className="bg-white text-red-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors">
            View Pending
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon="🆓" label="Free NGOs Active"     value={activeNgos}     sub={`${ngoVehicles} vehicles`}  color="green" />
        <StatCard icon="🏥" label="Hospitals Active"      value={activeHosp}     sub={`${hospVehicles} vehicles`} color="blue"  />
        <StatCard icon="📋" label="Paid Bookings Today"   value={todayBk.length} sub="hospital ambulance"         color="red"   />
        <StatCard icon="⏳" label="Pending Confirmation"  value={pendingBk}      sub="needs action"               color={pendingBk > 0 ? 'red' : 'gray'} />
        <StatCard icon="✅" label="Completed Today"       value={completedToday} color="green" />
        <StatCard icon="📊" label="Total Bookings"        value={hBookings.length} color="gray" />
      </div>

      {/* Two section cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center"><Heart size={16} className="text-green-600" /></div>
            <div>
              <p className="font-bold text-gray-900 text-sm">FREE AMBULANCE</p>
              <p className="text-xs text-gray-400">NGOs & Sewa Organisations</p>
            </div>
          </div>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between"><span className="text-gray-500">NGOs Active</span><span className="font-semibold">{activeNgos}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Vehicles Available</span><span className="font-semibold">{ngoVehicles}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total NGOs</span><span className="font-semibold">{ngos.length}</span></div>
          </div>
          <Link href="/ambulance/free" className="block w-full text-center bg-green-500 text-white rounded-xl py-2 text-sm font-semibold hover:bg-green-600 transition-colors">
            View Free Section →
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center"><Building2 size={16} className="text-red-500" /></div>
            <div>
              <p className="font-bold text-gray-900 text-sm">PAID AMBULANCE</p>
              <p className="text-xs text-gray-400">Hospitals & Private Providers</p>
            </div>
          </div>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between"><span className="text-gray-500">Hospitals Active</span><span className="font-semibold">{activeHosp}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Bookings Today</span><span className="font-semibold">{todayBk.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Pending</span><span className={`font-semibold ${pendingBk > 0 ? 'text-red-500' : ''}`}>{pendingBk}</span></div>
          </div>
          <Link href="/ambulance/paid" className="block w-full text-center bg-red-500 text-white rounded-xl py-2 text-sm font-semibold hover:bg-red-600 transition-colors">
            View Paid Section →
          </Link>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="font-semibold text-gray-900 text-sm mb-4">Bookings — Last 7 Days</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="calls" stroke={RED} strokeWidth={2} dot={{ fill: RED }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="font-semibold text-gray-900 text-sm mb-4">Ambulance Type Split</p>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">No booking data yet</div>
          )}
        </div>
      </div>

      {/* Recent bookings */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="font-bold text-gray-900">Recent Hospital Bookings</p>
          <Link href="/ambulance/paid/bookings" className="text-xs text-red-500 font-semibold hover:text-red-700">View all →</Link>
        </div>
        {hBookings.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">No bookings yet</div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-gray-50">{['Patient','Pickup','Hospital','Type','Status','Time'].map(h => (
              <th key={h} className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
            ))}</tr></thead>
            <tbody>
              {hBookings.slice(0, 8).map((b, idx) => (
                <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{(b as unknown as { patient_name?: string }).patient_name || '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-500 max-w-[140px] truncate">{(b as unknown as { pickup_address?: string }).pickup_address || '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-600">{(b as unknown as { hospital_name?: string }).hospital_name || '—'}</td>
                  <td className="px-5 py-3"><span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{b.ambulance_type || 'BLS'}</span></td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      b.status === 'completed' ? 'bg-green-100 text-green-700' :
                      b.status === 'pending'   ? 'bg-red-100 text-red-700' :
                      b.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">{new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
