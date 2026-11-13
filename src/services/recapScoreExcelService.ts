/**
 * Service Ekspor Rekapitulasi Nilai Ujian Semester Berbasis Kelas
 * MIS NW KORLEKO CBT
 * 
 * Fitur:
 * 1. Mengelompokkan data berdasarkan Kelas (Kelas VI A, Kelas VI B, Kelas V A, dst.)
 * 2. Menampilkan Nama Siswa, NISN, dan nilai setiap Mata Pelajaran yang diujikan
 * 3. Menghitung Total Nilai, Rata-rata, Status Kelulusan (Lulus/Remedial), dan Peringkat
 * 4. Diformat presisi untuk 1 Lembar Kertas Cetak (A4 Landscape, fitToWidth: 1, fitToHeight: 1)
 * 5. Format Microsoft Excel (.xlsx) dengan SheetJS
 */

import * as XLSX from 'xlsx';
import { SchoolSettings, Exam, Submission, User, ClassRoom } from '../types/cbt';
import { dbService } from './dbStore';

export interface StudentSubjectScore {
  studentId: string;
  nisn: string;
  name: string;
  kelas: string;
  subjectScores: Record<string, number | null>; // examId/subjectName -> score
  totalScore: number;
  averageScore: number;
  status: 'LULUS' | 'REMEDIAL';
  rank?: number;
}

export interface ClassRecapSummary {
  className: string;
  subjects: Array<{ id: string; name: string; passingGrade: number }>;
  students: StudentSubjectScore[];
  classAverage: number;
  highestScore: number;
  lowestScore: number;
  passedCount: number;
  remedialCount: number;
}

/**
 * Mengambil dan menyusun data rekapitulasi nilai untuk seluruh kelas
 */
export function getRecapDataAllClasses(): ClassRecapSummary[] {
  const exams = dbService.getExams();
  const allSubmissions = dbService.getSubmissions();
  const rawUsers = dbService.getUsers();
  const classes = dbService.getClasses();

  // Dapatkan semua siswa (dari dbStore + cards localStorage jika ada)
  let studentsList = rawUsers.filter(u => u.role === 'PESERTA' || u.role === 'STUDENT');

  try {
    const savedCards = localStorage.getItem('misnw_cbt_cards_students_v1');
    if (savedCards) {
      const parsedCards = JSON.parse(savedCards);
      parsedCards.forEach((c: any) => {
        if (!studentsList.some(s => s.id === c.id || s.nisn === c.nisn)) {
          studentsList.push({
            id: c.id,
            username: c.username || c.nisn,
            name: c.name,
            email: `${c.username || c.nisn}@misnwkorleko.sch.id`,
            role: 'PESERTA',
            nisn: c.nisn,
            kelas: c.kelas || 'Kelas VI A'
          });
        }
      });
    }
  } catch (e) {
    console.error('Error reading saved card students:', e);
  }

  // Identifikasi seluruh kelas unik
  const classNamesSet = new Set<string>();
  classes.forEach(c => classNamesSet.add(c.name));
  exams.forEach(e => {
    if (e.className) classNamesSet.add(e.className);
  });
  studentsList.forEach(s => {
    if (s.kelas) classNamesSet.add(s.kelas);
  });

  const sortedClassNames = Array.from(classNamesSet).sort((a, b) => a.localeCompare(b));

  const result: ClassRecapSummary[] = [];

  for (const clsName of sortedClassNames) {
    // Siswa di kelas ini
    const classStudents = studentsList.filter(s => s.kelas === clsName);
    if (classStudents.length === 0 && !exams.some(e => e.className === clsName)) {
      continue;
    }

    // Mata pelajaran / Ujian di kelas ini (atau ujian umum)
    const classExams = exams.filter(e => !e.className || e.className === clsName || e.className === 'Semua Kelas');
    const subjectsMap = new Map<string, { id: string; name: string; passingGrade: number }>();

    classExams.forEach(e => {
      const subName = e.subjectName || e.title.split(' ')[0] || 'Mata Pelajaran';
      if (!subjectsMap.has(subName)) {
        subjectsMap.set(subName, {
          id: e.id,
          name: subName,
          passingGrade: e.passingGrade || 75
        });
      }
    });

    // Jika tidak ada ujian spesifik kelas, masukkan semua ujian aktif
    if (subjectsMap.size === 0) {
      exams.forEach(e => {
        const subName = e.subjectName || e.title;
        if (!subjectsMap.has(subName)) {
          subjectsMap.set(subName, {
            id: e.id,
            name: subName,
            passingGrade: e.passingGrade || 75
          });
        }
      });
    }

    const subjects = Array.from(subjectsMap.values());

    // Hitung nilai setiap siswa
    const studentScores: StudentSubjectScore[] = classStudents.map(student => {
      const scoreObj: Record<string, number | null> = {};
      let total = 0;
      let countWithScore = 0;

      subjects.forEach(sub => {
        // Cari submission yang cocok dengan siswa ini
        const subRecord = allSubmissions.find(s => 
          (s.studentId === student.id || s.studentNisn === student.nisn || s.studentName === student.name) &&
          (s.examId === sub.id || (exams.find(e => e.id === s.examId)?.subjectName === sub.name))
        );

        if (subRecord && typeof subRecord.score === 'number') {
          scoreObj[sub.name] = subRecord.score;
          total += subRecord.score;
          countWithScore++;
        } else {
          scoreObj[sub.name] = null;
        }
      });

      const avg = countWithScore > 0 ? parseFloat((total / countWithScore).toFixed(1)) : 0;
      const status: 'LULUS' | 'REMEDIAL' = avg >= 75 ? 'LULUS' : 'REMEDIAL';

      return {
        studentId: student.id,
        nisn: student.nisn || '-',
        name: student.name,
        kelas: clsName,
        subjectScores: scoreObj,
        totalScore: parseFloat(total.toFixed(1)),
        averageScore: avg,
        status
      };
    });

    // Urutkan siswa berdasarkan Rata-rata / Total nilai menurun untuk menentukan peringkat
    studentScores.sort((a, b) => b.averageScore - a.averageScore);
    studentScores.forEach((s, idx) => {
      s.rank = idx + 1;
    });

    // Statistik Kelas
    const totalAvgs = studentScores.map(s => s.averageScore).filter(a => a > 0);
    const classAvg = totalAvgs.length > 0 ? parseFloat((totalAvgs.reduce((a, b) => a + b, 0) / totalAvgs.length).toFixed(1)) : 0;
    const highest = totalAvgs.length > 0 ? Math.max(...totalAvgs) : 0;
    const lowest = totalAvgs.length > 0 ? Math.min(...totalAvgs) : 0;
    const passed = studentScores.filter(s => s.status === 'LULUS').length;
    const remedial = studentScores.filter(s => s.status === 'REMEDIAL').length;

    result.push({
      className: clsName,
      subjects,
      students: studentScores,
      classAverage: classAvg,
      highestScore: highest,
      lowestScore: lowest,
      passedCount: passed,
      remedialCount: remedial
    });
  }

  return result;
}

