import React, { useState, useRef } from 'react';
import { 
  CreditCard, 
  UserCheck, 
  Printer, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  FileDown,
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  QrCode, 
  School, 
  Sparkles, 
  Lock, 
  User as UserIcon,
  BadgeCheck,
  KeyRound,
  ShieldCheck,
  Scissors,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { User, SchoolSettings } from '../../types/cbt';
import { dbService } from '../../services/dbStore';
import { 
  downloadCardExcelTemplate, 
  downloadStudentCardTemplate,
  downloadProctorCardTemplate,
  parseCardExcelFile 
} from '../../services/scheduleExcelService';
import { 
  generateStudentCardsPDF, 
  generateProctorCardsPDF 
} from '../../services/examCardsPdfService';
import { DEFAULT_SCHOOL_LOGO } from '../../services/logoPresets';

interface StudentCardData {
  id: string;
  nomorPeserta: string;
  nisn: string;
  name: string;
  kelas: string;
  ruang: string;
  sesi: string;
  username: string;
  password?: string;
  avatarUrl?: string;
}

interface ProctorCardData {
  id: string;
  nip: string;
  name: string;
  jabatan: string;
  ruang: string;
  jadwal: string;
  username?: string;
  password?: string;
  avatarUrl?: string;
}

export const ExamCardsManager: React.FC = () => {
  const settings = dbService.getSchoolSettings();
  const rawUsers = dbService.getUsers();

  const [activeTab, setActiveTab] = useState<'students' | 'proctors'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Print Modal States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<'all-students' | 'all-proctors' | 'single-student' | 'single-proctor'>('all-students');
  const [singleStudentPrint, setSingleStudentPrint] = useState<StudentCardData | null>(null);
  const [singleProctorPrint, setSingleProctorPrint] = useState<ProctorCardData | null>(null);

  // Form Modal States
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isProctorModalOpen, setIsProctorModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'student' | 'proctor' } | null>(null);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initial State from dbStore + Local Storage
  const [students, setStudents] = useState<StudentCardData[]>(() => {
    try {
      const saved = localStorage.getItem('misnw_cbt_cards_students_v1');
      if (saved) {
        const parsed: StudentCardData[] = JSON.parse(saved);
        return parsed.map(s => ({
          ...s,
          avatarUrl: s.avatarUrl && s.avatarUrl.includes('unsplash.com') ? '' : s.avatarUrl
        }));
      }
    } catch {
      // Fallback
    }

    const defaultStudents = rawUsers.filter(u => u.role === 'PESERTA' || u.role === 'STUDENT');
    if (defaultStudents.length > 0) {
      return defaultStudents.map((u, idx) => ({
        id: u.id,
        nomorPeserta: `05-024-${String(idx + 1).padStart(3, '0')}-8`,
        nisn: u.nisn || `0081234${idx + 5}`,
        name: u.name,
        kelas: u.kelas || 'Kelas VI A',
        ruang: 'Lab Komputer CBT Madrasah',
        sesi: idx % 2 === 0 ? 'Sesi 1 (07.30 - 09.00 WITA)' : 'Sesi 2 (09.30 - 11.00 WITA)',
        username: u.username,
        password: u.password || 'siswa123',
        avatarUrl: u.avatarUrl || ''
      }));
    }

    return [];
  });

  const [proctors, setProctors] = useState<ProctorCardData[]>(() => {
    try {
      const saved = localStorage.getItem('misnw_cbt_cards_proctors_v1');
      if (saved) {
        const parsed: ProctorCardData[] = JSON.parse(saved);
        return parsed.map(p => ({
          ...p,
          avatarUrl: p.avatarUrl && p.avatarUrl.includes('unsplash.com') ? '' : p.avatarUrl
        }));
      }
    } catch {
      // Fallback
    }

    const registeredProctors = rawUsers.filter(u => u.role === 'PENGAWAS' || u.role === 'TEACHER');
    if (registeredProctors.length > 0) {
      return registeredProctors.map((u) => ({
        id: u.id,
        nip: u.nip || '-',
        name: u.name,
        jabatan: 'Pengawas Ruang Ujian',
        ruang: 'Lab Komputer CBT Madrasah',
        jadwal: 'Sesuai Jadwal Asesmen',
        username: u.username,
        password: u.password || 'pengawas123',
        avatarUrl: u.avatarUrl || ''
      }));
    }

    return [];
  });

  // Save changes to localStorage
  const saveStudents = (newStudents: StudentCardData[]) => {
    setStudents(newStudents);
    try {
      localStorage.setItem('misnw_cbt_cards_students_v1', JSON.stringify(newStudents));
    } catch (e) {
      console.error(e);
    }
  };

  const saveProctors = (newProctors: ProctorCardData[]) => {
    setProctors(newProctors);
    try {
      localStorage.setItem('misnw_cbt_cards_proctors_v1', JSON.stringify(newProctors));
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Excel Handlers
  const handleDownloadExcelTemplate = () => {
    if (activeTab === 'students') {
      downloadStudentCardTemplate(settings.schoolName);
      showToast('Template Excel Kartu Peserta berhasil diunduh.');
    } else {
      downloadProctorCardTemplate(settings.schoolName);
      showToast('Template Excel Kartu Pengawas berhasil diunduh.');
    }
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { students: impStudents, proctors: impProctors } = await parseCardExcelFile(file);
      let countStudents = 0;
      let countProctors = 0;

      if (impStudents.length > 0) {
        const mapped: StudentCardData[] = impStudents.map((s, idx) => ({
          id: `std-imp-${Date.now()}-${idx}`,
          nomorPeserta: s.nomorPeserta,
          nisn: s.nisn,
          name: s.nama,
          kelas: s.kelas,
          ruang: s.ruang,
          sesi: s.sesi,
          username: s.username,
          password: s.password,
          avatarUrl: ''
        }));
        saveStudents([...students, ...mapped]);
        countStudents = mapped.length;
      }

      if (impProctors.length > 0) {
        const mappedPrc: ProctorCardData[] = impProctors.map((p, idx) => ({
          id: `prc-imp-${Date.now()}-${idx}`,
          nip: p.nip,
          name: p.nama,
          jabatan: p.jabatan,
          ruang: p.ruang,
          jadwal: p.jadwal,
          username: p.username || (p.nip && p.nip !== '-' ? p.nip.replace(/\s+/g, '') : `pengawas_${proctors.length + idx + 1}`),
          password: p.password || 'pengawas123',
          avatarUrl: ''
        }));
        saveProctors([...proctors, ...mappedPrc]);
        countProctors = mappedPrc.length;
      }

      showToast(`Sukses mengimpor dari Excel: ${countStudents} Peserta dan ${countProctors} Pengawas ditambahkan.`);
    } catch (err: any) {
      console.error(err);
      showToast(`Gagal membaca berkas Excel: ${err.message || 'Format tidak didukung'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Handler Unggah & Hapus Pasfoto Template Kartu (Sifatnya Opsional) ---
  const handleStudentPhotoUpload = (studentId: string, file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Berkas harus berupa gambar (JPG, PNG, JPEG, atau WebP).');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const updated = students.map(s => s.id === studentId ? { ...s, avatarUrl: dataUrl } : s);
      saveStudents(updated);
      setSingleStudentPrint(prev => prev && prev.id === studentId ? { ...prev, avatarUrl: dataUrl } : prev);

      // Sinkronkan ke database akun siswa jika ada
      const user = dbService.getUserById(studentId);
      if (user) {
        user.avatarUrl = dataUrl;
        dbService.saveUser(user);
      }
      showToast('Pasfoto kartu peserta berhasil diunggah!');
    };
    reader.readAsDataURL(file);
  };

  const handleStudentPhotoRemove = (studentId: string) => {
    const updated = students.map(s => s.id === studentId ? { ...s, avatarUrl: '' } : s);
    saveStudents(updated);
    setSingleStudentPrint(prev => prev && prev.id === studentId ? { ...prev, avatarUrl: '' } : prev);
    const user = dbService.getUserById(studentId);
    if (user) {
      delete user.avatarUrl;
      dbService.saveUser(user);
    }
    showToast('Pasfoto kartu peserta telah dihapus (kembali opsional).');
  };

  const handleProctorPhotoUpload = (proctorId: string, file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Berkas harus berupa gambar (JPG, PNG, JPEG, atau WebP).');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const updated = proctors.map(p => p.id === proctorId ? { ...p, avatarUrl: dataUrl } : p);
      saveProctors(updated);
      setSingleProctorPrint(prev => prev && prev.id === proctorId ? { ...prev, avatarUrl: dataUrl } : prev);
      showToast('Pasfoto kartu pengawas berhasil diunggah!');
    };
    reader.readAsDataURL(file);
  };

  const handleProctorPhotoRemove = (proctorId: string) => {
    const updated = proctors.map(p => p.id === proctorId ? { ...p, avatarUrl: '' } : p);
    saveProctors(updated);
    setSingleProctorPrint(prev => prev && prev.id === proctorId ? { ...prev, avatarUrl: '' } : prev);
    showToast('Pasfoto kartu pengawas telah dihapus.');
  };

  // Form State for Adding / Editing Student
  const [studentForm, setStudentForm] = useState<Partial<StudentCardData>>({
    nomorPeserta: '',
    nisn: '',
    name: '',
    kelas: 'Kelas VI A',
    ruang: 'Lab Komputer CBT Madrasah',
    sesi: 'Sesi 1 (07.30 - 09.00 WITA)',
    username: '',
    password: 'siswa123',
    avatarUrl: ''
  });

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.nisn) {
      showToast('Nama dan NISN siswa wajib diisi.');
      return;
    }

    const newStudent: StudentCardData = {
      id: studentForm.id || `std-${Date.now()}`,
      nomorPeserta: studentForm.nomorPeserta || `05-024-${String(students.length + 1).padStart(3, '0')}-8`,
      nisn: studentForm.nisn,
      name: studentForm.name,
      kelas: studentForm.kelas || 'Kelas VI A',
      ruang: studentForm.ruang || 'Lab Komputer CBT Madrasah',
      sesi: studentForm.sesi || 'Sesi 1',
      username: studentForm.username || studentForm.nisn,
      password: studentForm.password || 'siswa123',
      avatarUrl: studentForm.avatarUrl || ''
    };

    const exists = students.findIndex(s => s.id === newStudent.id);
    if (exists >= 0) {
      const updated = [...students];
      updated[exists] = newStudent;
      saveStudents(updated);
      showToast('Data kartu peserta berhasil diperbarui.');
    } else {
      saveStudents([...students, newStudent]);
      showToast('Peserta baru berhasil ditambahkan ke daftar kartu.');
    }

    setIsStudentModalOpen(false);
  };

  // Form State for Adding / Editing Proctor
  const [proctorForm, setProctorForm] = useState<Partial<ProctorCardData>>({
    nip: '',
    name: '',
    jabatan: 'Pengawas Ruang Ujian',
    ruang: 'Lab Komputer CBT Madrasah',
    jadwal: 'Senin - Sabtu',
    username: '',
    password: 'pengawas123'
  });

  const handleSaveProctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proctorForm.name) {
      showToast('Nama Pengawas wajib diisi.');
      return;
    }

    const defaultUser = proctorForm.nip && proctorForm.nip !== '-' 
      ? proctorForm.nip.replace(/\s+/g, '') 
      : `pengawas_${proctors.length + 1}`;

    const newPrc: ProctorCardData = {
      id: proctorForm.id || `prc-${Date.now()}`,
      nip: proctorForm.nip || '-',
      name: proctorForm.name,
      jabatan: proctorForm.jabatan || 'Pengawas Ruang',
      ruang: proctorForm.ruang || 'Lab Komputer CBT Madrasah',
      jadwal: proctorForm.jadwal || 'Senin - Sabtu',
      username: proctorForm.username || defaultUser,
      password: proctorForm.password || 'pengawas123',
      avatarUrl: proctorForm.avatarUrl || ''
    };

    const exists = proctors.findIndex(p => p.id === newPrc.id);
    if (exists >= 0) {
      const updated = [...proctors];
      updated[exists] = newPrc;
      saveProctors(updated);
      showToast('Data kartu pengawas berhasil diperbarui.');
    } else {
      saveProctors([...proctors, newPrc]);
      showToast('Pengawas baru berhasil ditambahkan ke daftar.');
    }

    setIsProctorModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'student') {
      saveStudents(students.filter(s => s.id !== itemToDelete.id));
      dbService.deleteUser(itemToDelete.id);
      showToast(`Kartu peserta "${itemToDelete.name}" berhasil dihapus.`);
    } else {
      saveProctors(proctors.filter(p => p.id !== itemToDelete.id));
      const matchedUser = dbService.getUserById(itemToDelete.id);
      if (matchedUser && matchedUser.role !== 'PROKTOR') {
        dbService.deleteUser(itemToDelete.id);
      }
      showToast(`Kartu pengawas "${itemToDelete.name}" berhasil dihapus.`);
    }
    setItemToDelete(null);
  };

  // Filters
  const uniqueClasses = Array.from(new Set(students.map(s => s.kelas)));
  const filteredStudents = students.filter(s => {
    if (selectedClass !== 'ALL' && s.kelas !== selectedClass) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.nisn.includes(q) ||
        s.nomorPeserta.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredProctors = proctors.filter(p => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.nip.includes(q);
    }
    return true;
  });

  // Unduh Berkas PDF Resmi Kartu Peserta / Pengawas (Format A4 Siap Cetak)
  const handleDownloadCardsPDF = async (
    targetOverride?: 'all-students' | 'all-proctors' | 'single-student' | 'single-proctor',
    studentOverride?: StudentCardData | null,
    proctorOverride?: ProctorCardData | null
  ) => {
    try {
      const mode = targetOverride || printTarget;
      const singleStd = studentOverride || singleStudentPrint;
      const singlePrc = proctorOverride || singleProctorPrint;

      if (mode === 'single-student' && singleStd) {
        await generateStudentCardsPDF([singleStd], settings);
        showToast(`PDF Kartu Peserta "${singleStd.name}" berhasil diunduh siap cetak.`);
      } else if (mode === 'all-students') {
        const toPrint = filteredStudents.length > 0 ? filteredStudents : students;
        if (toPrint.length === 0) {
          showToast('Tidak ada data peserta untuk diunduh.');
          return;
        }
        await generateStudentCardsPDF(toPrint, settings);
        showToast(`PDF Resmi (${toPrint.length} Kartu Peserta) berhasil diunduh (Format A4).`);
      } else if (mode === 'single-proctor' && singlePrc) {
        await generateProctorCardsPDF([singlePrc], settings);
        showToast(`PDF Kartu Pengawas "${singlePrc.name}" berhasil diunduh siap cetak.`);
      } else {
        const toPrint = filteredProctors.length > 0 ? filteredProctors : proctors;
        if (toPrint.length === 0) {
          showToast('Tidak ada data pengawas untuk diunduh.');
          return;
        }
        await generateProctorCardsPDF(toPrint, settings);
        showToast(`PDF Resmi (${toPrint.length} Kartu Pengawas) berhasil diunduh (Format A4).`);
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Gagal mengunduh PDF: ${err.message || 'Terjadi kesalahan sistem'}`);
    }
  };

  const handlePrintCards = () => {
    // 1. Download file PDF resmi langsung agar selalu berhasil 100% tanpa kendala pemblokiran iframe
    handleDownloadCardsPDF();
    // 2. Berikan opsi window.print() jika lingkungan browser mendukung dialog printer
    try {
      window.print();
    } catch (e) {
      // Abaikan jika sandbox memblokir dialog print modal
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

      {/* Main Top Header */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-4.5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="font-bold text-emerald-800 uppercase tracking-wide">
                Administrasi Ujian
              </span>
              <span>·</span>
              <span>T.P. {settings.academicYear} ({settings.semester})</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              Kartu Peserta & Kartu Pengawas
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Excel Download Template (Dibedakan Peserta vs Pengawas) */}
            <button
              onClick={handleDownloadExcelTemplate}
              className={`px-2.5 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'students'
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
              }`}
              title={activeTab === 'students' ? 'Unduh Template Excel Khusus Kartu Peserta' : 'Unduh Template Excel Khusus Kartu Pengawas'}
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${activeTab === 'students' ? 'text-emerald-700' : 'text-amber-700'}`} />
              <span>{activeTab === 'students' ? 'Template Excel Peserta' : 'Template Excel Pengawas'}</span>
            </button>

            {/* Excel Upload Import */}
            <label
              htmlFor="cards-excel-upload"
              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Unggah File Excel untuk Mengisi Peserta & Pengawas"
            >
              <Upload className="w-3.5 h-3.5 text-teal-700" />
              <span>Import Excel</span>
              <input
                id="cards-excel-upload"
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                onChange={handleUploadExcel}
                className="hidden"
              />
            </label>

            {/* Pratinjau & Cetak Button */}
            <button
              onClick={() => {
                if (activeTab === 'students') {
                  setPrintTarget('all-students');
                } else {
                  setPrintTarget('all-proctors');
                }
                setIsPrintModalOpen(true);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              title="Buka Layar Pratinjau & Dialog Cetak"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Pratinjau & Cetak</span>
            </button>

            {/* Add Button */}
            {activeTab === 'students' ? (
              <button
                onClick={() => {
                  setStudentForm({
                    nomorPeserta: `05-024-${String(students.length + 1).padStart(3, '0')}-8`,
                    nisn: '',
                    name: '',
                    kelas: 'Kelas VI A',
                    ruang: 'Lab Komputer CBT Madrasah',
                    sesi: 'Sesi 1 (07.30 - 09.00 WITA)',
                    username: '',
                    password: 'siswa123'
                  });
                  setIsStudentModalOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Peserta</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setProctorForm({
                    nip: '',
                    name: '',
                    jabatan: 'Pengawas Ruang Ujian',
                    ruang: 'Lab Komputer CBT Madrasah',
                    jadwal: 'Senin - Sabtu',
                    username: `pengawas_${proctors.length + 1}`,
                    password: 'pengawas123'
                  });
                  setIsProctorModalOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Pengawas</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Tabs: Kartu Peserta vs Kartu Pengawas (Berwarna Beda & Jelas) */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'students'
                ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/40'
                : 'bg-emerald-50/80 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Kartu Peserta ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('proctors')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'proctors'
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/40'
                : 'bg-amber-50/80 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <BadgeCheck className="w-3.5 h-3.5" />
            <span>Kartu Pengawas ({proctors.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'students' ? 'Cari nama, NISN, atau no. peserta...' : 'Cari nama atau NIP pengawas...'}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {activeTab === 'students' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">Kelas:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">Semua Kelas ({students.length})</option>
                {uniqueClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Ditemukan <b>{activeTab === 'students' ? filteredStudents.length : filteredProctors.length}</b> kartu
        </div>
      </div>

      {/* TAB 1: KARTU PESERTA GRID */}
      {activeTab === 'students' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredStudents.map((std) => (
            <div
              key={std.id}
              className="bg-white border-2 border-emerald-700/30 hover:border-emerald-700/70 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Header Kop Kartu */}
              <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-3 py-2 sm:px-3.5 sm:py-2.5 relative border-b-2 border-amber-400 flex items-center gap-2.5">
                {/* Logo Resmi Bulat Madrasah */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white p-0.5 shadow-sm border-2 border-amber-300 shrink-0 flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src={settings.logoUrl || DEFAULT_SCHOOL_LOGO}
                      alt="Logo Madrasah"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>
                {/* Identitas Kop Kartu */}
                <div className="flex-1 text-center min-w-0 pr-1">
                  <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-amber-300 leading-tight truncate">
                    {settings.foundationName || 'YAYASAN PONDOK PESANTREN NAHDLATUL WATHAN KORLEKO'}
                  </div>
                  <div className="text-xs sm:text-sm font-black uppercase tracking-wide mt-0.5 text-white truncate">
                    {settings.schoolName || 'MIS NW KORLEKO'}
                  </div>
                  <div className="mt-0.5 bg-emerald-950/70 py-0.5 px-2.5 rounded-full text-[8px] sm:text-[8.5px] font-extrabold tracking-wide uppercase inline-flex items-center gap-1 border border-emerald-600/50">
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    <span>KARTU PESERTA ASESMEN SUMATIF (ASAS)</span>
                  </div>
                  <div className="text-[8px] sm:text-[8.5px] font-bold text-amber-200 mt-0.5 tracking-wider uppercase truncate">
                    Tahun Pelajaran {settings.academicYear || '2026/2027'} ({settings.semester || 'Semester Ganjil'})
                  </div>
                </div>
              </div>

              {/* Body Kartu Siswa: Kiri Foto + Barcode, Kanan Data Identitas */}
              <div className="p-3 sm:p-3.5 flex gap-3 sm:gap-3.5 items-start">
                {/* Foto / Avatar Siswa & Barcode (Tempat Upload Foto Opsional) */}
                <div className="flex flex-col items-center justify-between shrink-0 w-24">
                  <div className="relative group w-20 h-25 bg-slate-100 rounded-xl border-2 border-emerald-800/50 overflow-hidden flex items-center justify-center p-0 shadow-2xs">
                    {std.avatarUrl ? (
                      <>
                        <img
                          src={std.avatarUrl}
                          alt={std.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        {/* Hover Overlay: Ganti / Hapus Pasfoto */}
                        <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1 rounded-xl no-print">
                          <label className="cursor-pointer bg-white text-emerald-800 hover:bg-emerald-50 px-2 py-0.5 rounded text-[9px] font-bold shadow-xs flex items-center gap-1 transition-transform active:scale-95">
                            <Camera className="w-2.5 h-2.5" />
                            <span>Ganti</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleStudentPhotoUpload(std.id, file);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleStudentPhotoRemove(std.id)}
                            className="bg-rose-600 text-white hover:bg-rose-700 px-2 py-0.5 rounded text-[9px] font-bold shadow-xs flex items-center gap-1 transition-transform active:scale-95"
                            title="Hapus Pasfoto"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <label 
                        className="w-full h-full rounded-xl bg-slate-50 hover:bg-emerald-50/70 border-2 border-dashed border-emerald-700/30 hover:border-emerald-600 cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-emerald-800 p-1 text-center transition-all group/box"
                        title="Klik di sini untuk upload pasfoto siswa (Sifatnya Opsional)"
                      >
                        <Camera className="w-5 h-5 text-slate-300 group-hover/box:text-emerald-600 mb-0.5 transition-colors" />
                        <span className="text-[7.5px] font-bold text-slate-400 group-hover/box:text-emerald-900 uppercase leading-tight">
                          Pas Foto<br/>3x4
                        </span>
                        <span className="text-[7px] font-extrabold text-emerald-800 bg-emerald-100/90 group-hover/box:bg-emerald-200 px-1.5 py-0.5 rounded-full mt-1 border border-emerald-300 no-print transition-colors">
                          + Upload
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleStudentPhotoUpload(std.id, file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <div className="mt-2 w-full">
                    <SvgBarcode code={std.nomorPeserta || std.nisn} />
                  </div>
                </div>

                {/* Rincian Identitas Siswa */}
                <div className="flex-1 space-y-1 text-xs">
                  <div className="grid grid-cols-3 gap-1 py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium text-[11px]">No. Peserta</span>
                    <span className="col-span-2 font-mono font-extrabold text-emerald-950 text-xs">
                      : {std.nomorPeserta}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium text-[11px]">NISN</span>
                    <span className="col-span-2 font-mono font-bold text-slate-800 text-[11px]">
                      : {std.nisn}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium text-[11px]">Nama Siswa</span>
                    <span className="col-span-2 font-black uppercase text-slate-900 text-xs leading-tight">
                      : {std.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium text-[11px]">Kelas</span>
                    <span className="col-span-2 font-extrabold text-emerald-800 text-[11px]">
                      : {std.kelas}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium text-[11px]">Ruang / Sesi</span>
                    <span className="col-span-2 text-slate-700 text-[10.5px]">
                      : {std.ruang} ({std.sesi.split(' ')[0]})
                    </span>
                  </div>

                  {/* Kredensial Login Siswa */}
                  <div className="mt-1.5 p-2 bg-emerald-50/80 rounded-xl border border-emerald-200 text-[11px]">
                    <div className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wide flex items-center gap-1 mb-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Akun Login CBT</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 block text-[8.5px]">Username:</span>
                        <span className="font-mono font-black text-emerald-950">{std.username}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[8.5px]">Password:</span>
                        <span className="font-mono font-black text-rose-700">{std.password || 'siswa123'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Kartu & Action Buttons */}
              <div className="px-3.5 py-2.5 bg-slate-50/90 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  <span className="font-bold text-emerald-800">Format Hemat (8 Kartu / Lembar A4)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Unduh PDF Kartu Siswa Ini Langsung */}
                  <button
                    onClick={() => handleDownloadCardsPDF('single-student', std)}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                    title="Unduh Berkas PDF Kartu Peserta Ini"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Unduh PDF</span>
                  </button>

                  {/* Pratinjau Cetak */}
                  <button
                    onClick={() => {
                      setSingleStudentPrint(std);
                      setPrintTarget('single-student');
                      setIsPrintModalOpen(true);
                    }}
                    className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                    title="Pratinjau Layar Kartu Ini"
                  >
                    <Printer className="w-3 h-3 text-slate-600" />
                    <span>Pratinjau</span>
                  </button>

                  <button
                    onClick={() => {
                      setStudentForm({ ...std });
                      setIsStudentModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                    title="Edit Data Peserta"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setItemToDelete({ id: std.id, name: std.name, type: 'student' })}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    title="Hapus Kartu Peserta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: KARTU PENGAWAS GRID */}
      {activeTab === 'proctors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredProctors.map((prc) => (
            <div
              key={prc.id}
              className="bg-white border-2 border-amber-600/30 hover:border-amber-600/70 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Header Badge */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white px-3 py-2 sm:px-3.5 sm:py-2.5 relative border-b-2 border-amber-400 flex items-center gap-2.5">
                {/* Logo Resmi Bulat Madrasah */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white p-0.5 shadow-sm border-2 border-amber-400 shrink-0 flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src={settings.logoUrl || DEFAULT_SCHOOL_LOGO}
                      alt="Logo Madrasah"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>
                {/* Identitas Pengawas */}
                <div className="flex-1 text-center min-w-0 pr-1">
                  <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-amber-300 truncate">
                    {settings.foundationName || 'PANITIA ASESMEN SUMATIF MIS NW KORLEKO'}
                  </div>
                  <div className="text-xs sm:text-sm font-black uppercase tracking-wide text-white mt-0.5 truncate">
                    TANDA PENGENAL PENGAWAS RUANG UJIAN
                  </div>
                  <div className="text-[8px] sm:text-[8.5px] font-bold text-amber-200 mt-0.5 tracking-wider uppercase truncate">
                    Tahun Pelajaran {settings.academicYear || '2026/2027'} ({settings.semester || 'Semester Ganjil'})
                  </div>
                </div>
              </div>

              {/* Body Badge */}
              <div className="p-3.5 flex gap-3.5 items-start">
                {/* Foto / Avatar Pengawas & Barcode (Tempat Upload Foto Opsional) */}
                <div className="w-22 shrink-0 flex flex-col items-center">
                  <div className="relative group w-18 h-25 bg-slate-100 rounded-xl border-2 border-amber-500/60 overflow-hidden flex items-center justify-center p-0 shadow-2xs">
                    {prc.avatarUrl ? (
                      <>
                        <img
                          src={prc.avatarUrl}
                          alt={prc.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        {/* Hover Overlay: Ganti / Hapus Pasfoto */}
                        <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1 rounded-xl no-print">
                          <label className="cursor-pointer bg-white text-amber-800 hover:bg-amber-50 px-2 py-0.5 rounded text-[9px] font-bold shadow-xs flex items-center gap-1 transition-transform active:scale-95">
                            <Camera className="w-2.5 h-2.5" />
                            <span>Ganti</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleProctorPhotoUpload(prc.id, file);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleProctorPhotoRemove(prc.id)}
                            className="bg-rose-600 text-white hover:bg-rose-700 px-2 py-0.5 rounded text-[9px] font-bold shadow-xs flex items-center gap-1 transition-transform active:scale-95"
                            title="Hapus Pasfoto"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <label 
                        className="w-full h-full rounded-xl bg-amber-50/50 hover:bg-amber-100/70 border-2 border-dashed border-amber-400 hover:border-amber-500 cursor-pointer flex flex-col items-center justify-center text-amber-600/70 hover:text-amber-800 p-1 text-center transition-all group/box"
                        title="Klik di sini untuk upload pasfoto pengawas (Sifatnya Opsional)"
                      >
                        <Camera className="w-5 h-5 text-amber-500 group-hover/box:text-amber-700 mb-0.5 transition-colors" />
                        <span className="text-[7.5px] font-bold text-amber-700 uppercase leading-tight">
                          Pas Foto<br/>3x4
                        </span>
                        <span className="text-[7px] font-extrabold text-amber-900 bg-amber-200/90 group-hover/box:bg-amber-300 px-1.5 py-0.5 rounded-full mt-1 border border-amber-400 no-print transition-colors">
                          + Upload
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleProctorPhotoUpload(prc.id, file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <div className="mt-2 w-full">
                    <SvgBarcode code={prc.nip && prc.nip !== '-' ? prc.nip : `PENGAWAS-${prc.id}`} />
                  </div>
                </div>

                <div className="flex-1 space-y-1.5 text-xs">
                  <div>
                    <span className="text-[9.5px] text-amber-700 font-extrabold uppercase block">Nama Lengkap:</span>
                    <span className="text-sm font-black text-slate-900 leading-tight">{prc.name}</span>
                  </div>

                  <div>
                    <span className="text-[9.5px] text-slate-500 font-bold uppercase block">NIP / NUPTK:</span>
                    <span className="font-mono font-bold text-slate-700">{prc.nip}</span>
                  </div>

                  <div className="pt-0.5 flex flex-wrap gap-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black">
                      {prc.jabatan}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                      Ruang: {prc.ruang}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500 font-medium">
                    Jadwal Tugas: <b>{prc.jadwal}</b>
                  </div>

                  {/* Kredensial Login Pengawas CBT (Persis Desain Referensi) */}
                  <div className="mt-1.5 p-2 bg-emerald-50/80 rounded-xl border border-emerald-200 text-[11px]">
                    <div className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wide flex items-center gap-1 mb-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>AKUN LOGIN CBT</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 block text-[8.5px]">Username:</span>
                        <span className="font-mono font-black text-emerald-950">{prc.username || 'pengawas'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[8.5px]">Password:</span>
                        <span className="font-mono font-black text-rose-700">{prc.password || 'pengawas123'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Badge */}
              <div className="px-3.5 py-2.5 bg-slate-50/90 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-600" />
                  <span className="font-bold text-amber-800">Format Hemat (8 Kartu / Lembar A4)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Unduh PDF Badge Pengawas Ini */}
                  <button
                    onClick={() => handleDownloadCardsPDF('single-proctor', null, prc)}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                    title="Unduh Berkas PDF Badge Pengawas Ini"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Unduh PDF</span>
                  </button>

                  {/* Pratinjau */}
                  <button
                    onClick={() => {
                      setSingleProctorPrint(prc);
                      setPrintTarget('single-proctor');
                      setIsPrintModalOpen(true);
                    }}
                    className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                    title="Pratinjau Layar Badge Pengawas Ini"
                  >
                    <Printer className="w-3 h-3 text-slate-600" />
                    <span>Pratinjau</span>
                  </button>

                  <button
                    onClick={() => {
                      setProctorForm({ ...prc });
                      setIsProctorModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                    title="Edit Data Pengawas"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setItemToDelete({ id: prc.id, name: prc.name, type: 'proctor' })}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    title="Hapus Kartu Pengawas"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: FORM TAMBAH / EDIT PESERTA */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-700" />
                <span>{studentForm.id ? 'Ubah Data Kartu Peserta' : 'Tambah Kartu Peserta Baru'}</span>
              </h3>
              <button onClick={() => setIsStudentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3">
              {/* Tempat Upload Foto Peserta (Sifatnya Opsional) */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center gap-3">
                <div className="w-16 h-21 bg-white rounded-lg border-2 border-dashed border-emerald-400 flex items-center justify-center overflow-hidden shrink-0 relative shadow-2xs">
                  {studentForm.avatarUrl ? (
                    <img src={studentForm.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-1 text-slate-400">
                      <Camera className="w-5 h-5 mx-auto mb-0.5 text-slate-300" />
                      <span className="text-[7.5px] font-bold text-slate-400 block leading-tight">Pasfoto<br/>3x4</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Pasfoto Peserta (3x4)</span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">Opsional</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-tight">
                    Unggah pasfoto siswa jika ada (JPG/PNG/WebP, maks. 3MB). Bersifat opsional (boleh dikosongkan).
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <label className="px-2.5 py-1 bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold cursor-pointer shadow-2xs flex items-center gap-1">
                      <Camera className="w-3 h-3 text-emerald-600" />
                      <span>{studentForm.avatarUrl ? 'Ganti Foto' : 'Pilih Berkas Foto'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setStudentForm(prev => ({ ...prev, avatarUrl: ev.target?.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {studentForm.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setStudentForm(prev => ({ ...prev, avatarUrl: '' }))}
                        className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  value={studentForm.name || ''}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  placeholder="Contoh: Muhammad Fauzi Rahman"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Peserta</label>
                  <input
                    type="text"
                    value={studentForm.nomorPeserta || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, nomorPeserta: e.target.value })}
                    placeholder="05-024-001-8"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NISN</label>
                  <input
                    type="text"
                    value={studentForm.nisn || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, nisn: e.target.value })}
                    placeholder="00812345"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas</label>
                  <input
                    type="text"
                    value={studentForm.kelas || 'Kelas VI A'}
                    onChange={(e) => setStudentForm({ ...studentForm, kelas: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ruang Ujian</label>
                  <input
                    type="text"
                    value={studentForm.ruang || 'Lab Komputer CBT'}
                    onChange={(e) => setStudentForm({ ...studentForm, ruang: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sesi Pelaksanaan</label>
                <input
                  type="text"
                  value={studentForm.sesi || 'Sesi 1 (07.30 - 09.00 WITA)'}
                  onChange={(e) => setStudentForm({ ...studentForm, sesi: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username Login</label>
                  <input
                    type="text"
                    value={studentForm.username || ''}
                    onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })}
                    placeholder="Sesuai NISN"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password CBT</label>
                  <input
                    type="text"
                    value={studentForm.password || 'siswa123'}
                    onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl shadow-xs"
                >
                  Simpan Kartu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FORM TAMBAH / EDIT PENGAWAS */}
      {isProctorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-emerald-700" />
                <span>{proctorForm.id ? 'Ubah Data Kartu Pengawas' : 'Tambah Kartu Pengawas Baru'}</span>
              </h3>
              <button onClick={() => setIsProctorModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProctor} className="space-y-3">
              {/* Tempat Upload Foto Pengawas (Sifatnya Opsional) */}
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center gap-3">
                <div className="w-16 h-21 bg-white rounded-lg border-2 border-dashed border-amber-400 flex items-center justify-center overflow-hidden shrink-0 relative shadow-2xs">
                  {proctorForm.avatarUrl ? (
                    <img src={proctorForm.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-1 text-slate-400">
                      <Camera className="w-5 h-5 mx-auto mb-0.5 text-amber-500" />
                      <span className="text-[7.5px] font-bold text-amber-700 block leading-tight">Pasfoto<br/>3x4</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Pasfoto Pengawas (3x4)</span>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">Opsional</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-tight">
                    Unggah pasfoto pengawas jika ada (JPG/PNG/WebP, maks. 3MB). Bersifat opsional (boleh dikosongkan).
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <label className="px-2.5 py-1 bg-white hover:bg-slate-50 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold cursor-pointer shadow-2xs flex items-center gap-1">
                      <Camera className="w-3 h-3 text-amber-600" />
                      <span>{proctorForm.avatarUrl ? 'Ganti Foto' : 'Pilih Berkas Foto'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setProctorForm(prev => ({ ...prev, avatarUrl: ev.target?.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {proctorForm.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setProctorForm(prev => ({ ...prev, avatarUrl: '' }))}
                        className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Pengawas</label>
                <input
                  type="text"
                  value={proctorForm.name || ''}
                  onChange={(e) => setProctorForm({ ...proctorForm, name: e.target.value })}
                  placeholder="Contoh: Ustazah Halimatussadiah, S.Pd"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NIP / NUPTK</label>
                <input
                  type="text"
                  value={proctorForm.nip || ''}
                  onChange={(e) => setProctorForm({ ...proctorForm, nip: e.target.value })}
                  placeholder="19920310 201903 2 011"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan Tugas</label>
                <input
                  type="text"
                  value={proctorForm.jabatan || 'Pengawas Ruang Ujian'}
                  onChange={(e) => setProctorForm({ ...proctorForm, jabatan: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ruang Penugasan</label>
                <input
                  type="text"
                  value={proctorForm.ruang || 'Lab Komputer CBT Madrasah'}
                  onChange={(e) => setProctorForm({ ...proctorForm, ruang: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jadwal Sesi Tugas</label>
                <input
                  type="text"
                  value={proctorForm.jadwal || 'Senin - Sabtu'}
                  onChange={(e) => setProctorForm({ ...proctorForm, jadwal: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                  required
                />
              </div>

              {/* Kredensial Akun Login CBT Pengawas */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/80 rounded-xl border border-emerald-200">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">Username Login CBT</label>
                  <input
                    type="text"
                    value={proctorForm.username || ''}
                    onChange={(e) => setProctorForm({ ...proctorForm, username: e.target.value })}
                    placeholder="Contoh: pengawas_1"
                    className="w-full text-xs p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">Password Login CBT</label>
                  <input
                    type="text"
                    value={proctorForm.password || 'pengawas123'}
                    onChange={(e) => setProctorForm({ ...proctorForm, password: e.target.value })}
                    placeholder="Password login"
                    className="w-full text-xs p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-rose-700 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProctorModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs"
                >
                  Simpan Pengawas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HAPUS IN-APP */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Hapus Kartu {itemToDelete.type === 'student' ? 'Peserta' : 'Pengawas'}?
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Apakah Anda yakin ingin menghapus data kartu untuk <b>{itemToDelete.name}</b>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRINT PREVIEW KARTU (KOP RESMI MIS NW KORLEKO) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[94vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    Pratinjau {printTarget.includes('student') ? 'Kartu Peserta Ujian CBT' : 'Kartu Pengawas Ruang Ujian'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    MIS NW Korleko · Format Kertas HVS A4 (Hemat: 8 Kartu per Halaman)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Tombol Utama: Unduh PDF Resmi */}
                <button
                  type="button"
                  onClick={() => handleDownloadCardsPDF()}
                  className="px-3 sm:px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all hover:shadow"
                  title="Unduh berkas PDF resmi A4 siap cetak langsung (8 kartu per lembar)"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Unduh PDF Resmi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors ml-1"
                  title="Tutup Pratinjau"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Petunjuk & Banner Info Cetak Hemat Kertas HVS */}
            <div className="bg-emerald-50/80 border-b border-emerald-200/90 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-950 font-medium gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <b>Format Hemat Kertas HVS (Muat 8 Kartu per Lembar A4):</b> Ukuran kartu kompak horizontal persis sesuai tampilan referensi, pasfoto resmi, barcode pemindai, kredensial login CBT, dan garis potong tanpa tanda tangan.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadCardsPDF()}
                className="shrink-0 text-emerald-800 hover:text-emerald-950 font-extrabold underline text-[11px]"
              >
                Unduh PDF (8 Kartu/Lembar)
              </button>
            </div>

            {/* Print Content Area */}
            <div id="printable-cards-area" className="p-4 sm:p-8 bg-slate-100/60 print:bg-white print:p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 max-w-4xl mx-auto">
                {/* Single or Multiple Student Cards */}
                {printTarget === 'single-student' && singleStudentPrint && (
                  <PrintCardItemStudent 
                    std={singleStudentPrint} 
                    settings={settings} 
                    onPhotoUpload={(file) => handleStudentPhotoUpload(singleStudentPrint.id, file)}
                    onPhotoRemove={() => handleStudentPhotoRemove(singleStudentPrint.id)}
                  />
                )}

                {printTarget === 'all-students' && filteredStudents.map(std => (
                  <PrintCardItemStudent 
                    key={std.id} 
                    std={std} 
                    settings={settings} 
                    onPhotoUpload={(file) => handleStudentPhotoUpload(std.id, file)}
                    onPhotoRemove={() => handleStudentPhotoRemove(std.id)}
                  />
                ))}

                {/* Single or Multiple Proctor Cards */}
                {printTarget === 'single-proctor' && singleProctorPrint && (
                  <PrintCardItemProctor 
                    prc={singleProctorPrint} 
                    settings={settings} 
                    onPhotoUpload={(file) => handleProctorPhotoUpload(singleProctorPrint.id, file)}
                    onPhotoRemove={() => handleProctorPhotoRemove(singleProctorPrint.id)}
                  />
                )}

                {printTarget === 'all-proctors' && filteredProctors.map(prc => (
                  <PrintCardItemProctor 
                    key={prc.id} 
                    prc={prc} 
                    settings={settings} 
                    onPhotoUpload={(file) => handleProctorPhotoUpload(prc.id, file)}
                    onPhotoRemove={() => handleProctorPhotoRemove(prc.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Barcode Vector SVG Realistis
 */
const SvgBarcode: React.FC<{ code: string; className?: string }> = ({ code, className = "h-8" }) => {
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed += code.charCodeAt(i);
  }
  const bars: { x: number; width: number }[] = [];
  let currentX = 2;
  for (let i = 0; i < 38; i++) {
    const isGap = ((seed + i * 3) % 6) === 0;
    const isThick = ((seed * (i + 1)) % 7) > 3;
    const barW = isThick ? 2.2 : 1.1;
    if (!isGap && currentX < 96) {
      bars.push({ x: currentX, width: barW });
    }
    currentX += barW + (isGap ? 1.6 : 1.1);
  }

  return (
    <div className={`flex flex-col items-center justify-center w-full ${className}`}>
      <svg viewBox="0 0 100 24" className="w-full h-5" preserveAspectRatio="none">
        {bars.map((b, idx) => (
          <rect key={idx} x={b.x} y="0" width={b.width} height="24" fill="#0f172a" />
        ))}
      </svg>
      <span className="text-[7.5px] font-mono tracking-widest text-slate-600 mt-0.5 font-bold">
        * {code} *
      </span>
    </div>
  );
};

// Sub-component: Kartu Peserta Format Hemat Kertas (8 Kartu / Lembar A4) - Persis Sesuai Gambar Referensi
const PrintCardItemStudent: React.FC<{ 
  std: StudentCardData; 
  settings: SchoolSettings;
  onPhotoUpload?: (file: File) => void;
  onPhotoRemove?: () => void;
}> = ({ std, settings, onPhotoUpload, onPhotoRemove }) => (
  <div className="w-full bg-white border-2 border-emerald-700/40 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between break-inside-avoid">
    {/* Header Kop Kartu (Hijau Zamrud & Kuning/Gold) */}
    <div className="bg-[#064e3b] text-white px-3 py-2 sm:px-3.5 sm:py-2.5 relative border-b border-emerald-950 flex items-center gap-2.5">
      {/* Logo Resmi Bulat Madrasah */}
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white p-0.5 shadow-sm border-2 border-amber-300 shrink-0 flex items-center justify-center overflow-hidden">
        <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
          <img
            src={settings.logoUrl || DEFAULT_SCHOOL_LOGO}
            alt="Logo Madrasah"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </div>

      {/* Identitas Kop Kartu */}
      <div className="flex-1 text-center min-w-0 pr-1">
        <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-amber-300 leading-tight truncate">
          {settings.foundationName || 'YAYASAN PENDIDIKAN PONDOK PESANTREN DARUNNAHDLAH KORLEKO'}
        </div>
        <div className="text-xs sm:text-sm font-black uppercase tracking-wide mt-0.5 text-white truncate">
          {settings.schoolName || 'MIS NW KORLEKO'}
        </div>
        <div className="mt-0.5 bg-emerald-900/90 py-0.5 px-2.5 rounded-full text-[8px] sm:text-[8.5px] font-extrabold tracking-wide uppercase inline-flex items-center gap-1 border border-emerald-600/50">
          <Sparkles className="w-2.5 h-2.5 text-amber-300" />
          <span>KARTU PESERTA ASESMEN SUMATIF (ASAS)</span>
        </div>
        <div className="text-[8px] sm:text-[8.5px] font-bold text-amber-200 mt-0.5 tracking-wider uppercase truncate">
          Tahun Pelajaran {settings.academicYear || '2026/2027'} ({settings.semester || 'Semester Ganjil'})
        </div>
      </div>
    </div>

    {/* Body Kartu: Kiri Foto + Barcode, Kanan Identitas + Akun Login CBT */}
    <div className="p-3 sm:p-3.5 flex gap-3 sm:gap-3.5 items-start">
      {/* Foto Siswa & Barcode (Tempat Upload Foto Opsional) */}
      <div className="flex flex-col items-center justify-between shrink-0 w-22 sm:w-24">
        <div className="relative group w-18 sm:w-20 h-22 sm:h-24 bg-slate-100 rounded-xl border-2 border-emerald-800/50 overflow-hidden flex items-center justify-center p-0 shadow-2xs">
          {std.avatarUrl ? (
            <>
              <img
                src={std.avatarUrl}
                alt={std.name}
                className="w-full h-full object-cover rounded-xl"
              />
              {onPhotoUpload && onPhotoRemove && (
                <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1 rounded-xl no-print">
                  <label className="cursor-pointer bg-white text-emerald-800 hover:bg-emerald-50 px-1.5 py-0.5 rounded text-[8.5px] font-bold shadow-xs flex items-center gap-1 transition-transform active:scale-95">
                    <Camera className="w-2.5 h-2.5" />
                    <span>Ganti</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onPhotoUpload(file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={onPhotoRemove}
                    className="bg-rose-600 text-white hover:bg-rose-700 px-1.5 py-0.5 rounded text-[8.5px] font-bold shadow-xs flex items-center gap-1 transition-transform active:scale-95"
                    title="Hapus Pasfoto"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            onPhotoUpload ? (
              <label 
                className="w-full h-full rounded-xl bg-slate-50 hover:bg-emerald-50/70 border-2 border-dashed border-emerald-700/30 hover:border-emerald-600 cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-emerald-800 p-1 text-center transition-all group/box"
                title="Klik di sini untuk upload pasfoto siswa (Sifatnya Opsional)"
              >
                <Camera className="w-4 h-4 text-slate-300 group-hover/box:text-emerald-600 mb-0.5" />
                <span className="text-[7.5px] font-bold text-slate-400 group-hover/box:text-emerald-900 uppercase leading-tight">Pas Foto<br/>3x4</span>
                <span className="text-[6.5px] font-extrabold text-emerald-800 bg-emerald-100/90 group-hover/box:bg-emerald-200 px-1.5 py-0.5 rounded-full mt-0.5 border border-emerald-300 no-print">
                  + Upload
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onPhotoUpload(file);
                  }}
                />
              </label>
            ) : (
              <div className="w-full h-full rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                <UserIcon className="w-5 h-5 text-slate-300 mb-0.5" />
                <span className="text-[8px] font-bold text-slate-400 uppercase leading-tight">Pas Foto<br/>3x4</span>
              </div>
            )
          )}
        </div>
        <div className="mt-1.5 w-full">
          <SvgBarcode code={std.nomorPeserta || std.nisn} />
        </div>
      </div>

      {/* Rincian Identitas Siswa */}
      <div className="flex-1 space-y-1 text-xs">
        <div className="grid grid-cols-3 gap-1 py-0.5 border-b border-slate-100">
          <span className="text-slate-500 font-medium text-[11px]">No. Peserta</span>
          <span className="col-span-2 font-mono font-extrabold text-emerald-950 text-xs">
            : {std.nomorPeserta}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 py-0.5 border-b border-slate-100">
          <span className="text-slate-500 font-medium text-[11px]">NISN</span>
          <span className="col-span-2 font-mono font-bold text-slate-800 text-[11px]">
            : {std.nisn}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 py-0.5 border-b border-slate-100">
          <span className="text-slate-500 font-medium text-[11px]">Nama Siswa</span>
          <span className="col-span-2 font-black uppercase text-slate-900 text-xs leading-tight">
            : {std.name}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 py-0.5 border-b border-slate-100">
          <span className="text-slate-500 font-medium text-[11px]">Kelas</span>
          <span className="col-span-2 font-extrabold text-emerald-800 text-[11px]">
            : {std.kelas}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 py-0.5 border-b border-slate-100">
          <span className="text-slate-500 font-medium text-[11px]">Ruang / Sesi</span>
          <span className="col-span-2 text-slate-700 text-[10.5px]">
            : {std.ruang} ({std.sesi?.split(' ')[0] || std.sesi || 'Sesi 1'})
          </span>
        </div>

        {/* Kredensial Login Siswa (Persis Desain Referensi) */}
        <div className="mt-1.5 p-2 bg-emerald-50/80 rounded-xl border border-emerald-200 text-[11px]">
          <div className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wide flex items-center gap-1 mb-1">
            <Lock className="w-2.5 h-2.5" />
            <span>AKUN LOGIN CBT</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 block text-[8.5px]">Username:</span>
              <span className="font-mono font-black text-emerald-950">{std.username}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[8.5px]">Password:</span>
              <span className="font-mono font-black text-rose-700">{std.password || 'siswa123'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Sub-component: Kartu Pengawas Format Hemat Kertas (8 Kartu / Lembar A4)
const PrintCardItemProctor: React.FC<{ 
  prc: ProctorCardData; 
  settings: SchoolSettings;
  onPhotoUpload?: (file: File) => void;
  onPhotoRemove?: () => void;
}> = ({ prc, settings, onPhotoUpload, onPhotoRemove }) => (
  <div className="w-full bg-white border-2 border-amber-600/40 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between break-inside-avoid">
    {/* Header Pengawas */}
    <div className="bg-slate-900 text-white px-3 py-2 sm:px-3.5 sm:py-2.5 relative border-b border-slate-950 flex items-center gap-2.5">
      {/* Logo Resmi Bulat Madrasah */}
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white p-0.5 shadow-sm border-2 border-amber-400 shrink-0 flex items-center justify-center overflow-hidden">
        <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
          <img
            src={settings.logoUrl || DEFAULT_SCHOOL_LOGO}
            alt="Logo Madrasah"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </div>

      <div className="flex-1 text-center min-w-0 pr-1">
        <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-amber-300 leading-tight truncate">
          {settings.foundationName || 'PANITIA ASESMEN SUMATIF MIS NW KORLEKO'}
        </div>
        <div className="text-xs sm:text-sm font-black uppercase tracking-wide text-white mt-0.5 truncate">
          {settings.schoolName || 'MIS NW KORLEKO'}
        </div>
        <div className="mt-0.5 bg-amber-500/20 text-amber-200 border border-amber-400/50 py-0.5 px-2.5 rounded-full text-[8px] font-black tracking-wider uppercase inline-block">
          KARTU PENGAWAS RUANG UJIAN CBT
        </div>
        <div className="text-[8px] sm:text-[8.5px] font-bold text-amber-200 mt-0.5 tracking-wider uppercase truncate">
          Tahun Pelajaran {settings.academicYear || '2026/2027'} ({settings.semester || 'Semester Ganjil'})
        </div>
      </div>
    </div>

    {/* Body Pengawas */}
    <div className="p-3 sm:p-3.5 flex gap-3 sm:gap-3.5 items-start">
      <div className="w-22 shrink-0 flex flex-col items-center">
        <div className="relative group w-18 h-24 bg-slate-100 rounded-xl border-2 border-amber-500/60 overflow-hidden flex items-center justify-center p-0 shadow-2xs">
          {prc.avatarUrl ? (
            <>
              <img
                src={prc.avatarUrl}
                alt={prc.name}
                className="w-full h-full object-cover rounded-xl"
              />
              {onPhotoUpload && onPhotoRemove && (
                <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1 rounded-xl no-print">
                  <label className="cursor-pointer bg-white text-amber-800 hover:bg-amber-50 px-1.5 py-0.5 rounded text-[8.5px] font-bold shadow-xs flex items-center gap-1 transition-transform active:scale-95">
                    <Camera className="w-2.5 h-2.5" />
                    <span>Ganti</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onPhotoUpload(file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={onPhotoRemove}
                    className="bg-rose-600 text-white hover:bg-rose-700 px-1.5 py-0.5 rounded text-[8.5px] font-bold shadow-xs flex items-center gap-1 transition-transform active:scale-95"
                    title="Hapus Pasfoto"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            onPhotoUpload ? (
              <label 
                className="w-full h-full rounded-xl bg-amber-50/50 hover:bg-amber-100/70 border-2 border-dashed border-amber-400 hover:border-amber-500 cursor-pointer flex flex-col items-center justify-center text-amber-600/70 hover:text-amber-800 p-1 text-center transition-all group/box"
                title="Klik di sini untuk upload pasfoto pengawas (Sifatnya Opsional)"
              >
                <Camera className="w-4 h-4 text-amber-500 group-hover/box:text-amber-700 mb-0.5" />
                <span className="text-[7.5px] font-bold text-amber-700 uppercase leading-tight">Pas Foto<br/>3x4</span>
                <span className="text-[6.5px] font-extrabold text-amber-900 bg-amber-200/90 group-hover/box:bg-amber-300 px-1.5 py-0.5 rounded-full mt-0.5 border border-amber-400 no-print">
                  + Upload
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onPhotoUpload(file);
                  }}
                />
              </label>
            ) : (
              <div className="w-full h-full rounded-xl bg-amber-50/50 border-2 border-dashed border-amber-300 flex flex-col items-center justify-center text-amber-600/70 p-1 text-center">
                <UserIcon className="w-5 h-5 text-amber-400 mb-0.5" />
                <span className="text-[8px] font-bold text-amber-700 uppercase leading-tight">Pas Foto<br/>3x4</span>
              </div>
            )
          )}
        </div>
        <div className="mt-1.5 w-full">
          <SvgBarcode code={prc.nip && prc.nip !== '-' ? prc.nip : `PENGAWAS-${prc.id}`} />
        </div>
      </div>

      <div className="flex-1 space-y-1.5 text-xs">
        <div>
          <span className="text-[9.5px] text-amber-700 font-extrabold uppercase block">Nama Lengkap:</span>
          <span className="text-sm font-black text-slate-900 leading-tight">{prc.name}</span>
        </div>

        <div>
          <span className="text-[9.5px] text-slate-500 font-bold uppercase block">NIP / NUPTK:</span>
          <span className="font-mono font-bold text-slate-700">{prc.nip || '-'}</span>
        </div>

        <div className="pt-0.5 flex flex-wrap gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black">
            {prc.jabatan}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
            Ruang: {prc.ruang}
          </span>
        </div>

        <div className="text-[10px] text-slate-500 font-medium">
          Jadwal Tugas: <b>{prc.jadwal}</b>
        </div>

        {/* Kredensial Login Pengawas CBT (Persis Gambar Referensi User) */}
        <div className="mt-1.5 p-2 bg-emerald-50/80 rounded-xl border border-emerald-200 text-[11px]">
          <div className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wide flex items-center gap-1 mb-1">
            <Lock className="w-2.5 h-2.5" />
            <span>AKUN LOGIN CBT</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 block text-[8.5px]">Username:</span>
              <span className="font-mono font-black text-emerald-950">{prc.username || 'pengawas'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[8.5px]">Password:</span>
              <span className="font-mono font-black text-rose-700">{prc.password || 'pengawas123'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
