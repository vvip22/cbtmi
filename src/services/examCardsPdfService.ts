/**
 * Service Pembuatan Dokumen PDF Resmi Kartu Peserta Ujian & Pengawas Ruang
 * Format Kartu Kompak Hemat Kertas HVS (8 Kartu per Lembar A4 - 2 Kolom x 4 Baris)
 * Sesuai Desain Referensi Pengguna (image_e8ff521f.png)
 * TANPA TANDA TANGAN & TANPA MRZ PASPOR
 */

import { jsPDF } from 'jspdf';
import { SchoolSettings } from '../types/cbt';
import { DEFAULT_SCHOOL_LOGO } from './logoPresets';

export interface StudentCardItem {
  id: string;
  nomorPeserta: string;
  nisn: string;
  name: string;
  kelas: string;
  ruang: string;
  sesi: string;
  username: string;
  password?: string;
  avatarUrl?: string;
}

export interface ProctorCardItem {
  id: string;
  nip: string;
  name: string;
  jabatan: string;
  ruang: string;
  jadwal: string;
  username?: string;
  password?: string;
  avatarUrl?: string;
}

/**
 * Mengonversi URL Logo (SVG data URL atau web path) menjadi PNG Data URL tajam (512x512)
 * agar terbaca dengan resolusi tinggi di PDF dokumen cetak
 */
export async function rasterizeLogoToPng(logoUrl: string, size = 512): Promise<string> {
  if (!logoUrl) return '';
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('');
            return;
          }
          ctx.clearRect(0, 0, size, size);
          ctx.save();
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, size, size);

          const imgRatio = img.width / img.height;
          let drawW = size;
          let drawH = size;
          let offsetX = 0;
          let offsetY = 0;
          if (imgRatio > 1) {
            drawW = size * imgRatio;
            offsetX = (size - drawW) / 2;
          } else if (imgRatio < 1) {
            drawH = size / imgRatio;
            offsetY = (size - drawH) / 2;
          }
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          ctx.restore();
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve('');
        }
      };
      img.onerror = () => {
        resolve('');
      };
      img.src = logoUrl;
    } catch {
      resolve('');
    }
  });
}

/**
 * Menyiapkan Pasfoto untuk disematkan ke PDF dalam rasio 3x4 (300x400 px)
 * Mendukung data URL, SVG, PNG, JPEG, dan WebP
 */
export async function preparePhotoForPdf(url?: string): Promise<string> {
  if (!url || typeof url !== 'string' || !url.trim()) return '';
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 300;
          canvas.height = 400; // Rasio Pasfoto 3:4 portrait
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('');
            return;
          }

          // Bersihkan canvas
          ctx.clearRect(0, 0, 300, 400);

          // Buat clipping path dengan sudut melengkung halus presisi (radius 18px)
          const radius = 18;
          ctx.beginPath();
          ctx.moveTo(radius, 0);
          ctx.lineTo(300 - radius, 0);
          ctx.quadraticCurveTo(300, 0, 300, radius);
          ctx.lineTo(300, 400 - radius);
          ctx.quadraticCurveTo(300, 400, 300 - radius, 400);
          ctx.lineTo(radius, 400);
          ctx.quadraticCurveTo(0, 400, 0, 400 - radius);
          ctx.lineTo(0, radius);
          ctx.quadraticCurveTo(0, 0, radius, 0);
          ctx.closePath();
          ctx.clip();

          // Latar belakang putih bersih
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 300, 400);

          // Gambar foto dengan cover center
          const imgRatio = img.width / img.height;
          const targetRatio = 300 / 400;
          let drawW = 300;
          let drawH = 400;
          let offsetX = 0;
          let offsetY = 0;

          if (imgRatio > targetRatio) {
            drawW = 400 * imgRatio;
            offsetX = (300 - drawW) / 2;
          } else {
            drawH = 300 / imgRatio;
            offsetY = (400 - drawH) / 2;
          }

          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve('');
        }
      };
      img.onerror = () => {
        resolve('');
      };
      img.src = url;
    } catch {
      resolve('');
    }
  });
}

