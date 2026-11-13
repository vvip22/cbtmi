import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  RefreshCw, 
  UserCheck, 
  Eye, 
  X,
  Send,
  Timer,
  CheckCircle,
  HelpCircle,
  Filter
} from 'lucide-react';
import { Exam, Submission, ViolationEvent } from '../../types/cbt';
import { dbService } from '../../services/dbStore';

interface LiveProctoringProps {
  exams: Exam[];
}

export const LiveProctoring: React.FC<LiveProctoringProps> = ({ exams }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedViolationLog, setSelectedViolationLog] = useState<{ studentName: string; logs: ViolationEvent[] } | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ONGOING' | 'TIME_UP' | 'COMPLETED' | 'DISQUALIFIED'>('ALL');
  const [forceSubmitCandidate, setForceSubmitCandidate] = useState<{ id: string; name: string } | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  const selectedExam = exams.find(e => e.id === selectedExamId) || exams[0];

  const refreshSubmissions = () => {
    if (selectedExamId) {
      // dbService.getSubmissions otomatis mengecek dan mengumpulkan ujian yang waktu pengerjaannya telah habis
      const subs = dbService.getSubmissions(selectedExamId);
      setSubmissions(subs);
    }
  };

  // 1. Polling interval 1.5 detik untuk telemetry pengawasan live
  useEffect(() => {
    refreshSubmissions();
    const interval = setInterval(refreshSubmissions, 1500);
    return () => clearInterval(interval);
  }, [selectedExamId]);

  // 2. Real-time 1s ticker untuk kalkulasi sisa waktu siswa di layar proktor
  useEffect(() => {
    const clock = setInterval(() => {
      setCurrentTime(Date.now());
      // Lakukan auto-submit check berkala jika ada siswa yang waktunya habis di detik ini
      if (selectedExamId) {
        const hasExpired = dbService.checkAndAutoSubmitExpiredSubmissions(selectedExamId);
        if (hasExpired) {
          refreshSubmissions();
        }
      }
    }, 1000);
    return () => clearInterval(clock);
  }, [selectedExamId]);

  const handleConfirmForceSubmit = () => {
    if (!forceSubmitCandidate) return;
    dbService.submitExam(forceSubmitCandidate.id, 'Diselesaikan paksa oleh Proktor Pengawas');
    refreshSubmissions();
    setForceSubmitCandidate(null);
  };

  const totalQuestions = selectedExam?.questions?.length || 1;
  const ongoingCount = submissions.filter(s => s.status === 'ONGOING').length;
  const autoSubmittedCount = submissions.filter(s => 
    (s.status === 'SUBMITTED' || s.status === 'GRADED') && 
    (s.isAutoSubmitted || s.autoSubmitReason?.includes('Waktu') || s.teacherNotes?.includes('Waktu'))
  ).length;
  const manualSubmittedCount = submissions.filter(s => 
    (s.status === 'SUBMITTED' || s.status === 'GRADED') && 
    !(s.isAutoSubmitted || s.autoSubmitReason?.includes('Waktu') || s.teacherNotes?.includes('Waktu'))
  ).length;
  const submittedCount = submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'GRADED').length;
  const disqualifiedCount = submissions.filter(s => s.status === 'DISQUALIFIED').length;
  const highViolationCount = submissions.filter(s => s.violationsCount >= 2 && s.status === 'ONGOING').length;

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter(sub => {
    if (filterStatus === 'ONGOING') return sub.status === 'ONGOING';
    if (filterStatus === 'TIME_UP') {
      return (sub.status === 'SUBMITTED' || sub.status === 'GRADED') && 
             (sub.isAutoSubmitted || sub.autoSubmitReason?.includes('Waktu') || sub.teacherNotes?.includes('Waktu'));
    }
    if (filterStatus === 'COMPLETED') {
      return sub.status === 'SUBMITTED' || sub.status === 'GRADED';
    }
    if (filterStatus === 'DISQUALIFIED') return sub.status === 'DISQUALIFIED';
    return true;
  });

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Top Banner & Control - Kompak */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                Pengawasan Aktif
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight mt-0.5">
              Live Monitoring & Pemantauan Sesi
            </h1>
          </div>

          {/* Exam Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
            >
              {exams.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.className}) · {e.duration}m
                </option>
              ))}
            </select>

            <button
              onClick={refreshSubmissions}
              className="p-1.5 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 hover:text-slate-900 bg-white transition-colors"
              title="Perbarui data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Metrics Row - Rapi & Kompak */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mt-2.5 pt-2.5 border-t border-slate-100">
          <div className="p-2 sm:p-2.5 bg-slate-50/80 rounded-lg border border-slate-200">
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Mengerjakan
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-indigo-700 font-mono mt-0.5">
              {ongoingCount} <span className="text-xs font-normal text-slate-400">siswa</span>
            </div>
          </div>

          <div className="p-2 sm:p-2.5 bg-amber-50/70 rounded-lg border border-amber-200">
            <div className="text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-amber-600" />
              Waktu Habis
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-amber-700 font-mono mt-0.5">
              {autoSubmittedCount} <span className="text-xs font-normal text-amber-600/70">auto</span>
            </div>
          </div>

          <div className="p-2 sm:p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200">
            <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Total Terkumpul
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-emerald-700 font-mono mt-0.5">
              {submittedCount} <span className="text-xs font-normal text-emerald-600/70">lembar</span>
            </div>
          </div>

          <div className="p-2 sm:p-2.5 bg-slate-50/80 rounded-lg border border-slate-200">
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              Didiskualifikasi
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-rose-600 font-mono mt-0.5">
              {disqualifiedCount} <span className="text-xs font-normal text-slate-400">siswa</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </span>
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
              filterStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({submissions.length})
          </button>
          <button
            onClick={() => setFilterStatus('ONGOING')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
              filterStatus === 'ONGOING'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Aktif ({ongoingCount})
          </button>
          <button
            onClick={() => setFilterStatus('TIME_UP')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
              filterStatus === 'TIME_UP'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Waktu Habis ({autoSubmittedCount})
          </button>
          <button
            onClick={() => setFilterStatus('COMPLETED')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
              filterStatus === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Selesai ({submittedCount})
          </button>
          <button
            onClick={() => setFilterStatus('DISQUALIFIED')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
              filterStatus === 'DISQUALIFIED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Diskualifikasi ({disqualifiedCount})
          </button>
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
          <span>Daftar Peserta Ujian ({filteredSubmissions.length} Siswa Terpilih)</span>
          <span className="text-slate-500 font-normal">
            Alokasi Waktu Ujian: {selectedExam?.duration} Menit · Toleransi Curang: {selectedExam?.maxViolations || 3}x
          </span>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
            Tidak ada peserta dengan filter status yang dipilih.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {filteredSubmissions.map((sub) => {
              const answeredCount = sub.answeredCount ?? Object.values(sub.answers || {}).filter(a => a.studentAnswer && a.studentAnswer.trim() !== '').length;
              const progressPercent = Math.min(100, Math.round((answeredCount / totalQuestions) * 100));
              const isDisqualified = sub.status === 'DISQUALIFIED';
              const isCompleted = sub.status === 'SUBMITTED' || sub.status === 'GRADED';
              const isOngoing = sub.status === 'ONGOING';
              const isTimeUp = isCompleted && (sub.isAutoSubmitted || sub.autoSubmitReason?.includes('Waktu') || sub.teacherNotes?.includes('Waktu'));

              // Hitung sisa waktu real-time untuk kartu proktor
              const timer = dbService.getTimerSession(sub.id);
              let remainingSeconds = 0;
              if (timer) {
                remainingSeconds = Math.max(0, Math.floor((timer.expiresAt - currentTime) / 1000));
              } else if (isOngoing) {
                const durationMs = (selectedExam?.duration || 60) * 60 * 1000;
                const startedAtMs = new Date(sub.startedAt).getTime();
                remainingSeconds = Math.max(0, Math.floor((startedAtMs + durationMs - currentTime) / 1000));
              }

              const isUrgent = isOngoing && remainingSeconds <= 300; // <= 5 menit

              return (
                <div 
                  key={sub.id}
                  className={`bg-white border rounded-xl p-3.5 sm:p-4 shadow-xs transition-all space-y-3 relative ${
                    isDisqualified 
                      ? 'border-rose-300 bg-rose-50/20' 
                      : isTimeUp
                      ? 'border-amber-200 bg-amber-50/15'
                      : sub.violationsCount >= 2 && isOngoing
                      ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-400'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Header Siswa */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                        {sub.studentName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {sub.studentName}
                        </h3>
                        <div className="text-[11px] text-slate-500 font-mono">
                          NISN: {sub.studentNisn} · {sub.studentClass}
                        </div>
                      </div>
                    </div>

                    {/* Status Tag di Dashboard Proktor */}
                    <div>
                      {isOngoing && (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isUrgent 
                            ? 'text-rose-700 bg-rose-50 border-rose-300 animate-pulse'
                            : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                        }`}>
                          <Clock className="w-3 h-3 animate-spin shrink-0" />
                          <span>Aktif Mengerjakan</span>
                        </span>
                      )}

                      {isTimeUp && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-100/80 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-amber-700 shrink-0" />
                          <span>Selesai (Waktu Habis)</span>
                        </span>
                      )}

                      {!isTimeUp && isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Selesai & Terkumpul</span>
                        </span>
                      )}

                      {isDisqualified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          <Lock className="w-3 h-3 shrink-0" />
                          <span>Terkunci Diskualifikasi</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Countdown Timer Siswa (Live Real-time Countdown) */}
                  <div className="p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono bg-slate-50/80 border-slate-200">
                    <span className="text-slate-500 font-sans font-medium flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-slate-400" />
                      {isOngoing ? 'Sisa Waktu Siswa:' : 'Waktu Pengerjaan:'}
                    </span>
                    {isOngoing ? (
                      <span className={`font-bold ${isUrgent ? 'text-rose-600 animate-pulse text-sm' : 'text-slate-900'}`}>
                        {formatCountdown(remainingSeconds)}
                      </span>
                    ) : isTimeUp ? (
                      <span className="font-bold text-amber-800 text-[11px] font-sans flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Otomatis Selesai (00:00)
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-700 text-[11px] font-sans">
                        Selesai Tepat Waktu
                      </span>
                    )}
                  </div>

                  {/* Progress Pengerjaan Soal */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Progres Menjawab:</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {answeredCount} / {totalQuestions} Soal ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isTimeUp 
                            ? 'bg-amber-500' 
                            : isCompleted 
                            ? 'bg-emerald-500' 
                            : isDisqualified 
                            ? 'bg-rose-500' 
                            : 'bg-indigo-600'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Score Pill jika sudah selesai */}
                  {isCompleted && (
                    <div className="p-2 bg-emerald-50/70 border border-emerald-200/80 rounded-lg flex items-center justify-between text-xs">
                      <span className="text-emerald-800 font-medium">Perolehan Nilai:</span>
                      <span className="font-black font-mono text-emerald-700 text-sm">
                        {sub.score} Poin
                      </span>
                    </div>
                  )}

                  {/* Anti-Cheat Violation Banner */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {sub.violationsCount > 0 ? (
                        <span className={`font-semibold flex items-center gap-1 ${
                          sub.violationsCount >= (selectedExam?.maxViolations || 3)
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }`}>
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          {sub.violationsCount}x Pelanggaran Tab
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                          Integritas Bersih (0)
                        </span>
                      )}
                    </div>

                    {sub.violationsCount > 0 && (
                      <button
                        onClick={() => setSelectedViolationLog({ studentName: sub.studentName || '', logs: sub.violationsLog || [] })}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 underline underline-offset-2"
                      >
                        <Eye className="w-3 h-3" />
                        Detail Log
                      </button>
                    )}
                  </div>

                  {/* Action CTA for Invigilator */}
                  {isOngoing && (
                    <div className="pt-2">
                      <button
                        onClick={() => setForceSubmitCandidate({ id: sub.id, name: sub.studentName || 'Siswa' })}
                        className="w-full py-1.5 px-3 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        Kumpulkan Paksa Ujian Siswa
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* In-app Modal Konfirmasi Kumpulkan Paksa Ujian */}
      {forceSubmitCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Kumpulkan Paksa Ujian Siswa?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apakah Anda yakin ingin mengumpulkan ujian untuk <strong>{forceSubmitCandidate.name}</strong>? Sesi pengerjaan akan segera ditutup dan dinilai otomatis.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setForceSubmitCandidate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmForceSubmit}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kumpulkan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Pelanggaran Anti-Curang */}
      {selectedViolationLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Log Audit Kecurangan: {selectedViolationLog.studentName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedViolationLog(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-80 overflow-y-auto space-y-3">
              {selectedViolationLog.logs.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4">
                  Tidak ada catatan pelanggaran.
                </div>
              ) : (
                selectedViolationLog.logs.map((log, index) => (
                  <div key={index} className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-rose-800">
                      <span>Pelanggaran Ke-{log.tabSwitchCount || index + 1}</span>
                      <span className="font-mono text-rose-600 font-normal">
                        {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                    <p className="text-xs text-rose-950 font-medium">
                      {log.reason}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-right">
              <button
                onClick={() => setSelectedViolationLog(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
