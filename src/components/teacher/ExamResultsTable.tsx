import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  CheckCircle, 
  Clock, 
  Lock, 
  Edit3, 
  Search, 
  Filter,
  Award,
  AlertTriangle,
  GraduationCap
} from 'lucide-react';
import { Exam, Submission } from '../../types/cbt';
import { exportExamResultsToExcel } from '../../services/excelExport';
import { generateStudentReportCardPDF } from '../../services/pdfReport';
import { EssayGradingModal } from './EssayGradingModal';
import { dbService } from '../../services/dbStore';

interface ExamResultsTableProps {
  exam: Exam;
  onRefresh: () => void;
}

export const ExamResultsTable: React.FC<ExamResultsTableProps> = ({ exam, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'GRADED' | 'SUBMITTED' | 'ONGOING' | 'DISQUALIFIED'>('ALL');
  const [selectedSubmissionForGrading, setSelectedSubmissionForGrading] = useState<Submission | null>(null);
  const [tableNotice, setTableNotice] = useState<string | null>(null);

  const submissions = dbService.getSubmissions(exam.id);

  // Filter logic
  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = 
      (s.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentNisn || '').includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate high-level summary metrics
  const completedSubs = submissions.filter(s => s.status === 'GRADED' || s.status === 'SUBMITTED');
  const avgScore = completedSubs.length > 0 
    ? (completedSubs.reduce((acc, curr) => acc + curr.score, 0) / completedSubs.length).toFixed(1)
    : '0.0';
  const passingCount = completedSubs.filter(s => s.score >= exam.passingGrade).length;
  const passRate = completedSubs.length > 0 
    ? Math.round((passingCount / completedSubs.length) * 100) 
    : 0;

  const handleExportExcel = () => {
    if (submissions.length === 0) {
      setTableNotice('Belum ada lembar pengerjaan siswa yang tersimpan untuk diekspor.');
      setTimeout(() => setTableNotice(null), 3500);
      return;
    }
    exportExamResultsToExcel(exam, submissions);
  };

  const handleDownloadPDF = (sub: Submission) => {
    generateStudentReportCardPDF(exam, sub);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {tableNotice && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs font-semibold text-amber-900 flex items-center justify-between shadow-xs">
          <span>{tableNotice}</span>
          <button onClick={() => setTableNotice(null)} className="text-amber-700 hover:text-amber-950 font-bold ml-2">×</button>
        </div>
      )}

      {/* Top Banner & Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            <span>Rekapitulasi & Buku Nilai</span>
            <span>·</span>
            <span>KKM: {exam.passingGrade}</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {exam.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mata Pelajaran: {exam.subjectName} · Rombel: {exam.className} · Total Soal: {exam.questions?.length || 0} Butir
          </p>
        </div>

        {/* Export Excel Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Rekap Nilai (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Peserta Ujian</div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
            {submissions.length} <span className="text-xs font-normal text-slate-400">siswa</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Rata-rata Nilai Kelas</div>
          <div className="text-2xl font-extrabold text-indigo-600 font-mono mt-1">
            {avgScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Tingkat Ketuntasan (≥ KKM)</div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-1">
            {passRate}% <span className="text-xs font-normal text-slate-400">({passingCount} siswa)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Perlu Koreksi Esai</div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono mt-1">
            {submissions.filter(s => s.status === 'SUBMITTED').length} <span className="text-xs font-normal text-slate-400">berkas</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama siswa atau NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 mr-1 shrink-0">Status:</span>
          {(['ALL', 'GRADED', 'SUBMITTED', 'ONGOING', 'DISQUALIFIED'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL' && 'Semua'}
              {st === 'GRADED' && 'Sudah Dinilai'}
              {st === 'SUBMITTED' && 'Perlu Koreksi'}
              {st === 'ONGOING' && 'Mengerjakan'}
              {st === 'DISQUALIFIED' && 'Diskualifikasi'}
            </button>
          ))}
        </div>
      </div>

      {/* Table of Submissions */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">No.</th>
                <th className="py-3 px-4">Identitas Siswa</th>
                <th className="py-3 px-4">Status & Waktu</th>
                <th className="py-3 px-4 text-center">Nilai PG</th>
                <th className="py-3 px-4 text-center">Nilai Esai</th>
                <th className="py-3 px-4 text-center">Total Skor</th>
                <th className="py-3 px-4 text-center">Hasil KKM</th>
                <th className="py-3 px-4 text-center">Anti-Curang</th>
                <th className="py-3 px-4 text-right">Aksi & Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Tidak ditemukan data hasil ujian yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, index) => {
                  const isPassed = sub.score >= exam.passingGrade;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400">{index + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {sub.studentName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          NISN: {sub.studentNisn} · {sub.studentClass}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {sub.status === 'GRADED' && (
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit ${
                              sub.isAutoSubmitted ? 'text-amber-800 bg-amber-50 border border-amber-200' : 'text-emerald-700 bg-emerald-50'
                            }`}>
                              <CheckCircle className="w-3 h-3" />
                              {sub.isAutoSubmitted ? 'Selesai (Waktu Habis)' : 'Selesai Dinilai'}
                            </span>
                            {sub.isAutoSubmitted && (
                              <span className="text-[10px] text-amber-700 font-medium">Auto-kumpul sistem</span>
                            )}
                          </div>
                        )}
                        {sub.status === 'SUBMITTED' && (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full w-fit">
                              <Clock className="w-3 h-3" />
                              {sub.isAutoSubmitted ? 'Selesai (Waktu Habis)' : 'Menunggu Koreksi Esai'}
                            </span>
                            {sub.isAutoSubmitted && (
                              <span className="text-[10px] text-amber-700 font-medium">Auto-kumpul sistem</span>
                            )}
                          </div>
                        )}
                        {sub.status === 'ONGOING' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 animate-spin" />
                            Sedang Berlangsung
                          </span>
                        )}
                        {sub.status === 'DISQUALIFIED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3" />
                            Diskualifikasi
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                        {sub.mcqScore}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                        {sub.status === 'SUBMITTED' ? (
                          <span className="text-amber-600 italic">Belum Dinilai</span>
                        ) : (
                          sub.essayScore
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-mono text-sm font-extrabold ${
                          isPassed ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                          {sub.score.toFixed(1)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {sub.status === 'DISQUALIFIED' ? (
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                            GAGAL
                          </span>
                        ) : isPassed ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            LULUS
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                            REMEDIAL
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {sub.violationsCount > 0 ? (
                          <span className="text-[11px] font-semibold text-rose-600 flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {sub.violationsCount}x
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-medium">0 (Aman)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Koreksi Esai */}
                          {(sub.status === 'SUBMITTED' || sub.status === 'GRADED') && (
                            <button
                              onClick={() => setSelectedSubmissionForGrading(sub)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1 transition-colors"
                              title="Buka panel koreksi esai guru"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>{sub.status === 'SUBMITTED' ? 'Koreksi Esai' : 'Edit Koreksi'}</span>
                            </button>
                          )}

                          {/* Tombol Download Rapor PDF */}
                          {(sub.status === 'GRADED' || sub.status === 'SUBMITTED') && (
                            <button
                              onClick={() => handleDownloadPDF(sub)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors"
                              title="Unduh Rapor PDF Resmi"
                            >
                              <FileText className="w-3 h-3 text-rose-600" />
                              <span>Cetak Rapor</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Essay Grading Modal */}
      {selectedSubmissionForGrading && (
        <EssayGradingModal
          exam={exam}
          submission={selectedSubmissionForGrading}
          isOpen={true}
          onClose={() => setSelectedSubmissionForGrading(null)}
          onGraded={() => {
            onRefresh();
            setSelectedSubmissionForGrading(null);
          }}
        />
      )}
    </div>
  );
};