/**
 * Membentuk worksheet Excel untuk satu kelas tertentu yang pas dalam 1 lembar kertas A4 Landscape
 */
function createClassRecapWorksheet(summary: ClassRecapSummary, settings: SchoolSettings): XLSX.WorkSheet {
  const rows: any[][] = [];

  // Kop Surat Madrasah MIS NW KORLEKO
  rows.push([(settings.foundationName || 'YAYASAN PENDIDIKAN PONDOK PESANTREN DARUNNAHDLAH KORLEKO').toUpperCase()]);
  rows.push([(settings.schoolName || 'MIS NW KORLEKO').toUpperCase() + ' - KABUPATEN LOMBOK TIMUR']);
  rows.push(['REKAPITULASI NILAI ASESMEN SUMATIF / UJIAN SEMESTER (LEGER NILAI CBT)']);
  rows.push([
    `Tahun Pelajaran: ${settings.academicYear || '2026/2027'}  |  Semester: ${settings.semester || 'Ganjil'}  |  Kelas: ${summary.className.toUpperCase()}  |  Dicetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`
  ]);
  rows.push([]); // Baris kosong pemisah

  // Header Tabel Kolom Utama
  const headers = [
    'NO',
    'NISN',
    'NAMA SISWA',
    ...summary.subjects.map(s => s.name.toUpperCase()),
    'TOTAL NILAI',
    'RATA-RATA',
    'STATUS',
    'PERINGKAT'
  ];
  rows.push(headers);

  // Baris Data Setiap Siswa
  summary.students.forEach((std, idx) => {
    const row = [
      idx + 1,
      std.nisn,
      std.name,
      ...summary.subjects.map(sub => {
        const val = std.subjectScores[sub.name];
        return val !== null && val !== undefined ? val : '-';
      }),
      std.totalScore,
      std.averageScore,
      std.status,
      std.rank || idx + 1
    ];
    rows.push(row);
  });

  // Baris Kosong Pemisah
  rows.push([]);

  // Baris Ringkasan Statistik Kelas
  const subjectAverages = summary.subjects.map(sub => {
    const scores = summary.students
      .map(std => std.subjectScores[sub.name])
      .filter((s): s is number => typeof s === 'number');
    if (scores.length === 0) return '-';
    return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
  });

  rows.push([
    '',
    '',
    'RATA-RATA NILAI MAPEL',
    ...subjectAverages,
    '-',
    summary.classAverage,
    `Tuntas: ${summary.passedCount}`,
    `Remedial: ${summary.remedialCount}`
  ]);

  rows.push([
    '',
    '',
    'NILAI TERTINGGI KELAS',
    ...summary.subjects.map(() => '-'),
    '-',
    summary.highestScore,
    '',
    ''
  ]);

  rows.push([
    '',
    '',
    'NILAI TERENDAH KELAS',
    ...summary.subjects.map(() => '-'),
    '-',
    summary.lowestScore,
    '',
    ''
  ]);

  // Baris Tanda Tangan Resmi Madrasah (Format Cetak 1 Lembar)
  rows.push([]);
  rows.push([]);
  rows.push([
    '',
    '',
    'Mengetahui,',
    ...summary.subjects.map(() => ''),
    '',
    'Korleko, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    '',
    ''
  ]);
  rows.push([
    '',
    '',
    'Kepala Madrasah MIS NW Korleko',
    ...summary.subjects.map(() => ''),
    '',
    'Proktor Utama CBT Madrasah',
    '',
    ''
  ]);
  rows.push([]);
  rows.push([]);
  rows.push([
    '',
    '',
    settings.headmasterName || 'Ahmad Zaini, S.Pd.I',
    ...summary.subjects.map(() => ''),
    '',
    settings.proktorName || 'Muhammad Nasir, S.Kom',
    '',
    ''
  ]);
  rows.push([
    '',
    '',
    `NIP. ${settings.headmasterNip || '19780512 200501 1 004'}`,
    ...summary.subjects.map(() => ''),
    '',
    'NIP. 19890814 201402 1 003',
    '',
    ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Auto-fit kolom agar rapi dan tidak terpotong
  const colWidths = [
    { wch: 6 },  // NO
    { wch: 14 }, // NISN
    { wch: 28 }, // NAMA SISWA
    ...summary.subjects.map(() => ({ wch: 18 })), // MAPEL
    { wch: 14 }, // TOTAL NILAI
    { wch: 12 }, // RATA-RATA
    { wch: 14 }, // STATUS
    { wch: 12 }  // PERINGKAT
  ];
  ws['!cols'] = colWidths;

  // Konfigurasi Kertas 1 Lembar (A4 Landscape, Fit to 1 Page Width & Height)
  ws['!pageSetup'] = {
    orientation: 'landscape',
    paperSize: 9, // 9 = A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1
  };

  ws['!margins'] = {
    left: 0.35,
    right: 0.35,
    top: 0.45,
    bottom: 0.45,
    header: 0.2,
    footer: 0.2
  };

  return ws;
}

/**
 * 1. Unduh Rekap Nilai Satu Kelas Tertentu (1 Lembar Kertas Cetak A4 Landscape)
 */
export function exportClassRecapToExcel(className: string): void {
  const settings = dbService.getSchoolSettings();
  const allSummaries = getRecapDataAllClasses();
  const summary = allSummaries.find(s => s.className.toLowerCase() === className.toLowerCase()) || allSummaries[0];

  if (!summary) {
    throw new Error(`Data nilai untuk ${className} tidak ditemukan.`);
  }

  const wb = XLSX.utils.book_new();
  const cleanSheetName = summary.className.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 31);
  const ws = createClassRecapWorksheet(summary, settings);

  XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);

  const cleanFileClass = summary.className.replace(/\s+/g, '_');
  const cleanSchool = (settings.schoolName || 'MIS_NW_Korleko').replace(/\s+/g, '_');
  const fileName = `Rekap_Nilai_${cleanFileClass}_${cleanSchool}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

/**
 * 2. Unduh Rekap Nilai Seluruh Kelas (1 Buku Kerja dengan Tab per Kelas, Masing-Masing 1 Lembar Cetak)
 */
export function exportAllClassesRecapToExcel(): void {
  const settings = dbService.getSchoolSettings();
  const allSummaries = getRecapDataAllClasses();

  if (allSummaries.length === 0) {
    throw new Error('Tidak ada data kelas atau siswa yang ditemukan untuk direkap.');
  }

  const wb = XLSX.utils.book_new();

  // Buat Sheet untuk setiap kelas
  allSummaries.forEach(summary => {
    const ws = createClassRecapWorksheet(summary, settings);
    const cleanSheetName = summary.className.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);
  });

  const cleanSchool = (settings.schoolName || 'MIS_NW_Korleko').replace(/\s+/g, '_');
  const fileName = `Rekap_Nilai_Semua_Kelas_${cleanSchool}_TP_${settings.academicYear.replace('/', '-')}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
