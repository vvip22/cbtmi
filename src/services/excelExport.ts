/**
 * Excel Export Service for EduExam CBT
 * Menghasilkan file Excel (.xlsx) rekapitulasi nilai ujian siswa
 */

import * as XLSX from 'xlsx';
import { Exam, Submission } from '../types/cbt';

export function exportExamResultsToExcel(exam: Exam, submissions: Submission[]) {
  // Susun data tabel utama
  const tableData = submissions.map((sub, index) => {
    const isPassed = sub.score >= exam.passingGrade;
    const submittedDate = sub.submittedAt
      ? new Date(sub.submittedAt).toLocaleString('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      : 'Belum Selesai';

    let statusText = 'LULUS (TUNTAS)';
    if (sub.status === 'DISQUALIFIED') {
      statusText = 'DIDISKUALIFIKASI';
    } else if (!isPassed) {
      statusText = 'REMEDIAL';
    }

    return {
      'No.': index + 1,
      'NISN': sub.studentNisn || '-',
      'Nama Siswa': sub.studentName || 'Anonim',
      'Kelas': sub.studentClass || exam.className || '-',
      'Nilai PG': sub.mcqScore,
      'Nilai Esai': sub.essayScore,
      'Total Nilai': sub.score,
      'Batas KKM': exam.passingGrade,
      'Status Kelulusan': statusText,
      'Status Pengerjaan': sub.status,
      'Pelanggaran Anti-Curang': `${sub.violationsCount} kali`,
      'Waktu Pengumpulan': submittedDate
    };
  });

  // Buat worksheet dari array objek
  const worksheet = XLSX.utils.json_to_sheet(tableData);

  // Auto-fit lebar kolom
  const colWidths = [
    { wch: 6 },  // No
    { wch: 14 }, // NISN
    { wch: 28 }, // Nama
    { wch: 14 }, // Kelas
    { wch: 12 }, // Nilai PG
    { wch: 12 }, // Nilai Esai
    { wch: 12 }, // Total Nilai
    { wch: 12 }, // KKM
    { wch: 18 }, // Status
    { wch: 16 }, // Status Pengerjaan
    { wch: 22 }, // Pelanggaran
    { wch: 24 }  // Waktu
  ];
  worksheet['!cols'] = colWidths;

  // Buat workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Nilai');

  // Generate nama file
  const sanitizedTitle = exam.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Rekap_Nilai_MIS_NW_Korleko_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // Download file ke browser pengguna
  XLSX.writeFile(workbook, fileName);
}
