import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbStore';
import { 
  GraduationCap, 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle,
  School,
  KeyRound,
  FileCode2,
  Eye,
  EyeOff
} from 'lucide-react';

interface UnifiedLoginPageProps {
  onOpenSetupGuide: () => void;
}

export const UnifiedLoginPage: React.FC<UnifiedLoginPageProps> = ({ onOpenSetupGuide }) => {
  const { login } = useAuth();
  const settings = dbService.getSchoolSettings();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Silakan isi Nama Pengguna / NISN dan Kata Sandi.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = login(identifier, password);
      if (!result.success) {
        setErrorMsg(result.message);
        setIsSubmitting(false);
      }
    }, 250);
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col justify-between text-slate-100 px-3 sm:px-4 py-2.5 sm:py-4">
      {/* Top Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {settings.logoUrl ? (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white p-0.5 overflow-hidden shadow-2xs flex items-center justify-center">
              <img src={settings.logoUrl} alt="" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs font-bold">
              <School className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="font-extrabold tracking-tight text-white text-xs sm:text-sm">
              MIS NW KORLEKO
            </div>
            <div className="text-[10px] text-emerald-400 font-medium">
              Tahun Pelajaran {settings.academicYear} · CBT Madrasah
            </div>
          </div>
        </div>

      </header>

      {/* Main Container - Padat & Pas di Layar */}
      <main className="max-w-md w-full mx-auto my-auto py-2">
        <div className="bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Card Brand Header */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-3.5 sm:p-4 text-white text-center relative">
            <div className="w-11 h-11 bg-white/10 backdrop-blur-xs rounded-xl mx-auto flex items-center justify-center mb-1.5 border border-white/20 shadow-inner">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
              ) : (
                <GraduationCap className="w-5 h-5 text-emerald-300" />
              )}
            </div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight uppercase">
              {settings.schoolName || 'MIS NW KORLEKO'}
            </h1>
            <div className="text-[11px] sm:text-xs text-emerald-200 font-bold mt-0.5 tracking-wide">
              Tahun Pelajaran {settings.academicYear}
            </div>
            <p className="text-[10.5px] text-emerald-100/90 font-medium mt-0.5">
              Portal Ujian Berbasis Komputer
            </p>
          </div>

          {/* Form Area */}
          <div className="p-3.5 sm:p-4.5 space-y-3">
            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Nama Pengguna / NISN:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Masukkan username atau NISN..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Kata Sandi:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden transition-all bg-slate-50 focus:bg-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-700 transition-colors focus:outline-hidden"
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all mt-1"
              >
                <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk ke Sistem CBT'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>


          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center text-[11px] text-slate-500 border-t border-slate-800/80 pt-2.5">
        {settings.foundationName} · {settings.city}
      </footer>
    </div>
  );
};
