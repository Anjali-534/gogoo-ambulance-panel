'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Heart, Users, MapPin, Phone, CheckCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://gogobackend-production.up.railway.app';

interface NGO {
  id: string; name: string; type: string; phone: string; area: string; city: string;
  vehicle_count: number; is_active: boolean; is_verified: boolean; coverage_areas: string[];
}

export default function FreeAmbulancePage() {
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem('ambulance_admin_token') ?? '';
      const { data } = await axios.get(`${API}/gogoo/ambulance/ngos`, { headers: { Authorization: `Bearer ${token}` } });
      setNgos(data || []);
    } catch { toast.error('Failed to load NGOs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active    = ngos.filter(n => n.is_active);
  const verified  = ngos.filter(n => n.is_verified);
  const vehicles  = ngos.reduce((s, n) => s + (n.vehicle_count || 0), 0);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center"><Heart size={14} className="text-green-600" /></div>
            <h1 className="text-xl font-bold text-gray-900">Free Ambulance</h1>
          </div>
          <p className="text-sm text-gray-400">NGOs & Sewa Organisations providing free emergency response</p>
        </div>
        <Link href="/ambulance/free/ngos" className="bg-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 transition-colors flex items-center gap-2">
          <Users size={14} /> Manage NGOs
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total NGOs',      value: ngos.length,    icon: '🏢', color: 'bg-gray-50'  },
          { label: 'Active NGOs',     value: active.length,  icon: '✅', color: 'bg-green-50' },
          { label: 'Verified',        value: verified.length,icon: '🔒', color: 'bg-blue-50'  },
          { label: 'Total Vehicles',  value: vehicles,       icon: '🚑', color: 'bg-red-50'   },
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

      {/* Info banner */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🆓</span>
          <div>
            <p className="font-bold text-green-800">FREE Ambulance Network</p>
            <p className="text-sm text-green-700 mt-1">
              gogoo partners with NGOs and Sewa Organisations to provide <strong>free emergency ambulance service</strong> across Delhi NCR.
              These organisations operate on donation / CSR funding and provide 24×7 service at zero cost to patients.
            </p>
          </div>
        </div>
      </div>

      {/* NGO Cards grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : ngos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-4xl mb-3">🏢</p>
          <p className="font-semibold text-gray-700">No NGOs added yet</p>
          <Link href="/ambulance/free/ngos" className="mt-4 inline-block bg-green-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 transition-colors">
            Add First NGO →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {ngos.map(ngo => (
            <div key={ngo.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900">{ngo.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ngo.type}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {ngo.is_verified && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">✓ Verified</span>}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ngo.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {ngo.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-gray-500"><Phone size={12} /><span>{ngo.phone}</span></div>
                <div className="flex items-center gap-2 text-gray-500"><MapPin size={12} /><span>{ngo.area}, {ngo.city}</span></div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">{ngo.vehicle_count} ambulance{ngo.vehicle_count !== 1 ? 's' : ''}</span>
                {ngo.coverage_areas?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ngo.coverage_areas.slice(0, 2).map(a => (
                      <span key={a} className="bg-green-50 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full">{a}</span>
                    ))}
                    {ngo.coverage_areas.length > 2 && <span className="text-[10px] text-gray-400">+{ngo.coverage_areas.length - 2}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
