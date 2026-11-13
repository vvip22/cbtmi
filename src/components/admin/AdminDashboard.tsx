import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Users, 
  BookOpen, 
  Award, 
  Clock, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  FileSpreadsheet,
  Layers,
  Sparkles,
  School,
  FileUp,
  AlertTriangle,
  CheckCircle,
  X,
  Calendar,
  Download,
  CreditCard
} from 'lucide-react';
import { Exam, Subject, ClassRoom, User } from '../../types/cbt';
import { dbService } from '../../services/dbStore';
import { ExamEditorModal } from './ExamEditorModal';
import { ExamResultsTable } from '../teacher/ExamResultsTable';
import { DocxDocumentParser } from './DocxDocumentParser';
import { SemesterScheduleManager } from './SemesterScheduleManager';
import { ExamCardsManager } from './ExamCardsManager';
import { ClassScoreRecapManager } from './ClassScoreRecapManager';
import { DataMasterManager } from './DataMasterManager';

interface AdminDashboardProps {
  onOpenLiveProctoring: (examId: string) => void;
  onOpenSettings?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenLiveProctoring, onOpenSettings }) => {
  const [activeTab, setActiveTab] = useState<'exams' | 'schedules' | 'cards' | 'recap' | 'docx-parser' | 'bank' | 'master'>('exams');
  const [exams, setExams] = useState<Exam[]>(() => dbService.getExams());
  const [subjects] = useState<Subject[]>(() => dbService.getSubjects());
  const [classes] = useState<ClassRoom[]>(() => dbService.getClasses());
  const [users] = useState<User[]>(() => dbService.getUsers());
  const settings = dbService.getSchoolSettings();

  // Modal states
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [viewingResultsExam, setViewingResultsExam] = useState<Exam | null>(null);

  // In-app Delete Confirmation Dialog states
  const [examToDelete, setExamToDelete] = useState<{ id: string; title: string; questionCount: number; subjectName: string; className: string } | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<{ examId: string; questionId: string; questionNum: number; text: string; examTitle: string } | null>(null);
  const [toastNotification, setToastNotification] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const refreshData = () => {
    setExams([...dbService.getExams()]);
  };

  const handleCreateNewExam = () => {
    setEditingExam(null);
    setIsExamModalOpen(true);
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setIsExamModalOpen(true);
  };

  const handleOpenDeleteExamModal = (exam: Exam) => {
    setExamToDelete({
      id: exam.id,
      title: exam.title,
      questionCount: exam.questions?.length || 0,
      subjectName: exam.subjectName || 'Mata Pelajaran',
      className: exam.className || 'Umum'
    });
  };

  const handleConfirmDeleteExam = () => {
    if (!examToDelete) return;
    const deletedTitle = examToDelete.title;
    dbService.deleteExam(examToDelete.id);
    refreshData();
    setExamToDelete(null);
    setToastNotification({
      type: 'success',
      text: `Paket soal & ujian "${deletedTitle}" telah berhasil dihapus secara permanen.`
    });
    setTimeout(() => setToastNotification(null), 4000);
  };

  const handleOpenDeleteQuestionModal = (exam: Exam, questionId: string, questionNum: number, text: string) => {
    setQuestionToDelete({
      examId: exam.id,
      questionId,
      questionNum,
      text: text.slice(0, 120),
      examTitle: exam.title
    });
  };

  const handleConfirmDeleteQuestion = () => {
    if (!questionToDelete) return;
    const targetExam = exams.find(e => e.id === questionToDelete.examId);
    if (targetExam) {
      const updatedQuestions = (targetExam.questions || []).filter(q => q.id !== questionToDelete.questionId);
      const reindexed = updatedQuestions.map((q, idx) => ({ ...q, orderIndex: idx + 1 }));
      const updatedExam = { ...targetExam, questions: reindexed };
      dbService.saveExam(updatedExam);
      refreshData();
      setToastNotification({
        type: 'success',
        text: `Butir Soal No. ${questionToDelete.questionNum} berhasil dihapus dari paket "${targetExam.title}".`
      });
      setTimeout(() => setToastNotification(null), 4000);
    }
    setQuestionToDelete(null);
  };

  // Metrics
  const totalQuestionsCount = exams.reduce((acc, e) => acc + (e.questions?.length || 0), 0);
  const allSubmissions = dbService.getSubmissions();
  const completedSubmissions = allSubmissions.filter(s => s.status === 'GRADED' || s.status === 'SUBMITTED');

  // If viewing a specific exam's results
  if (viewingResultsExam) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setViewingResultsExam(null)}
          className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1.5 py-1"
        >
          ← Kembali ke Ringkasan Ujian
        </button>
        <ExamResultsTable exam={viewingResultsExam} onRefresh={refreshData} />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* Toast Notification */}
      {toastNotification && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs transition-all animate-in fade-in ${
          toastNotification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' 
            : 'bg-indigo-50 text-indigo-900 border border-indigo-300'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastNotification.text}</span>
          </div>
          <button 
            type="button"
            onClick={() => setToastNotification(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Welcome & KPI Header - Padat & Elegan */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            {settings.logoUrl && (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-0.5 overflow-hidden shrink-0">
                <img src={settings.logoUrl} alt={settings.schoolName} className="w-full h-full object-contain" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="font-bold text-emerald-800 uppercase tracking-wide">
                  Semester {settings.semester} {settings.academicYear}
                </span>
                <span>·</span>
                <span>{settings.schoolName}</span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                Pusat Kendali Ujian Online
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('recap')}
              className="px-2.5 sm:px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Unduh Rekap Nilai Ujian per Kelas (Format Excel 1 Lembar Cetak)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
              <span>Rekap Nilai (.xlsx)</span>
            </button>

            <button
              onClick={() => setActiveTab('docx-parser')}
              className="px-2.5 sm:px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Unggah dan Ekstrak Soal dari Dokumen Word (.docx)"
            >
              <FileUp className="w-3.5 h-3.5 text-teal-700" />
              <span>Parser Word (.docx)</span>
            </button>

            <button
              onClick={handleCreateNewExam}
              className="px-3 sm:px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Ujian</span>
            </button>
          </div>
        </div>

        {/* KPI Metric Strips - Kompak & Terpadu */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 mt-2.5 pt-2.5 border-t border-slate-100">
          {/* Card 1: Jadwal Ujian */}
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-50/90 via-indigo-50/40 to-blue-50/50 rounded-xl border border-indigo-200/90 shadow-2xs hover:shadow-xs transition-all">
            <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
              <span className="w-4.5 h-4.5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText className="w-3 h-3" />
              </span>
              <span>Jadwal Ujian</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-indigo-700 font-mono mt-0.5 flex items-baseline gap-1">
              {exams.length} <span className="text-[10px] font-semibold text-indigo-400">paket</span>
            </div>
          </div>

          {/* Card 2: Bank Soal */}
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-teal-50/50 rounded-xl border border-emerald-200/90 shadow-2xs hover:shadow-xs transition-all">
            <div className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="w-4.5 h-4.5 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-3 h-3" />
              </span>
              <span>Bank Soal</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono mt-0.5 flex items-baseline gap-1">
              {totalQuestionsCount} <span className="text-[10px] font-semibold text-emerald-500">butir</span>
            </div>
          </div>

          {/* Card 3: Siswa Terdaftar */}
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-sky-50/90 via-sky-50/40 to-cyan-50/50 rounded-xl border border-sky-200/90 shadow-2xs hover:shadow-xs transition-all">
            <div className="text-[11px] font-bold text-sky-900 flex items-center gap-1.5">
              <span className="w-4.5 h-4.5 rounded-md bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <Users className="w-3 h-3" />
              </span>
              <span>Siswa Terdaftar</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-sky-700 font-mono mt-0.5 flex items-baseline gap-1">
              {users.filter(u => u.role === 'PESERTA' || u.role === 'STUDENT').length} <span className="text-[10px] font-semibold text-sky-400">siswa</span>
            </div>
          </div>

          {/* Card 4: Terkumpul */}
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-orange-50/50 rounded-xl border border-amber-200/90 shadow-2xs hover:shadow-xs transition-all">
            <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
              <span className="w-4.5 h-4.5 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Award className="w-3 h-3" />
              </span>
              <span>Terkumpul</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-700 font-mono mt-0.5 flex items-baseline gap-1">
              {completedSubmissions.length} <span className="text-[10px] font-semibold text-amber-500">lembar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigasi - Rapi & Kompak */}
      <div className="flex items-center gap-1 sm:gap-1.5 border-b border-slate-200 overflow-x-auto text-xs font-semibold py-0.5">
        {/* Tab 1: Paket Ujian (Indigo) */}
        <button
          onClick={() => setActiveTab('exams')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'exams'
              ? 'border-indigo-600 text-indigo-950 bg-indigo-50/80 font-bold shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/40'
          }`}
        >
          <Layers className={`w-3.5 h-3.5 ${activeTab === 'exams' ? 'text-indigo-600' : 'text-slate-500'}`} />
          <span>Paket Ujian</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'exams' ? 'bg-indigo-200/80 text-indigo-900' : 'bg-slate-200/70 text-slate-600'
          }`}>
            {exams.length}
          </span>
        </button>

        {/* Tab 2: Jadwal Semester (Teal) */}
        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'schedules'
              ? 'border-teal-600 text-teal-950 bg-teal-50/80 font-bold shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-teal-700 hover:bg-teal-50/40'
          }`}
        >
          <Calendar className={`w-3.5 h-3.5 ${activeTab === 'schedules' ? 'text-teal-600' : 'text-slate-500'}`} />
          <span>Jadwal Semester</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'schedules' ? 'bg-teal-200/80 text-teal-900' : 'bg-slate-200/70 text-slate-600'
          }`}>
            {dbService.getSchedules().length}
          </span>
        </button>

        {/* Tab 3: Kartu Peserta & Pengawas (Emerald) */}
        <button
          onClick={() => setActiveTab('cards')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'cards'
              ? 'border-emerald-600 text-emerald-950 bg-emerald-50/90 font-bold shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/40'
          }`}
        >
          <CreditCard className={`w-3.5 h-3.5 ${activeTab === 'cards' ? 'text-emerald-600' : 'text-slate-500'}`} />
          <span>Kartu Peserta & Pengawas</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'cards' ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-200/70 text-slate-600'
          }`}>
            CBT
          </span>
        </button>

        {/* Tab 4: Rekap Nilai per Kelas (Amber) */}
        <button
          onClick={() => setActiveTab('recap')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'recap'
              ? 'border-amber-600 text-amber-950 bg-amber-50/90 font-bold shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-amber-700 hover:bg-amber-50/40'
          }`}
        >
          <FileSpreadsheet className={`w-3.5 h-3.5 ${activeTab === 'recap' ? 'text-amber-600' : 'text-slate-500'}`} />
          <span>Rekap Nilai</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'recap' ? 'bg-amber-200/80 text-amber-900' : 'bg-slate-200/70 text-slate-600'
          }`}>
            .xlsx
          </span>
        </button>

        {/* Tab 5: Parser Word (Purple) */}
        <button
          onClick={() => setActiveTab('docx-parser')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'docx-parser'
              ? 'border-purple-600 text-purple-950 bg-purple-50/80 font-bold shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-purple-700 hover:bg-purple-50/40'
          }`}
        >
          <FileUp className={`w-3.5 h-3.5 ${activeTab === 'docx-parser' ? 'text-purple-600' : 'text-slate-500'}`} />
          <span>Parser Word</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'docx-parser' ? 'bg-purple-200/80 text-purple-900' : 'bg-slate-200/70 text-slate-600'
          }`}>
            DOCX
          </span>
        </button>

        {/* Tab 5: Bank Soal (Amber) */}
        <button
          onClick={() => setActiveTab('bank')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'bank'
              ? 'border-amber-600 text-amber-950 bg-amber-50/80 font-bold shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-amber-700 hover:bg-amber-50/40'
          }`}
        >
          <BookOpen className={`w-3.5 h-3.5 ${activeTab === 'bank' ? 'text-amber-600' : 'text-slate-500'}`} />
          <span>Bank Soal</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'bank' ? 'bg-amber-200/80 text-amber-900' : 'bg-slate-200/70 text-slate-600'
          }`}>
            {totalQuestionsCount}
          </span>
        </button>

        {/* Tab 6: Data Master (Rose) */}
        <button
          onClick={() => setActiveTab('master')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'master'
              ? 'border-rose-600 text-rose-950 bg-rose-50/80 font-bold shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-rose-700 hover:bg-rose-50/40'
          }`}
        >
          <School className={`w-3.5 h-3.5 ${activeTab === 'master' ? 'text-rose-600' : 'text-slate-500'}`} />
          <span>Data Master</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'master' ? 'bg-rose-200/80 text-rose-900' : 'bg-slate-200/70 text-slate-600'
          }`}>
            Madrasah
          </span>
        </button>
      </div>

      {/* Tab 1: Exams List */}
      {activeTab === 'exams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          {exams.map((exam) => {
            const examSubs = allSubmissions.filter(s => s.examId === exam.id);
            const questionCount = exam.questions?.length || 0;
            const mcqCount = (exam.questions || []).filter(q => q.type === 'MCQ').length;
            const essayCount = (exam.questions || []).filter(q => q.type === 'ESSAY').length;
            const cleanClassName = (exam.className || '').replace(/^Kelas\s+/i, '');

            return (
              <div 
                key={exam.id}
                className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-2.5"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <span className="font-semibold text-emerald-800">{exam.subjectName}</span>
                        <span>·</span>
                        <span>Kelas {cleanClassName}</span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                        {exam.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEditExam(exam)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Edit soal dan konfigurasi"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteExamModal(exam)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Hapus paket ujian"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {exam.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {exam.description}
                    </p>
                  )}

                  {/* Clean Specs Row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 px-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                    <span className="flex items-center gap-1 font-mono font-semibold text-slate-800">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {exam.duration}m
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>KKM: <strong className="text-emerald-700 font-mono">{exam.passingGrade.toFixed(0)}</strong></span>
                    <span className="text-slate-300">·</span>
                    <span>Soal: <strong className="text-slate-800">{questionCount}</strong> ({mcqCount} PG, {essayCount} Esai)</span>
                    <span className="text-slate-300">·</span>
                    <span>Toleransi: <strong className="text-rose-600">{exam.maxViolations}x</strong></span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onOpenLiveProctoring(exam.id)}
                    className="py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Live Monitoring</span>
                  </button>

                  <button
                    onClick={() => setViewingResultsExam(exam)}
                    className="py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Rekap Nilai ({examSubs.length})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Bank Soal */}
      {activeTab === 'bank' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Katalog Bank Soal Terintegrasi</h3>
              <p className="text-xs text-slate-500">Kumpulan bank soal terstandar berdasarkan mata pelajaran dan kompetensi dasar.</p>
            </div>
            <button
              onClick={() => {
                if (exams[0]) handleEditExam(exams[0]);
              }}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Kelola Butir Soal
            </button>
          </div>

          <div className="space-y-4">
            {exams.map(e => (
              <div key={e.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div>
                    <div className="font-bold text-xs text-slate-900">
                      Paket: {e.title} ({e.questions?.length || 0} Soal)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Kelas {e.className}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                      {e.subjectName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteExamModal(e)}
                      className="px-2.5 py-1 text-[11px] text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition-colors font-bold"
                      title="Hapus seluruh paket soal ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Paket Ujian</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {(e.questions || []).map((q, idx) => (
                    <div key={q.id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>No. {idx + 1}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                            q.type === 'MCQ' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'
                          }`}>
                            {q.type}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-mono text-[11px]">Bobot: {q.points} Poin</span>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteQuestionModal(e, q.id, idx + 1, q.text)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus butir soal yang tidak digunakan ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-700 font-medium whitespace-pre-line">{q.text}</p>
                      {q.type === 'MCQ' && (
                        <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                          Kunci Jawaban: Pilihan {q.correctAnswer}
                        </div>
                      )}
                      {q.type === 'ESSAY' && (
                        <div className="text-[11px] text-amber-800 font-mono mt-1">
                          Rubrik: {q.correctAnswer?.slice(0, 80)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Data Master Madrasah & Manajemen Sesi Login */}
      {activeTab === 'master' && (
        <DataMasterManager onRefreshData={refreshData} />
      )}
      
      {/* Tab: Jadwal Ujian Semester */}
      {activeTab === 'schedules' && (
        <SemesterScheduleManager
          onOpenLiveProctoring={onOpenLiveProctoring}
          onNavigateToExams={() => setActiveTab('exams')}
        />
      )}

      {/* Tab: Kartu Peserta & Pengawas Ujian */}
      {activeTab === 'cards' && (
        <ExamCardsManager />
      )}

      {/* Tab: Rekapitulasi Nilai Ujian per Kelas (Format Excel 1 Lembar Cetak) */}
      {activeTab === 'recap' && (
        <ClassScoreRecapManager />
      )}

      {/* Tab: Parser Dokumen Word (.docx) */}
      {activeTab === 'docx-parser' && (
        <DocxDocumentParser
          onExamCreated={() => {
            refreshData();
            setActiveTab('exams');
          }}
          onRefreshData={refreshData}
        />
      )}

      {/* Exam & Question Editor Modal */}
      {isExamModalOpen && (
        <ExamEditorModal
          examToEdit={editingExam}
          subjects={subjects}
          classes={classes}
          isOpen={true}
          onClose={() => setIsExamModalOpen(false)}
          onSaved={() => {
            refreshData();
            setIsExamModalOpen(false);
          }}
        />
      )}

      {/* MODAL KONFIRMASI HAPUS PAKET SOAL / UJIAN */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Hapus Paket Soal & Ujian?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apakah Anda yakin ingin menghapus paket soal/ujian ini karena sudah tidak digunakan lagi?
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-slate-900 text-sm">{examToDelete.title}</div>
              <div className="text-slate-500 text-[11px]">
                {examToDelete.subjectName} · Kelas {examToDelete.className}
              </div>
              <div className="text-emerald-700 font-bold text-[11px] flex items-center gap-1 mt-1">
                <span>Memuat {examToDelete.questionCount} Butir Soal</span>
              </div>
            </div>

            <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl font-medium leading-relaxed">
              ⚠️ Perhatian: Tindakan ini akan menghapus paket ujian dan semua butir soal di dalamnya secara permanen dari server CBT MIS NW Korleko.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExamToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExam}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS BUTIR SOAL INDIVIDUAL */}
      {questionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Hapus Butir Soal No. {questionToDelete.questionNum}?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Soal ini akan dihapus dari paket ujian <strong>{questionToDelete.examTitle}</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 line-clamp-3 italic">
              "{questionToDelete.text}..."
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuestionToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteQuestion}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Soal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
