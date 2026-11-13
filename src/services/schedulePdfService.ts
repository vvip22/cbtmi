/**
 * Service Pembuatan Dokumen PDF Resmi Jadwal Asesmen Semester
 * MIS NW KORLEKO - Berbasis jsPDF (kompatibel 100% dengan iframe & semua peramban)
 */

import { jsPDF } from 'jspdf';
import { ExamSchedule, SchoolSettings } from '../types/cbt';

export function generateSemesterSchedulePDF(
  schedules: ExamSchedule[],
  settings: SchoolSettings
) {
  // Gunakan format A4 Landscape agar 8 kolom muat rapi dan elegan
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~210 mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // ~269 mm
  let y = 14;

  // --- KOP SURAT RESMI LEMBAGA & MADRASAH ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(settings.foundationName || 'YAYASAN PENDIDIKAN PONDOK PESANTREN NAHDLATUL WATHAN KORLEKO', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(15);
  doc.setTextColor(4, 120, 87); // Emerald 700
  doc.text(settings.schoolName || 'MIS NW KORLEKO', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `NSM: ${settings.nsm || '111252030045'}  |  NPSN: ${settings.npsn || '60721890'}  |  Alamat: ${settings.address || 'Jl. Raya Korleko'}, ${settings.city || 'Lombok Timur'}, ${settings.province || 'Nusa Tenggara Barat'}`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 4;

  // Garis Pembatas Kop Surat Ganda
  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 1;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // --- JUDUL DOKUMEN ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('JADWAL ASESMEN SUMATIF AKHIR SEMESTER (ASAS)', pageWidth / 2, y, { align: 'center' });
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const semText = (settings.semester || 'Ganjil').toUpperCase();
  doc.text(`TAHUN PELAJARAN ${settings.academicYear || '2026/2027'}  ·  SEMESTER ${semText}`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  // --- TABEL MATRIX JADWAL (8 KOLOM) ---
  // Lebar kolom total = 269 mm
  const cols = [
    { label: 'NO', width: 10, align: 'center' },
    { label: 'HARI / TANGGAL', width: 34, align: 'left' },
    { label: 'WAKTU (WITA)', width: 28, align: 'center' },
    { label: 'SESI', width: 24, align: 'center' },
    { label: 'MATA PELAJARAN', width: 62, align: 'left' },
    { label: 'KELAS', width: 26, align: 'center' },
    { label: 'RUANG', width: 40, align: 'left' },
    { label: 'PENGAWAS / PROKTOR', width: 45, align: 'left' }
  ];

  // Table Header
  const headerHeight = 7.5;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, y, contentWidth, headerHeight, 'F');
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, headerHeight, 'S');

  let curX = margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  cols.forEach((col, idx) => {
    // Garis vertikal pemisah kolom
    if (idx > 0) {
      doc.line(curX, y, curX, y + headerHeight);
    }
    const textX = col.align === 'center' ? curX + col.width / 2 : curX + 2;
    doc.text(col.label, textX, y + 5, { align: col.align as any });
    curX += col.width;
  });

  y += headerHeight;

  // Table Body Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const rowHeight = 7.5;
  schedules.forEach((sch, idx) => {
    // Cek apakah halaman penuh
    if (y + rowHeight > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }

    // Alternating row background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.2);
    doc.rect(margin, y, contentWidth, rowHeight, 'S');

    let cellX = margin;

    // Col 0: No
    doc.line(cellX + cols[0].width, y, cellX + cols[0].width, y + rowHeight);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(idx + 1), cellX + cols[0].width / 2, y + 5, { align: 'center' });
    cellX += cols[0].width;

    // Col 1: Hari / Tanggal
    doc.line(cellX + cols[1].width, y, cellX + cols[1].width, y + rowHeight);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const dayDate = `${sch.dayName}, ${sch.date}`;
    doc.text(doc.splitTextToSize(dayDate, cols[1].width - 3)[0] || dayDate, cellX + 2, y + 5);
    cellX += cols[1].width;

    // Col 2: Waktu
    doc.line(cellX + cols[2].width, y, cellX + cols[2].width, y + rowHeight);
    doc.setFont('helvetica', 'normal');
    doc.text(`${sch.startTime} - ${sch.endTime}`, cellX + cols[2].width / 2, y + 5, { align: 'center' });
    cellX += cols[2].width;

    // Col 3: Sesi
    doc.line(cellX + cols[3].width, y, cellX + cols[3].width, y + rowHeight);
    doc.text(sch.session?.split(' ')[0] || sch.session || 'Sesi 1', cellX + cols[3].width / 2, y + 5, { align: 'center' });
    cellX += cols[3].width;

    // Col 4: Mata Pelajaran
    doc.line(cellX + cols[4].width, y, cellX + cols[4].width, y + rowHeight);
    doc.setFont('helvetica', 'bold');
    doc.text(doc.splitTextToSize(sch.subjectName, cols[4].width - 3)[0] || sch.subjectName, cellX + 2, y + 5);
    cellX += cols[4].width;

    // Col 5: Kelas
    doc.line(cellX + cols[5].width, y, cellX + cols[5].width, y + rowHeight);
    doc.setFont('helvetica', 'normal');
    doc.text(sch.className, cellX + cols[5].width / 2, y + 5, { align: 'center' });
    cellX += cols[5].width;

    // Col 6: Ruang
    doc.line(cellX + cols[6].width, y, cellX + cols[6].width, y + rowHeight);
    doc.text(doc.splitTextToSize(sch.room, cols[6].width - 3)[0] || sch.room, cellX + 2, y + 5);
    cellX += cols[6].width;

    // Col 7: Pengawas / Proktor
    doc.text(doc.splitTextToSize(sch.proctorName, cols[7].width - 3)[0] || sch.proctorName, cellX + 2, y + 5);

    y += rowHeight;
  });

  y += 4;

  // --- KETENTUAN & TATA TERTIB ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Ketentuan & Tata Tertib Asesmen CBT:', margin, y);
  y += 3.8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('1. Peserta ujian wajib hadir di madrasah 15 menit sebelum sesi asesmen dimulai.', margin, y);
  y += 3.4;
  doc.text('2. Pengerjaan soal CBT wajib menggunakan peramban dalam mode layar penuh dengan pengawasan proktor.', margin, y);
  y += 3.4;
  doc.text('3. Dilarang membuka aplikasi, tab lain, atau meninggalkan jendela ujian selama waktu asesmen berlangsung.', margin, y);
  y += 6;

  // --- TANDA TANGAN KEPALA MADRASAH & PROKTOR ---
  const signY = y;
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  // Kiri: Kepala Madrasah
  const signLeftX = margin + 15;
  doc.text('Mengetahui,', signLeftX, signY);
  doc.text('Kepala Madrasah,', signLeftX, signY + 3.8);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.headmasterName || 'Kepala Madrasah MIS NW Korleko', signLeftX, signY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${settings.headmasterNip || '-'}`, signLeftX, signY + 22);

  // Kanan: Ketua Panitia / Proktor CBT
  const signRightX = pageWidth - margin - 75;
  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Korleko, ${todayStr}`, signRightX, signY);
  doc.text('Ketua Panitia / Proktor CBT,', signRightX, signY + 3.8);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.proktorName || 'Muhammad Nasir, S.Kom', signRightX, signY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text('NIP. 19890814 201402 1 003', signRightX, signY + 22);

  // Footer Hak Cipta & Tanggal Cetak
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Dokumen Jadwal Resmi diterbitkan secara digital oleh Sistem CBT MIS NW KORLEKO · Dicetak pada ${new Date().toLocaleString('id-ID')}`,
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );

  // Download PDF langsung
  const cleanSchool = (settings.schoolName || 'MIS_NW_Korleko').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Jadwal_Ujian_Semester_${cleanSchool}.pdf`);
}