/**
 * Menggambar Barcode visual realistis
 */
function drawBarcode(doc: jsPDF, x: number, y: number, width: number, height: number, code: string) {
  doc.setFillColor(15, 23, 42);
  const barCount = 34;
  const unitWidth = width / barCount;
  
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed += code.charCodeAt(i);
  }

  for (let i = 0; i < barCount; i++) {
    const isThick = ((seed * (i + 1)) % 7) > 3;
    const isGap = ((seed + i * 3) % 6) === 0;
    if (!isGap) {
      const barW = isThick ? unitWidth * 1.5 : unitWidth * 0.75;
      doc.rect(x + i * unitWidth, y, barW, height, 'F');
    }
  }

  doc.setFont('courier', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(71, 85, 105);
  doc.text(`* ${code} *`, x + width / 2, y + height + 2, { align: 'center' });
}

/**
 * Menggambar Logo Resmi Lambang Nahdlatul Wathan (NW) / MIS NW KORLEKO
 * Berbasis Vector presisi tinggi dengan teks tebal jelas terbaca
 */
function drawMadrasahLogoEmblem(doc: jsPDF, cx: number, cy: number, r: number = 5.4) {
  // 1. Lingkaran Putih Dasar dengan Border Emas
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(245, 158, 11); // Amber/Gold
  doc.setLineWidth(0.4);
  doc.circle(cx, cy, r, 'FD');

  // 2. Lingkaran Hijau NW (Emerald 800)
  doc.setFillColor(4, 120, 87);
  doc.circle(cx, cy, r - 0.5, 'F');

  // 3. Garis Lingkar Putih Halus
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.15);
  doc.circle(cx, cy, r - 0.9, 'S');

  // 4. Tulisan Atas Jelas: 'MIS NW'
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.0);
  doc.setTextColor(254, 240, 138); // Yellow 200
  doc.text('MIS NW', cx, cy - 2.2, { align: 'center' });

  // 5. Bulan Sabit Emas NW
  doc.setFillColor(245, 158, 11); // Gold
  doc.circle(cx, cy + 0.3, 2.2, 'F');
  doc.setFillColor(4, 120, 87);
  doc.circle(cx + 0.7, cy - 0.2, 2.0, 'F');

  // 6. Bintang Sembilan NW Tengah
  doc.setFillColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.0);
  doc.text('*', cx - 0.4, cy + 0.9, { align: 'center' });

  // 7. Pita Emas Bawah 'KORLEKO' yang jelas terbaca
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(cx - 3.8, cy + 2.3, 7.6, 2.0, 0.4, 0.4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.8);
  doc.setTextColor(6, 78, 59);
  doc.text('KORLEKO', cx, cy + 3.8, { align: 'center' });
}

/**
 * 1. GENERATE KARTU PESERTA (8 KARTU PER LEMBAR A4 - 2 KOLOM x 4 BARIS)
 * Format Horizontal Hemat Kertas HVS - Persis Sesuai Gambar Referensi
 */
