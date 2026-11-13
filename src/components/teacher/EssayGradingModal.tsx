import React, { useState } from 'react';
import { X, CheckCircle2, Award, MessageSquare, AlertCircle } from 'lucide-react';
import { Exam, Submission, Question } from '../../types/cbt';
import { dbService } from '../../services/dbStore';

interface EssayGradingModalProps {
  exam: Exam;
  submission: Submission;
  isOpen: boolean;
  onClose: () => void;
  onGraded: (updatedSubmission: Submission) => void;
}

export const EssayGradingModal: React.FC<EssayGradingModalProps> = ({
  exam,
  submission,
  isOpen,
  onClose,
  onGraded
}) => {
  const essayQuestions = (exam.questions || []).filter(q => q.type === 'ESSAY');

  // Form states
  const [grades, setGrades] = useState<Record<string, { points: number; feedback: string }>>(() => {
    const initial: Record<string, { points: number; feedback: string }> = {};
    essayQuestions.forEach(q => {
      const existing = submission.answers[q.id];
      initial[q.id] = {
        points: existing?.pointsAwarded || 0,
        feedback: existing?.teacherFeedback || ''
      };
    });
    return initial;
  });

  const [generalNotes, setGeneralNotes] = useState(submission.teacherNotes || '');

  if (!isOpen) return null;

  const handlePointChange = (questionId: string, maxPoints: number, val: number) => {
    const cleanVal = Math.min(maxPoints, Math.max(0, val));
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        points: cleanVal
      }
    }));
  };

  const handleFeedbackChange = (questionId: string, text: string) => {
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        feedback: text
      }
    }));
  };

  const totalEssayCalculated = Object.values(grades).reduce((acc, curr) => acc + (curr.points || 0), 0);
  const finalCalculatedScore = submission.mcqScore + totalEssayCalculated;
  const isPassing = finalCalculatedScore >= exam.passingGrade;

  const handleSaveAll = () => {
    let currentSub = submission;
    essayQuestions.forEach(q => {
      const g = grades[q.id];
      if (g) {
        currentSub = dbService.gradeEssayAnswer(submission.id, q.id, g.points, g.feedback);
      }
    });

    if (generalNotes.trim() !== '') {
      dbService.updateTeacherNotes(submission.id, generalNotes);
      currentSub.teacherNotes = generalNotes;
    }

    onGraded(currentSub);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Penilaian Manual Guru
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">{submission.studentClass}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              Koreksi Soal Uraian / Esai: {submission.studentName}
            </h2>
            <p className="text-xs text-slate-500">
              NISN: {submission.studentNisn} · Nilai PG: <span className="font-semibold text-slate-700">{submission.mcqScore} poin</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {essayQuestions.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              Ujian ini tidak memiliki butir soal esai. Seluruh nilai dihitung secara otomatis (Auto-Graded).
            </div>
          ) : (
            essayQuestions.map((q: Question, idx: number) => {
              const studentAns = submission.answers[q.id]?.studentAnswer || '';
              const gradeData = grades[q.id] || { points: 0, feedback: '' };

              return (
                <div key={q.id} className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
                  {/* Pertanyaan */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs font-bold">
                          Soal No. {q.orderIndex || idx + 1}
                        </span>
                        <span className="text-xs text-slate-500">Bobot Maksimal: {q.points} Poin</span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 whitespace-pre-line mt-1">
                        {q.text}
                      </p>
                      {q.imageUrl && (
                        <div className="mt-2 max-w-sm rounded-lg border border-slate-200 p-2 bg-slate-50">
                          <img src={q.imageUrl} alt="Diagram Soal" className="max-h-48 object-contain rounded" />
                        </div>
                      )}
                    </div>

                    {/* Input Skor Poin */}
                    <div className="shrink-0 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col items-center">
                      <label className="text-[11px] font-semibold text-slate-600 mb-1">
                        Skor Siswa (Maks: {q.points})
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={q.points}
                          step={1}
                          value={gradeData.points}
                          onChange={(e) => handlePointChange(q.id, q.points, parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-center font-bold text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                        <span className="text-xs text-slate-500 font-semibold">/ {q.points}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rubrik / Kunci Jawaban Guru */}
                  {q.correctAnswer && (
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900">
                      <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Pedoman / Rubrik Penilaian Guru:
                      </div>
                      <div className="whitespace-pre-line leading-relaxed text-amber-900/90 font-mono text-[11px]">
                        {q.correctAnswer}
                      </div>
                    </div>
                  )}

                  {/* Jawaban Siswa */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1.5">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      Jawaban yang Ditulis Siswa:
                    </div>
                    {studentAns.trim() ? (
                      <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans bg-white p-3 rounded border border-slate-200">
                        {studentAns}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic bg-white p-3 rounded border border-slate-200">
                        (Siswa tidak mengisi jawaban untuk butir soal ini)
                      </p>
                    )}
                  </div>

                  {/* Masukan / Feedback Guru */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      Catatan Evaluasi / Masukan untuk Siswa:
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Analisis sudah tepat, perbaiki rumus turunan kedua..."
                      value={gradeData.feedback}
                      onChange={(e) => handleFeedbackChange(q.id, e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              );
            })
          )}

          {/* Catatan Umum Guru */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
            <label className="text-xs font-bold text-slate-800">
              Catatan Akademik Umum (Ditampilkan pada Lembar Rapor Siswa):
            </label>
            <textarea
              rows={2}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Tuliskan apresiasi atau saran pengembangan kompetensi siswa..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Footer with Score Summary & Save CTA */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500">Nilai PG: </span>
              <span className="font-bold text-slate-800">{submission.mcqScore}</span>
            </div>
            <div>
              <span className="text-slate-500">+ Esai: </span>
              <span className="font-bold text-indigo-700">{totalEssayCalculated}</span>
            </div>
            <div className="text-sm font-extrabold text-slate-900 border-l border-slate-300 pl-4">
              Total: <span className={isPassing ? 'text-emerald-600' : 'text-rose-600'}>{finalCalculatedScore.toFixed(1)} / 100</span>
              <span className="text-xs font-semibold ml-2 text-slate-500">
                (KKM: {exam.passingGrade} · {isPassing ? 'LULUS' : 'REMEDIAL'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSaveAll}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              Simpan & Tetapkan Nilai Akhir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
