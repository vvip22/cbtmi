import React, { useState, useRef } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  FileText, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle, 
  FileCheck, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  ClipboardList,
  BookOpen
} from 'lucide-react';
import { Exam, Question, QuestionOption, Subject, ClassRoom } from '../../types/cbt';
import { dbService } from '../../services/dbStore';
import { 
  documentParser,
  parseDocxFile, 
  parsePlainText, 
  hasArabicCharacters, 
  LATIN_TO_ARABIC_OPTION_MAP 
} from '../../services/DocumentParser';

interface ExamEditorModalProps {
  examToEdit?: Exam | null;
  subjects?: Subject[];
  classes?: ClassRoom[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedExam: Exam) => void;
}

export const ExamEditorModal: React.FC<ExamEditorModalProps> = ({
  examToEdit,
  isOpen,
  onClose,
  onSaved
}) => {
  // Manual text inputs for Subject and Class as requested by user
  const [title, setTitle] = useState(examToEdit?.title || '');
  const [description, setDescription] = useState(examToEdit?.description || '');
  const [subjectName, setSubjectName] = useState(examToEdit?.subjectName || 'Matematika & Penalaran Numerasi');
  const [className, setClassName] = useState(examToEdit?.className || 'Kelas VI A');
  const [duration, setDuration] = useState<number>(examToEdit?.duration || 60);
  const [passingGrade, setPassingGrade] = useState<number>(examToEdit?.passingGrade || 75);
  const [maxViolations, setMaxViolations] = useState<number>(examToEdit?.maxViolations || 3);
  const schoolSettings = dbService.getSchoolSettings();
  const [randomize] = useState<boolean>(examToEdit?.randomizeQuestions ?? schoolSettings.randomizeQuestions ?? false);
  const [showResults] = useState<boolean>(examToEdit?.showResults ?? schoolSettings.allowStudentViewResults ?? true);

  // Tabs: 'info' | 'word-upload' | 'questions'
  const [activeTab, setActiveTab] = useState<'info' | 'word-upload' | 'questions'>('info');

  // Questions management
  const [questions, setQuestions] = useState<Question[]>(() => {
    return examToEdit?.questions ? [...examToEdit.questions] : [];
  });
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);

  // File Upload & Parser States
  const [isProcessingWord, setIsProcessingWord] = useState(false);
  const [wordParseSuccessMsg, setWordParseSuccessMsg] = useState('');
  const [inModalError, setInModalError] = useState<string | null>(null);
  const [pastedWordText, setPastedWordText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const DEFAULT_AUTO_INSTRUCTIONS = 
    `Petunjuk Pengerjaan Ujian:\n` +
    `1. Bacalah basmalah sebelum memulai pengerjaan ujian.\n` +
    `2. Periksa kelengkapan butir soal pilihan ganda dan esai sebelum menjawab.\n` +
    `3. Dilarang berpindah jendela/tab browser atau membuka aplikasi lain selama ujian.\n` +
    `4. Kerjakan soal yang lebih mudah terlebih dahulu, gunakan tombol ragu-ragu bila perlu.\n` +
    `5. Seluruh jawaban tersimpan otomatis oleh sistem server CBT MIS NW Korleko.`;

  if (!isOpen) return null;

  const handleSaveExam = () => {
    setInModalError(null);
    if (!subjectName.trim()) {
      setInModalError('Nama Mata Pelajaran wajib diisi.');
      return;
    }
    if (!className.trim()) {
      setInModalError('Nama Kelas Sasaran wajib diisi.');
      return;
    }

    // Judul ujian dan petunjuk pengerjaan dibuat otomatis oleh sistem
    const finalTitle = `Ujian ${subjectName.trim()} - ${className.trim()}`;
    const finalDescription = description.trim() || DEFAULT_AUTO_INSTRUCTIONS;

    const examData: Exam = {
      id: examToEdit?.id || `exam-${Date.now()}`,
      title: finalTitle,
      description: finalDescription,
      subjectId: examToEdit?.subjectId || `sub-custom-${Date.now()}`,
      subjectName: subjectName.trim(),
      classId: examToEdit?.classId || `cls-custom-${Date.now()}`,
      className: className.trim(),
      startTime: examToEdit?.startTime || new Date().toISOString(),
      endTime: examToEdit?.endTime || new Date(Date.now() + 86400 * 1000 * 7).toISOString(),
      duration: Number(duration) || 60,
      passingGrade: Number(passingGrade) || 75,
      isActive: true,
      randomizeQuestions: randomize,
      showResults,
      maxViolations: Number(maxViolations) || 3,
      token: '',
      questions
    };

    dbService.saveExam(examData);
    onSaved(examData);
    onClose();
  };

  // File upload handler (.docx Word)
  const handleWordFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingWord(true);
    setWordParseSuccessMsg('');
    setInModalError(null);

    try {
      const parsed = await parseDocxFile(file);
      if (parsed.questions.length > 0) {
        setQuestions(prev => [...prev, ...parsed.questions]);
        if (!title.trim() && parsed.title) {
          setTitle(parsed.title);
        }
        const mcqCount = parsed.questions.filter(q => q.type === 'MCQ').length;
        const essayCount = parsed.questions.filter(q => q.type === 'ESSAY').length;
        const imgCount = parsed.questions.filter(q => q.imageUrl).length;

        setWordParseSuccessMsg(
          `Word "${file.name}" berhasil diekstrak! ${parsed.questions.length} butir soal (${mcqCount} Pilihan Ganda, ${essayCount} Esai, ${imgCount} Gambar/Diagram).`
        );
        setActiveTab('questions');
        setEditingQuestion(parsed.questions[0]);
      } else {
        setInModalError('Tidak ditemukan butir soal yang terbaca dari file Word ini. Pastikan format teks atau nomor soal jelas.');
      }
    } catch (err: any) {
      console.error(err);
      setInModalError(`Gagal membaca berkas: ${err.message || 'Format dokumen tidak didukung.'}`);
    } finally {
      setIsProcessingWord(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Plain text / paste parser
  const handleParsePastedText = () => {
    setInModalError(null);
    if (!pastedWordText.trim()) {
      setInModalError('Silakan tempelkan teks soal terlebih dahulu.');
      return;
    }
    const parsed = parsePlainText(pastedWordText, title || 'Ujian Impor');
    if (parsed.questions.length > 0) {
      setQuestions(prev => [...prev, ...parsed.questions]);
      const mcqCount = parsed.questions.filter(q => q.type === 'MCQ').length;
      const essayCount = parsed.questions.filter(q => q.type === 'ESSAY').length;
      setWordParseSuccessMsg(`Berhasil mengekstrak ${parsed.questions.length} butir soal (${mcqCount} PG, ${essayCount} Esai)!`);
      setPastedWordText('');
      setActiveTab('questions');
      setEditingQuestion(parsed.questions[0]);
    } else {
      setInModalError('Tidak ditemukan butir soal. Pastikan menyertakan nomor (1., 2.) dan pilihan (A., B., C., D.).');
    }
  };

  const handleAddQuestion = (type: 'MCQ' | 'ESSAY') => {
    const defaultOptions: QuestionOption[] = type === 'MCQ' ? [
      { key: 'A', text: 'Pilihan Jawaban A' },
      { key: 'B', text: 'Pilihan Jawaban B' },
      { key: 'C', text: 'Pilihan Jawaban C' },
      { key: 'D', text: 'Pilihan Jawaban D' }
    ] : [];

    const newQ: Question = {
      id: `q-${Date.now()}`,
      examId: examToEdit?.id || 'temp-exam',
      type,
      text: type === 'MCQ' ? 'Tuliskan butir pertanyaan pilihan ganda di sini...' : 'Tuliskan petunjuk atau uraian soal esai di sini...',
      options: defaultOptions,
      correctAnswer: type === 'MCQ' ? 'A' : 'Rubrik acuan jawaban guru...',
      points: type === 'MCQ' ? 10 : 15,
      orderIndex: questions.length + 1
    };

    setQuestions([...questions, newQ]);
    setEditingQuestion(newQ);
  };

  const handleDeleteQuestion = (qId: string) => {
    setQuestions(questions.filter(q => q.id !== qId));
    if (editingQuestion?.id === qId) setEditingQuestion(null);
  };

  const handleUpdateEditingQuestion = (field: string, val: any) => {
    if (!editingQuestion) return;
    const updated = { ...editingQuestion, [field]: val };
    setEditingQuestion(updated);
    setQuestions(questions.map(q => q.id === editingQuestion.id ? (updated as Question) : q));
  };

  const handleUpdateOption = (index: number, text: string) => {
    if (!editingQuestion || !editingQuestion.options) return;
    const opts = [...editingQuestion.options];
    opts[index] = { ...opts[index], text };
    handleUpdateEditingQuestion('options', opts);
  };

  const handleImageUploadPerQuestion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleUpdateEditingQuestion('imageUrl', base64);
    };
    reader.readAsDataURL(file);
  };

  const totalPoints = questions.reduce((acc, q) => acc + (q.points || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                EduExam CBT MIS NW Korleko
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">Bebas Format & Tanpa Token</span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">
              {examToEdit ? 'Edit Paket Ujian & Butir Soal' : 'Buat Ujian & Unggah Soal Word'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-5 pt-1.5 border-b border-slate-200 flex items-center gap-1.5 bg-white">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Informasi & Pengaturan Ujian
          </button>

          <button
            onClick={() => setActiveTab('word-upload')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'word-upload'
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-indigo-600 hover:text-indigo-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>2. Unggah File Word (.docx)</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'questions'
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>3. Butir Soal ({questions.length})</span>
            <span className="text-[11px] font-mono text-slate-400">Total: {totalPoints} Poin</span>
          </button>
        </div>

        {/* Error Toast */}
        {inModalError && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-xs font-bold text-rose-900 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{inModalError}</span>
            </div>
            <button onClick={() => setInModalError(null)} className="text-rose-700 hover:text-rose-900 text-xs font-bold">
              Tutup
            </button>
          </div>
        )}

        {/* Success Toast */}
        {wordParseSuccessMsg && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-bold text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{wordParseSuccessMsg}</span>
            </div>
            <button onClick={() => setWordParseSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 text-xs">
              Tutup
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* TAB 1: INFORMASI UJIAN (Manual Mapel & Kelas, Rapi & Padat) */}
          {activeTab === 'info' && (
            <div className="space-y-3.5 max-w-4xl">
              {/* Bagian 1: Identitas Mata Pelajaran & Kelas */}
              <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                      Identitas Ujian (Mata Pelajaran & Kelas)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-300 font-bold">
                    Diisi Bebas Tanpa Batasan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Mata Pelajaran:
                    </label>
                    <input
                      type="text"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="Contoh: Matematika, Fiqih, PAI, IPA..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Kelas Sasaran:
                    </label>
                    <input
                      type="text"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="Contoh: Kelas VI A, Kelas 6 B, Semua Kelas VI..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium"
                    />
                  </div>
                </div>

                {/* Banner Judul Otomatis yang Terbentuk */}
                <div className="p-2.5 bg-white rounded-lg border border-emerald-200/80 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[11px] text-slate-500 font-semibold shrink-0">Judul Ujian Otomatis:</span>
                    <span className="text-xs font-black text-slate-900 truncate">
                      {`Ujian ${subjectName || '...'} - ${className || '...'}`}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold shrink-0">
                    Sesuai Standar Madrasah
                  </span>
                </div>
              </div>

              {/* Bagian 2: Durasi, KKM, & Toleransi Curang */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                  Durasi & Ketentuan Kelulusan
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Durasi (Menit):
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={240}
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Waktu hitung mundur ujian</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Batas KKM (Kelulusan):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={passingGrade}
                      onChange={(e) => setPassingGrade(parseFloat(e.target.value) || 75)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Standar kelulusan nilai</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Toleransi Anti-Curang:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={maxViolations}
                      onChange={(e) => setMaxViolations(parseInt(e.target.value) || 3)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Maksimal ganti tab/jendela</span>
                  </div>
                </div>
              </div>


              {/* Bagian 4: Petunjuk Pengerjaan Standar (Kompak & Rapi) */}
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200/80 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Petunjuk Pengerjaan Standar (Otomatis Ditampilkan ke Siswa):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[10.5px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                  <div>1. Bacalah basmalah sebelum memulai pengerjaan ujian.</div>
                  <div>2. Periksa kelengkapan butir soal pilihan ganda dan esai.</div>
                  <div>3. Dilarang berpindah jendela/tab browser selama ujian.</div>
                  <div>4. Kerjakan soal yang lebih mudah terlebih dahulu.</div>
                  <div className="sm:col-span-2">5. Seluruh jawaban tersimpan otomatis oleh sistem server CBT MIS NW Korleko.</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEMPAT UPLOAD SOAL WORD & BEBAS FORMAT */}
          {activeTab === 'word-upload' && (
            <div className="space-y-4 max-w-4xl">
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                    Tempat Upload Soal Microsoft Word (.docx) & Format Bebas
                  </h3>
                </div>
                <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                  Sistem mendukung pembacaan otomatis dari file Word Anda:
                </p>
                <ul className="text-[11px] text-emerald-900/90 list-disc pl-5 space-y-0.5">
                  <li><strong>Format Soal Bebas:</strong> Mendukung penomoran <code>1. </code>, <code>1) </code>, <code>No. 1</code>, atau tanpa nomor.</li>
                  <li><strong>Kunci Jawaban Bebas:</strong> Mendukung <code>Kunci: A</code>, <code>Jawaban: B</code>, <code>Kunci = C</code>, atau daftar kunci jawaban di bagian bawah dokumen.</li>
                  <li><strong>Membaca Lengkap:</strong> Huruf, angka, rumus, <strong>gambar / foto tersemat</strong>, <strong>tabel</strong>, <strong>grafik</strong>, dan <strong>diagram</strong> diekstrak secara otomatis.</li>
                </ul>
              </div>

              {/* Upload Drag & Drop Area */}
              <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl p-5 sm:p-6 text-center bg-emerald-50/20 transition-colors space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".docx,.doc"
                  onChange={handleWordFileUpload}
                  className="hidden"
                  id="word-file-input"
                />

                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-2xs">
                  <FileText className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    {isProcessingWord ? 'Sedang Memproses Dokumen Word...' : 'Pilih atau Seret File Dokumen Word (.docx)'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mendukung file Microsoft Word (.docx) dengan gambar, tabel, dan formula matematika/sains.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="word-file-input"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs ${
                      isProcessingWord
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isProcessingWord ? 'Mengekstrak Soal...' : 'Pilih File Word dari Komputer'}</span>
                  </label>
                </div>
              </div>

              {/* Alternatif: Copy-Paste Teks dari Word */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-slate-600" />
                    Atau Tempel (Copy-Paste) Teks Soal dari Word / Docs:
                  </h4>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSubjectName('BAHASA ARAB');
                        setClassName('Kelas VI A');
                        const arabicText = 
                          `27. susunlah kata-kata acak di bawah ini sehingga menjadi kalimat yang sempurna\n` +
                          `عَيْنٌ - جَمِيْلَةٌ - هَذِهِ\n` +
                          `28. Terjemahkan kedalam Bahasa Indonesia\n` +
                          `هَذِهِ أُذُنٌ , اَلْأُذُنُ لِلسَّمَاعِ\n` +
                          `29. Terjemahkan kedalam Bahasa Arab\n` +
                          `“dikepala ada rambut”\n\n` +
                          `Kunci Jawaban\n` +
                          `Uraian:\n` +
                          `27. هَذِهِ عَيْنٌ جَمِيْلَةٌ\n` +
                          `28. Ini telinga, telinga untuk mendengar\n` +
                          `29. فِي الرَّأْسِ شَعْرٌ`;
                        setPastedWordText(arabicText);
                      }}
                      className="text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-300 transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-teal-600" />
                      <span>Muat Contoh Bahasa Arab (Uraian)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const sampleText = `Soal Pilihan Ganda\n` +
                          `1.\tHasil dari 456 − 123  adalah …\n` +
                          `A. 333\t\tB. 323\t\tC. 343\t\tD. 353\n` +
                          `2.\tHasil dari 700 − 245  adalah …\n` +
                          `A. 455\t\tB. 445\t\tC. 465\t\tD. 475\n` +
                          `3.\tIbu mempunyai 350 jeruk. Diberikan 125 jeruk. Sisa jeruk ibu adalah …\n` +
                          `A. 215\t\tB. 225\t\tC. 235\t\tD. 245\n` +
                          `4.\tHasil dari 864 − 432  adalah …\n` +
                          `A. 422\t\tB. 432\t\tC. 442\t\tD. 452\n` +
                          `5.\tHasil dari 905 − 478 adalah …\n` +
                          `A. 417\t\tB. 427\t\tC. 437\t\tD. 447\n` +
                          `6.\tAyah membeli tali 5 meter. Dipakai 2 meter. Sisa tali adalah …\n` +
                          `A. 2 m\t\tB. 3 m\t\tC. 4 m\t\tD. 5 m\n` +
                          `7.\t1 meter = … cm\n` +
                          `A. 10\t\tB. 100\t\tC. 1.000\t\tD. 10.000\n` +
                          `8.\tPanjang meja 150 cm sama dengan …\n` +
                          `A. 1 m 5 cm\t\tB. 1 m 50 cm\t\tC. 15 m\t\tD. 150 m\n` +
                          `9.\tSatuan untuk mengukur berat semangka adalah …\n` +
                          `A. Cm\t\tB. liter\t\tC. kg\t\tD. meter\n` +
                          `10.\t3 kg = … gram\n` +
                          `A. 30\t\tB. 300\t\tC. 3.000\t\tD. 30.000\n` +
                          `11.\tBerat badan Deni 28 kg, sedangkan Rudi 32 kg. Selisih berat mereka adalah …\n` +
                          `A. 2 kg\t\tB. 3 kg\t\tC. 4 kg\t\tD. 5 kg\n` +
                          `12.\t980 − 560 = …\n` +
                          `A. 410\t\tB. 420\t\tC. 430\t\tD. 440\n` +
                          `13.\tPanjang pensil sekitar …\n` +
                          `A. 15 cm\t\tB. 15 kg\t\tC. 15 liter\t\tD. 15 gram\n` +
                          `14.\t450 gram + 550 gram = …\n` +
                          `A. 100 gram\t\tB. 500 gram\t\tC. 1.000 gram\t\tD. 10.000 gram\n` +
                          `15.\tSinta memiliki pita 8 meter. Dipakai 3 meter. Sisa pita adalah …\n` +
                          `A. 4 m\t\tB. 5 m\t\tC. 6 m\t\tD. 7 m\n` +
                          `16.\t765 − 234 = …\n` +
                          `A. 521\t\tB. 531\t\tC. 541\t\tD. 551\n` +
                          `17.\tBerat seekor ayam adalah 2 kg. Jika ada 4 ayam, berat seluruhnya adalah …\n` +
                          `A. 4 kg\t\tB. 6 kg\t\tC. 8 kg\t\tD. 10 kg\n` +
                          `18.\tPanjang papan 2 meter sama dengan …\n` +
                          `A. 20 cm\t\tB. 200 cm\t\tC. 2.000 cm\t\tD. 20 m\n` +
                          `19.\t600 − 289 = …\n` +
                          `A. 301\t\tB. 311\t\tC. 321\t\tD. 331\n` +
                          `20.\tAlat untuk mengukur berat adalah …\n` +
                          `A. Penggaris\t\tB. Timbangan\t\tC. Jam\t\tD. Meteran\n\n` +
                          `Soal Isian\n` +
                          `1.\t725 − 315 = …\n` +
                          `2.\t1 kg = … gram\n` +
                          `3.\t9 meter = … cm\n` +
                          `4.\t850 − 425 = …\n` +
                          `5.\tBerat gula 5 kg sama dengan … gram\n\n` +
                          `Kunci Jawaban\n` +
                          `Pilihan Ganda:\n` +
                          `1.A\t2.A\t3.B\t4.B\t5.B\t6.B\t7.B\t8.B\t9.C\t10.C\n` +
                          `11.C\t12.B\t13.A\t14.C\t15.B\t16.B\t17.C\t18.B\t19.B\t20.B\n\n` +
                          `Isian:\n` +
                          `1.\t410\n` +
                          `2.\t1.000\n` +
                          `3.\t900\n` +
                          `4.\t425\n` +
                          `5.\t5.000`;
                        setPastedWordText(sampleText);
                      }}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Muat Contoh Matematika (25 Soal)</span>
                    </button>
                  </div>
                </div>

                <textarea
                  rows={8}
                  dir={hasArabicCharacters(pastedWordText) ? 'auto' : 'ltr'}
                  value={pastedWordText}
                  onChange={(e) => setPastedWordText(e.target.value)}
                  placeholder={`Contoh teks bebas yang dapat ditempel:\n\n27. susunlah kata-kata acak di bawah ini sehingga menjadi kalimat yang sempurna\nعَيْنٌ - جَمِيْلَةٌ - هَذِهِ\n\nKunci Jawaban\n27. هَذِهِ عَيْنٌ جَمِيْلَةٌ`}
                  className={`w-full p-3 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden leading-relaxed ${
                    hasArabicCharacters(pastedWordText) ? 'font-arabic text-sm leading-loose' : 'font-mono'
                  }`}
                />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                  <div className="text-[11px] text-slate-500">
                    Otomatis mengenali teks Bahasa Arab berharakat, angka Arab (<code>٠-٩</code>), serta soal uraian dan pilihan ganda.
                  </div>
                  <button
                    onClick={handleParsePastedText}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Ekstrak Teks & Kunci Jawaban</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DAFTAR BUTIR SOAL & PREVIEW LENGKAP DENGAN GAMBAR/TABEL */}
          {activeTab === 'questions' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Question List Sidebar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Daftar Butir Soal ({questions.length})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAddQuestion('MCQ')}
                      className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded transition-colors flex items-center gap-1"
                      title="Tambah Soal Pilihan Ganda Manual"
                    >
                      <Plus className="w-3 h-3" />
                      + PG
                    </button>
                    <button
                      onClick={() => handleAddQuestion('ESSAY')}
                      className="px-2 py-1 text-[11px] font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 rounded transition-colors flex items-center gap-1"
                      title="Tambah Soal Esai Manual"
                    >
                      <Plus className="w-3 h-3" />
                      + Esai
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                  {questions.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4">
                      Belum ada butir soal. Silakan klik tab <strong>Unggah File Word</strong> atau klik tombol <strong>+ PG / + Esai</strong>.
                    </div>
                  ) : (
                    questions.map((q, idx) => (
                      <div
                        key={q.id}
                        onClick={() => setEditingQuestion(q)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                          editingQuestion?.id === q.id
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold shadow-xs ring-1 ring-emerald-300'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            q.type === 'MCQ' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'
                          }`}>
                            {q.type}
                          </span>
                          {q.imageUrl && (
                            <span title="Memiliki gambar/diagram" className="inline-flex">
                              <ImageIcon className="w-3 h-3 text-indigo-600 shrink-0" />
                            </span>
                          )}
                          <span className="truncate">No. {idx + 1} - {q.text.slice(0, 22)}...</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-slate-500">{q.points} pt</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuestion(q.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus butir soal yang tidak digunakan ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Question Editor & Image/Table Canvas */}
              <div className="md:col-span-2 border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
                {editingQuestion ? (
                  <>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Edit Soal No. {editingQuestion.orderIndex}
                        </span>
                        <select
                          value={editingQuestion.type}
                          onChange={(e) => handleUpdateEditingQuestion('type', e.target.value)}
                          className="px-2 py-0.5 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50"
                        >
                          <option value="MCQ">Pilihan Ganda (MCQ)</option>
                          <option value="ESSAY">Soal Uraian / Esai</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-500 font-medium">Bobot:</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={editingQuestion.points || 10}
                            onChange={(e) => handleUpdateEditingQuestion('points', parseInt(e.target.value) || 10)}
                            className="w-14 px-1.5 py-1 text-xs border border-slate-300 rounded text-center font-bold font-mono"
                          />
                          <span className="text-slate-400">poin</span>
                        </div>
                        <button
                          onClick={() => handleDeleteQuestion(editingQuestion.id!)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                          title="Hapus butir soal ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Teks Pertanyaan Soal (Mendukung rumus, angka, simbol):
                      </label>
                      <textarea
                        rows={4}
                        value={editingQuestion.text || ''}
                        onChange={(e) => handleUpdateEditingQuestion('text', e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden leading-relaxed font-sans"
                      />
                    </div>

                    {/* Gambar / Diagram / Grafik Tersemat */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                          Gambar / Diagram / Grafik Soal:
                        </span>
                        {editingQuestion.imageUrl && (
                          <button
                            type="button"
                            onClick={() => handleUpdateEditingQuestion('imageUrl', undefined)}
                            className="text-[11px] text-rose-600 hover:text-rose-800 underline font-semibold"
                          >
                            Hapus Gambar
                          </button>
                        )}
                      </div>

                      {editingQuestion.imageUrl ? (
                        <div className="max-w-md mx-auto p-2 bg-white rounded-lg border border-slate-200 text-center">
                          <img
                            src={editingQuestion.imageUrl}
                            alt="Diagram / Grafik Soal"
                            className="max-h-48 object-contain mx-auto rounded"
                          />
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Gambar terdeteksi dari dokumen Word / unggahan
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors">
                            <Upload className="w-3.5 h-3.5 text-slate-500" />
                            <span>Unggah Gambar / Diagram untuk Soal Ini</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUploadPerQuestion}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* MCQ Options with Flexible Key Selector */}
                    {editingQuestion.type === 'MCQ' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700">
                            Pilihan Jawaban (A - D/E):
                          </label>
                          <span className="text-[11px] text-emerald-700 font-semibold">
                            Kunci Saat Ini: Pilihan {editingQuestion.correctAnswer || 'A'}
                          </span>
                        </div>

                        {(editingQuestion.options || []).map((opt, i) => (
                          <div key={opt.key} className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs shrink-0">
                              {opt.key}
                            </span>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => handleUpdateOption(i, e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateEditingQuestion('correctAnswer', opt.key)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 ${
                                editingQuestion.correctAnswer?.toUpperCase() === opt.key.toUpperCase()
                                  ? 'bg-emerald-700 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {editingQuestion.correctAnswer?.toUpperCase() === opt.key.toUpperCase() ? 'Kunci Benar' : 'Jadikan Kunci'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rubrik / Kunci Jawaban Esai */}
                    {editingQuestion.type === 'ESSAY' && (
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Rubrik Penilaian / Kunci Jawaban Acuan Guru:
                        </label>
                        <textarea
                          rows={3}
                          value={editingQuestion.correctAnswer || ''}
                          onChange={(e) => handleUpdateEditingQuestion('correctAnswer', e.target.value)}
                          placeholder="Tuliskan pedoman jawaban, kata kunci wajib, atau kriteria penilaian..."
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-mono"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-20 text-slate-400 text-xs">
                    Pilih salah satu nomor soal di sebelah kiri untuk melihat rincian teks, kunci jawaban, dan gambar.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {questions.length} Butir Soal Terdaftar · Total Bobot: <span className="font-bold text-slate-800">{totalPoints} Poin</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSaveExam}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Save className="w-4 h-4" />
              Simpan Ujian & Soal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
