'use client';
import { useState } from 'react';
import axios from 'axios';
import { Key, User, Shield, RefreshCw } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://gogobackend-production.up.railway.app';

export default function SettingsPage() {
  const [tab,     setTab]     = useState<'profile' | 'password' | 'system'>('profile');
  const [curPw,   setCurPw]   = useState('');
  const [newPw,   setNewPw]   = useState('');
  const [confPw,  setConfPw]  = useState('');
  const [saving,  setSaving]  = useState(false);

  const email = typeof window !== 'undefined' ? localStorage.getItem('ambulance_admin_email') ?? '' : '';
  const role  = typeof window !== 'undefined' ? localStorage.getItem('ambulance_admin_role')  ?? '' : '';

  async function changePassword() {
    if (!curPw || !newPw) { toast.error('Fill all fields'); return; }
    if (newPw.length < 6)  { toast.error('Password must be 6+ chars'); return; }
    if (newPw !== confPw)  { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('ambulance_admin_token') ?? '';
      // Use the panel-login endpoint to verify + reset (simplified — re-login then update)
      toast.success('To change panel password, use the Master Panel → Settings → Sub Panel Access');
    } catch { toast.error('Failed to change password'); }
    finally { setSaving(false); setCurPw(''); setNewPw(''); setConfPw(''); }
  }

  const TABS = [
    { id: 'profile',  label: 'Profile',  icon: User   },
    { id: 'password', label: 'Password', icon: Key    },
    { id: 'system',   label: 'System',   icon: Shield },
  ] as const;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-400">Manage your ambulance panel preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-44 flex-shrink-0 space-y-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${tab === t.id ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
              <t.icon size={15} />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {tab === 'profile' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6">
              <h2 className="font-bold text-gray-900">Profile Information</h2>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-3xl">🚑</div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">{email || 'ambulance@gogoo.in'}</p>
                  <p className="text-sm text-gray-400 capitalize">{role || 'manager'} · Ambulance Panel</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium mb-1">Panel</p>
                  <p className="font-semibold text-gray-900">Ambulance Operations</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium mb-1">Organisation</p>
                  <p className="font-semibold text-gray-900">Aggarwal Publicity & Marketing</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium mb-1">Backend</p>
                  <p className="font-semibold text-gray-900 text-sm">gogobackend-production.up.railway.app</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-medium mb-1">Session</p>
                  <p className="font-semibold text-gray-900">24 hour token</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'password' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-5 max-w-md">
              <h2 className="font-bold text-gray-900">Change Password</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">⚠️ Note</p>
                <p>Ambulance panel passwords are managed from the <strong>Master Dashboard → Settings → Sub Panel Access</strong>. Log in there as admin to reset credentials.</p>
              </div>
              <div className="space-y-3 opacity-60 pointer-events-none">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Current Password</label>
                  <input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirm New Password</label>
                  <input type="password" value={confPw} onChange={e => setConfPw(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
                </div>
              </div>
              <a href="https://gogoo-dashboard-production.up.railway.app/dashboard/settings" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">
                Go to Master Panel Settings →
              </a>
            </div>
          )}

          {tab === 'system' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-5">
              <h2 className="font-bold text-gray-900">System Information</h2>
              <div className="space-y-3">
                {[
                  { label: 'Backend URL',   value: API },
                  { label: 'Panel Type',    value: 'ambulance' },
                  { label: 'Token Key',     value: 'ambulance_admin_token' },
                  { label: 'Theme',         value: 'Red (#EF4444)' },
                  { label: 'Version',       value: '1.0.0' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-500">{row.label}</span>
                    <span className="text-sm font-semibold text-gray-800 font-mono">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-900 mb-3">Quick Links</p>
                <div className="space-y-2">
                  <a href="https://gogoo-dashboard-production.up.railway.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700">→ Master Dashboard</a>
                  <a href="https://gogoo-cab-panel-production.up.railway.app"  target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-700">→ Cab Panel</a>
                  <a href="https://gogoo-truck-panel-production.up.railway.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700">→ Truck Panel</a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
