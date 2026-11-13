import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  RotateCcw, 
  CheckCircle, 
  X, 
  School, 
  ShieldCheck, 
  UserCheck, 
  BadgeCheck, 
  Wifi, 
  WifiOff, 
  Lock, 
  KeyRound,
  Clock,
  Sparkles,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { User, ClassRoom } from '../../types/cbt';
import { dbService } from '../../services/dbStore';

interface DataMasterManagerProps {
  onRefreshData?: () => void;
}

export const DataMasterManager: React.FC<DataMasterManagerProps> = ({ onRefreshData }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const list = dbService.getUsers();
    // Also include any students saved in cards if missing
    try {
      const savedCards = localStorage.getItem('misnw_cbt_cards_students_v1');
      if (savedCards) {
        const cards = JSON.parse(savedCards);
        cards.forEach((c: any) => {
          if (!list.some(u => u.id === c.id || u.nisn === c.nisn)) {
            const newUser: User = {
              id: c.id,
              username: c.username || c.nisn,
              name: c.name,
              email: `${c.username || c.nisn}@misnwkorleko.sch.id`,
              role: 'PESERTA',
              nisn: c.nisn,
              kelas: c.kelas || 'Kelas VI A',
              avatarUrl: c.avatarUrl,
              isLoggedIn: false
            };
            list.push(newUser);
            dbService.saveUser(newUser);
          }
        });
      }
    } catch {
      // ignore
    }
    return list;
  });

  const settings = dbService.getSchoolSettings();
  const [storedClasses] = useState<ClassRoom[]>(() => dbService.getClasses());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ONLINE' | 'PESERTA' | 'PENGAWAS' | 'PROKTOR'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resetConfirmUser, setResetConfirmUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Gabungkan kelas tersimpan dengan kelas nyata dari peserta yang terdaftar
  const classes: ClassRoom[] = React.useMemo(() => {
    const map = new Map<string, ClassRoom>();
    storedClasses.forEach(c => {
      map.set(c.name.toLowerCase().trim(), c);
    });
    users.forEach(u => {
      if ((u.role === 'PESERTA' || u.role === 'STUDENT') && u.kelas && u.kelas.trim()) {
        const key = u.kelas.toLowerCase().trim();
        if (!map.has(key)) {
          const upper = u.kelas.toUpperCase();
          const gradeMatch = upper.match(/\b(VI|V|IV|III|II|I|[1-6])\b/);
          const romanMap: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
          const parsedGrade = gradeMatch ? (romanMap[gradeMatch[1]] || Number(gradeMatch[1]) || 6) : 6;
          map.set(key, {
            id: `cls-dyn-${key.replace(/\s+/g, '-')}`,
            name: u.kelas.trim(),
            grade: parsedGrade,
            academicYear: settings.academicYear || '2026/2027',
            teacherId: '',
            teacherName: ''
          });
        }
      }
    });
    return Array.from(map.values());
  }, [storedClasses, users, settings.academicYear]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const reloadUsers = () => {
    setUsers([...dbService.getUsers()]);
    if (onRefreshData) onRefreshData();
  };

  // Reset Sesi Login Pengguna Tunggal
  const handleResetLogin = (user: User) => {
    dbService.resetUserLogin(user.id);
    reloadUsers();
    showToast(`Sesi login "${user.name}" (${user.role}) berhasil direset. Pengguna kini dapat login kembali di perangkat baru.`);
    setResetConfirmUser(null);
  };

  // Hapus Akun Pengguna (juga bersihkan dari penyimpanan kartu jika ada)
  const handleConfirmDeleteUser = (user: User) => {
    dbService.deleteUser(user.id);
    try {
      const rawStd = localStorage.getItem('misnw_cbt_cards_students_v1');
      if (rawStd) {
        const parsed = JSON.parse(rawStd);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            'misnw_cbt_cards_students_v1',
            JSON.stringify(parsed.filter((s: any) => s.id !== user.id && s.username !== user.username))
          );
        }
      }
      const rawPrc = localStorage.getItem('misnw_cbt_cards_proctors_v1');
      if (rawPrc) {
        const parsed = JSON.parse(rawPrc);
        if (Array.isArray(parsed)) {
          localStorage.setItem(
            'misnw_cbt_cards_proctors_v1',
            JSON.stringify(parsed.filter((p: any) => p.id !== user.id && p.username !== user.username))
          );
        }
      }
    } catch {
      // ignore
    }
    reloadUsers();
    showToast(`Akun "${user.name}" berhasil dihapus dari sistem.`);
    setUserToDelete(null);
  };

  // Reset Massal Seluruh Peserta yang Sedang Login
  const handleResetAllStudents = () => {
    const count = dbService.resetAllLogins('PESERTA');
    reloadUsers();
    showToast(`Berhasil mereset ${count} sesi login peserta ujian.`);
  };

  // Reset Massal Seluruh Pengawas yang Sedang Login
  const handleResetAllProctors = () => {
    const count = dbService.resetAllLogins('PENGAWAS');
    reloadUsers();
    showToast(`Berhasil mereset ${count} sesi login pengawas ruang.`);
  };

  // Simulasi / Toggle Login (Untuk kemudahan pengujian proktor)
  const handleToggleLoginStatus = (user: User) => {
    const newStatus = !user.isLoggedIn;
    dbService.setUserLoginStatus(user.id, newStatus);
    reloadUsers();
    showToast(`Status login "${user.name}" diubah menjadi: ${newStatus ? 'Sedang Login (Online)' : 'Offline'}.`);
  };

  // Filter & Search Logic
  const filteredUsers = users.filter((u) => {
    // 1. Role / Status Filter
    if (activeFilter === 'ONLINE' && !u.isLoggedIn) return false;
    if (activeFilter === 'PESERTA' && u.role !== 'PESERTA' && u.role !== 'STUDENT') return false;
    if (activeFilter === 'PENGAWAS' && u.role !== 'PENGAWAS' && u.role !== 'TEACHER') return false;
    if (activeFilter === 'PROKTOR' && u.role !== 'PROKTOR' && u.role !== 'ADMIN') return false;

    // 2. Search Query (Nama, NISN, NIP, Username, Kelas)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchUsername = u.username.toLowerCase().includes(q);
      const matchNisn = u.nisn ? u.nisn.toLowerCase().includes(q) : false;
      const matchNip = u.nip ? u.nip.toLowerCase().includes(q) : false;
      const matchKelas = u.kelas ? u.kelas.toLowerCase().includes(q) : false;
      return matchName || matchUsername || matchNisn || matchNip || matchKelas;
    }

    return true;
  });

  // KPI Calculations
  const onlineUsers = users.filter(u => u.isLoggedIn);
  const onlineStudents = users.filter(u => u.isLoggedIn && (u.role === 'PESERTA' || u.role === 'STUDENT'));
  const onlineProctors = users.filter(u => u.isLoggedIn && (u.role === 'PENGAWAS' || u.role === 'PROKTOR'));
  const totalStudents = users.filter(u => u.role === 'PESERTA' || u.role === 'STUDENT');
  const totalProctors = users.filter(u => u.role === 'PENGAWAS' || u.role === 'PROKTOR');

  const formatLoginTime = (isoString?: string) => {
    if (!isoString) return 'Baru saja';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA';
    } catch {
      return 'Aktif';
    }
  };

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Monitoring Strip Status Login Real-Time - Rapi & Kompak */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
        {/* KPI 1: Total Pengguna */}
        <div className="p-2.5 sm:p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">Total Pengguna</span>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5 flex items-baseline gap-1">
            {users.length} <span className="text-[10px] font-semibold text-slate-500">akun</span>
          </div>
        </div>

        {/* KPI 2: Sedang Login (Online) */}
        <div className="p-2.5 sm:p-3 bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-teal-50 border border-emerald-300 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sedang Login
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-800 font-mono mt-0.5 flex items-baseline gap-1">
            {onlineUsers.length} <span className="text-[10px] font-semibold text-emerald-600">online</span>
          </div>
        </div>

        {/* KPI 3: Peserta Login */}
        <div className="p-2.5 sm:p-3 bg-gradient-to-br from-sky-50 via-sky-50/40 to-blue-50 border border-sky-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold text-sky-900 block">Peserta Login</span>
          <div className="text-lg sm:text-xl font-black text-sky-700 font-mono mt-0.5 flex items-baseline gap-1">
            {onlineStudents.length} <span className="text-[10px] font-semibold text-sky-500">/ {totalStudents.length}</span>
          </div>
        </div>

        {/* KPI 4: Pengawas Login */}
        <div className="p-2.5 sm:p-3 bg-gradient-to-br from-amber-50 via-amber-50/40 to-orange-50 border border-amber-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold text-amber-900 block">Pengawas Login</span>
          <div className="text-lg sm:text-xl font-black text-amber-700 font-mono mt-0.5 flex items-baseline gap-1">
            {onlineProctors.length} <span className="text-[10px] font-semibold text-amber-500">/ {totalProctors.length}</span>
          </div>
        </div>
      </div>

      {/* Main Container: 2 Kolom (Rombongan Belajar + Manajemen Akun & Reset Login) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Kolom 1: Daftar Rombongan Belajar (Kelas) */}
        <div className="lg:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3 self-start">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <School className="w-4 h-4 text-emerald-700" />
              <span>Rombongan Belajar (Kelas)</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono font-bold">{classes.length} Kelas</span>
          </div>

          <div className="space-y-2">
            {classes.length === 0 ? (
              <div className="py-8 px-3 text-center text-slate-400 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 space-y-1.5">
                <School className="w-7 h-7 mx-auto text-slate-300" />
                <p className="text-xs font-medium text-slate-500">Belum ada rombongan belajar terdaftar.</p>
                <p className="text-[11px] text-slate-400">Tambahkan peserta ujian melalui menu Kartu Ujian untuk membentuk daftar kelas otomatis.</p>
              </div>
            ) : (
              classes.map(c => {
                const studentCount = users.filter(u => (u.role === 'PESERTA' || u.role === 'STUDENT') && u.kelas === c.name).length;
                return (
                  <div 
                    key={c.id} 
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900">{c.name}</span>
                      <span className="text-[10.5px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold">
                        {studentCount} Siswa
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Tingkat {c.grade} · TP {c.academicYear}</span>
                    </div>
                    {c.teacherName && (
                      <div className="text-[11px] font-medium text-slate-600 mt-0.5 truncate">
                        Wali: <strong className="text-slate-800">{c.teacherName}</strong>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom 2 & 3: Daftar Pengguna, Status Login, Pencarian & Reset Sesi */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
          {/* Header & Bulk Reset Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>Pengguna & Status Login Perangkat</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau peserta & pengawas yang sedang login serta reset sesi login jika perangkat terkunci.
              </p>
            </div>

            {/* Tombol Reset Massal */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleResetAllStudents}
                disabled={onlineStudents.length === 0}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors ${
                  onlineStudents.length > 0
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
                title="Reset seluruh sesi login peserta ujian"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Semua Peserta ({onlineStudents.length})</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Filter Tabs */}
          <div className="space-y-2.5">
            {/* Input Pencarian Nama / NISN / NIP */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama peserta, pengawas, NISN, atau NIP..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                  activeFilter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({users.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('ONLINE')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeFilter === 'ONLINE'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Sedang Login ({onlineUsers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('PESERTA')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                  activeFilter === 'PESERTA'
                    ? 'bg-sky-700 text-white shadow-2xs'
                    : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                }`}
              >
                Peserta ({totalStudents.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('PENGAWAS')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                  activeFilter === 'PENGAWAS'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Pengawas ({totalProctors.length})
              </button>
            </div>
          </div>

          {/* List Pengguna Terdaftar dengan Status Login & Tombol Reset */}
          <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1 space-y-0.5">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">Tidak ada data pengguna yang sesuai dengan pencarian / filter.</p>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isOnline = !!u.isLoggedIn;
                const isPeserta = u.role === 'PESERTA' || u.role === 'STUDENT';
                const isPengawas = u.role === 'PENGAWAS' || u.role === 'TEACHER';
                const isProktor = u.role === 'PROKTOR' || u.role === 'ADMIN';

                return (
                  <div
                    key={u.id}
                    className={`p-3 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isOnline ? 'bg-emerald-50/40 border border-emerald-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Identitas Pengguna */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-700 border border-slate-300">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            u.name.charAt(0)
                          )}
                        </div>
                        {/* Status Dot */}
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                          title={isOnline ? 'Perangkat sedang aktif/login' : 'Perangkat offline'}
                        ></div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900 truncate">
                            {u.name}
                          </span>
                          {/* Role Badge */}
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase tracking-wider ${
                              isProktor
                                ? 'bg-indigo-100 text-indigo-800'
                                : isPengawas
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap font-mono">
                          {u.nisn && <span>NISN: <b>{u.nisn}</b></span>}
                          {u.nip && u.nip !== '-' && <span>NIP: <b>{u.nip}</b></span>}
                          {u.kelas && <span className="font-sans text-emerald-800 font-semibold">· {u.kelas}</span>}
                          <span>· User: {u.username}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Login Pill & Tombol Reset Login */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {/* Status Login Indicator */}
                      {isOnline ? (
                        <div className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg text-[10.5px] font-bold flex items-center gap-1.5 border border-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                          <span>Sedang Login</span>
                          <span className="text-[9.5px] text-emerald-700 font-normal">({formatLoginTime(u.lastLoginAt)})</span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10.5px] font-semibold flex items-center gap-1 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span>Offline</span>
                        </div>
                      )}

                      {/* Tombol Reset Sesi Login Pengguna */}
                      <button
                        type="button"
                        onClick={() => setResetConfirmUser(u)}
                        className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                        title={`Reset sesi login ${u.name} agar dapat login kembali`}
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                        <span>Reset Login</span>
                      </button>

                      {/* Tombol Hapus Akun (Kecuali Proktor Utama) */}
                      {u.id !== 'usr-proktor-1' && (
                        <button
                          type="button"
                          onClick={() => setUserToDelete(u)}
                          className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-lg transition-colors"
                          title={`Hapus akun ${u.name}`}
                          aria-label={`Hapus akun ${u.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Dialog Konfirmasi Reset Sesi Login In-App */}
      {resetConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3.5 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Reset Sesi Login {resetConfirmUser.role === 'PESERTA' ? 'Peserta' : 'Pengawas'}?
                </h4>
                <p className="text-xs text-slate-500">
                  Buka kunci login perangkat untuk akun ini.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>Nama: <strong className="text-slate-900">{resetConfirmUser.name}</strong></div>
              <div>Username: <strong className="font-mono text-slate-800">{resetConfirmUser.username}</strong></div>
              {resetConfirmUser.nisn && <div>NISN: <strong className="font-mono text-slate-800">{resetConfirmUser.nisn}</strong></div>}
              {resetConfirmUser.nip && <div>NIP: <strong className="font-mono text-slate-800">{resetConfirmUser.nip}</strong></div>}
              <div>Status: <span className={resetConfirmUser.isLoggedIn ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                {resetConfirmUser.isLoggedIn ? 'Sedang Login (Aktif)' : 'Offline'}
              </span></div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Setelah direset, sesi pengguna akan diakhiri dan akun dapat login kembali dari perangkat komputer / ponsel yang baru tanpa terkunci.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetConfirmUser(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleResetLogin(resetConfirmUser)}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ya, Reset Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Konfirmasi Hapus Akun Pengguna */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3.5 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Hapus Akun Pengguna?
                </h4>
                <p className="text-xs text-slate-500">
                  Akun akan dihapus permanen dari daftar pengguna.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>Nama: <strong className="text-slate-900">{userToDelete.name}</strong></div>
              <div>Peran: <strong className="text-slate-800">{userToDelete.role}</strong></div>
              <div>Username: <strong className="font-mono text-slate-800">{userToDelete.username}</strong></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteUser(userToDelete)}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
