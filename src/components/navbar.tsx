'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Briefcase, UploadCloud, Users, FileText, LogOut, ShieldAlert, Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  // Keep auth pages from mounting the authenticated navbar at all.
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return <AuthenticatedNavbar pathname={pathname} />;
}

function AuthenticatedNavbar({ pathname }: { pathname: string }) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('HR Specialist');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUserName(data.user.name);
          } else {
            router.push('/login');
          }
        } else {
          router.push('/login');
        }
      } catch (e) {
        console.error('Navbar profile fetch error:', e);
      }
    }
    fetchMe();
  }, [pathname, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Job Requirements', href: '/jobs', icon: Briefcase },
    { label: 'Upload Resumes', href: '/upload', icon: UploadCloud },
    { label: 'Talent Pool', href: '/candidates', icon: Users },
    { label: 'HR Team', href: '/team', icon: ShieldAlert },
    { label: 'Reports', href: '/reports', icon: FileText }
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/Enacton-logo.png"
            alt="EnactOn"
            width={190}
            height={54}
            priority
            className="h-10 w-auto"
          />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-slate-100 ${
                  isActive
                    ? 'text-blue-700 bg-blue-50 border border-blue-100'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-slate-900">{userName}</span>
            <span className="text-xs text-slate-500 font-medium">HR Recruiter</span>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
          <button
            onClick={() => setMobileOpen(open => !open)}
            className="md:hidden p-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-200"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all duration-200 shadow-sm cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-semibold">Sign Out</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold ${
                  isActive ? 'text-blue-700 bg-blue-50 border border-blue-100' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
