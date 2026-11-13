/**
 * Layanan Template Excel & Importer Jadwal Semester & Kartu Peserta / Pengawas
 * MIS NW KORLEKO CBT
 * 
 * Menggunakan SheetJS (xlsx) untuk:
 * 1. Download Template Jadwal Semester (.xlsx) & Ekspor / Impor Jadwal
 * 2. Download Template Data Kartu Peserta & Pengawas (.xlsx) & Impor Data Kartu
 */

import * as XLSX from 'xlsx';
import { ExamSchedule, ExamScheduleStatus, User } from '../types/cbt';

/**
 * 1. Unduh Template Excel Resmi Jadwal Ujian Semester
 */
export function downloadScheduleExcelTemplate(schoolName = 'MIS NW KORLEKO'): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'NO',
    'HARI',
    'TANGGAL',
    'SESI',
    'WAKTU_MULAI',
    'WAKTU_SELESAI',
    'MATA_PELAJARAN',
    'KELAS',
    'RUANG',
    'PENGAWAS_PROKTOR',
    'STATUS',
    'CATATAN'
  ];

  const sampleRows = [
    [
      1,
      'Senin',
      '2026-11-23',
      'Sesi 1 (07.30 - 09.00)',
      '07:30',
      '09:00',
      'Matematika & Penalaran Numerasi',
      'Kelas VI A',
      'Lab Komputer CBT Madrasah',
      'Muhammad Nasir, S.Kom',
      'UPCOMING',
      'Pengerjaan via CBT layar penuh. Membawa coretan buram.'
    ],
    [
      2,
      'Senin',
      '2026-11-23',
      'Sesi 2 (09.30 - 11.00)',
      '09:30',
      '11:00',
      'Matematika & Penalaran Numerasi',
      'Kelas VI B',
      'Lab Komputer CBT Madrasah',
      'Ustazah Halimatussadiah, S.Pd',
      'UPCOMING',
      'Peserta wajib hadir 15 menit sebelum sesi dimulai.'
    ],
    [
      3,
      'Selasa',
      '2026-11-24',
      'Sesi 1 (07.30 - 09.00)',
      '07:30',
      '09:00',
      'Bahasa Arab',
      'Kelas VI A',
      'Lab Komputer CBT Madrasah',
      'Muhammad Nasir, S.Kom',
      'UPCOMING',
      'Mendukung teks berharakat & tulisan Arab kanan ke kiri (RTL).'
    ],
    [
      4,
      'Selasa',
      '2026-11-24',
      'Sesi 2 (09.30 - 11.00)',
      '09:30',
      '11:00',
      'Bahasa Arab',
      'Kelas VI B',
      'Lab Komputer CBT Madrasah',
      'Ustazah Halimatussadiah, S.Pd',
      'UPCOMING',
      'Sesi kedua Kelas VI B.'
    ],
    [
      5,
      'Rabu',
      '2026-11-25',
      'Sesi 1 (07.30 - 09.00)',
      '07:30',
      '09:00',
      'Pendidikan Agama Islam & Ke-NW-an',
      'Kelas VI A',
      'Ruang Kelas VI A',
      'Ahmad Zaini, S.Pd.I',
      'UPCOMING',
      'Materi Ke-NW-an, Sejarah Madrasah NW Korleko.'
    ],
    [
      6,
      'Kamis',
      '2026-11-26',
      'Sesi 1 (07.30 - 09.00)',
      '07:30',
      '09:00',
      'Ilmu Pengetahuan Alam (IPA Terpadu)',
      'Kelas VI A',
      'Lab Komputer CBT Madrasah',
      'Muhammad Nasir, S.Kom',
      'UPCOMING',
      'Siswa diperkenankan membawa alat tulis pensil.'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 6 },  // NO
    { wch: 12 }, // HARI
    { wch: 14 }, // TANGGAL
    { wch: 24 }, // SESI
    { wch: 14 }, // WAKTU_MULAI
    { wch: 14 }, // WAKTU_SELESAI
    { wch: 32 }, // MATA_PELAJARAN
    { wch: 16 }, // KELAS
    { wch: 28 }, // RUANG
    { wch: 28 }, // PENGAWAS_PROKTOR
    { wch: 14 }, // STATUS
    { wch: 35 }  // CATATAN
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'JADWAL_SEMESTER');

  // Sheet Petunjuk
  const instructions = [
    ['PANDUAN PENGISIAN TEMPLATE JADWAL UJIAN SEMESTER'],
    [schoolName],
    [''],
    ['1. HARI & TANGGAL:', 'Isi Hari (Senin - Sabtu) dan Tanggal dengan format YYYY-MM-DD (contoh: 2026-11-23).'],
    ['2. WAKTU & SESI:', 'Isi Jam Mulai dan Jam Selesai dalam format HH:mm (contoh: 07:30 dan 09:00).'],
    ['3. MATA PELAJARAN:', 'Tuliskan nama mapel yang diujikan (contoh: Matematika, Bahasa Arab, Fikih, dll).'],
    ['4. KELAS & RUANG:', 'Tuliskan kelas sasaran (misal: Kelas VI A) dan lokasi ruangan (misal: Lab Komputer CBT).'],
    ['5. STATUS:', 'Pilihan status yang valid: UPCOMING (Akan Datang), ONGOING (Sedang Ujian), COMPLETED (Selesai).'],
    ['6. CARA IMPOR:', 'Klik tombol "Import Jadwal dari Excel" di panel Jadwal Semester untuk memperbarui jadwal secara otomatis.']
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(instructions);
  wsInfo['!cols'] = [{ wch: 24 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'PETUNJUK_PENGISIAN');

  XLSX.writeFile(wb, `Template_Jadwal_Semester_${schoolName.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * 2. Ekspor Jadwal Aktif yang ada di sistem ke Excel
 */
export function exportActiveSchedulesToExcel(schedules: ExamSchedule[], schoolName = 'MIS NW KORLEKO'): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'NO',
    'HARI',
    'TANGGAL',
    'SESI',
    'WAKTU_MULAI',
    'WAKTU_SELESAI',
    'MATA_PELAJARAN',
    'KELAS',
    'RUANG',
    'PENGAWAS_PROKTOR',
    'STATUS',
    'CATATAN'
  ];

  const rows = schedules.map((s, idx) => [
    idx + 1,
    s.dayName,
    s.date,
    s.session,
    s.startTime,
    s.endTime,
    s.subjectName,
    s.className,
    s.room,
    s.proctorName,
    s.status,
    s.notes || ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 14 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 32 },
    { wch: 16 },
    { wch: 28 },
    { wch: 28 },
    { wch: 14 },
    { wch: 35 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'JADWAL_SEMESTER_AKTIF');
  XLSX.writeFile(wb, `Jadwal_Semester_Aktif_${schoolName.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * 3. Parser Berkas Excel Jadwal Ujian Semester
 */
export async function parseScheduleExcelFile(file: File): Promise<ExamSchedule[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetName = wb.SheetNames.find(n => n.toUpperCase().includes('JADWAL')) || wb.SheetNames[0];
  if (!sheetName) throw new Error('Lembar jadwal tidak ditemukan di dalam berkas Excel.');

  const ws = wb.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (!rawRows || rawRows.length < 2) {
    throw new Error('Berkas Excel tidak memiliki baris data jadwal.');
  }

  // Cari baris header
  let headerIdx = -1;
  const colMap: Record<string, number> = {};

  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;
    const upper = row.map(c => String(c || '').trim().toUpperCase());

    if (upper.some(c => c.includes('MAPEL') || c.includes('MATA PELAJARAN') || c.includes('HARI'))) {
      headerIdx = r;
      upper.forEach((col, cIdx) => {
        if (col === 'HARI') colMap['HARI'] = cIdx;
        else if (col.includes('TANGGAL')) colMap['TANGGAL'] = cIdx;
        else if (col.includes('SESI')) colMap['SESI'] = cIdx;
        else if (col.includes('MULAI')) colMap['MULAI'] = cIdx;
        else if (col.includes('SELESAI')) colMap['SELESAI'] = cIdx;
        else if (col.includes('MAPEL') || col.includes('MATA PELAJARAN')) colMap['MAPEL'] = cIdx;
        else if (col.includes('KELAS')) colMap['KELAS'] = cIdx;
        else if (col.includes('RUANG')) colMap['RUANG'] = cIdx;
        else if (col.includes('PENGAWAS') || col.includes('PROKTOR')) colMap['PENGAWAS'] = cIdx;
        else if (col.includes('STATUS')) colMap['STATUS'] = cIdx;
        else if (col.includes('CATATAN') || col.includes('KET')) colMap['CATATAN'] = cIdx;
      });
      break;
    }
  }

  if (headerIdx === -1) {
    headerIdx = 0;
    colMap['HARI'] = 1;
    colMap['TANGGAL'] = 2;
    colMap['SESI'] = 3;
    colMap['MULAI'] = 4;
    colMap['SELESAI'] = 5;
    colMap['MAPEL'] = 6;
    colMap['KELAS'] = 7;
    colMap['RUANG'] = 8;
    colMap['PENGAWAS'] = 9;
    colMap['STATUS'] = 10;
    colMap['CATATAN'] = 11;
  }

  const results: ExamSchedule[] = [];

  for (let r = headerIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row)) continue;

    const mapel = String(row[colMap['MAPEL'] ?? 6] || '').trim();
    if (!mapel) continue;

    const hari = String(row[colMap['HARI'] ?? 1] || 'Senin').trim();
    const tanggal = String(row[colMap['TANGGAL'] ?? 2] || new Date().toISOString().split('T')[0]).trim();
    const sesi = String(row[colMap['SESI'] ?? 3] || 'Sesi 1').trim();
    const mulai = String(row[colMap['MULAI'] ?? 4] || '07:30').trim();
    const selesai = String(row[colMap['SELESAI'] ?? 5] || '09:00').trim();
    const kelas = String(row[colMap['KELAS'] ?? 7] || 'Kelas VI A').trim();
    const ruang = String(row[colMap['RUANG'] ?? 8] || 'Lab Komputer CBT Madrasah').trim();
    const pengawas = String(row[colMap['PENGAWAS'] ?? 9] || 'Pengawas Ruang').trim();
    const statusRaw = String(row[colMap['STATUS'] ?? 10] || 'UPCOMING').trim().toUpperCase();
    const status: ExamScheduleStatus = (statusRaw === 'ONGOING' || statusRaw === 'COMPLETED') ? statusRaw : 'UPCOMING';
    const catatan = String(row[colMap['CATATAN'] ?? 11] || '').trim();

    results.push({
      id: `sch-imp-${Date.now()}-${r}`,
      academicYear: '2026/2027',
      semester: 'Ganjil',
      examType: 'Asesmen Sumatif Akhir Semester (ASAS)',
      dayName: hari,
      date: tanggal,
      session: sesi,
      startTime: mulai,
      endTime: selesai,
      subjectName: mapel,
      className: kelas,
      room: ruang,
      proctorName: pengawas,
      status,
      notes: catatan
    });
  }

  return results;
}

/**
 * 4. Unduh Template Excel Resmi Khusus KARTU PESERTA Ujian Semester
 */
export function downloadStudentCardTemplate(schoolName = 'MIS NW KORLEKO'): void {
  const wb = XLSX.utils.book_new();

  const studentHeaders = [
    'NO',
    'NOMOR_PESERTA',
    'NISN',
    'NAMA_LENGKAP',
    'KELAS',
    'RUANG_UJIAN',
    'SESI',
    'USERNAME_LOGIN',
    'PASSWORD_LOGIN'
  ];

  const studentRows = [
    [
      1,
      '05-024-001-8',
      '00812345',
      'Muhammad Fauzi Rahman',
      'Kelas VI A',
      'Lab Komputer CBT Madrasah',
      'Sesi 1 (07.30 - 09.00)',
      '00812345',
      'siswa123'
    ],
    [
      2,
      '05-024-002-7',
      '00812346',
      'Nabila Putri Az-Zahra',
      'Kelas VI A',
      'Lab Komputer CBT Madrasah',
      'Sesi 1 (07.30 - 09.00)',
      '00812346',
      'siswa123'
    ],
    [
      3,
      '05-024-003-6',
      '00812347',
      'Rizky Al-Fatih',
      'Kelas VI B',
      'Lab Komputer CBT Madrasah',
      'Sesi 2 (09.30 - 11.00)',
      '00812347',
      'siswa123'
    ],
    [
      4,
      '05-024-004-5',
      '00812348',
      'Aisyah Humaira',
      'Kelas VI B',
      'Lab Komputer CBT Madrasah',
      'Sesi 2 (09.30 - 11.00)',
      '00812348',
      'siswa123'
    ],
    [
      5,
      '05-024-005-4',
      '00812349',
      'Ahmad Syauqi Farhan',
      'Kelas V A',
      'Ruang Kelas V A',
      'Sesi 1 (07.30 - 09.00)',
      '00812349',
      'siswa123'
    ]
  ];

  const wsStudents = XLSX.utils.aoa_to_sheet([studentHeaders, ...studentRows]);
  wsStudents['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 14 },
    { wch: 28 },
    { wch: 16 },
    { wch: 26 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, wsStudents, 'KARTU_PESERTA');

  // Petunjuk
  const instructions = [
    ['PANDUAN PENGISIAN TEMPLATE DATA KARTU PESERTA UJIAN'],
    [schoolName],
    [''],
    ['1. NOMOR PESERTA:', 'Format nomor peserta madrasah (contoh: 05-024-001-8).'],
    ['2. NISN & NAMA:', 'Isi NISN resmi siswa dan nama lengkap siswa.'],
    ['3. USERNAME & PASSWORD:', 'Kredensial yang akan digunakan siswa login ke aplikasi CBT. Password standar siswa123.'],
    ['4. RUANG & SESI:', 'Lokasi ujian dan sesi pengerjaan siswa.'],
    ['5. CARA IMPOR:', 'Klik tombol "Import Excel" di menu Kartu Peserta untuk memasukkan data secara massal.']
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(instructions);
  wsInfo['!cols'] = [{ wch: 26 }, { wch: 75 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'PETUNJUK_PESERTA');

  XLSX.writeFile(wb, `Template_Kartu_Peserta_${schoolName.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * 5. Unduh Template Excel Resmi Khusus KARTU PENGAWAS RUANG
 */
export function downloadProctorCardTemplate(schoolName = 'MIS NW KORLEKO'): void {
  const wb = XLSX.utils.book_new();

  const proctorHeaders = [
    'NO',
    'NIP_NUPTK',
    'NAMA_PENGAWAS',
    'JABATAN_TUGAS',
    'RUANG_TUGAS',
    'HARI_DAN_SESI',
    'USERNAME_LOGIN',
    'PASSWORD_LOGIN'
  ];

  const proctorRows = [
    [
      1,
      '19890814 201402 1 003',
      'Muhammad Nasir, S.Kom',
      'Proktor Utama CBT',
      'Lab Komputer CBT Madrasah',
      'Senin - Sabtu (Semua Sesi)',
      '198908142014021003',
      'proktor123'
    ],
    [
      2,
      '19920310 201903 2 011',
      'Ustazah Halimatussadiah, S.Pd',
      'Pengawas Ruang Lab',
      'Lab Komputer CBT Madrasah',
      'Senin - Sabtu (Sesi 1 & 2)',
      '199203102019032011',
      'pengawas123'
    ],
    [
      3,
      '19780512 200501 1 004',
      'Ahmad Zaini, S.Pd.I',
      'Penanggung Jawab / Kepala Madrasah',
      'Sekretariat Panitia CBT',
      'Senin - Sabtu',
      'ahmad_zaini',
      'madrasah123'
    ],
    [
      4,
      '19850615 201001 2 008',
      'Ustazah Siti Nurjanah, S.Pd.I',
      'Pengawas Ruang Kelas VI',
      'Ruang Kelas VI A',
      'Senin - Rabu (Sesi 1)',
      'siti_nurjanah',
      'pengawas123'
    ],
    [
      5,
      '-',
      'Ustaz Baiq Mariani, S.Pd',
      'Pengawas Ruang Cadangan',
      'Ruang Guru CBT',
      'Kamis - Sabtu',
      'baiq_mariani',
      'pengawas123'
    ]
  ];

  const wsProctors = XLSX.utils.aoa_to_sheet([proctorHeaders, ...proctorRows]);
  wsProctors['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 32 },
    { wch: 28 },
    { wch: 28 },
    { wch: 28 },
    { wch: 20 },
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, wsProctors, 'KARTU_PENGAWAS');

  // Petunjuk Pengawas
  const instructions = [
    ['PANDUAN PENGISIAN TEMPLATE DATA KARTU PENGAWAS RUANG CBT'],
    [schoolName],
    [''],
    ['1. NIP / NUPTK:', 'Isi NIP resmi atau NUPTK. Jika guru non-PNS/honorer dapat diisi tanda minus (-) atau NUPTK.'],
    ['2. NAMA PENGAWAS:', 'Nama lengkap pengawas ruang beserta gelar kehormatan.'],
    ['3. JABATAN TUGAS:', 'Contoh: Proktor Utama CBT, Pengawas Ruang Lab, Pengawas Ruang Kelas, Penanggung Jawab.'],
    ['4. RUANG & HARI:', 'Ruang pengawasan dan jadwal hari/sesi bertugas.'],
    ['5. USERNAME & PASSWORD:', 'Kredensial akun CBT untuk login pengawas ruang ujian.'],
    ['6. CARA IMPOR:', 'Buka tab "Kartu Pengawas" lalu klik tombol "Import Excel" untuk memuat daftar kartu pengawas.']
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(instructions);
  wsInfo['!cols'] = [{ wch: 26 }, { wch: 75 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'PETUNJUK_PENGAWAS');

  XLSX.writeFile(wb, `Template_Kartu_Pengawas_${schoolName.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * Unduh Gabungan Template (Kompatibilitas Mundur)
 */
export function downloadCardExcelTemplate(schoolName = 'MIS NW KORLEKO'): void {
  downloadStudentCardTemplate(schoolName);
}

/**
 * 6. Parser Berkas Excel Data Kartu Peserta & Pengawas (Fleksibel & Otomatis)
 */
export async function parseCardExcelFile(file: File): Promise<{
  students: Array<{
    nomorPeserta: string;
    nisn: string;
    nama: string;
    kelas: string;
    ruang: string;
    sesi: string;
    username: string;
    password: string;
  }>;
  proctors: Array<{
    nip: string;
    nama: string;
    jabatan: string;
    ruang: string;
    jadwal: string;
    username: string;
    password: string;
  }>;
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const students: Array<{
    nomorPeserta: string;
    nisn: string;
    nama: string;
    kelas: string;
    ruang: string;
    sesi: string;
    username: string;
    password: string;
  }> = [];

  const proctors: Array<{
    nip: string;
    nama: string;
    jabatan: string;
    ruang: string;
    jadwal: string;
    username: string;
    password: string;
  }> = [];

  // Telusuri setiap sheet dalam workbook agar tidak bergantung nama sheet kaku
  for (const sheetName of wb.SheetNames) {
    const upperSheet = sheetName.toUpperCase();
    if (upperSheet.includes('PETUNJUK') || upperSheet.includes('GUIDE') || upperSheet.includes('INFO')) {
      continue;
    }

    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (!rows || rows.length < 2) continue;

    // Cari baris header
    let headerRowIdx = -1;
    let isProctorSheet = upperSheet.includes('PENGAWAS') || upperSheet.includes('PROKTOR') || upperSheet.includes('GURU');
    let isStudentSheet = upperSheet.includes('PESERTA') || upperSheet.includes('SISWA') || upperSheet.includes('STUDENT');

    for (let r = 0; r < Math.min(5, rows.length); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      const joined = row.map(c => String(c || '').toUpperCase()).join(' ');

      if (joined.includes('PENGAWAS') || joined.includes('JABATAN') || joined.includes('NUPTK')) {
        isProctorSheet = true;
        isStudentSheet = false;
        headerRowIdx = r;
        break;
      }
      if (joined.includes('PESERTA') || joined.includes('NISN') || (joined.includes('NAMA') && joined.includes('KELAS'))) {
        isStudentSheet = true;
        isProctorSheet = false;
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) headerRowIdx = 0;
    const headerRow = rows[headerRowIdx] || [];
    const headerCols = headerRow.map((c: any) => String(c || '').toUpperCase().trim());

    // Pemetaan Kolom Pengawas
    if (isProctorSheet) {
      let nipCol = headerCols.findIndex(c => c.includes('NIP') || c.includes('NUPTK') || c.includes('IDENTITAS'));
      let namaCol = headerCols.findIndex(c => c.includes('NAMA'));
      let jabatanCol = headerCols.findIndex(c => c.includes('JABATAN') || c.includes('TUGAS') || c.includes('PERAN'));
      let ruangCol = headerCols.findIndex(c => c.includes('RUANG') || c.includes('LOKASI'));
      let jadwalCol = headerCols.findIndex(c => c.includes('JADWAL') || c.includes('HARI') || c.includes('SESI'));
      let userCol = headerCols.findIndex(c => c.includes('USER') || c.includes('LOGIN'));
      let passCol = headerCols.findIndex(c => c.includes('PASS') || c.includes('SANDI'));

      if (nipCol === -1) nipCol = 1;
      if (namaCol === -1) namaCol = 2;
      if (jabatanCol === -1) jabatanCol = 3;
      if (ruangCol === -1) ruangCol = 4;
      if (jadwalCol === -1) jadwalCol = 5;
      if (userCol === -1) userCol = 6;
      if (passCol === -1) passCol = 7;

      for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !Array.isArray(row)) continue;
        const nama = String(row[namaCol] || '').trim();
        if (!nama || nama.toUpperCase().startsWith('PANDUAN') || nama.toUpperCase().startsWith('CATATAN')) continue;

        const nip = String(row[nipCol] ?? '-').trim();
        const usernameDefault = nip && nip !== '-' 
          ? nip.replace(/\s+/g, '') 
          : `pengawas_${proctors.length + 1}`;

        proctors.push({
          nip: nip || '-',
          nama,
          jabatan: String(row[jabatanCol] || 'Pengawas Ruang').trim(),
          ruang: String(row[ruangCol] || 'Lab Komputer CBT Madrasah').trim(),
          jadwal: String(row[jadwalCol] || 'Senin - Sabtu').trim(),
          username: String(row[userCol] || usernameDefault).trim(),
          password: String(row[passCol] || 'pengawas123').trim()
        });
      }
    } 
    // Pemetaan Kolom Peserta
    else if (isStudentSheet || (!isProctorSheet && headerCols.some(c => c.includes('KELAS') || c.includes('NISN')))) {
      let noPesertaCol = headerCols.findIndex(c => c.includes('NOMOR') || c.includes('NO_PESERTA') || c.includes('NO PESERTA'));
      let nisnCol = headerCols.findIndex(c => c.includes('NISN'));
      let namaCol = headerCols.findIndex(c => c.includes('NAMA'));
      let kelasCol = headerCols.findIndex(c => c.includes('KELAS'));
      let ruangCol = headerCols.findIndex(c => c.includes('RUANG'));
      let sesiCol = headerCols.findIndex(c => c.includes('SESI'));
      let userCol = headerCols.findIndex(c => c.includes('USER') || c.includes('LOGIN'));
      let passCol = headerCols.findIndex(c => c.includes('PASS') || c.includes('SANDI'));

      if (noPesertaCol === -1) noPesertaCol = 1;
      if (nisnCol === -1) nisnCol = 2;
      if (namaCol === -1) namaCol = 3;
      if (kelasCol === -1) kelasCol = 4;
      if (ruangCol === -1) ruangCol = 5;
      if (sesiCol === -1) sesiCol = 6;
      if (userCol === -1) userCol = 7;
      if (passCol === -1) passCol = 8;

      for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !Array.isArray(row)) continue;
        const nama = String(row[namaCol] || '').trim();
        if (!nama || nama.toUpperCase().startsWith('PANDUAN') || nama.toUpperCase().startsWith('CATATAN')) continue;

        const nisn = String(row[nisnCol] || '').trim();
        students.push({
          nomorPeserta: String(row[noPesertaCol] || `05-024-${String(students.length + 1).padStart(3, '0')}-0`).trim(),
          nisn,
          nama,
          kelas: String(row[kelasCol] || 'Kelas VI A').trim(),
          ruang: String(row[ruangCol] || 'Lab Komputer CBT Madrasah').trim(),
          sesi: String(row[sesiCol] || 'Sesi 1 (07.30 - 09.00)').trim(),
          username: String(row[userCol] || nisn || `user${students.length + 1}`).trim(),
          password: String(row[passCol] || 'siswa123').trim()
        });
      }
    }
  }

  return { students, proctors };
}
