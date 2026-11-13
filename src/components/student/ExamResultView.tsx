import React from 'react';
import { CheckCircle, Award, FileText, ArrowLeft, ShieldCheck, AlertTriangle, Lock } from 'lucide-react';
import { Exam, Submission } from '../../types/cbt';
import { generateStudentReportCardPDF } from '../../services/pdfReport';
import { dbService } from '../../services/dbStore';

interface ExamResultViewProps {
  exam: Exam;
  submission: Submission;
  onBackToPortal: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  exam,
  submission,
  onBackToPortal
}) => {
  const settings = dbService.getSchoolSettings();
  const canViewResults = settings.allowStudentViewResults !== false;
  const isPassed = submission.score >= exam.passingGrade;
  const isDisqualified = submission.status === 'DISQUALIFIED';

  const handleDownloadPDF = () => {
    generateStudentReportCardPDF(exam, submission);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-lg text-center space-y-6">
        {/* Status Graphic */}
        <div className="flex justify-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
            isDisqualified
              ? 'bg-rose-100 text-rose-600'
              : !canViewResults
              ? 'bg-emerald-100 text-emerald-600'
              : isPassed
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-amber-100 text-amber-600'
          }`}>
            {isDisqualified ? (
              <AlertTriangle className="w-10 h-10" />
            ) : !canViewResults ? (
              <CheckCircle className="w-10 h-10" />
            ) : (
              <Award className="w-10 h-10" />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isDisqualified
              ? 'Ujian Dihentikan & Terkunci'
              : 'Ujian Berhasil Dikumpulkan!'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {exam.title} · {submission.studentName} ({submission.studentClass})
          </p>
        </div>

        {/* Score Card (Ditampilkan hanya jika diizinkan Admin/Proktor di Pengaturan) */}
        {canViewResults ? (
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Perolehan Nilai Akhir
            </div>
            <div className="text-5xl font-black font-mono tracking-tight">
              <span className={isPassed ? 'text-emerald-600' : 'text-rose-600'}>
                {submission.score.toFixed(1)}
              </span>
              <span className="text-xl text-slate-400 font-normal"> / 100</span>
            </div>

            <div className="flex items-center justify-center gap-3 text-xs">
              <span className="text-slate-600">Batas KKM: <strong>{exam.passingGrade} Poin</strong></span>
              <span className="text-slate-300">·</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                isDisqualified
                  ? 'bg-rose-100 text-rose-800'
                  : isPassed
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {isDisqualified ? 'DISKUALIFIKASI' : isPassed ? 'LULUS (TUNTAS)' : 'REMEDIAL'}
              </span>
            </div>

            {/* Breakdown PG & Essay */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-semibold">PILIHAN GANDA</span>
                <span className="font-bold text-slate-800 font-mono text-base">{submission.mcqScore} Poin</span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">Dinilai Otomatis</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-semibold">SOAL URAIAN / ESAI</span>
                <span className="font-bold text-slate-800 font-mono text-base">
                  {submission.status === 'SUBMITTED' ? 'Ditinjau Guru' : `${submission.essayScore} Poin`}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {submission.status === 'SUBMITTED' ? 'Menunggu Penilaian' : 'Tervalidasi'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2 text-xs text-emerald-950">
            <div className="flex items-center justify-center gap-1.5 font-extrabold text-emerald-800 text-sm">
              <Lock className="w-4 h-4 text-emerald-700" />
              <span>Jawaban Anda Telah Tersimpan di Server CBT</span>
            </div>
            <p className="text-emerald-900/90 leading-relaxed max-w-md mx-auto">
              Penayangan perolehan nilai dan unduhan Rapor PDF saat ini dinonaktifkan oleh panitia/admin ujian. Silakan tunggu pengumuman hasil resmi dari madrasah.
            </p>
          </div>
        )}

        {/* Integrity Note */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1.5">
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Laporan Integritas Sesi Ujian:
            </span>
            <span className="text-slate-500 font-mono">
              {submission.violationsCount} Pelanggaran
            </span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            {submission.violationsCount === 0
              ? 'Selamat! Tidak ada catatan pelanggaran tab atau jendela yang terdeteksi selama pengerjaan.'
              : `Terdeteksi ${submission.violationsCount} kali perpindahan tab atau jendela. Seluruh log telah terekam di sistem proctoring guru.`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onBackToPortal}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda Ujian</span>
          </button>

          {canViewResults && (
            <button
              onClick={handleDownloadPDF}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Unduh Lembar Rapor PDF</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
