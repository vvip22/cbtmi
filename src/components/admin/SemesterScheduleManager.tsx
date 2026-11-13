import React, { useState, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  Printer, 
  CheckCircle, 
  Layers, 
  School, 
  UserCheck, 
  FileText, 
  X, 
  AlertTriangle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  FileSpreadsheet,
  Upload,
  Download
} from 'lucide-react';
import { ExamSchedule, Exam, ExamScheduleStatus } from '../../types/cbt';
import { dbService, DEFAULT_SCHEDULES } from '../../services/dbStore';
import { 
  downloadScheduleExcelTemplate, 
  exportActiveSchedulesToExcel, 
  parseScheduleExcelFile 
} from '../../services/scheduleExcelService';
import { generateSemesterSchedulePDF } from '../../services/schedulePdfService';
import { parseScheduleDateTime } from '../../services/scheduleTimingService';

interface SemesterScheduleManagerProps {
  onOpenLiveProctoring?: (examId: string) => void;
  onNavigateToExams?: () => void;
}

export const SemesterScheduleManager: React.FC<SemesterScheduleManagerProps> = ({
  onOpenLiveProctoring,
  onNavigateToExams
}) => {
  const syncSchedulesWithClock = (list: ExamSchedule[]): ExamSchedule[] => {
    const now = new Date();
    let hasChanged = false;
    const updated = list.map(item => {
      if (!item.date || !item.startTime || !item.endTime) return item;
      const start = parseScheduleDateTime(item.date, item.startTime);
      const end = parseScheduleDateTime(item.date, item.endTime);
      const nowMs = now.getTime();
      let autoStatus: ExamScheduleStatus = item.status;
      if (nowMs > end.getTime()) {
        autoStatus = 'COMPLETED';
      } else if (nowMs >= start.getTime()) {
        autoStatus = 'ONGOING';
      } else {
        autoStatus = 'UPCOMING';
      }
      if (autoStatus !== item.status) {
        hasChanged = true;
        return { ...item, status: autoStatus };
      }
      return item;
    });

    if (hasChanged) {
      updated.forEach(u => dbService.saveSchedule(u));
    }
    return updated;
  };

  const [schedules, setSchedules] = useState<ExamSchedule[]>(() => {
    const raw = dbService.getSchedules();
    return syncSchedulesWithClock(raw);
  });
  const [exams] = useState<Exam[]>(() => dbService.getExams());
  const settings = dbService.getSchoolSettings();

  // Filter states
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExamSchedule | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<ExamSchedule | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<Partial<ExamSchedule>>({
    academicYear: settings.academicYear || '2026/2027',
    semester: (settings.semester === 'Genap' ? 'Genap' : 'Ganjil') as 'Ganjil' | 'Genap',
    examType: 'Asesmen Sumatif Akhir Semester (ASAS)',
    dayName: 'Senin',
    date: new Date().toISOString().split('T')[0],
    session: 'Sesi 1 (07.30 - 09.00)',
    startTime: '07:30',
    endTime: '09:00',
    subjectName: 'Matematika & Penalaran Numerasi',
    className: 'Kelas VI A',
    room: 'Lab Komputer CBT Madrasah',
    proctorName: settings.proktorName || 'Muhammad Nasir, S.Kom',
    status: 'UPCOMING',
    notes: ''
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const reloadSchedules = () => {
    setSchedules(syncSchedulesWithClock(dbService.getSchedules()));
  };

  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setFormData({
      academicYear: settings.academicYear || '2026/2027',
      semester: (settings.semester === 'Genap' ? 'Genap' : 'Ganjil') as 'Ganjil' | 'Genap',
      examType: 'Asesmen Sumatif Akhir Semester (ASAS)',
      dayName: 'Senin',
      date: new Date().toISOString().split('T')[0],
      session: 'Sesi 1 (07.30 - 09.00)',
      startTime: '07:30',
      endTime: '09:00',
      subjectName: 'Matematika & Penalaran Numerasi',
      className: 'Kelas VI A',
      room: 'Lab Komputer CBT Madrasah',
      proctorName: settings.proktorName || 'Muhammad Nasir, S.Kom',
      status: 'UPCOMING',
      notes: ''
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (item: ExamSchedule) => {
    setEditingSchedule(item);
    setFormData({ ...item });
    setIsFormModalOpen(true);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectName || !formData.date || !formData.startTime || !formData.endTime) {
      showToast('Harap lengkapi mata pelajaran, tanggal, dan jam ujian.');
      return;
    }

    const scheduleToSave: ExamSchedule = {
      id: editingSchedule ? editingSchedule.id : `sch-${Date.now()}`,
      academicYear: formData.academicYear || '2026/2027',
      semester: formData.semester || 'Ganjil',
      examType: formData.examType || 'Asesmen Sumatif Akhir Semester (ASAS)',
      dayName: formData.dayName || 'Senin',
      date: formData.date || new Date().toISOString().split('T')[0],
      session: formData.session || 'Sesi 1 (07.30 - 09.00)',
      startTime: formData.startTime || '07:30',
      endTime: formData.endTime || '09:00',
      subjectName: formData.subjectName || 'Mata Pelajaran',
      className: formData.className || 'Kelas VI A',
      room: formData.room || 'Lab Komputer CBT Madrasah',
      proctorName: formData.proctorName || settings.proktorName || 'Pengawas Ruang',
      examId: formData.examId || undefined,
      status: (formData.status as ExamScheduleStatus) || 'UPCOMING',
      notes: formData.notes || ''
    };

    dbService.saveSchedule(scheduleToSave);
    reloadSchedules();
    setIsFormModalOpen(false);
    showToast(editingSchedule ? 'Jadwal berhasil diperbarui!' : 'Jadwal ujian baru berhasil ditambahkan!');
  };

  const handleConfirmDelete = () => {
    if (!scheduleToDelete) return;
    const subj = scheduleToDelete.subjectName;
    dbService.deleteSchedule(scheduleToDelete.id);
    reloadSchedules();
    setScheduleToDelete(null);
    showToast(`Jadwal ujian "${subj}" berhasil dihapus.`);
  };

  const handleQuickStatusChange = (schedule: ExamSchedule, newStatus: ExamScheduleStatus) => {
    const updated = { ...schedule, status: newStatus };
    dbService.saveSchedule(updated);
    reloadSchedules();
    showToast(`Status ujian ${schedule.subjectName} diubah menjadi: ${newStatus}`);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDownloadTemplate = () => {
    downloadScheduleExcelTemplate(settings.schoolName);
    showToast('Template Excel Jadwal Semester berhasil diunduh!');
  };

  const handleExportExcel = () => {
    exportActiveSchedulesToExcel(schedules, settings.schoolName);
    showToast('Seluruh jadwal semester berhasil diekspor ke file Excel!');
  };

  const handleImportScheduleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await parseScheduleExcelFile(file);
      if (!imported || imported.length === 0) {
        showToast('Tidak ada data jadwal yang valid dalam berkas Excel.');
        return;
      }

      imported.forEach(item => {
        dbService.saveSchedule(item);
      });

      reloadSchedules();
      showToast(`Sukses! ${imported.length} jadwal asesmen semester berhasil diimpor dari Excel.`);
    } catch (err: any) {
      showToast(`Gagal membaca berkas Excel: ${err?.message || 'Format tidak sesuai'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetToDefault = () => {
    dbService.resetSchedulesToDefault();
    reloadSchedules();
    showToast('Jadwal semester telah direset ke template standar MIS NW Korleko.');
  };

  const handlePrintNow = () => {
    try {
      generateSemesterSchedulePDF(schedules, settings);
      showToast('Dokumen PDF Jadwal resmi berhasil diunduh dan siap dicetak!');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      showToast('Gagal memproses PDF, membuka dialog cetak peramban...');
    }

    try {
      window.print();
    } catch (e) {
      // Ignore if iframe sandbox suppresses window.print
    }
  };

  // Filtered schedules
  const filteredSchedules = schedules.filter(sch => {
    if (selectedDay !== 'ALL' && sch.dayName !== selectedDay) return false;
    if (selectedClass !== 'ALL' && sch.className !== selectedClass) return false;
    if (selectedStatus !== 'ALL' && sch.status !== selectedStatus) return false;
    return true;
  });

  // Extract unique days and classes for filters
  const uniqueDays = Array.from(new Set(schedules.map(s => s.dayName)));
  const uniqueClasses = Array.from(new Set(schedules.map(s => s.className)));

  // Group schedules by date/day
  const groupedSchedules = filteredSchedules.reduce((acc, curr) => {
    const key = `${curr.dayName}, ${curr.date}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {} as Record<string, ExamSchedule[]>);

  // Counters
  const totalCount = schedules.length;
  const ongoingCount = schedules.filter(s => s.status === 'ONGOING').length;
  const completedCount = schedules.filter(s => s.status === 'COMPLETED').length;
  const upcomingCount = schedules.filter(s => s.status === 'UPCOMING').length;

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Toast */}
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

      {/* Top Banner & Action Controls */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-4.5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="font-bold text-emerald-800 uppercase tracking-wide">
                Jadwal Ujian
              </span>
              <span>·</span>
              <span>T.P. {settings.academicYear} ({settings.semester})</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              Jadwal Asesmen Semester
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportScheduleExcel} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />

            <button
              onClick={handleDownloadTemplate}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Unduh Berkas Template Excel Resmi (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Template Excel</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Unggah dan impor jadwal ujian semester dari file Excel"
            >
              <Upload className="w-3.5 h-3.5 text-teal-700" />
              <span>Import Excel</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Ekspor daftar jadwal aktif ke Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Ekspor</span>
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Cetak Jadwal Resmi Format Kop Madrasah"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Cetak (PDF)</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Jadwal</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-100">
          <div className="p-2 sm:p-2.5 bg-slate-50/80 rounded-lg border border-slate-200/80">
            <span className="text-[11px] text-slate-500 font-medium">Total Sesi</span>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 font-mono mt-0.5">{totalCount} Sesi</div>
          </div>
          <div className="p-2 sm:p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200/60">
            <span className="text-[11px] text-emerald-800 font-medium">Berlangsung</span>
            <div className="text-base sm:text-lg font-extrabold text-emerald-700 font-mono mt-0.5">{ongoingCount} Sesi</div>
          </div>
          <div className="p-2 sm:p-2.5 bg-sky-50/70 rounded-lg border border-sky-200/60">
            <span className="text-[11px] text-sky-800 font-medium">Terjadwal</span>
            <div className="text-base sm:text-lg font-extrabold text-sky-700 font-mono mt-0.5">{upcomingCount} Sesi</div>
          </div>
          <div className="p-2 sm:p-2.5 bg-slate-100/70 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium">Selesai</span>
            <div className="text-base sm:text-lg font-extrabold text-slate-600 font-mono mt-0.5">{completedCount} Sesi</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter:</span>
          </div>

          {/* Day Filter */}
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Hari</option>
            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Kelas</option>
            {uniqueClasses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="UPCOMING">Akan Datang</option>
            <option value="ONGOING">Sedang Berlangsung</option>
            <option value="COMPLETED">Selesai</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {schedules.length === 0 && (
            <button
              onClick={handleResetToDefault}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline"
            >
              Muat Contoh Jadwal Semester (MIS NW Korleko)
            </button>
          )}
          <span className="text-xs text-slate-500 font-medium">
            Menampilkan <b>{filteredSchedules.length}</b> dari {totalCount} sesi
          </span>
        </div>
      </div>

      {/* Schedules List by Grouped Date */}
      {Object.keys(groupedSchedules).length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">Tidak ada jadwal yang sesuai filter</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Silakan ubah filter pencarian atau buat jadwal ujian semester baru untuk madrasah.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl"
          >
            + Buat Jadwal Baru
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedSchedules).map(([dateLabel, items]) => (
            <div key={dateLabel} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
                    {dateLabel}
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {items.length} Sesi Ujian
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {items.map((item) => {
                  const linkedExam = exams.find(e => e.id === item.examId);
                  return (
                    <div 
                      key={item.id} 
                      className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {item.className}
                          </span>
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {item.session}
                          </span>
                          <span className="text-xs text-slate-500 font-mono font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {item.startTime} - {item.endTime} WITA
                          </span>

                          {/* Status Badge */}
                          {item.status === 'ONGOING' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white animate-pulse">
                              SEDANG BERLANGSUNG
                            </span>
                          )}
                          {item.status === 'UPCOMING' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                              AKAN DATANG
                            </span>
                          )}
                          {item.status === 'COMPLETED' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                              SELESAI
                            </span>
                          )}
                        </div>

                        <div className="text-base font-extrabold text-slate-900">
                          {item.subjectName}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <School className="w-3.5 h-3.5 text-slate-400" />
                            <b>Ruang:</b> {item.room}
                          </span>
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <b>Proktor:</b> {item.proctorName}
                          </span>
                          {linkedExam && (
                            <span className="flex items-center gap-1 text-emerald-700 font-medium">
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                              Terkoneksi ke Paket Soal: <b>{linkedExam.title}</b> ({linkedExam.questions?.length || 0} soal)
                            </span>
                          )}
                        </div>

                        {item.notes && (
                          <div className="text-[11px] text-slate-500 italic bg-amber-50/60 p-2 rounded-lg border border-amber-200/50 mt-1">
                            Catatan: {item.notes}
                          </div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        {/* Quick Status toggle */}
                        <select
                          value={item.status}
                          onChange={(e) => handleQuickStatusChange(item, e.target.value as ExamScheduleStatus)}
                          className="text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="UPCOMING">Akan Datang</option>
                          <option value="ONGOING">Sedang Ujian</option>
                          <option value="COMPLETED">Selesai</option>
                        </select>

                        {linkedExam && onOpenLiveProctoring && (
                          <button
                            onClick={() => onOpenLiveProctoring(linkedExam.id)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                            title="Buka Ruang Pengawasan Langsung"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Pantau</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Jadwal Ini"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setScheduleToDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Jadwal Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Tambah / Edit Jadwal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {editingSchedule ? 'Ubah Jadwal Ujian Semester' : 'Tambah Jadwal Ujian Semester Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Pelajaran</label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="2026/2027"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value as 'Ganjil' | 'Genap' })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Ganjil">1 (Ganjil)</option>
                    <option value="Genap">2 (Genap)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Asesmen</label>
                <input
                  type="text"
                  value={formData.examType}
                  onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Asesmen Sumatif Akhir Semester (ASAS)"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hari</label>
                  <select
                    value={formData.dayName}
                    onChange={(e) => setFormData({ ...formData, dayName: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sesi</label>
                  <input
                    type="text"
                    value={formData.session}
                    onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Sesi 1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  value={formData.subjectName}
                  onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: Matematika & Penalaran Numerasi, Bahasa Arab, Fikih"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas Sasaran</label>
                  <input
                    type="text"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Kelas VI A"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ruangan / Lab</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Lab Komputer CBT Madrasah"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Proktor / Pengawas Ruang</label>
                <input
                  type="text"
                  value={formData.proctorName}
                  onChange={(e) => setFormData({ ...formData, proctorName: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Nama Pengawas"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hubungkan dengan Paket Soal CBT (Opsional)
                </label>
                <select
                  value={formData.examId || ''}
                  onChange={(e) => setFormData({ ...formData, examId: e.target.value || undefined })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50"
                >
                  <option value="">-- Tidak ditautkan (Jadwal Manual) --</option>
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} ({ex.questions?.length || 0} Soal - {ex.className || 'Semua Kelas'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Sesi</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ExamScheduleStatus })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="UPCOMING">Akan Datang (Terjadwal)</option>
                  <option value="ONGOING">Sedang Berlangsung (Ujian Aktif)</option>
                  <option value="COMPLETED">Telah Selesai</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Instruksi khusus, membawa kartu peserta, dll."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition-colors"
                >
                  {editingSchedule ? 'Simpan Perubahan' : 'Terbitkan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hapus Jadwal (In-App Dialog, no window.confirm) */}
      {scheduleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-slate-900">
              Hapus Jadwal Ujian?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus jadwal ujian untuk mata pelajaran:
              <br />
              <b className="text-slate-900">{scheduleToDelete.subjectName}</b> ({scheduleToDelete.className} - {scheduleToDelete.dayName}, {scheduleToDelete.date})?
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setScheduleToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors"
              >
                Ya, Hapus Jadwal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tampilan Cetak / Print Resmi (Kop Madrasah MIS NW Korleko) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Pratinjau Cetak Jadwal Ujian Semester MIS NW Korleko
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintNow}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                  title="Cetak dan unduh berkas PDF resmi jadwal ujian semester"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Printable Area */}
            <div id="printable-schedule-area" className="p-8 space-y-6 text-slate-900 font-sans print:p-0">
              {/* Kop Surat Madrasah */}
              <div className="border-b-2 border-slate-900 pb-4 relative flex items-center gap-4">
                {settings.logoUrl && (
                  <div className="w-16 h-16 shrink-0 flex items-center justify-center p-1">
                    <img src={settings.logoUrl} alt="Logo Madrasah" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="flex-1 text-center">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
                    {settings.foundationName}
                  </div>
                  <div className="text-xl font-black uppercase tracking-tight text-slate-900 mt-0.5">
                    {settings.schoolName}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    NSM: {settings.nsm} &nbsp;|&nbsp; NPSN: {settings.npsn}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Alamat: {settings.address}, {settings.city}, {settings.province}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-1">
                <h4 className="text-base font-black uppercase tracking-wide underline">
                  JADWAL ASESMEN SUMATIF AKHIR SEMESTER (ASAS)
                </h4>
                <p className="text-xs font-bold text-slate-700">
                  TAHUN PELAJARAN {settings.academicYear} &nbsp;·&nbsp; SEMESTER {settings.semester.toUpperCase()}
                </p>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-black border-b border-slate-800">
                      <th className="p-2.5 border-r border-slate-800 text-center w-10">NO</th>
                      <th className="p-2.5 border-r border-slate-800 w-28">HARI / TANGGAL</th>
                      <th className="p-2.5 border-r border-slate-800 w-24">WAKTU (WITA)</th>
                      <th className="p-2.5 border-r border-slate-800 w-20">SESI</th>
                      <th className="p-2.5 border-r border-slate-800">MATA PELAJARAN</th>
                      <th className="p-2.5 border-r border-slate-800 w-24">KELAS</th>
                      <th className="p-2.5 border-r border-slate-800 w-32">RUANG</th>
                      <th className="p-2.5">PENGAWAS / PROKTOR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {schedules.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-2.5 border-r border-slate-800 text-center font-bold">{idx + 1}</td>
                        <td className="p-2.5 border-r border-slate-800 font-medium">
                          {s.dayName},<br /><span className="text-[11px] text-slate-600">{s.date}</span>
                        </td>
                        <td className="p-2.5 border-r border-slate-800 font-mono text-[11px]">
                          {s.startTime} - {s.endTime}
                        </td>
                        <td className="p-2.5 border-r border-slate-800 font-medium">{s.session}</td>
                        <td className="p-2.5 border-r border-slate-800 font-bold">{s.subjectName}</td>
                        <td className="p-2.5 border-r border-slate-800">{s.className}</td>
                        <td className="p-2.5 border-r border-slate-800 text-[11px]">{s.room}</td>
                        <td className="p-2.5 text-[11px] font-medium">{s.proctorName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Catatan Pelaksanaan */}
              <div className="text-[11px] text-slate-600 space-y-1">
                <div className="font-bold">Ketentuan & Tata Tertib:</div>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Peserta ujian wajib hadir di madrasah 15 menit sebelum sesi dimulai.</li>
                  <li>Ujian berbasis komputer (CBT) dilaksanakan dengan pengawasan ketat dan sistem anti-curang layar penuh.</li>
                  <li>Peserta dilarang membuka tab lain atau meminimize peramban selama ujian berlangsung.</li>
                </ol>
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 pt-8 text-center text-xs">
                <div>
                  <div>Mengetahui,</div>
                  <div className="font-bold">Kepala Madrasah</div>
                  <div className="h-16"></div>
                  <div className="font-extrabold underline">{settings.headmasterName}</div>
                  <div className="text-[11px] text-slate-500">NIP. {settings.headmasterNip}</div>
                </div>

                <div>
                  <div>Korleko, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div className="font-bold">Ketua Panitia / Proktor CBT</div>
                  <div className="h-16"></div>
                  <div className="font-extrabold underline">{settings.proktorName}</div>
                  <div className="text-[11px] text-slate-500">NIP. 19890814 201402 1 003</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
