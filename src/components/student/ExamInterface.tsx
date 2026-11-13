import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  ShieldAlert, 
  CheckCircle, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Maximize, 
  Minimize, 
  Send,
  Flag,
  HelpCircle,
  X
} from 'lucide-react';
import { Exam, Question, Submission, User } from '../../types/cbt';
import { dbService } from '../../services/dbStore';
import { hasArabicCharacters, LATIN_TO_ARABIC_OPTION_MAP } from '../../services/wordParser';
import { findScheduleForExam, parseScheduleDateTime } from '../../services/scheduleTimingService';

interface ExamInterfaceProps {
  exam: Exam;
  currentUser: User;
  onFinishExam: (submission: Submission) => void;
  onExit: () => void;
}

export const ExamInterface: React.FC<ExamInterfaceProps> = ({
  exam,
  currentUser,
  onFinishExam,
  onExit
}) => {
  const [submission, setSubmission] = useState<Submission>(() => {
    const { submission } = dbService.startExamSession(exam.id, currentUser);
    return submission;
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { answer: string; isFlagged: boolean }>>(() => {
    const initial: Record<string, { answer: string; isFlagged: boolean }> = {};
    const existingAnswers = submission.answers || {};
    Object.entries(existingAnswers).forEach(([qId, ans]) => {
      initial[qId] = {
        answer: ans.studentAnswer || '',
        isFlagged: ans.isFlaggedReview || false
      };
    });
    return initial;
  });

  // Redis authoritative countdown timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const sync = dbService.syncTimer(submission.id);
    return sync.remainingSeconds;
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Anti-cheating violation modal state
  const [violationModal, setViolationModal] = useState<{
    show: boolean;
    count: number;
    max: number;
    reason: string;
    isDisqualified: boolean;
  }>({
    show: false,
    count: submission.violationsCount || 0,
    max: exam.maxViolations || 3,
    reason: '',
    isDisqualified: false
  });

  // Time-up auto-submit modal state
  const [timeUpModal, setTimeUpModal] = useState<{
    show: boolean;
    countdown: number;
    finalSubmission: Submission | null;
  }>({
    show: false,
    countdown: 3,
    finalSubmission: null
  });

  const questions: Question[] = exam.questions || [];
  const currentQuestion: Question | undefined = questions[currentQuestionIndex];
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Temukan jadwal asesmen resmi yang terikat dengan paket soal dan kelas siswa ini
  const linkedSchedule = useRef(
    findScheduleForExam(exam, dbService.getSchedules(), currentUser.kelas || exam.className)
  ).current;

  // 1. Authoritative Real-time Timer Interval (Sinkron Durasi & Jam Selesai Jadwal)
  useEffect(() => {
    const interval = setInterval(() => {
      const sync = dbService.syncTimer(submission.id);
      
      // Hitung juga apakah waktu real-time telah melewati jam selesai jadwal (endTime)
      let isScheduleEnded = false;
      if (linkedSchedule && linkedSchedule.date && linkedSchedule.endTime) {
        try {
          const schedEnd = parseScheduleDateTime(linkedSchedule.date, linkedSchedule.endTime).getTime();
          if (!isNaN(schedEnd) && Date.now() >= schedEnd) {
            isScheduleEnded = true;
          }
        } catch {
          // ignore
        }
      }

      setRemainingSeconds(sync.remainingSeconds);

      if (sync.isExpired || sync.remainingSeconds <= 0 || isScheduleEnded) {
        clearInterval(interval);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        
        const autoReason = isScheduleEnded
          ? `Selesai otomatis: Waktu pelaksanaan asesmen sesuai jadwal (${linkedSchedule?.endTime || 'selesai'} WITA) telah berakhir. Website ujian ditutup otomatis.`
          : 'Selesai otomatis: Waktu pengerjaan ujian telah habis.';

        const finalSub = dbService.submitExam(submission.id, autoReason);
        
        setTimeUpModal({
          show: true,
          countdown: 3,
          finalSubmission: finalSub
        });

        let count = 3;
        const countdownTimer = setInterval(() => {
          count -= 1;
          if (count <= 0) {
            clearInterval(countdownTimer);
            onFinishExam(finalSub);
          } else {
            setTimeUpModal(prev => ({ ...prev, countdown: count }));
          }
        }, 1000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [submission.id, linkedSchedule]);

  // 2. Anti-Cheating Shield (Visibility change, window blur, keyboard shortcuts, context menu)
  useEffect(() => {
    const handleViolation = (reason: string) => {
      // Don't trigger if already submitted or disqualified
      const currentSub = dbService.getSubmissionById(submission.id);
      if (currentSub?.status !== 'ONGOING') return;

      const { submission: updatedSub, isLocked } = dbService.recordViolation(submission.id, reason);
      setSubmission({ ...updatedSub });

      setViolationModal({
        show: true,
        count: updatedSub.violationsCount,
        max: exam.maxViolations,
        reason,
        isDisqualified: isLocked
      });

      if (isLocked) {
        setTimeout(() => {
          onFinishExam(updatedSub);
        }, 3500);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('Terdeteksi beralih ke tab atau aplikasi lain (Tab Switch).');
      }
    };

    const handleWindowBlur = () => {
      handleViolation('Fokus jendela ujian hilang (Window Blur / Alt-Tab terdeteksi).');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent developer tools, copy, paste, reload shortcuts
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U')) ||
        (e.ctrlKey && (e.key === 'c' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'v' || e.key === 'V'))
      ) {
        e.preventDefault();
        handleViolation(`Percobaan penekanan tombol terlarang (${e.key}).`);
      }

      // Quick key selection for MCQ (A, B, C, D, E) when not typing in textarea
      if (
        currentQuestion?.type === 'MCQ' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        const upper = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D', 'E'].includes(upper)) {
          handleSelectAnswer(upper);
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      handleViolation('Aktivitas copy-paste dinonaktifkan demi integritas ujian.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopyPaste);
    window.addEventListener('paste', handleCopyPaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopyPaste);
      window.removeEventListener('paste', handleCopyPaste);
    };
  }, [submission.id, currentQuestion]);

  // 3. Debounced Auto-save to Database Store
  const triggerAutoSave = (qId: string, ans: string, flagged: boolean) => {
    setSaveStatus('saving');
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      dbService.saveAnswer(submission.id, qId, ans, flagged);
      setSaveStatus('saved');
    }, 400);
  };

  const handleSelectAnswer = (optionKey: string) => {
    if (!currentQuestion) return;
    const currentFlag = answers[currentQuestion.id]?.isFlagged || false;
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: {
        answer: optionKey,
        isFlagged: currentFlag
      }
    };
    setAnswers(newAnswers);
    triggerAutoSave(currentQuestion.id, optionKey, currentFlag);
  };

  const handleEssayChange = (text: string) => {
    if (!currentQuestion) return;
    const currentFlag = answers[currentQuestion.id]?.isFlagged || false;
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: {
        answer: text,
        isFlagged: currentFlag
      }
    };
    setAnswers(newAnswers);
    triggerAutoSave(currentQuestion.id, text, currentFlag);
  };

  const handleToggleFlagged = () => {
    if (!currentQuestion) return;
    const current = answers[currentQuestion.id] || { answer: '', isFlagged: false };
    const updatedFlag = !current.isFlagged;
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: {
        ...current,
        isFlagged: updatedFlag
      }
    };
    setAnswers(newAnswers);
    triggerAutoSave(currentQuestion.id, current.answer, updatedFlag);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Completion calculation
  const totalAnswered = Object.values(answers).filter(a => a.answer && a.answer.trim() !== '').length;
  const totalFlagged = Object.values(answers).filter(a => a.isFlagged).length;
  const totalUnanswered = questions.length - totalAnswered;

  const handleSubmitExamConfirm = () => {
    const finalSub = dbService.submitExam(submission.id);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onFinishExam(finalSub);
  };

  const isTimerCritical = remainingSeconds <= 300; // <= 5 minutes
  const isTimerWarning = remainingSeconds <= 600 && !isTimerCritical;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col select-none overflow-hidden">
      {/* CBT Fixed Header (Distraction-Free) */}
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-800 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-sm">
            CBT
          </div>
          <div>
            <h1 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {exam.title}
            </h1>
            <div className="text-[11px] text-slate-400">
              Peserta: <span className="text-slate-200 font-semibold">{currentUser.name}</span> ({currentUser.nisn || 'Siswa'})
            </div>
          </div>
        </div>

        {/* Center: Real-time Countdown Timer (Redis Authoritative) */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-sm font-bold border transition-all ${
            isTimerCritical
              ? 'bg-rose-950/80 border-rose-500 text-rose-400 animate-pulse'
              : isTimerWarning
              ? 'bg-amber-950/80 border-amber-500 text-amber-400'
              : 'bg-slate-800 border-slate-700 text-emerald-400'
          }`}>
            <Clock className="w-4 h-4 shrink-0" />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>

          {linkedSchedule?.endTime && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 border border-slate-700 rounded-lg text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Batas Selesai: <strong className="text-white font-mono">{linkedSchedule.endTime} WITA</strong> (Tutup Otomatis)</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 ml-2">
            {saveStatus === 'saved' ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                Tersimpan
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></div>
                Menyimpan...
              </span>
            )}
          </div>
        </div>

        {/* Right: Fullscreen Toggle & Submit CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Fullscreen)'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kumpulkan Ujian</span>
          </button>
        </div>
      </header>

      {/* Main Examination Viewport (2-Zone Split: Question Stage + Palette Deck) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Stage: Question Canvas */}
        <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto p-4 sm:p-8">
          {currentQuestion ? (
            <div className="max-w-3xl mx-auto w-full space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-extrabold rounded-md">
                    SOAL NOMOR {currentQuestionIndex + 1}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Jenis: {currentQuestion.type === 'MCQ' ? 'Pilihan Ganda' : 'Uraian / Esai'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-mono">
                    Bobot: <strong>{currentQuestion.points}</strong> Poin
                  </span>

                  {/* Toggle Ragu-ragu */}
                  <button
                    onClick={handleToggleFlagged}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                      answers[currentQuestion.id]?.isFlagged
                        ? 'bg-amber-100 border-amber-300 text-amber-800 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Flag className={`w-3.5 h-3.5 ${answers[currentQuestion.id]?.isFlagged ? 'fill-amber-600 text-amber-600' : ''}`} />
                    <span>Ragu-ragu</span>
                  </button>
                </div>
              </div>

              {/* Question Body with Table, Arabic, and Formula Rendering */}
              {(() => {
                const isArabic = hasArabicCharacters(currentQuestion.text);
                return (
                  <>
                    {currentQuestion.text.includes('<table') || currentQuestion.text.includes('<div') ? (
                      <div 
                        dir={isArabic ? 'rtl' : 'ltr'}
                        className={`text-sm sm:text-base font-medium text-slate-900 leading-relaxed ${
                          isArabic ? 'font-arabic text-base sm:text-xl leading-loose font-semibold' : 'font-sans'
                        }`}
                        dangerouslySetInnerHTML={{ __html: currentQuestion.text }}
                      />
                    ) : (
                      <div 
                        dir={isArabic ? 'rtl' : 'ltr'}
                        className={`text-sm sm:text-base font-medium text-slate-900 leading-relaxed whitespace-pre-line ${
                          isArabic ? 'font-arabic text-base sm:text-xl leading-loose font-semibold' : 'font-sans'
                        }`}
                      >
                        {currentQuestion.text}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Gambar / Diagram / Grafik Tersemat dari Dokumen Word */}
              {currentQuestion.imageUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-w-lg mx-auto text-center shadow-xs">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Diagram / Grafik Soal"
                    className="max-h-80 object-contain mx-auto rounded-xl"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1 font-sans">
                    Gambar / Diagram Soal
                  </span>
                </div>
              )}

              {/* MCQ Options Deck */}
              {currentQuestion.type === 'MCQ' && (
                <div className="space-y-2.5 pt-2">
                  {(currentQuestion.options || []).map((opt) => {
                    const isSelected = answers[currentQuestion.id]?.answer === opt.key;
                    const isQuestionArabic = hasArabicCharacters(currentQuestion.text);
                    const isOptionArabic = hasArabicCharacters(opt.text);
                    const arabicLetter = LATIN_TO_ARABIC_OPTION_MAP[opt.key.toUpperCase()];

                    return (
                      <div
                        key={opt.key}
                        onClick={() => handleSelectAnswer(opt.key)}
                        className={`p-3.5 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all flex items-start gap-3.5 ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-600 text-emerald-950 font-semibold shadow-xs ring-1 ring-emerald-500'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isQuestionArabic && arabicLetter ? arabicLetter : opt.key}
                        </div>
                        <div 
                          dir={isOptionArabic ? 'rtl' : 'ltr'}
                          className={`flex-1 pt-1 ${isOptionArabic ? 'font-arabic text-base sm:text-lg leading-loose' : 'leading-snug'}`}
                        >
                          {opt.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Essay Textarea Canvas */}
              {currentQuestion.type === 'ESSAY' && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 block">
                      Tuliskan Jawaban Uraian Anda Secara Terperinci:
                    </label>
                    {hasArabicCharacters(currentQuestion.text) && (
                      <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        Mendukung Teks Bahasa Arab & Latin
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={8}
                    dir="auto"
                    value={answers[currentQuestion.id]?.answer || ''}
                    onChange={(e) => handleEssayChange(e.target.value)}
                    placeholder={
                      hasArabicCharacters(currentQuestion.text)
                        ? "اكتب إجابتك هنا بالتفصيل... (Ketik uraian jawaban Anda di sini...)"
                        : "Ketik uraian jawaban, langkah sistematis, atau analisis lengkap di sini..."
                    }
                    className={`w-full p-4 text-xs sm:text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden leading-relaxed ${
                      hasArabicCharacters(answers[currentQuestion.id]?.answer || '') ? 'font-arabic text-base leading-loose' : 'font-sans'
                    }`}
                  />
                  <div className="text-[11px] text-slate-400 text-right">
                    {(answers[currentQuestion.id]?.answer || '').length} Karakter
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400">
              Tidak ada butir soal yang dimuat.
            </div>
          )}

          {/* Bottom Navigation Buttons */}
          <div className="max-w-3xl mx-auto w-full pt-6 mt-6 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Soal Sebelumnya
            </button>

            <span className="text-xs text-slate-500 font-mono">
              {currentQuestionIndex + 1} dari {questions.length} Soal
            </span>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
              >
                Soal Berikutnya
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
              >
                Tinjau & Selesai
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Deck: Question Navigation Palette (Nomor Soal) */}
        <aside className="w-full md:w-80 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 p-4 sm:p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Navigasi Soal Ujian
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {totalAnswered} / {questions.length} Dijawab
              </span>
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-600"></div>
                <span>Terjawab</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-400"></div>
                <span>Ragu-ragu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-200 border border-slate-300"></div>
                <span>Kosong</span>
              </div>
            </div>

            {/* Number Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto py-1">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isAnswered = ans && ans.answer && ans.answer.trim() !== '';
                const isFlagged = ans?.isFlagged;
                const isCurrent = currentQuestionIndex === idx;

                let btnClass = 'bg-white text-slate-700 border-slate-200 hover:border-slate-300';
                if (isFlagged) {
                  btnClass = 'bg-amber-400 text-amber-950 border-amber-500 font-bold';
                } else if (isAnswered) {
                  btnClass = 'bg-emerald-600 text-white border-emerald-700 font-bold';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-9 rounded-lg border text-xs font-mono transition-all flex items-center justify-center relative ${btnClass} ${
                      isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2' : ''
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-900 absolute top-1 right-1"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Integrity Status */}
          <div className="pt-4 border-t border-slate-200 mt-4 space-y-2">
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Status Anti-Curang:</span>
              <span className={`font-bold ${
                submission.violationsCount > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {submission.violationsCount} / {exam.maxViolations} Pelanggaran
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Dilarang berpindah tab browser, membuka aplikasi lain, atau melakukan copy-paste.
            </p>
          </div>
        </aside>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-5 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Pengumpulan Ujian
                </h3>
                <p className="text-xs text-slate-500">
                  Periksa kembali rekap pengerjaan sebelum mengunci jawaban.
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Soal Telah Terjawab:</span>
                <span className="font-bold text-emerald-700">{totalAnswered} dari {questions.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Soal Masih Ragu-ragu:</span>
                <span className="font-bold text-amber-700">{totalFlagged} soal</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Soal Belum Terisi:</span>
                <span className="font-bold text-rose-700">{totalUnanswered} soal</span>
              </div>
            </div>

            {totalUnanswered > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>Masih terdapat {totalUnanswered} butir soal yang belum Anda isi. Apakah yakin ingin mengumpulkan sekarang?</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Kembali Periksa
              </button>
              <button
                onClick={handleSubmitExamConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
              >
                Ya, Kumpulkan Ujian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intrusive Anti-Cheating Warning Modal */}
      {violationModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-rose-500 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 animate-bounce">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-rose-600">
                  {violationModal.isDisqualified
                    ? 'UJIAN TERKUNCI: DISKUALIFIKASI SISTEM'
                    : `PERINGATAN PELANGGARAN KE-${violationModal.count} DARI ${violationModal.max}`}
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Protokol Pengawasan Anti-Curang CBT EduExam
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-950 font-medium">
              {violationModal.reason}
            </div>

            <div className="text-xs text-slate-600 leading-relaxed">
              {violationModal.isDisqualified ? (
                <p className="font-bold text-rose-700">
                  Anda telah melampaui batas toleransi perpindahan jendela. Seluruh berkas pengerjaan Anda otomatis dikunci dan dikirim ke guru dengan status diskualifikasi.
                </p>
              ) : (
                <p>
                  Sistem mencatat setiap aktivitas meninggalkan tab atau membuka aplikasi lain. Jika pelanggaran mencapai batas maksimal (<strong>{violationModal.max}x</strong>), lembar ujian Anda akan langsung dikumpulkan paksa.
                </p>
              )}
            </div>

            <div className="pt-2 text-right">
              {!violationModal.isDisqualified ? (
                <button
                  onClick={() => setViolationModal({ ...violationModal, show: false })}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Saya Mengerti, Kembali Mengerjakan Ujian
                </button>
              ) : (
                <div className="text-center text-xs text-slate-500 font-semibold py-2">
                  Mengalihkan ke rekapitulasi nilai...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Time Up Auto-Finish Modal */}
      {timeUpModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Waktu Pelaksanaan Ujian Telah Habis!
                </h3>
                <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                  Sesi Selesai & Website Ditutup Otomatis
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 leading-relaxed space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Seluruh jawaban telah tersimpan dengan aman
              </p>
              <p className="text-emerald-900/90">
                Sesuai jam jadwal asesmen madrasah {linkedSchedule?.endTime ? `(pukul ${linkedSchedule.endTime} WITA)` : ''}, waktu ujian telah berakhir. Sistem telah menyelesaikan pengerjaan dan menutup portal ujian secara otomatis.
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-mono">
                Menutup ujian dalam <strong className="text-emerald-700 font-extrabold text-sm">{timeUpModal.countdown}</strong> detik...
              </span>
              <button
                onClick={() => {
                  if (timeUpModal.finalSubmission) {
                    onFinishExam(timeUpModal.finalSubmission);
                  }
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Kembali ke Portal →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
