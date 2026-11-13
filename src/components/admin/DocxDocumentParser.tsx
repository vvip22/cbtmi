import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  Image as ImageIcon, 
  Table as TableIcon, 
  Check, 
  Trash2, 
  Edit3, 
  HelpCircle, 
  ArrowRight,
  BookOpen,
  Calendar,
  Save,
  Languages
} from 'lucide-react';
import { 
  documentParser,
  parseDocxFile, 
  parsePlainText, 
  hasArabicCharacters, 
  LATIN_TO_ARABIC_OPTION_MAP 
} from '../../services/DocumentParser';
import { Exam, Question, QuestionOption } from '../../types/cbt';
import { dbService } from '../../services/dbStore';

interface DocxDocumentParserProps {
  onExamCreated?: (newExam: Exam) => void;
  onRefreshData?: () => void;
}

export const DocxDocumentParser: React.FC<DocxDocumentParserProps> = ({
  onExamCreated,
  onRefreshData
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [documentTitle, setDocumentTitle] = useState('');
  const [subjectName, setSubjectName] = useState('BAHASA ARAB');
  const [className, setClassName] = useState('Kelas VI A');
  const [duration, setDuration] = useState(60);
  const [passingGrade, setPassingGrade] = useState(75);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Perhitungan statistik hasil ekstraksi
  const totalQuestions = extractedQuestions.length;
  const mcqCount = extractedQuestions.filter(q => q.type === 'MCQ').length;
  const essayCount = extractedQuestions.filter(q => q.type === 'ESSAY').length;
  const imagesCount = extractedQuestions.filter(q => !!q.imageUrl).length;
  const tablesCount = extractedQuestions.filter(q => q.text.includes('<table')).length;
  const keysFoundCount = extractedQuestions.filter(q => q.correctAnswer && q.correctAnswer !== 'Rubrik acuan guru...').length;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // Menggunakan mammoth.js untuk mengekstrak dokumen Word (.docx)
      const result = await parseDocxFile(file);
      if (result.questions && result.questions.length > 0) {
        setExtractedQuestions(result.questions);
        setSelectedQuestion(result.questions[0]);
        setDocumentTitle(result.title || file.name.replace(/\.[^/.]+$/, ''));
        
        const mcq = result.questions.filter(q => q.type === 'MCQ').length;
        const essay = result.questions.filter(q => q.type === 'ESSAY').length;
        const imgs = result.questions.filter(q => !!q.imageUrl).length;
        const tbls = result.questions.filter(q => q.text.includes('<table')).length;

        setSuccessMessage(
          `Dokumen Word "${file.name}" berhasil diproses! Ditemukan ${result.questions.length} butir soal (${mcq} PG, ${essay} Esai, ${imgs} Gambar, ${tbls} Tabel) dengan kunci jawaban otomatis.`
        );
      } else {
        setErrorMessage('Tidak ditemukan format soal dalam file Word ini. Pastikan format nomor soal jelas.');
      }
    } catch (err: any) {
      console.error('Word extraction error:', err);
      setErrorMessage(`Gagal mengekstrak dokumen Word: ${err.message || 'Format tidak didukung'}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleParsePasted = () => {
    if (!pastedText.trim()) {
      setErrorMessage('Silakan tempel teks soal terlebih dahulu.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = parsePlainText(pastedText, 'Ujian Impor Teks');
      if (result.questions && result.questions.length > 0) {
        setExtractedQuestions(result.questions);
        setSelectedQuestion(result.questions[0]);
        const mcq = result.questions.filter(q => q.type === 'MCQ').length;
        const essay = result.questions.filter(q => q.type === 'ESSAY').length;
        setSuccessMessage(`Berhasil mengekstrak ${result.questions.length} butir soal (${mcq} Pilihan Ganda & ${essay} Isian/Uraian) dengan kunci jawaban otomatis.`);
      } else {
        setErrorMessage('Tidak ada butir soal yang berhasil dipisahkan. Pastikan ada nomor soal (1., 2.) dan opsi (A., B.).');
      }
    } catch (err: any) {
      setErrorMessage(`Gagal parsing teks: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAsExam = () => {
    if (extractedQuestions.length === 0) {
      alert('Belum ada butir soal yang diekstrak.');
      return;
    }
    if (!subjectName.trim()) {
      alert('Nama Mata Pelajaran wajib diisi.');
      return;
    }
    if (!className.trim()) {
      alert('Nama Kelas Sasaran wajib diisi.');
      return;
    }

    const autoTitle = `Ujian ${subjectName.trim()} - ${className.trim()}`;
    const autoInstructions = 
      `Petunjuk Pengerjaan Ujian:\n` +
      `1. Bacalah basmalah sebelum memulai pengerjaan ujian.\n` +
      `2. Periksa kelengkapan butir soal pilihan ganda dan esai sebelum menjawab.\n` +
      `3. Dilarang berpindah jendela/tab browser atau membuka aplikasi lain selama ujian.\n` +
      `4. Kerjakan soal yang lebih mudah terlebih dahulu, gunakan tombol ragu-ragu bila perlu.\n` +
      `5. Seluruh jawaban tersimpan otomatis oleh sistem server CBT MIS NW Korleko.`;

    const newExam: Exam = {
      id: `exam-${Date.now()}`,
      title: autoTitle,
      description: autoInstructions,
      subjectId: `sub-${Date.now()}`,
      subjectName: subjectName.trim(),
      classId: `cls-${Date.now()}`,
      className: className.trim(),
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 86400 * 1000 * 7).toISOString(),
      duration: Number(duration) || 60,
      passingGrade: Number(passingGrade) || 75,
      isActive: true,
      randomizeQuestions: false,
      showResults: true,
      maxViolations: 3,
      token: '', // Bebas token
      questions: extractedQuestions
    };

    dbService.saveExam(newExam);
    if (onExamCreated) onExamCreated(newExam);
    if (onRefreshData) onRefreshData();

    alert(`Paket Ujian "${newExam.title}" berhasil dibuat dengan ${extractedQuestions.length} butir soal dan langsung aktif untuk siswa.`);
  };

  const handleUpdateSelectedQuestion = (field: string, value: any) => {
    if (!selectedQuestion) return;
    const updated = { ...selectedQuestion, [field]: value };
    setSelectedQuestion(updated);
    setExtractedQuestions(prev => prev.map(q => q.id === selectedQuestion.id ? updated : q));
  };

  const handleDeleteQuestion = (qId: string) => {
    const updated = extractedQuestions.filter(q => q.id !== qId);
    setExtractedQuestions(updated);
    if (selectedQuestion?.id === qId) {
      setSelectedQuestion(updated.length > 0 ? updated[0] : null);
    }
  };

  const loadMathSample = () => {
    const sample = `Soal Pilihan Ganda\n` +
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
    setPastedText(sample);
  };

  const loadArabicSample = () => {
    setSubjectName('BAHASA ARAB');
    setClassName('Kelas VI A');
    const arabicSample = 
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

    setPastedText(arabicSample);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-[11px] font-extrabold tracking-wide uppercase">
                Mammoth.js & Smart Regex Parser
              </span>
              <span className="text-emerald-300">·</span>
              <span className="text-xs text-emerald-100">Mendukung Bahasa Arab, Teks Berharakat, Angka ٠-٩ & Soal Uraian</span>
            </div>
            <h2 className="text-xl font-black mt-1">
              Parser Dokumen Ujian Word (.docx) & Teks Arab
            </h2>
            <p className="text-xs text-emerald-100 max-w-2xl mt-1 leading-relaxed">
              Mengekstrak teks soal Latin & Arab, opsi jawaban (A–D / أ–د), soal uraian/esai tanpa opsi,
              tabel, gambar/diagram tersemat, dan kunci jawaban otomatis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="docx-file-upload-primary"
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md ${
                isProcessing
                  ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                  : 'bg-white hover:bg-emerald-50 text-emerald-900'
              }`}
            >
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>{isProcessing ? 'Memproses File Word...' : 'Unggah File Word (.docx)'}</span>
              <input
                id="docx-file-upload-primary"
                type="file"
                ref={fileInputRef}
                accept=".docx,.doc"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start justify-between gap-3 text-xs text-emerald-900 font-semibold shadow-2xs">
          <div className="flex items-start gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block text-sm">Ekstraksi Sukses:</span>
              <span className="font-normal">{successMessage}</span>
            </div>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-700 hover:text-emerald-900 font-bold">
            Tutup
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl flex items-start justify-between gap-3 text-xs text-rose-900 font-semibold">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block text-sm">Terjadi Kendala:</span>
              <span className="font-normal">{errorMessage}</span>
            </div>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-700 hover:text-rose-900 font-bold">
            Tutup
          </button>
        </div>
      )}

      {/* Main Grid: Input Sources on Left / Stats & Target Metadata on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dropzone & Paste Box */}
        <div className="lg:col-span-2 space-y-4">
          {/* Dropzone Box */}
          <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-6 bg-white transition-all text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tarik & Lepas File Microsoft Word (.docx) di Sini
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Membaca teks Latin & Arab, tabel data, gambar tersemat, formula, dan kunci jawaban.
              </p>
            </div>
            <div>
              <label
                htmlFor="docx-file-upload-secondary"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih Berkas Word</span>
                <input
                  id="docx-file-upload-secondary"
                  type="file"
                  accept=".docx,.doc"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Paste Raw Text Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold text-slate-800">
                  Atau Tempel (Copy-Paste) Teks Dokumen Soal:
                </h3>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={loadArabicSample}
                  className="text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-300 transition-colors flex items-center gap-1.5"
                  title="Muat teks soal Bahasa Arab uraian persis seperti di tangkapan layar"
                >
                  <Languages className="w-3.5 h-3.5 text-teal-700" />
                  <span>Muat Contoh Bahasa Arab (Uraian)</span>
                </button>
                <button
                  type="button"
                  onClick={loadMathSample}
                  className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Muat Contoh Matematika (20 PG + 5 Isian)</span>
                </button>
              </div>
            </div>

            <textarea
              rows={8}
              dir={hasArabicCharacters(pastedText) ? 'auto' : 'ltr'}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Tempel teks soal di sini... Mendukung teks Bahasa Arab berharakat, angka Arab (٠-٩), penomoran soal (27., 28., 29.), soal pilihan ganda maupun soal uraian, dan kunci jawaban di bawah."
              className={`w-full p-3 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden leading-relaxed ${
                hasArabicCharacters(pastedText) ? 'font-arabic text-sm leading-loose' : 'font-mono'
              }`}
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Mendukung teks Arab, angka Arab (<code>٠-٩</code>), simbol (<code>−</code>, <code>…</code>), dan soal uraian tanpa opsi.
              </span>
              <button
                type="button"
                onClick={handleParsePasted}
                disabled={isProcessing || !pastedText.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Ekstrak Teks Ini</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Target Subject/Class Configuration & Stats */}
        <div className="space-y-4">
          {/* Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Target Ujian (Diisi Manual)</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Mata Pelajaran (Manual):
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Ketik manual, misal: Matematika, Fiqih, IPA..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kelas Sasaran (Manual):
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Ketik manual, misal: Kelas VI A, Kelas 5 B..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
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
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    KKM (Kelulusan):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={passingGrade}
                    onChange={(e) => setPassingGrade(parseInt(e.target.value) || 75)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Otomatisasi Info */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
              <span className="font-extrabold block">Bebas Token & Judul Otomatis:</span>
              <p className="text-slate-600 leading-relaxed">
                Judul ujian: <strong>{`Ujian ${subjectName || '...'} - ${className || '...'}`}</strong>.
                Siswa dapat langsung mengerjakan tanpa perlu memasukkan token ujian manual.
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleSaveAsExam}
              disabled={extractedQuestions.length === 0}
              className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                extractedQuestions.length > 0
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>Simpan & Terbitkan Ujian Langsung ({totalQuestions} Soal)</span>
            </button>
          </div>

          {/* Quick Metrics of Extracted Elements */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Statistik Ekstraksi Dokumen
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">TOTAL SOAL</span>
                <span className="text-base font-extrabold text-slate-900 font-mono">{totalQuestions} Butir</span>
              </div>
              <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block font-medium">PILIHAN GANDA</span>
                <span className="text-base font-extrabold text-emerald-800 font-mono">{mcqCount} Butir</span>
              </div>
              <div className="p-2.5 bg-teal-50/60 rounded-lg border border-teal-100">
                <span className="text-[10px] text-teal-700 block font-medium">SOAL ISIAN / ESAI</span>
                <span className="text-base font-extrabold text-teal-800 font-mono">{essayCount} Butir</span>
              </div>
              <div className="p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-100">
                <span className="text-[10px] text-indigo-700 block font-medium">KUNCI TERDETEKSI</span>
                <span className="text-base font-extrabold text-indigo-800 font-mono">{keysFoundCount} Butir</span>
              </div>
              <div className="p-2.5 bg-purple-50/60 rounded-lg border border-purple-100">
                <span className="text-[10px] text-purple-700 block font-medium">GAMBAR / FOTO</span>
                <span className="text-base font-extrabold text-purple-800 font-mono">{imagesCount} Gambar</span>
              </div>
              <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-100">
                <span className="text-[10px] text-amber-700 block font-medium">TABEL DATA</span>
                <span className="text-base font-extrabold text-amber-800 font-mono">{tablesCount} Tabel</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extracted Questions Viewer & Editor Stage */}
      {extractedQuestions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Hasil Pemisahan Regex & Mammoth.js
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-500 font-medium">
                  {extractedQuestions.length} Butir Soal Siap Digunakan
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                Daftar Butir Soal, Opsi Jawaban (A-D), dan Kunci Jawaban
              </h3>
            </div>

            <button
              onClick={handleSaveAsExam}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Paket Ujian Sekarang</span>
            </button>
          </div>

          {/* 2-Column Split: Question List on Left, Detail Viewer on Right */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Scrollable Question List */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-2">
              {extractedQuestions.map((q, idx) => {
                const isArabic = hasArabicCharacters(q.text);
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuestion(q)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      selectedQuestion?.id === q.id
                        ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950 shadow-2xs ring-1 ring-emerald-300'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        q.type === 'MCQ' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'
                      }`}>
                        {q.type === 'MCQ' ? 'PG' : 'URAIAN'}
                      </span>
                      {isArabic && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">
                          ARAB
                        </span>
                      )}
                      {q.imageUrl && (
                        <span title="Memiliki Gambar/Diagram" className="text-indigo-600">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {q.text.includes('<table') && (
                        <span title="Memiliki Tabel Data" className="text-amber-600">
                          <TableIcon className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <span className={`truncate ${isArabic ? 'font-arabic text-sm' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
                        No. {q.orderIndex || idx + 1} - {q.text.replace(/<[^>]*>?/gm, '').slice(0, 24)}...
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono shrink-0 font-bold max-w-[100px] truncate" title={q.correctAnswer}>
                      Kunci: {q.correctAnswer}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Right: Detailed Card View & Editor */}
            <div className="md:col-span-2 border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-5">
              {selectedQuestion ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-emerald-700 text-white text-xs font-black rounded-lg">
                        SOAL NO. {selectedQuestion.orderIndex}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {selectedQuestion.type === 'MCQ' ? 'Pilihan Ganda (PG)' : 'Soal Uraian / Esai'}
                      </span>
                      {hasArabicCharacters(selectedQuestion.text) && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                          Bahasa Arab
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus soal ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text Preview */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Teks Pertanyaan Soal:
                    </label>
                    {selectedQuestion.text.includes('<table') || selectedQuestion.text.includes('<div') ? (
                      <div 
                        dir={hasArabicCharacters(selectedQuestion.text) ? 'rtl' : 'ltr'}
                        className={`p-4 bg-white border border-slate-200 rounded-xl text-xs leading-relaxed ${
                          hasArabicCharacters(selectedQuestion.text) ? 'font-arabic text-base sm:text-lg leading-loose' : ''
                        }`}
                        dangerouslySetInnerHTML={{ __html: selectedQuestion.text }}
                      />
                    ) : (
                      <div 
                        dir={hasArabicCharacters(selectedQuestion.text) ? 'rtl' : 'ltr'}
                        className={`p-4 bg-white border border-slate-200 rounded-xl ${
                          hasArabicCharacters(selectedQuestion.text)
                            ? 'font-arabic text-base sm:text-lg leading-loose text-slate-900 font-semibold'
                            : 'text-xs text-slate-900 leading-relaxed font-sans whitespace-pre-line font-medium'
                        }`}
                      >
                        {selectedQuestion.text}
                      </div>
                    )}
                  </div>

                  {/* Embedded Image Preview */}
                  {selectedQuestion.imageUrl && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-1">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide block">
                        Gambar / Diagram Terdeteksi dari Dokumen Word
                      </span>
                      <img
                        src={selectedQuestion.imageUrl}
                        alt="Gambar Soal"
                        className="max-h-56 object-contain mx-auto rounded-lg"
                      />
                    </div>
                  )}

                  {/* MCQ Options Display */}
                  {selectedQuestion.type === 'MCQ' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          Opsi Jawaban yang Berhasil Dipisahkan (A, B, C, D):
                        </label>
                        <span className="text-xs font-extrabold text-emerald-800">
                          Kunci Benar: Pilihan {selectedQuestion.correctAnswer}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(selectedQuestion.options || []).map((opt) => {
                          const isKey = selectedQuestion.correctAnswer?.toUpperCase() === opt.key.toUpperCase();
                          const isArabicOpt = hasArabicCharacters(opt.text);
                          const arabicLetter = LATIN_TO_ARABIC_OPTION_MAP[opt.key.toUpperCase()];
                          return (
                            <div
                              key={opt.key}
                              onClick={() => handleUpdateSelectedQuestion('correctAnswer', opt.key)}
                              className={`p-2.5 rounded-xl border text-xs flex items-center gap-3 cursor-pointer transition-all ${
                                isKey
                                  ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-950 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isKey ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-800'
                              }`}>
                                {arabicLetter ? `${arabicLetter}` : opt.key}
                              </span>
                              <span 
                                dir={isArabicOpt ? 'rtl' : 'ltr'} 
                                className={`flex-1 ${isArabicOpt ? 'font-arabic text-sm' : ''}`}
                              >
                                {opt.text}
                              </span>
                              {isKey && (
                                <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">
                                  Kunci
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Essay Key / Rubric Display */}
                  {selectedQuestion.type === 'ESSAY' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Kunci Jawaban / Rubrik Acuan Koreksi Guru:
                      </label>
                      <div 
                        dir={hasArabicCharacters(selectedQuestion.correctAnswer || '') ? 'rtl' : 'ltr'}
                        className={`p-3 bg-white border border-slate-200 rounded-xl font-bold text-emerald-950 ${
                          hasArabicCharacters(selectedQuestion.correctAnswer || '')
                            ? 'font-arabic text-base sm:text-lg leading-loose'
                            : 'text-xs font-mono'
                        }`}
                      >
                        {selectedQuestion.correctAnswer}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-24 text-slate-400 text-xs">
                  Pilih salah satu nomor soal di sebelah kiri untuk melihat rincian teks, tabel, gambar, dan kunci jawaban.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
