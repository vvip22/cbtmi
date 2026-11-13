/**
 * PDF Report Card Generation Service for EduExam CBT - MIS NW KORLEKO
 * Menghasilkan Dokumen Rapor Ujian Resmi Madrasah (Format PDF)
 */

import { jsPDF } from 'jspdf';
import { Exam, Submission } from '../types/cbt';
import { dbService } from './dbStore';

export function generateStudentReportCardPDF(exam: Exam, submission: Submission) {
  const settings = dbService.getSchoolSettings();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // --- KOP SURAT RESMI KEMENAG & MADRASAH ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', pageWidth / 2, y, { align: 'center' });
  y += 4.5;
  doc.text('KANTOR KEMENTERIAN AGAMA KABUPATEN LOMBOK TIMUR', pageWidth / 2, y, { align: 'center' });
  y += 4.5;
  doc.setFontSize(9);
  doc.text(settings.foundationName, pageWidth / 2, y, { align: 'center' });
  y += 5.5;

  doc.setFontSize(13);
  doc.setTextColor(5, 150, 105); // Emerald
  doc.text(settings.schoolName, pageWidth / 2, y, { align: 'center' });
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`NSM: ${settings.nsm} | NPSN: ${settings.npsn} | ${settings.address}, ${settings.city}`, pageWidth / 2, y, { align: 'center' });
  y += 4;

  // Garis Pembatas Kop Surat Ganda
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 1;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- JUDUL DOKUMEN ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('LEMBAR HASIL EVALUASI ASESMEN SUMATIF CBT ONLINE', pageWidth / 2, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tahun Ajaran ${settings.academicYear} · Semester ${settings.semester} · CBT Engine MIS NW Korleko`, pageWidth / 2, y, { align: 'center' });
  y += 7;

  // --- KOTAK IDENTITAS SISWA ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 27, 2, 2, 'FD');

  doc.setFontSize(8.5);
  const col1 = margin + 5;
  const col2 = margin + 95;
  let textY = y + 5.5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Nama Peserta', col1, textY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${submission.studentName || 'Peserta Ujian'}`, col1 + 26, textY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Mata Pelajaran', col2, textY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${exam.subjectName || 'Matematika'}`, col2 + 26, textY);

  textY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Nomor Induk (NISN)', col1, textY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${submission.studentNisn || '-'}`, col1 + 26, textY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Kelas / Rombel', col2, textY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${submission.studentClass || exam.className || 'Kelas VI A'}`, col2 + 26, textY);

  textY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Waktu Selesai', col1, textY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const testDate = submission.submittedAt
    ? new Date(submission.submittedAt).toLocaleDateString('id-ID', { dateStyle: 'long' })
    : 'Senin, 02 November 2026';
  doc.text(`: ${testDate}`, col1 + 26, textY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Kriteria Kelulusan (KKM)', col2, textY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${exam.passingGrade.toFixed(1)} / 100`, col2 + 26, textY);

  y += 33;

  // --- TABEL RINCIAN EVALUASI & CAPAIAN NILAI ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('I. RINCIAN CAPAIAN KOMPETENSI & SKOR ASESMEN', margin, y);
  y += 4;

  // Header Tabel
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 7.5, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Komponen Asesmen', margin + 4, y + 5);
  doc.text('Bobot Maksimal', margin + 80, y + 5);
  doc.text('Skor Capaian', margin + 115, y + 5);
  doc.text('Keterangan / Status', margin + 145, y + 5);
  y += 7.5;

  // Row 1: Pilihan Ganda
  doc.rect(margin, y, contentWidth, 7.5, 'D');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('1. Pilihan Ganda (Auto-Graded Engine)', margin + 4, y + 5);
  doc.text('70 Poin', margin + 80, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${submission.mcqScore.toFixed(1)} Poin`, margin + 115, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('Tuntas Otomatis', margin + 145, y + 5);
  y += 7.5;

  // Row 2: Soal Uraian / Esai
  doc.rect(margin, y, contentWidth, 7.5, 'D');
  doc.text('2. Soal Uraian / Esai (Koreksi Rubrik Guru)', margin + 4, y + 5);
  doc.text('30 Poin', margin + 80, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${submission.essayScore.toFixed(1)} Poin`, margin + 115, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(submission.status === 'GRADED' ? 'Tervalidasi Guru' : 'Ditinjau Pengawas', margin + 145, y + 5);
  y += 7.5;

  // Row 3: Total Nilai Akhir
  const isPassed = submission.score >= exam.passingGrade;
  doc.setFillColor(isPassed ? 240 : 254, isPassed ? 253 : 242, isPassed ? 244 : 242);
  doc.setDrawColor(isPassed ? 187 : 254, isPassed ? 247 : 202, isPassed ? 208 : 202);
  doc.rect(margin, y, contentWidth, 8.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL SKOR AKHIR CUMULATIVE', margin + 4, y + 5.5);
  doc.text('100 Poin', margin + 80, y + 5.5);
  doc.setTextColor(isPassed ? 5 : 220, isPassed ? 150 : 38, isPassed ? 105 : 38);
  doc.text(`${submission.score.toFixed(1)} / 100`, margin + 115, y + 5.5);

  let predicate = 'C';
  if (submission.score >= 90) predicate = 'A (Sangat Baik)';
  else if (submission.score >= 80) predicate = 'B (Baik)';
  else if (submission.score >= 75) predicate = 'C (Cukup)';
  else predicate = 'D (Kurang)';

  doc.text(isPassed ? `LULUS - Predikat ${predicate}` : `REMEDIAL - Predikat ${predicate}`, margin + 145, y + 5.5);
  y += 14;

  // --- KOTAK EVALUASI INTEGRITAS & CATATAN GURU ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('II. CATATAN AKADEMIK & INTEGRITAS CBT (ANTI-CURANG)', margin, y);
  y += 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 23, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const violationNote = submission.violationsCount === 0
    ? 'Integritas Ujian: Sempurna (0 Pelanggaran). Tidak ada aktivitas perpindahan tab atau jendela yang terdeteksi.'
    : `Integritas Ujian: Terdeteksi ${submission.violationsCount} kali perpindahan tab/jendela. Catatan telah diarsipkan dalam log proctoring.`;

  doc.text(violationNote, margin + 4, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Ulasan Pengawas / Guru Mata Pelajaran:', margin + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(submission.teacherNotes || 'Pemahaman materi sangat baik, terus tingkatkan kecermatan pada pemecahan masalah kontekstual.', margin + 4, y + 16, {
    maxWidth: contentWidth - 8
  });

  y += 31;

  // --- BLOK TANDA TANGAN RESMI ---
  const signY = y + 6;
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  // Kiri: Guru / Pengawas
  doc.text('Mengetahui / Mengoreksi,', margin + 10, signY);
  doc.text('Guru Mata Pelajaran,', margin + 10, signY + 4.5);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(margin + 10, signY + 25, margin + 65, signY + 25);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('...........................................', margin + 10, signY + 29);
  doc.setFont('helvetica', 'normal');
  doc.text('NIP. ...................................', margin + 10, signY + 33);

  // Kanan: Kepala Madrasah
  const rightX = pageWidth - margin - 65;
  doc.text(`Korleko, ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`, rightX, signY);
  doc.text('Kepala Madrasah,', rightX, signY + 4.5);
  doc.line(rightX, signY + 25, rightX + 60, signY + 25);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.headmasterName, rightX, signY + 29);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${settings.headmasterNip}`, rightX, signY + 33);

  // Footer Dokumen
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Dokumen resmi ini dicetak melalui Sistem CBT MIS NW KORLEKO · Token Ujian: ${settings.activeExamToken} · ID: ${submission.id}`, pageWidth / 2, 288, { align: 'center' });

  const sanitizedStudent = (submission.studentName || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Rapor_CBT_${sanitizedStudent}_${submission.studentNisn || '0000'}.pdf`);
}
