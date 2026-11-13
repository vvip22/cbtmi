import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Clock, 
  FileText, 
  Play, 
  CheckCircle2, 
  Lock,
  ShieldCheck,
  Calendar,
  AlertCircle,
  MapPin,
  UserCheck,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  X
} from 'lucide-react';
import { Exam, Submission, User, ExamSchedule } from '../../types/cbt';
import { dbService } from '../../services/dbStore';
import { generateStudentReportCardPDF } from '../../services/pdfReport';
import { 
  getExamTimingInfo, 
  formatIndonesianFullDate, 
  formatRemainingTime,
  parseScheduleDateTime 
} from '../../services/scheduleTimingService';

interface StudentPortalProps {
  currentUser: User;
  onStartExam: (exam: Exam) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ currentUser, onStartExam }) => {
  // Real-time server/device clock ticker - updates every 1 second
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showFullScheduleModal, setShowFullScheduleModal] = useState<boolean>(false);
  const [pendingExamGuide, setPendingExamGuide] = useState<{
    exam: Exam;
    timingInfo: ReturnType<typeof getExamTimingInfo>;
    isOngoing: boolean;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const settings = dbService.getSchoolSettings();
  const exams = dbService.getExams();
  const allSubmissions = dbService.getSubmissions();
  const allSchedules = dbService.getSchedules();

  // Find submissions for this student
  const studentSubmissions = allSubmissions.filter(s => s.studentId === currentUser.id);

  // Schedules relevant to this student's class
  const studentClass = currentUser.kelas || 'Kelas VI A';
  const relevantSchedules = allSchedules.filter(s => 
    !s.className || s.className.toLowerCase().trim() === studentClass.toLowerCase().trim()
  );

  const handleStartExamClick = (exam: Exam, timingInfo: ReturnType<typeof getExamTimingInfo>, isOngoing: boolean) => {
    if (!timingInfo.canStart) return;
    setPendingExamGuide({ exam, timingInfo, isOngoing });
  };

  const handleConfirmStartExam = () => {
    if (!pendingExamGuide) return;
    const latestTiming = getExamTimingInfo(pendingExamGuide.exam, studentClass, allSchedules, new Date());
    if (!latestTiming.canStart) {
      setPendingExamGuide(null);
      return;
    }
    const targetExam = pendingExamGuide.exam;
    setPendingExamGuide(null);
    onStartExam(targetExam);
  };

  const handleDownloadPDF = (exam: Exam, sub: Submission) => {
    generateStudentReportCardPDF(exam, sub);
  };

  const formattedCurrentTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="space-y-3">
      {/* Student Profile Card & Real-time Schedule Clock */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center overflow-hidden shrink-0">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="w-5 h-5 text-emerald-700" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <span className="font-bold text-emerald-800 uppercase tracking-wide">
                Peserta Ujian CBT
              </span>
              <span>·</span>
              <span className="font-semibold text-slate-700">{studentClass}</span>
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
              Selamat Datang, {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              NISN: {currentUser.nisn || '-'}
            </p>
          </div>
        </div>

        {/* Real-time Schedule Sync Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 self-stretch md:self-auto">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <div className="text-[11px]">
              <span className="text-slate-500 block leading-tight">Waktu Pelaksanaan Sesi:</span>
              <span className="font-mono font-bold text-slate-800 text-xs">
                {formatIndonesianFullDate(currentTime)} · {formattedCurrentTime} WITA
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowFullScheduleModal(true)}
            className="sm:ml-2 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1 shrink-0"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>Lihat Jadwal Lengkap</span>
          </button>
        </div>
      </div>

      {/* Active Exams Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-700" />
            <span>Daftar Pelaksanaan Ujian Asesmen</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {exams.length} Paket Ujian Terdaftar
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-start">
          {exams.map((exam) => {
            const userSub = studentSubmissions.find(s => s.examId === exam.id);
            const isCompleted = userSub && (userSub.status === 'SUBMITTED' || userSub.status === 'GRADED');
            const isOngoing = userSub && userSub.status === 'ONGOING';
            const isDisqualified = userSub && userSub.status === 'DISQUALIFIED';

            // Hitung status timing secara real-time terhadap jadwal resmi
            const timingInfo = getExamTimingInfo(exam, studentClass, allSchedules, currentTime);
            const sched = timingInfo.schedule;

            return (
              <div
                key={exam.id}
                className={`bg-white border rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col gap-2 transition-all ${
                  timingInfo.status === 'ONGOING' && !isCompleted && !isDisqualified
                    ? 'border-emerald-400 ring-1 ring-emerald-300/50 shadow-xs'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1.5">
                  {/* Top: Mata Pelajaran & Dynamic Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-emerald-800 tracking-wide uppercase">
                        {exam.subjectName}
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 leading-snug">
                        {exam.title}
                      </h3>
                    </div>

                    <div className="shrink-0">
                      {isCompleted ? (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Selesai & Terkumpul
                        </span>
                      ) : isDisqualified ? (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-rose-600" />
                          Terkunci
                        </span>
                      ) : timingInfo.status === 'UPCOMING' ? (
                        <span className="text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-sky-600" />
                          Belum Dimulai
                        </span>
                      ) : timingInfo.status === 'ONGOING' ? (
                        <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-400 px-2.5 py-0.5 rounded-md flex items-center gap-1.5 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                          Sedang Berlangsung
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                          Waktu Habis / Ditutup
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scheduled Execution Details Box (Hari, Tanggal, Jam, Sesi, Ruang) */}
                  {sched ? (
                    <div className="p-2 bg-slate-50/90 rounded-lg border border-slate-200/90 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2 text-slate-700 font-semibold">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <strong className="text-slate-900 truncate">{formatIndonesianFullDate(sched.date)}</strong>
                        </span>
                        <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 whitespace-nowrap">
                          {sched.startTime} - {sched.endTime} WITA
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-600 pt-1 border-t border-slate-200/70">
                        <span className="font-medium text-slate-800">{sched.session}</span>
                        <span className="text-slate-300">·</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {sched.room || 'Lab Komputer CBT'}
                        </span>
                        {sched.proctorName && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-slate-400" />
                              {sched.proctorName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-100 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Durasi pengerjaan: <strong>{exam.duration} Menit</strong> · KKM: {exam.passingGrade}</span>
                    </div>
                  )}

                  {/* Dynamic Timing Status Callout */}
                  {!isCompleted && !isDisqualified && (
                    <div className="text-[11px] leading-relaxed">
                      {timingInfo.status === 'UPCOMING' ? (
                        <div className="text-sky-800 bg-sky-50/80 px-2.5 py-1.5 rounded-lg border border-sky-200/70 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            Dibuka otomatis sesuai jadwal asesmen
                          </span>
                          {timingInfo.countdownFormatted && (
                            <span className="font-mono font-bold text-sky-900 bg-white px-2 py-0.5 rounded border border-sky-300 shrink-0">
                              Dalam {timingInfo.countdownFormatted}
                            </span>
                          )}
                        </div>
                      ) : timingInfo.status === 'ONGOING' ? (
                        <div className="text-emerald-900 bg-emerald-50/90 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center justify-between gap-2">
                          <span className="font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                            Sesi Asesmen Sedang Berjalan
                          </span>
                          {timingInfo.countdownFormatted && (
                            <span className="font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                              Sisa sesi: {timingInfo.countdownFormatted}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Waktu pelaksanaan ujian telah berakhir. Website ditutup secara otomatis.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Clean Specs Row */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 py-1 px-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                    <span className="flex items-center gap-1 font-mono font-semibold text-slate-800">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {exam.duration}m
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>KKM: <strong className="text-emerald-700 font-mono">{exam.passingGrade.toFixed(0)}</strong></span>
                    <span className="text-slate-300">·</span>
                    <span>Soal: <strong className="text-slate-800">{exam.questions?.length || 0}</strong> butir</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-emerald-700 font-medium">Bebas Token</span>
                  </div>
                </div>

                {/* Bottom CTA Action Button */}
                <div>
                  {isCompleted ? (
                    settings.allowStudentViewResults !== false ? (
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-500">Nilai: </span>
                          <span className={`font-mono font-bold text-sm ${
                            userSub.score >= exam.passingGrade ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            {userSub.score.toFixed(1)} / 100
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 ml-1">
                            ({userSub.score >= exam.passingGrade ? 'LULUS' : 'REMEDIAL'})
                          </span>
                        </div>
                        <button
                          onClick={() => handleDownloadPDF(exam, userSub)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-600" />
                          <span>Unduh Rapor PDF</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 bg-emerald-50/70 rounded-lg border border-emerald-200 flex items-center gap-2 text-xs text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium leading-snug">
                          Jawaban telah tersimpan aman. Hasil nilai & rapor PDF menunggu dirilis oleh madrasah.
                        </span>
                      </div>
                    )
                  ) : isDisqualified ? (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-semibold">Ujian ditutup karena diskualifikasi anti-curang. Silakan hubungi proktor/pengawas.</span>
                    </div>
                  ) : timingInfo.status === 'UPCOMING' ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-3 bg-slate-100 border border-slate-300 text-slate-500 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ujian Belum Dimulai (Otomatis Buka Pukul {sched?.startTime || '07:30'} WITA)</span>
                    </button>
                  ) : timingInfo.status === 'EXPIRED' ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-3 bg-slate-100 border border-slate-200 text-slate-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ujian Telah Ditutup Otomatis (Waktu Habis)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartExamClick(exam, timingInfo, Boolean(isOngoing))}
                      className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isOngoing ? 'Lanjutkan Pengerjaan Ujian' : 'Mulai Kerjakan Ujian'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Lihat Jadwal Lengkap Asesmen Semester */}
      {showFullScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-sm">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Jadwal Asesmen Semester - {studentClass}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {settings.schoolName || 'MIS NW Korleko'} · TP {settings.academicYear || '2026/2027'} ({settings.semester || 'Ganjil'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFullScheduleModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                <span>Waktu Server Saat Ini: <strong>{formatIndonesianFullDate(currentTime)} · {formattedCurrentTime} WITA</strong></span>
                <span className="font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                  Sinkron Otomatis
                </span>
              </div>

              {relevantSchedules.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Belum ada jadwal asesmen yang dirilis untuk kelas {studentClass}.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {relevantSchedules.map((item) => {
                    const startDt = parseScheduleDateTime(item.date, item.startTime);
                    const endDt = parseScheduleDateTime(item.date, item.endTime);
                    const nowMs = currentTime.getTime();
                    const isUpcoming = nowMs < startDt.getTime();
                    const isOngoing = nowMs >= startDt.getTime() && nowMs <= endDt.getTime();
                    const isEnded = nowMs > endDt.getTime();

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isOngoing
                            ? 'bg-emerald-50/60 border-emerald-400 ring-1 ring-emerald-300'
                            : isEnded
                            ? 'bg-slate-50 border-slate-200 opacity-75'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[11px] font-bold text-emerald-800 uppercase">
                              {formatIndonesianFullDate(item.date)}
                            </div>
                            <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                              {item.subjectName}
                            </h4>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                              <span>{item.session}</span>
                              <span>·</span>
                              <span className="font-mono font-semibold text-slate-700">{item.startTime} - {item.endTime} WITA</span>
                              <span>·</span>
                              <span>{item.room}</span>
                              {item.proctorName && (
                                <>
                                  <span>·</span>
                                  <span>Proktor: {item.proctorName}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div>
                            {isOngoing ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                                Sedang Berlangsung
                              </span>
                            ) : isUpcoming ? (
                              <span className="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                                Akan Datang
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md">
                                Selesai
                              </span>
                            )}
                          </div>
                        </div>

                        {item.notes && (
                          <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 italic">
                            Catatan: {item.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setShowFullScheduleModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                Tutup Jadwal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Petunjuk Pengerjaan Soal Sebelum Peserta Memulai Ujian */}
      {pendingExamGuide && (() => {
        const { exam: guideExam, timingInfo: guideTiming, isOngoing: guideOngoing } = pendingExamGuide;
        const guideSched = guideTiming.schedule;
        const allQuestions = guideExam.questions || [];
        const mcqCount = allQuestions.filter(q => q.type === 'MCQ').length;
        const essayCount = allQuestions.filter(q => q.type === 'ESSAY').length;

        // Parse custom numbered instructions if available in exam.description
        const rawLines = (guideExam.description || '')
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);
        const numberedLines = rawLines
          .filter(l => /^\d+[\.\)]\s+/.test(l))
          .map(l => l.replace(/^\d+[\.\)]\s+/, ''));
        const extraNote = numberedLines.length === 0 && guideExam.description ? guideExam.description.trim() : '';

        const standardInstructions = [
          {
            title: 'Berdoa Sebelum Memulai',
            desc: 'Bacalah Basmalah dan berdoalah terlebih dahulu sebelum mulai mengerjakan soal ujian.'
          },
          {
            title: 'Periksa Identitas & Kelengkapan Soal',
            desc: `Pastikan nama mata pelajaran (${guideExam.subjectName || guideExam.title}) serta jumlah soal (${allQuestions.length} butir) tampil dengan lengkap.`
          },
          {
            title: 'Tata Cara Menjawab Soal',
            desc: 'Untuk Pilihan Ganda, klik langsung opsi A, B, C, atau D. Untuk soal Esai/Uraian, ketikkan jawaban yang jelas pada kolom jawaban yang tersedia.'
          },
          {
            title: 'Navigasi Nomor & Tombol Ragu-ragu',
            desc: 'Anda dapat memilih nomor soal secara langsung melalui daftar nomor soal, serta menandai soal dengan tombol Ragu-ragu bila ingin diperiksa kembali.'
          },
          {
            title: 'Aturan Pengawasan Anti-Curang',
            desc: `Dilarang berpindah tab/jendela browser, membuka aplikasi lain, atau melakukan copy-paste selama ujian. Batas maksimal pelanggaran adalah ${guideExam.maxViolations || 3}x sebelum sistem mengunci ujian.`
          },
          {
            title: 'Penyimpanan Otomatis & Batas Waktu',
            desc: `Jawaban tersimpan otomatis oleh server CBT. Klik "Kumpulkan Ujian" jika telah selesai, atau sistem menutup & mengumpulkan otomatis saat waktu habis${guideSched?.endTime ? ` (pukul ${guideSched.endTime} WITA)` : ''}.`
          }
        ];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 overflow-hidden">
              {/* Header Petunjuk */}
              <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/15 border border-amber-300/60 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      Petunjuk Pengerjaan Soal
                    </div>
                    <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                      {guideExam.title}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingExamGuide(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Scrollable */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
                {/* Ringkasan Paket Soal */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-medium">Jumlah Soal</span>
                    <strong className="text-slate-900 font-extrabold">
                      {allQuestions.length} Butir
                    </strong>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      {mcqCount} PG{essayCount > 0 ? ` · ${essayCount} Esai` : ''}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-medium">Durasi Ujian</span>
                    <strong className="text-emerald-800 font-extrabold font-mono">
                      {guideExam.duration} Menit
                    </strong>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      Timer Otomatis
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-medium">Nilai KKM</span>
                    <strong className="text-slate-900 font-extrabold font-mono">
                      {guideExam.passingGrade.toFixed(0)}
                    </strong>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      Standar Lulus
                    </span>
                  </div>
                  <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 block font-medium">Jadwal Sesi</span>
                    <strong className="text-emerald-950 font-extrabold font-mono">
                      {guideSched ? `${guideSched.startTime}-${guideSched.endTime}` : 'Aktif'}
                    </strong>
                    <span className="block text-[10px] text-emerald-700 mt-0.5 truncate">
                      {guideSched ? `${guideSched.dayName}, WITA` : 'Siap Dikerjakan'}
                    </span>
                  </div>
                </div>

                {extraNote && (
                  <div className="p-2.5 bg-sky-50/80 border border-sky-200 rounded-xl text-xs text-sky-950 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{extraNote}</span>
                  </div>
                )}

                {/* Daftar Petunjuk Pengerjaan */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>Bacalah Petunjuk Berikut Sebelum Memulai:</span>
                    </h4>
                  </div>

                  {numberedLines.length > 0 ? (
                    <ol className="space-y-2 text-xs text-slate-700">
                      {numberedLines.map((line, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                          <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed font-medium text-slate-800">{line}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <ol className="space-y-2 text-xs text-slate-700">
                      {standardInstructions.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                          <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="leading-relaxed">
                            <strong className="text-slate-900 block">{item.title}</strong>
                            <span className="text-slate-600">{item.desc}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* Peringatan Anti-Curang & Penutupan Otomatis */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Perhatian Penting:</strong> Selama ujian berlangsung, dilarang berpindah tab/aplikasi lain (maksimal pelanggaran <strong>{guideExam.maxViolations || 3}x</strong>). Apabila waktu berakhir, halaman ujian akan tertutup otomatis dan jawaban Anda langsung terkumpul.
                  </div>
                </div>
              </div>

              {/* Footer Action */}
              <div className="p-3.5 sm:px-5 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPendingExamGuide(null)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStartExam}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {guideOngoing ? 'Saya Mengerti & Lanjutkan Ujian' : 'Saya Mengerti & Mulai Kerjakan Soal'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