export async function generateStudentCardsPDF(
  students: StudentCardItem[],
  settings: SchoolSettings
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Siapkan logo resolusi tinggi agar terbaca sangat tajam di PDF
  const logoPng = await rasterizeLogoToPng(settings.logoUrl || DEFAULT_SCHOOL_LOGO, 512);

  // Siapkan foto peserta secara paralel (jika diunggah)
  const studentPhotos = await Promise.all(
    students.map(s => (s.avatarUrl ? preparePhotoForPdf(s.avatarUrl) : Promise.resolve('')))
  );

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm

  // Dimensi Kompak: 2 kolom x 4 baris = 8 kartu per lembar kertas A4
  const cardW = 94; // mm
  const cardH = 63; // mm

  const marginX = (pageWidth - (cardW * 2 + 6)) / 2; // ~8 mm
  const marginY = (pageHeight - (cardH * 4 + 18)) / 2; // ~15.5 mm
  const gapX = 6;
  const gapY = 6;

  students.forEach((std, index) => {
    // Tambah halaman baru setiap 8 kartu
    if (index > 0 && index % 8 === 0) {
      doc.addPage();
    }

    const posInPage = index % 8;
    const col = posInPage % 2; // 0 atau 1
    const row = Math.floor(posInPage / 2); // 0, 1, 2, 3

    const cardX = marginX + col * (cardW + gapX);
    const cardY = marginY + row * (cardH + gapY);

    // --- GARIS PANDUAN POTONG KERTAS HVS ---
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(0.12);
    doc.line(cardX - 2.5, cardY, cardX + cardW + 2.5, cardY);
    doc.line(cardX, cardY - 2.5, cardX, cardY + cardH + 2.5);
    doc.line(cardX - 2.5, cardY + cardH, cardX + cardW + 2.5, cardY + cardH);
    doc.line(cardX + cardW, cardY - 2.5, cardX + cardW, cardY + cardH + 2.5);

    // --- BINGKAI KARTU UTAMA ---
    doc.setDrawColor(4, 120, 87); // Emerald 700
    doc.setLineWidth(0.6);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, cardY, cardW, cardH, 2.5, 2.5, 'FD');

    // --- HEADER HIJAU TUA (PERSIS GAMBAR REFERENSI DENGAN LOGO MIS NW) ---
    const headerH = 15;
    doc.setFillColor(6, 78, 59); // Deep Emerald
    doc.roundedRect(cardX, cardY, cardW, headerH, 2.5, 2.5, 'F');
    doc.rect(cardX, cardY + headerH - 2, cardW, 2, 'F'); // Rata bawah

    // Logo Bulat Resmi Madrasah di Sisi Kiri Header
    doc.setFillColor(255, 255, 255);
    doc.circle(cardX + 7.7, cardY + 7.5, 5.5, 'F');

    if (logoPng) {
      doc.addImage(logoPng, 'PNG', cardX + 2.4, cardY + 2.2, 10.6, 10.6);
    } else {
      drawMadrasahLogoEmblem(doc, cardX + 7.7, cardY + 7.5, 5.3);
    }

    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.45);
    doc.circle(cardX + 7.7, cardY + 7.5, 5.5, 'S');

    // Titik Tengah Teks Header (Disesuaikan agar seimbang dengan logo)
    const textCenterX = cardX + 53;

    // Teks Header Kop
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.7);
    doc.setTextColor(253, 224, 71); // Kuning/Gold
    doc.text(
      (settings.foundationName || 'YAYASAN PENDIDIKAN PONDOK PESANTREN DARUNNAHDLAH KORLEKO').toUpperCase(),
      textCenterX,
      cardY + 3.2,
      { align: 'center' }
    );

    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);
    doc.text(settings.schoolName || 'MIS NW KORLEKO', textCenterX, cardY + 6.2, { align: 'center' });

    // Pill Badge Tengah
    doc.setFillColor(4, 120, 87);
    doc.roundedRect(textCenterX - 25, cardY + 7.4, 50, 3.2, 1.0, 1.0, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.3);
    doc.setTextColor(255, 255, 255);
    doc.text('KARTU PESERTA ASESMEN SUMATIF (ASAS)', textCenterX, cardY + 9.6, { align: 'center' });

    // Tahun Pelajaran & Semester Siswa
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.1);
    doc.setTextColor(253, 224, 71); // Kuning cerah
    const tpTextStd = `TAHUN PELAJARAN ${settings.academicYear || '2026/2027'} (${settings.semester ? settings.semester.toUpperCase() : 'SEMESTER GANJIL'})`;
    doc.text(tpTextStd, textCenterX, cardY + 13.0, { align: 'center' });

    // --- BODY KARTU: KIRI (FOTO + BARCODE), KANAN (BIODATA + LOGIN BOX) ---
    const bodyY = cardY + headerH + 2.5;

    // 1. Kolom Kiri: Pasfoto (Opsional)
    const photoW = 18;
    const photoH = 24;
    const photoX = cardX + 3.5;
    const photoY = bodyY;
    const photoImg = studentPhotos[index];

    if (photoImg) {
      // Background halus di bawah foto
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(photoX, photoY, photoW, photoH, 1.2, 1.2, 'F');
      try {
        // Disematkan dengan PNG ber-alpha transparan di tiap sudut
        doc.addImage(photoImg, 'PNG', photoX, photoY, photoW, photoH);
      } catch (e) {
        console.error('Failed to draw student photo in PDF:', e);
      }
      // Bingkai foto dengan sudut melengkung halus presisi
      doc.setDrawColor(4, 120, 87);
      doc.setLineWidth(0.35);
      doc.roundedRect(photoX, photoY, photoW, photoH, 1.2, 1.2, 'S');
    } else {
      // Area kosong tempat tempel pasfoto 3x4 (Sifatnya Opsional) dengan sudut rapi
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(52, 211, 153);
      doc.setLineWidth(0.35);
      doc.roundedRect(photoX, photoY, photoW, photoH, 1.2, 1.2, 'FD');

      // Label Pasfoto
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text('FOTO 3X4', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
    }

    // Barcode persis di bawah foto
    drawBarcode(doc, photoX - 1, photoY + photoH + 2, photoW + 2, 4.8, std.nomorPeserta || std.nisn);

    // 2. Kolom Kanan: Rincian Biodata Peserta
    const bioX = photoX + photoW + 4;
    let bioY = bodyY + 1.5;
    const labelW = 19;

    const printField = (label: string, val: string, isBold: boolean = false) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.2);
      doc.setTextColor(71, 85, 105);
      doc.text(label, bioX, bioY);
      doc.text(':', bioX + labelW - 1, bioY);

      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(5.6);
      doc.setTextColor(15, 23, 42);

      const maxValW = cardW - (bioX - cardX) - labelW - 2;
      const splitVal = doc.splitTextToSize(val, maxValW);
      doc.text(splitVal[0] || val, bioX + labelW + 0.5, bioY);
      bioY += 3.8;
    };

    printField('No. Peserta', std.nomorPeserta, true);
    printField('NISN', std.nisn);
    printField('Nama Siswa', std.name.toUpperCase(), true);
    printField('Kelas', std.kelas, true);
    printField('Ruang / Sesi', `${std.ruang} (${std.sesi?.split(' ')[0] || std.sesi || 'Sesi 1'})`);

    // 3. Box Akun Login CBT (Persis Gambar Referensi)
    const boxY = bioY + 1;
    const boxW = cardW - (bioX - cardX) - 3.5;
    const boxH = 11.5;

    doc.setFillColor(240, 253, 244); // Emerald 50
    doc.setDrawColor(167, 243, 208); // Emerald 200
    doc.setLineWidth(0.3);
    doc.roundedRect(bioX, boxY, boxW, boxH, 1.5, 1.5, 'FD');

    // Header Box Login
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.setTextColor(4, 120, 87);
    doc.text('AKUN LOGIN CBT', bioX + 2.5, boxY + 3.2);

    // Username & Password Sejajar
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Username:', bioX + 2.5, boxY + 6.8);
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(6, 78, 59);
    doc.text(std.username, bioX + 2.5, boxY + 9.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Password:', bioX + boxW / 2 + 1, boxY + 6.8);
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(225, 29, 72); // Rose 600
    doc.text(std.password || 'siswa123', bioX + boxW / 2 + 1, boxY + 9.8);
  });

  const cleanSchool = (settings.schoolName || 'MIS_NW_Korleko').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Kartu_Peserta_CBT_${cleanSchool}.pdf`);
}

/**
 * 2. GENERATE KARTU PENGAWAS (8 KARTU PER LEMBAR A4 - 2 KOLOM x 4 BARIS)
 * Format Horizontal Hemat Kertas HVS - Kompak & Rapi
 */
export async function generateProctorCardsPDF(
  proctors: ProctorCardItem[],
  settings: SchoolSettings
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Siapkan logo resolusi tinggi agar terbaca sangat tajam di PDF pengawas
  const logoPng = await rasterizeLogoToPng(settings.logoUrl || DEFAULT_SCHOOL_LOGO, 512);

  // Siapkan foto pengawas secara paralel (jika diunggah)
  const proctorPhotos = await Promise.all(
    proctors.map(p => (p.avatarUrl ? preparePhotoForPdf(p.avatarUrl) : Promise.resolve('')))
  );

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const cardW = 94;
  const cardH = 63;

  const marginX = (pageWidth - (cardW * 2 + 6)) / 2;
  const marginY = (pageHeight - (cardH * 4 + 18)) / 2;
  const gapX = 6;
  const gapY = 6;

  proctors.forEach((prc, index) => {
    if (index > 0 && index % 8 === 0) {
      doc.addPage();
    }

    const posInPage = index % 8;
    const col = posInPage % 2;
    const row = Math.floor(posInPage / 2);

    const cardX = marginX + col * (cardW + gapX);
    const cardY = marginY + row * (cardH + gapY);

    // Garis Panduan Potong
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.12);
    doc.line(cardX - 2.5, cardY, cardX + cardW + 2.5, cardY);
    doc.line(cardX, cardY - 2.5, cardX, cardY + cardH + 2.5);
    doc.line(cardX - 2.5, cardY + cardH, cardX + cardW + 2.5, cardY + cardH);
    doc.line(cardX + cardW, cardY - 2.5, cardX + cardW, cardY + cardH + 2.5);

    // Bingkai Kartu Pengawas (Aksen Emas/Amber)
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.6);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, cardY, cardW, cardH, 2.5, 2.5, 'FD');

    // Header Pengawas (Slate 900)
    const headerH = 15;
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.roundedRect(cardX, cardY, cardW, headerH, 2.5, 2.5, 'F');
    doc.rect(cardX, cardY + headerH - 2, cardW, 2, 'F');

    // Logo Bulat Resmi Madrasah di Sisi Kiri Header Pengawas
    doc.setFillColor(255, 255, 255);
    doc.circle(cardX + 7.7, cardY + 7.5, 5.5, 'F');

    if (logoPng) {
      doc.addImage(logoPng, 'PNG', cardX + 2.4, cardY + 2.2, 10.6, 10.6);
    } else {
      drawMadrasahLogoEmblem(doc, cardX + 7.7, cardY + 7.5, 5.3);
    }

    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.45);
    doc.circle(cardX + 7.7, cardY + 7.5, 5.5, 'S');

    // Titik Tengah Teks Header Pengawas
    const textCenterX = cardX + 53;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.7);
    doc.setTextColor(251, 191, 36); // Amber
    doc.text(
      (settings.foundationName || 'PANITIA ASESMEN SUMATIF MIS NW KORLEKO').toUpperCase(),
      textCenterX,
      cardY + 3.2,
      { align: 'center' }
    );

    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);
    doc.text(settings.schoolName || 'MIS NW KORLEKO', textCenterX, cardY + 6.2, { align: 'center' });

    // Pill Badge Pengawas
    doc.setFillColor(217, 119, 6);
    doc.roundedRect(textCenterX - 27, cardY + 7.4, 54, 3.2, 1.0, 1.0, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.3);
    doc.setTextColor(255, 255, 255);
    doc.text('KARTU PENGAWAS RUANG UJIAN CBT', textCenterX, cardY + 9.6, { align: 'center' });

    // Tahun Pelajaran & Semester Pengawas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.1);
    doc.setTextColor(251, 191, 36); // Amber cerah
    const tpTextPrc = `TAHUN PELAJARAN ${settings.academicYear || '2026/2027'} (${settings.semester ? settings.semester.toUpperCase() : 'SEMESTER GANJIL'})`;
    doc.text(tpTextPrc, textCenterX, cardY + 13.0, { align: 'center' });

    // Body Pengawas
    const bodyY = cardY + headerH + 2.5;

    // Pasfoto Kiri (Opsional)
    const photoW = 18;
    const photoH = 24;
    const photoX = cardX + 3.5;
    const photoY = bodyY;
    const photoImg = proctorPhotos[index];

    if (photoImg) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(photoX, photoY, photoW, photoH, 1.2, 1.2, 'F');
      try {
        doc.addImage(photoImg, 'PNG', photoX, photoY, photoW, photoH);
      } catch (e) {
        console.error('Failed to draw proctor photo in PDF:', e);
      }
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(0.35);
      doc.roundedRect(photoX, photoY, photoW, photoH, 1.2, 1.2, 'S');
    } else {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(0.35);
      doc.roundedRect(photoX, photoY, photoW, photoH, 1.2, 1.2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text('FOTO 3X4', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
    }

    drawBarcode(doc, photoX - 1, photoY + photoH + 2, photoW + 2, 4.8, prc.nip && prc.nip !== '-' ? prc.nip : `PRC-${index + 1}`);

    // Kolom Kanan
    const bioX = photoX + photoW + 4;
    let bioY = bodyY + 1.5;
    const labelW = 19;

    const printPrcField = (label: string, val: string, isBold: boolean = false) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.2);
      doc.setTextColor(71, 85, 105);
      doc.text(label, bioX, bioY);
      doc.text(':', bioX + labelW - 1, bioY);

      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(5.6);
      doc.setTextColor(15, 23, 42);

      const maxValW = cardW - (bioX - cardX) - labelW - 2;
      const splitVal = doc.splitTextToSize(val, maxValW);
      doc.text(splitVal[0] || val, bioX + labelW + 0.5, bioY);
      bioY += 3.8;
    };

    printPrcField('Nama Pengawas', prc.name, true);
    printPrcField('NIP / NUPTK', prc.nip || '-');
    printPrcField('Jabatan Tugas', prc.jabatan, true);
    printPrcField('Ruang Tugas', prc.ruang);
    printPrcField('Jadwal Pelaksanaan', prc.jadwal || 'Senin - Sabtu');

    // Box Akun Login CBT Pengawas (Persis Desain Referensi)
    const boxY = bioY + 1;
    const boxW = cardW - (bioX - cardX) - 3.5;
    const boxH = 11.5;

    doc.setFillColor(240, 253, 244); // Emerald 50
    doc.setDrawColor(167, 243, 208); // Emerald 200
    doc.setLineWidth(0.3);
    doc.roundedRect(bioX, boxY, boxW, boxH, 1.5, 1.5, 'FD');

    // Header Box Login
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.setTextColor(4, 120, 87);
    doc.text('AKUN LOGIN CBT', bioX + 2.5, boxY + 3.2);

    // Username & Password Sejajar
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Username:', bioX + 2.5, boxY + 6.8);

    doc.setFont('courier', 'bold');
    doc.setFontSize(5.4);
    doc.setTextColor(6, 78, 59);
    doc.text(prc.username || 'pengawas', bioX + 2.5, boxY + 10);

    const passX = bioX + boxW / 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Password:', passX, boxY + 6.8);

    doc.setFont('courier', 'bold');
    doc.setFontSize(5.4);
    doc.setTextColor(190, 18, 60); // Rose 700
    doc.text(prc.password || 'pengawas123', passX, boxY + 10);
  });

  const cleanSchool = (settings.schoolName || 'MIS_NW_Korleko').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Kartu_Pengawas_CBT_${cleanSchool}.pdf`);
}
