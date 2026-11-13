import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Award, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  School, 
  TrendingUp, 
  Printer, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { 
  getRecapDataAllClasses, 
  exportClassRecapToExcel, 
  exportAllClassesRecapToExcel,
  ClassRecapSummary 
} from '../../services/recapScoreExcelService';
import { dbService } from '../../services/dbStore';

export const ClassScoreRecapManager: React.FC = () => {
  const settings = dbService.getSchoolSettings();
  const recapData = getRecapDataAllClasses();

  const [selectedClassName, setSelectedClassName] = useState<string>(() => {
    return recapData.length > 0 ? recapData[0].className : 'Kelas VI A';
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentClassSummary = recapData.find(c => c.className === selectedClassName) || recapData[0];

  const handleDownloadCurrentClass = () => {
    if (!currentClassSummary) return;
    try {
      exportClassRecapToExcel(currentClassSummary.className);
      showToast(`Berkas Excel Rekap Nilai "${currentClassSummary.className}" (1 Lembar Cetak) berhasil diunduh.`);
    } catch (err: any) {
      console.error(err);
      showToast(`Gagal mengunduh: ${err.message || 'Terjadi kesalahan sistem'}`);
    }
  };

  const handleDownloadAllClasses = () => {
    try {
      exportAllClassesRecapToExcel();
      showToast('Berkas Excel Rekap Nilai Semua Kelas (1 Buku Kerja) berhasil diunduh.');
    } catch (err: any) {
      console.error(err);
      showToast(`Gagal mengunduh: ${err.message || 'Terjadi kesalahan sistem'}`);
    }
  };

  if (!currentClassSummary) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center space-y-3">
        <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-sm font-bold text-slate-800">Belum Ada Data Nilai Ujian</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Silakan buat paket ujian dan inputkan siswa untuk melihat rekapitulasi nilai kolektif per kelas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-700">
            &times;
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1">
                <School className="w-3.5 h-3.5" />
                {settings.schoolName || 'MIS NW KORLEKO'}
              </span>
              <span>·</span>
              <span>T.P. {settings.academicYear} ({settings.semester})</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-600" />
              Rekapitulasi Nilai Ujian (Format Excel 1 Lembar Cetak)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dikelompokkan sesuai kelas dengan daftar nama siswa dan nilai seluruh mata pelajaran yang diujikan.
            </p>
          </div>

          {/* Action Download Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadAllClasses}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors"
              title="Unduh Rekap Nilai Seluruh Kelas dalam 1 Buku Kerja Excel"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Unduh Excel Semua Kelas</span>
            </button>

            <button
              onClick={handleDownloadCurrentClass}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors"
              title={`Unduh Rekap Nilai ${currentClassSummary.className} dalam Format 1 Lembar Cetak A4 Landscape`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Unduh Excel ({currentClassSummary.className})</span>
            </button>
          </div>
        </div>

        {/* Class Selection Pills */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 overflow-x-auto">
          <span className="text-xs text-slate-500 font-bold shrink-0">Pilih Kelas:</span>
          {recapData.map((cls) => (
            <button
              key={cls.className}
              onClick={() => setSelectedClassName(cls.className)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedClassName === cls.className
                  ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{cls.className}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedClassName === cls.className ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {cls.students.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Class Statistics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">Total Siswa</span>
          <div className="text-xl font-mono font-black text-slate-900 mt-1 flex items-baseline gap-1">
            {currentClassSummary.students.length} <span className="text-[11px] font-normal text-slate-500">siswa</span>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">Rata-rata Kelas</span>
          <div className="text-xl font-mono font-black text-amber-700 mt-1">
            {currentClassSummary.classAverage.toFixed(1)} <span className="text-[11px] font-normal text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">Tuntas (Lulus)</span>
          <div className="text-xl font-mono font-black text-emerald-700 mt-1 flex items-baseline gap-1">
            {currentClassSummary.passedCount} <span className="text-[11px] font-normal text-emerald-600">siswa</span>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">Perlu Remedial</span>
          <div className="text-xl font-mono font-black text-rose-700 mt-1 flex items-baseline gap-1">
            {currentClassSummary.remedialCount} <span className="text-[11px] font-normal text-rose-500">siswa</span>
          </div>
        </div>
      </div>

      {/* Table Preview (Mirrors Exact Excel Format) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        {/* Table Top Ribbon */}
        <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
              Pratinjau Leger Nilai: {currentClassSummary.className}
            </h3>
          </div>
          <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" />
            <span>Format Cetak 1 Lembar A4 Landscape</span>
          </div>
        </div>

        {/* Scrollable Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b-2 border-slate-300">
                <th className="py-2.5 px-3 font-bold text-center w-12 border-r border-slate-200">No</th>
                <th className="py-2.5 px-3 font-bold w-28 border-r border-slate-200">NISN</th>
                <th className="py-2.5 px-3 font-bold min-w-[180px] border-r border-slate-200">Nama Siswa</th>
                {currentClassSummary.subjects.map((sub) => (
                  <th key={sub.name} className="py-2.5 px-3 font-bold text-center border-r border-slate-200 bg-amber-50/60 text-amber-950">
                    <div className="text-[11px] leading-tight">{sub.name}</div>
                    <div className="text-[9.5px] font-mono text-slate-500 font-normal">KKM: {sub.passingGrade}</div>
                  </th>
                ))}
                <th className="py-2.5 px-3 font-bold text-center w-24 border-r border-slate-200 bg-emerald-50/80 text-emerald-950">
                  Total Nilai
                </th>
                <th className="py-2.5 px-3 font-bold text-center w-20 border-r border-slate-200 bg-emerald-100/60 text-emerald-950">
                  Rata-rata
                </th>
                <th className="py-2.5 px-3 font-bold text-center w-24 border-r border-slate-200">
                  Status
                </th>
                <th className="py-2.5 px-3 font-bold text-center w-16">
                  Peringkat
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentClassSummary.students.length === 0 ? (
                <tr>
                  <td colSpan={currentClassSummary.subjects.length + 7} className="py-8 text-center text-slate-400">
                    Belum ada siswa terdaftar pada kelas ini.
                  </td>
                </tr>
              ) : (
                currentClassSummary.students.map((student, idx) => {
                  const isTop3 = student.rank && student.rank <= 3;
                  return (
                    <tr 
                      key={student.studentId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isTop3 ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center font-mono font-medium text-slate-500 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 border-r border-slate-100">
                        {student.nisn}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-100">
                        {student.name}
                      </td>
                      {currentClassSummary.subjects.map((sub) => {
                        const score = student.subjectScores[sub.name];
                        return (
                          <td 
                            key={sub.name} 
                            className="py-2 px-3 text-center font-mono font-semibold border-r border-slate-100 text-slate-800"
                          >
                            {score !== null && score !== undefined ? (
                              <span className={score >= sub.passingGrade ? 'text-slate-800 font-bold' : 'text-rose-600 font-bold'}>
                                {score.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 border-r border-slate-100 bg-emerald-50/30">
                        {student.totalScore.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-extrabold text-emerald-800 border-r border-slate-100 bg-emerald-50/50">
                        {student.averageScore.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-center border-r border-slate-100">
                        <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-extrabold ${
                          student.status === 'LULUS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-bold">
                        {student.rank === 1 ? (
                          <span className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 inline-flex items-center justify-center text-[10px] font-black shadow-xs">
                            1
                          </span>
                        ) : student.rank === 2 ? (
                          <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-800 inline-flex items-center justify-center text-[10px] font-black">
                            2
                          </span>
                        ) : student.rank === 3 ? (
                          <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 inline-flex items-center justify-center text-[10px] font-black">
                            3
                          </span>
                        ) : (
                          <span className="font-mono text-slate-600">{student.rank}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer Summary Row */}
            <tfoot className="bg-slate-100/90 font-bold text-slate-800 border-t-2 border-slate-300">
              <tr>
                <td colSpan={3} className="py-2 px-3 text-right text-xs uppercase tracking-wide border-r border-slate-200">
                  Rata-rata Kelas
                </td>
                {currentClassSummary.subjects.map((sub) => {
                  const scores = currentClassSummary.students
                    .map(std => std.subjectScores[sub.name])
                    .filter((s): s is number => typeof s === 'number');
                  const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';
                  return (
                    <td key={sub.name} className="py-2 px-3 text-center font-mono border-r border-slate-200 text-amber-900 font-bold">
                      {avg}
                    </td>
                  );
                })}
                <td className="py-2 px-3 text-center font-mono border-r border-slate-200">-</td>
                <td className="py-2 px-3 text-center font-mono font-black text-emerald-900 border-r border-slate-200">
                  {currentClassSummary.classAverage.toFixed(1)}
                </td>
                <td colSpan={2} className="py-2 px-3 text-center text-[11px] text-slate-600">
                  Tuntas: <b className="text-emerald-700">{currentClassSummary.passedCount}</b> | Remedial: <b className="text-rose-600">{currentClassSummary.remedialCount}</b>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Guidance Note */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Format Excel telah dioptimasi dengan tata letak <b>A4 Landscape (Fit to 1 Page Width & Height)</b> untuk arsip kurikulum madrasah.
            </span>
          </div>
          <button
            onClick={handleDownloadCurrentClass}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1 shrink-0 self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sekarang (.xlsx)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
