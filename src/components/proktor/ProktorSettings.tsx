import React, { useState, useRef } from 'react';
import { 
  Settings, 
  School, 
  KeyRound, 
  ShieldAlert, 
  Users, 
  Database, 
  Save, 
  RotateCcw, 
  CheckCircle, 
  Copy, 
  AlertTriangle,
  Download,
  Upload,
  UserX,
  Image as ImageIcon,
  FileImage,
  Trash2,
  X,
  Eye,
  EyeOff,
  Lock,
  UserCheck,
  RefreshCw,
  Pencil
} from 'lucide-react';
import { SchoolSettings, User } from '../../types/cbt';
import { dbService } from '../../services/dbStore';
import { DEFAULT_SCHOOL_LOGO } from '../../services/logoPresets';
import { useAuth } from '../../context/AuthContext';

interface ProktorSettingsProps {
  onSettingsUpdated: () => void;
}

export const ProktorSettings: React.FC<ProktorSettingsProps> = ({ onSettingsUpdated }) => {
  const { currentUser, refreshCurrentUser } = useAuth();
  const [settings, setSettings] = useState<SchoolSettings>(() => dbService.getSchoolSettings());
  const [users, setUsers] = useState<User[]>(() => dbService.getUsers());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);

  // Logo upload state
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Akun proktor yang dapat diganti username & password-nya
  const [proctorUser, setProctorUser] = useState<User>(() => {
    const allUsers = dbService.getUsers();
    return allUsers.find(u => u.role === 'PROKTOR') || (currentUser?.role === 'PROKTOR' ? currentUser : allUsers[0]) || {
      id: 'usr-proktor-1',
      username: 'proktor',
      password: 'proktor123',
      name: 'Muhammad Nasir, S.Kom',
      role: 'PROKTOR',
      email: 'proktor@misnwkorleko.sch.id',
      isLoggedIn: true
    };
  });

  const [proctorFormName, setProctorFormName] = useState(proctorUser.name || 'Muhammad Nasir, S.Kom');
  const [proctorFormUsername, setProctorFormUsername] = useState(proctorUser.username || 'proktor');
  const [proctorFormPassword, setProctorFormPassword] = useState(proctorUser.password || 'proktor123');
  const [proctorFormConfirmPassword, setProctorFormConfirmPassword] = useState(proctorUser.password || 'proktor123');
  const [showPassword, setShowPassword] = useState(false);
  const [proctorAccountError, setProctorAccountError] = useState<string | null>(null);
  const [proctorAccountSuccess, setProctorAccountSuccess] = useState<string | null>(null);

  // In-app Confirmation Modal for safe resets (No window.confirm!)
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    confirmText: string;
    confirmAction: () => void;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateProctorCredentials = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProctorAccountError(null);
    setProctorAccountSuccess(null);

    const cleanUsername = proctorFormUsername.trim();
    const cleanPassword = proctorFormPassword.trim();
    const cleanConfirm = proctorFormConfirmPassword.trim();
    const cleanName = proctorFormName.trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      setProctorAccountError('Username proktor minimal terdiri dari 3 karakter.');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 4) {
      setProctorAccountError('Password proktor minimal terdiri dari 4 karakter.');
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      setProctorAccountError('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    const updatedUser: User = {
      ...proctorUser,
      username: cleanUsername,
      password: cleanPassword,
      name: cleanName || proctorUser.name
    };

    dbService.saveUser(updatedUser);
    setProctorUser(updatedUser);
    setUsers(dbService.getUsers());

    // Sinkronkan nama proktor ke settings jika diubah
    if (cleanName && cleanName !== settings.proktorName) {
      dbService.updateSchoolSettings({ proktorName: cleanName });
      setSettings(prev => ({ ...prev, proktorName: cleanName }));
    }

    // Refresh auth context agar navbar & sesi pengguna aktif segera terupdate
    if (currentUser && (currentUser.id === updatedUser.id || currentUser.role === 'PROKTOR')) {
      refreshCurrentUser();
      localStorage.setItem('misnwkorleko_auth_user_id', updatedUser.id);
    }

    onSettingsUpdated();
    setProctorAccountSuccess(`Username & Password Proktor berhasil diperbarui! Gunakan username "${cleanUsername}" untuk login selanjutnya.`);
    showToast('Username dan Password Proktor berhasil diperbarui!');
    setTimeout(() => setProctorAccountSuccess(null), 6000);
  };

  const handleInputChange = (field: keyof SchoolSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveSettings = () => {
    dbService.updateSchoolSettings(settings);
    setSaveSuccess(true);
    onSettingsUpdated();
    showToast('Pengaturan CBT & Logo Madrasah berhasil disimpan!');
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // --- Handlers Penggantian Logo ---
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe berkas
    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Harap pilih berkas gambar yang valid (PNG, JPG, JPEG, SVG, WebP).');
      return;
    }

    // Validasi ukuran berkas (Maksimal 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setLogoUploadError('Ukuran berkas logo terlalu besar (maksimal 3MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleInputChange('logoUrl', dataUrl);
        showToast('Logo baru berhasil dimuat! Klik "Simpan Semua Pengaturan" untuk menerapkan secara permanen.');
      }
    };
    reader.onerror = () => {
      setLogoUploadError('Terjadi kesalahan saat membaca berkas gambar.');
    };
    reader.readAsDataURL(file);

    // Reset input agar dapat memilih file yang sama lagi bila perlu
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = '';
    }
  };

  const handleResetLogoToDefault = () => {
    setLogoUploadError(null);
    handleInputChange('logoUrl', DEFAULT_SCHOOL_LOGO);
    showToast('Logo dikembalikan ke Lambang Bintang Sembilan NW Korleko standar.');
  };

  const handleRemoveLogo = () => {
    setLogoUploadError(null);
    handleInputChange('logoUrl', '');
    showToast('Logo dikosongkan. Sistem akan menggunakan ikon madrasah standar.');
  };



  const handleExportBackup = () => {
    const json = dbService.exportDatabaseJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_CBT_MIS_NW_Korleko_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Berkas cadangan data CBT berhasil diunduh!');
  };

  const handleImportBackup = () => {
    if (!importJsonText.trim()) return;
    const ok = dbService.importDatabaseJson(importJsonText);
    if (ok) {
      showToast('Data cadangan CBT berhasil dipulihkan!');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showToast('Format file JSON cadangan tidak valid.');
    }
  };


  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-4.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800">
            <Settings className="w-3.5 h-3.5" />
            <span>Pengaturan CBT</span>
          </div>
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight mt-0.5">
            Pengaturan Logo & Identitas Madrasah
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            {saveSuccess ? <CheckCircle className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{saveSuccess ? 'Tersimpan!' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Left Column: Logo Madrasah & Identitas Madrasah (2 Cols) */}
        <div className="lg:col-span-2 space-y-3.5 sm:space-y-4">

          {/* CARD UTAMA: TEMPAT MENGGANTI LOGO PADA PENGATURAN PROKTOR */}
          <div className="bg-white border border-emerald-600/30 rounded-xl p-4 sm:p-4.5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-700" />
                  Logo Resmi Madrasah
                </h2>
              </div>
              
              <div className="flex items-center gap-1.5">
                {settings.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg flex items-center gap-1 transition-colors"
                    title="Kosongkan logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Logo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error Banner jika upload bermasalah */}
            {logoUploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{logoUploadError}</span>
                </div>
                <button onClick={() => setLogoUploadError(null)} className="text-rose-500 hover:text-rose-700 font-bold">×</button>
              </div>
            )}

            {/* Pratinjau Logo Aktif dengan Tombol Pensil untuk Ganti Logo */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
              {/* Logo Container dengan Ikon Pensil di Atasnya */}
              <div className="relative shrink-0 group">
                {/* Hidden file input */}
                <input 
                  type="file" 
                  ref={logoFileInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                  onChange={handleLogoFileUpload}
                  className="hidden" 
                />

                {/* Kotak Logo */}
                <div 
                  onClick={() => logoFileInputRef.current?.click()}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-500 p-2.5 flex items-center justify-center shadow-xs overflow-hidden cursor-pointer transition-all hover:shadow-md relative"
                  title="Klik untuk ganti logo madrasah"
                >
                  {settings.logoUrl ? (
                    <img 
                      src={settings.logoUrl} 
                      alt="Logo Madrasah" 
                      className="w-full h-full object-contain transition-transform group-hover:scale-105" 
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center justify-center space-y-1">
                      <School className="w-10 h-10 text-slate-300" />
                      <span className="text-[10px] font-semibold">Pilih Logo</span>
                    </div>
                  )}

                  {/* Overlay hover dengan ikon pensil */}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-white text-[11px] font-bold gap-1 backdrop-blur-2xs">
                    <Pencil className="w-5 h-5 text-emerald-300" />
                    <span>Ganti Logo</span>
                  </div>
                </div>

                {/* Gambar Pensil di Atas Logo */}
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md border-2 border-white transition-transform hover:scale-110 active:scale-95 focus:outline-hidden"
                  title="Klik ikon pensil untuk mengganti logo madrasah"
                  aria-label="Ganti Logo Madrasah"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              {/* Keterangan Singkat Logo Aktif */}
              <div className="text-center sm:text-left space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-center sm:justify-start gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  Logo Aktif Madrasah
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {settings.schoolName || 'MIS NW KORLEKO'}
                </h3>
              </div>
            </div>
          </div>

          {/* Card 2: Identitas Madrasah */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-4.5 shadow-2xs space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <School className="w-4 h-4 text-emerald-600" />
              Identitas Resmi Lembaga / Madrasah
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Madrasah:</label>
                <input
                  type="text"
                  value={settings.schoolName}
                  onChange={(e) => handleInputChange('schoolName', e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Yayasan / Penyelenggara:</label>
                <input
                  type="text"
                  value={settings.foundationName}
                  onChange={(e) => handleInputChange('foundationName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor Statistik Madrasah (NSM):</label>
                <input
                  type="text"
                  value={settings.nsm}
                  onChange={(e) => handleInputChange('nsm', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">NPSN:</label>
                <input
                  type="text"
                  value={settings.npsn}
                  onChange={(e) => handleInputChange('npsn', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Kepala Madrasah:</label>
                <input
                  type="text"
                  value={settings.headmasterName}
                  onChange={(e) => handleInputChange('headmasterName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">NIP Kepala Madrasah:</label>
                <input
                  type="text"
                  value={settings.headmasterNip}
                  onChange={(e) => handleInputChange('headmasterNip', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Proktor CBT:</label>
                <input
                  type="text"
                  value={settings.proktorName}
                  onChange={(e) => {
                    handleInputChange('proktorName', e.target.value);
                    setProctorFormName(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
                <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                  * Untuk mengubah username dan password login proktor, gunakan kartu "Akun & Kredensial Proktor" di samping kanan.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kabupaten / Kota:</label>
                <input
                  type="text"
                  value={settings.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Alamat Lengkap Madrasah:</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Provinsi:</label>
                <input
                  type="text"
                  value={settings.province}
                  onChange={(e) => handleInputChange('province', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tahun Ajaran:</label>
                <input
                  type="text"
                  value={settings.academicYear}
                  onChange={(e) => handleInputChange('academicYear', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Semester:</label>
                <select
                  value={settings.semester}
                  onChange={(e) => handleInputChange('semester', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 3: Pengaturan Keamanan & Anti-Curang */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-4.5 shadow-2xs space-y-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Protokol Anti-Curang & Kebijakan CBT
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Toleransi Pindah Tab / Jendela:</div>
                  <div className="text-[11px] text-slate-500">
                    Batas toleransi sebelum ujian terkunci otomatis.
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.defaultMaxViolations}
                    onChange={(e) => handleInputChange('defaultMaxViolations', parseInt(e.target.value) || 3)}
                    className="w-14 px-2 py-1 text-center font-bold text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                  />
                  <span className="text-slate-500 font-medium">kali</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Wajibkan Mode Layar Penuh (Fullscreen):</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enforceFullscreen}
                  onChange={(e) => handleInputChange('enforceFullscreen', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">Acak Urutan Soal (Randomize):</div>
                  <div className="text-[11px] text-slate-500">
                    Urutan butir soal diacak otomatis untuk setiap peserta ujian.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!settings.randomizeQuestions}
                  onChange={(e) => handleInputChange('randomizeQuestions', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
              </div>

              <div className={`p-3.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                settings.allowStudentViewResults
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-slate-50/90 border-slate-200'
              }`}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">
                      Tampilkan Nilai & Unduh Rapor PDF ke Peserta:
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                      settings.allowStudentViewResults
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-300 text-slate-700'
                    }`}>
                      {settings.allowStudentViewResults ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    Jika diaktifkan, peserta dapat melihat perolehan nilai dan mengunduh Rapor PDF setelah ujian selesai. Nonaktifkan untuk menyembunyikan skor dan tombol Unduh Rapor PDF.
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.allowStudentViewResults}
                  onClick={() => {
                    const nextVal = !settings.allowStudentViewResults;
                    handleInputChange('allowStudentViewResults', nextVal);
                    dbService.updateSchoolSettings({ allowStudentViewResults: nextVal });
                    onSettingsUpdated();
                    showToast(
                      nextVal
                        ? 'Tampilan Nilai & Unduh Rapor PDF peserta berhasil DIAKTIFKAN.'
                        : 'Tampilan Nilai & Unduh Rapor PDF peserta berhasil DINONAKTIFKAN.'
                    );
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1 ${
                    settings.allowStudentViewResults ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  title={settings.allowStudentViewResults ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan'}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      settings.allowStudentViewResults ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Akun Proktor, Mode Akses, Reset Login, & Backup (1 Col) */}
        <div className="space-y-3.5 sm:space-y-4">

          {/* CARD KHUSUS: TEMPAT MENGGANTI USERNAME DAN PASSWORD PROKTOR */}
          <div className="bg-white border-2 border-emerald-600/40 rounded-xl p-4 sm:p-4.5 shadow-xs space-y-3.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700"></div>

            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                    Akun & Kredensial Proktor
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Ganti username dan password login proktor
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                PROKTOR
              </span>
            </div>

            {/* Error & Success Messages */}
            {proctorAccountError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{proctorAccountError}</span>
              </div>
            )}

            {proctorAccountSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs flex items-center gap-2 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{proctorAccountSuccess}</span>
              </div>
            )}

            {/* Informasi Akun Saat Ini */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block font-medium">Username Aktif:</span>
                <span className="font-mono font-black text-emerald-950 text-xs">@{proctorUser.username}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block font-medium">Password:</span>
                <span className="font-mono text-xs text-slate-700">••••••••</span>
              </div>
            </div>

            {/* Form Ganti Username & Password */}
            <form onSubmit={handleUpdateProctorCredentials} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Proktor:
                </label>
                <input
                  type="text"
                  value={proctorFormName}
                  onChange={(e) => setProctorFormName(e.target.value)}
                  placeholder="Nama Lengkap Proktor"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>Username Baru:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Min. 3 karakter</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={proctorFormUsername}
                    onChange={(e) => setProctorFormUsername(e.target.value)}
                    placeholder="Contoh: proktor atau admin_cbt"
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                    required
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Password Baru:</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={proctorFormPassword}
                      onChange={(e) => setProctorFormPassword(e.target.value)}
                      placeholder="Password baru"
                      className="w-full pr-8 pl-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                    <span>Ulangi Password:</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={proctorFormConfirmPassword}
                      onChange={(e) => setProctorFormConfirmPassword(e.target.value)}
                      placeholder="Konfirmasi password"
                      className="w-full pr-8 pl-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5 text-slate-600" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{showPassword ? 'Sembunyikan' : 'Tampilkan Password'}</span>
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Simpan Kredensial Proktor</span>
                </button>
              </div>
            </form>
          </div>
          {/* Card: Cadangan & Pemulihan (Backup & Restore) */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-4.5 shadow-2xs space-y-2.5">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              Cadangan Database
            </h2>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Unduh Cadangan (.json)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowImportBox(!showImportBox)}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>{showImportBox ? 'Tutup Panel Impor' : 'Pulihkan Data dari JSON'}</span>
              </button>

              {showImportBox && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <textarea
                    rows={4}
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder="Tempelkan isi file cadangan JSON di sini..."
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-[10px] bg-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleImportBackup}
                    className="w-full py-1.5 bg-emerald-700 text-white rounded-lg font-bold text-xs hover:bg-emerald-800"
                  >
                    Proses Pemulihan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* IN-APP CONFIRMATION MODAL (Safe for iframes - No window.confirm) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmModal.confirmAction}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors"
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
