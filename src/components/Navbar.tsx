import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  School, 
  ShieldCheck, 
  UserCheck, 
  FileCode2, 
  LogOut,
  Settings,
  Layers,
  ChevronDown,
  KeyRound
} from 'lucide-react';
import { dbService } from '../services/dbStore';

interface NavbarProps {
  onOpenSetupGuide: () => void;
  activeView: 'dashboard' | 'exam' | 'monitoring' | 'settings';
  setActiveView: (view: 'dashboard' | 'exam' | 'monitoring' | 'settings') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenSetupGuide, 
  activeView, 
  setActiveView 
}) => {
  const { currentUser, role, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const settings = dbService.getSchoolSettings();

  const isProktor = role === 'PROKTOR' || role === 'ADMIN';
  const isPengawas = role === 'PENGAWAS' || role === 'TEACHER';
  const isPeserta = role === 'PESERTA' || role === 'STUDENT';

  const getRoleBadge = () => {
    if (isProktor) return <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Akun Proktor</span>;
    if (isPengawas) return <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">Pengawas Ruang</span>;
    return <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">Peserta CBT</span>;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 h-12 sm:h-13 flex items-center justify-between gap-2.5">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          {settings.logoUrl ? (
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-0.5 overflow-hidden shrink-0">
              <img 
                src={settings.logoUrl} 
                alt={settings.schoolName} 
                className="w-full h-full object-contain" 
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-2xs">
              <School className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 leading-none">
              MIS NW <span className="text-emerald-700">KORLEKO</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold leading-tight mt-0.5">
              Tahun Pelajaran {settings.academicYear}
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeView === 'dashboard'
                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {isPeserta ? 'Daftar Ujian Saya' : 'Panel Ujian'}
          </button>

          {!isPeserta && (
            <button
              onClick={() => setActiveView('monitoring')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeView === 'monitoring'
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Live Proctoring</span>
            </button>
          )}

          {isProktor && (
            <button
              onClick={() => setActiveView('settings')}
              className={`p-2 rounded-lg transition-colors flex items-center justify-center shrink-0 ${
                activeView === 'settings'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-emerald-800 bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-100'
              }`}
              title="Pengaturan Proktor"
              aria-label="Pengaturan Proktor"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </nav>

        {/* Zone 3: User Profile */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white text-left transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-emerald-200">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name.charAt(0) || 'U'
                )}
              </div>
              <div className="hidden sm:block text-left max-w-[140px] truncate">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {currentUser?.name}
                </div>
                <div className="text-[10px] text-slate-500">
                  {currentUser?.username || currentUser?.nisn}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProfileMenu && (
              <div 
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in"
                onMouseLeave={() => setShowProfileMenu(false)}
              >
                <div className="pb-3 mb-2 border-b border-slate-100">
                  <div className="font-extrabold text-xs text-slate-900">{currentUser?.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{currentUser?.email}</div>
                  <div className="mt-2">{getRoleBadge()}</div>
                </div>

                {isProktor && (
                  <button
                    onClick={() => {
                      setActiveView('settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-emerald-700" />
                    <span>Pengaturan Akun Proktor</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 mt-1 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar (Logout)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
