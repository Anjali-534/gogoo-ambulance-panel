'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import {
  LayoutDashboard, Heart, Users, Building2,
  BookOpen, Activity, BarChart2, Settings,
  ExternalLink, LogOut,
} from 'lucide-react';

const NAV = [
  { href: '/ambulance',                  icon: LayoutDashboard, label: 'Overview' },
  { href: '/ambulance/free',             icon: Heart,           label: 'Free Ambulance' },
  { href: '/ambulance/free/ngos',        icon: Users,           label: 'NGOs & Sewa Orgs' },
  { href: '/ambulance/paid',             icon: Building2,       label: 'Paid Ambulance' },
  { href: '/ambulance/paid/hospitals',   icon: Building2,       label: 'Hospitals' },
  { href: '/ambulance/paid/bookings',    icon: BookOpen,        label: 'Paid Bookings' },
  { href: '/ambulance/bookings',         icon: Activity,        label: 'All Bookings' },
  { href: '/ambulance/analytics',        icon: BarChart2,       label: 'Analytics' },
  { href: '/ambulance/settings',         icon: Settings,        label: 'Settings' },
];

export default function AmbulanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    if (!localStorage.getItem('ambulance_admin_token')) router.push('/');
  }, [router]);

  function logout() {
    localStorage.removeItem('ambulance_admin_token');
    localStorage.removeItem('ambulance_admin_role');
    localStorage.removeItem('ambulance_admin_email');
    router.push('/');
  }

  function isActive(href: string) {
    if (href === '/ambulance') return pathname === '/ambulance';
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Red sidebar */}
      <aside className="w-56 h-screen flex flex-col fixed left-0 top-0 z-30 bg-red-500">

        {/* Logo */}
        <div className="p-5 border-b border-red-400">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🚑</span>
            <div>
              <p className="text-white font-bold text-base leading-tight">gogoo</p>
              <p className="text-red-100 text-xs font-medium">Ambulance Ops</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive(item.href)
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-red-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon size={16} className="flex-shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-red-400 space-y-2">
          <a
            href="https://gogoo-dashboard-production.up.railway.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-red-100 text-sm hover:text-white transition-colors"
          >
            <ExternalLink size={13} />
            Master Panel
          </a>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-red-100 text-sm hover:text-white transition-colors w-full"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-56 flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-500 font-medium">Ambulance Operations Panel</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full font-semibold">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </div>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
