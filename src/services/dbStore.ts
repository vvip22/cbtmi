/**
 * Database & Cache Store Service - MIS NW KORLEKO CBT
 * Sistem penyimpanan persisten penuh (localStorage) dengan autentikasi nyata,
 * pengaturan proktor, manajemen token, dan rekap penilaian madrasah.
 */

import { 
  User, 
  SchoolSettings, 
  ClassRoom, 
  Subject, 
  Exam, 
  Question, 
  Submission, 
  Answer, 
  ExamTimerSession, 
  ViolationEvent,
  ExamSchedule 
} from '../types/cbt';
import { DEFAULT_SCHOOL_LOGO } from './logoPresets';

const DB_STORAGE_KEY = 'misnwkorleko_cbt_db_v2';
const REDIS_TIMER_KEY = 'misnwkorleko_redis_timers_v2';
const SIM_PURGED_KEY = 'misnw_cbt_sim_purged_v1';

export interface CBTDatabase {
  settings: SchoolSettings;
  users: User[];
  classes: ClassRoom[];
  subjects: Subject[];
  exams: Exam[];
  submissions: Submission[];
  schedules: ExamSchedule[];
}

const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'MIS NW KORLEKO',
  foundationName: 'YAYASAN PENDIDIKAN PONDOK PESANTREN NAHDLATUL WATHAN KORLEKO',
  nsm: '111252030045',
  npsn: '60721890',
  headmasterName: 'Ahmad Zaini, S.Pd.I',
  headmasterNip: '19780512 200501 1 004',
  proktorName: 'Muhammad Nasir, S.Kom',
  address: 'Jl. Raya Korleko, Desa Korleko, Kec. Labuhan Haji',
  city: 'Kabupaten Lombok Timur',
  province: 'Nusa Tenggara Barat',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  logoUrl: DEFAULT_SCHOOL_LOGO,
  activeExamToken: 'KRLK26',
  tokenGeneratedAt: new Date().toISOString(),
  defaultMaxViolations: 3,
  allowStudentViewResults: true,
  randomizeQuestions: false,
  enforceFullscreen: true,
  soundAlertEnabled: true
};

const DEFAULT_USERS: User[] = [
  {
    id: 'usr-proktor-1',
    username: 'proktor',
    password: 'proktor123',
    email: 'proktor@misnwkorleko.sch.id',
    name: 'Muhammad Nasir, S.Kom',
    role: 'PROKTOR',
    nip: '19890814 201402 1 003',
    isLoggedIn: false
  }
];

const DEFAULT_CLASSES: ClassRoom[] = [];

const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: 'sub-mat-vi',
    name: 'Matematika & Penalaran Numerasi',
    code: 'MAT-VI',
    description: 'Operasi hitung campuran, pecahan, geometri bangun ruang kubus dan balok, serta penyajian data statistik.'
  },
  {
    id: 'sub-kwnw-vi',
    name: 'Pendidikan Agama Islam & Ke-NW-an',
    code: 'PAI-NW-VI',
    description: 'Akidah akhlak, fiqih ibadah, sejarah perjuangan Al-Magfurulah Maulana Syaikh TGKH. M. Zainuddin Abdul Madjid dan tradisi Nahdlatul Wathan.'
  },
  {
    id: 'sub-ipa-vi',
    name: 'Ilmu Pengetahuan Alam (IPA Terpadu)',
    code: 'IPA-VI',
    description: 'Perkembangbiakan makhluk hidup, adaptasi ekosistem lingkungan, dan penghematan energi listrik alternatif.'
  }
];

const DEFAULT_QUESTIONS_MAT: Question[] = [
  {
    id: 'q-mat-1',
    examId: 'exam-mat-vi',
    type: 'MCQ',
    orderIndex: 1,
    text: 'Hasil perhitungan dari 1.250 + 250 × 4 - 450 : 50 adalah...',
    options: [
      { key: 'A', text: '2.241' },
      { key: 'B', text: '2.250' },
      { key: 'C', text: '5.991' },
      { key: 'D', text: '6.000' }
    ],
    correctAnswer: 'A',
    points: 10,
    explanation: 'Dahulukan perkalian dan pembagian: 250 × 4 = 1.000, 450 : 50 = 9. Maka 1.250 + 1.000 - 9 = 2.250 - 9 = 2.241.'
  },
  {
    id: 'q-mat-2',
    examId: 'exam-mat-vi',
    type: 'MCQ',
    orderIndex: 2,
    text: 'Sebuah bak penampungan air wudhu di MIS NW Korleko berbentuk kubus dengan panjang rusuk 1,2 meter. Berapa liter volume air maksimal yang dapat ditampung bak tersebut jika terisi penuh? (1 m³ = 1.000 liter)',
    options: [
      { key: 'A', text: '1.440 liter' },
      { key: 'B', text: '1.728 liter' },
      { key: 'C', text: '2.160 liter' },
      { key: 'D', text: '2.880 liter' }
    ],
    correctAnswer: 'B',
    points: 10,
    explanation: 'Volume kubus = s³ = 1,2 × 1,2 × 1,2 = 1,728 m³ = 1.728 liter.'
  },
  {
    id: 'q-mat-3',
    examId: 'exam-mat-vi',
    type: 'MCQ',
    orderIndex: 3,
    text: 'Ibu memiliki persediaan tepung terigu 3 1/2 kg. Digunakan untuk membuat kue tradisional sasak 1 3/4 kg. Kemudian ibu membeli lagi 2,5 kg. Berapa kilogram sisa persediaan tepung ibu sekarang?',
    options: [
      { key: 'A', text: '4,0 kg' },
      { key: 'B', text: '4,25 kg' },
      { key: 'C', text: '4,5 kg' },
      { key: 'D', text: '4,75 kg' }
    ],
    correctAnswer: 'B',
    points: 10,
    explanation: '3,5 - 1,75 + 2,5 = 1,75 + 2,5 = 4,25 kg.'
  },
  {
    id: 'q-mat-4',
    examId: 'exam-mat-vi',
    type: 'MCQ',
    orderIndex: 4,
    text: 'KPK dan FPB dari bilangan 36, 48, dan 72 berturut-turut adalah...',
    options: [
      { key: 'A', text: '144 dan 12' },
      { key: 'B', text: '144 dan 24' },
      { key: 'C', text: '72 dan 12' },
      { key: 'D', text: '288 dan 12' }
    ],
    correctAnswer: 'A',
    points: 10,
    explanation: 'Faktorisasi prima: 36 = 2²×3², 48 = 2⁴×3, 72 = 2³×3². KPK = 2⁴×3² = 16×9 = 144. FPB = 2²×3 = 12.'
  },
  {
    id: 'q-mat-5',
    examId: 'exam-mat-vi',
    type: 'MCQ',
    orderIndex: 5,
    text: 'Nilai ulangan Matematika 10 siswa MIS NW Korleko: 75, 80, 85, 90, 75, 80, 85, 95, 90, 85. Berapakah nilai rata-rata (mean) dan modus dari data nilai tersebut?',
    options: [
      { key: 'A', text: 'Mean = 83,5 dan Modus = 80' },
      { key: 'B', text: 'Mean = 84,0 dan Modus = 85' },
      { key: 'C', text: 'Mean = 85,0 dan Modus = 85' },
      { key: 'D', text: 'Mean = 84,5 dan Modus = 90' }
    ],
    correctAnswer: 'B',
    points: 10,
    explanation: 'Jumlah nilai = 840 / 10 = 84,0. Nilai yang paling sering muncul adalah 85 (sebanyak 3 kali).'
  },
  {
    id: 'q-mat-6',
    examId: 'exam-mat-vi',
    type: 'MCQ',
    orderIndex: 6,
    text: 'Sebuah taman madrasah berbentuk lingkaran memiliki diameter 28 meter. Di sekeliling taman tersebut akan dipasang lampu hias dengan jarak antar lampu 4 meter. Berapa banyak lampu hias yang dibutuhkan? (π = 22/7)',
    options: [
      { key: 'A', text: '20 buah' },
      { key: 'B', text: '22 buah' },
      { key: 'C', text: '24 buah' },
      { key: 'D', text: '28 buah' }
    ],
    correctAnswer: 'B',
    points: 10,
    explanation: 'Keliling = π × d = 22/7 × 28 = 88 meter. Jumlah lampu = 88 : 4 = 22 buah.'
  },
  {
    id: 'q-mat-7',
    examId: 'exam-mat-vi',
    type: 'MCQ',
    orderIndex: 7,
    text: 'Pak Ahmad mengendarai sepeda motor dari Korleko menuju Selong dengan kecepatan rata-rata 45 km/jam. Jarak Korleko ke Selong adalah 15 km. Jika Pak Ahmad berangkat pukul 06.45 WITA, pukul berapa ia tiba di Selong?',
    options: [
      { key: 'A', text: 'Pukul 07.00 WITA' },
      { key: 'B', text: 'Pukul 07.05 WITA' },
      { key: 'C', text: 'Pukul 07.15 WITA' },
      { key: 'D', text: 'Pukul 07.20 WITA' }
    ],
    correctAnswer: 'B',
    points: 10,
    explanation: 'Waktu tempuh = Jarak / Kecepatan = 15/45 jam = 1/3 jam = 20 menit. Tiba = 06.45 + 20 menit = 07.05 WITA.'
  },
  {
    id: 'q-mat-8',
    examId: 'exam-mat-vi',
    type: 'ESSAY',
    orderIndex: 8,
    text: 'Sebuah kolam wudhu madrasah berukuran panjang 4 meter, lebar 2,5 meter, dan kedalaman 1,5 meter terisi air 3/4 bagian. \n1. Hitung volume total kolam tersebut dalam satuan meter kubik!\n2. Hitung berapa liter air yang sudah ada di dalam kolam!\n3. Berapa liter air lagi yang diperlukan agar kolam terisi penuh?',
    correctAnswer: 'Rubrik Penilaian:\n1. Volume total = p × l × t = 4 × 2,5 × 1,5 = 15 m³ (bobot 5 poin)\n2. Air yang ada = 3/4 × 15 m³ = 11,25 m³ = 11.250 liter (bobot 5 poin)\n3. Air tambahan = 15.000 - 11.250 = 3.750 liter (bobot 5 poin)',
    points: 15,
    explanation: 'Perhitungan volume balok dan konversi satuan meter kubik ke liter.'
  },
  {
    id: 'q-mat-9',
    examId: 'exam-mat-vi',
    type: 'ESSAY',
    orderIndex: 9,
    text: 'Data perolehan zakat infak shadaqah kelas VI MIS NW Korleko dalam 5 hari berturut-turut adalah:\nSenin: Rp 45.000\nSelasa: Rp 60.000\nRabu: Rp 55.000\nKamis: Rp 70.000\nJumat: Rp 95.000\nHitunglah:\na. Rata-rata perolehan infak per hari.\nb. Selisih infak tertinggi dan terendah.\nc. Kesimpulan apa yang dapat kamu ambil mengenai kesadaran berinfak pada hari Jumat?',
    correctAnswer: 'Rubrik Penilaian:\na. Total = 325.000 : 5 = Rp 65.000 per hari (bobot 5 poin)\nb. Selisih = 95.000 - 45.000 = Rp 50.000 (bobot 5 poin)\nc. Analisis Jumat berkah memicu peningkatan infak tertinggi (bobot 5 poin)',
    points: 15,
    explanation: 'Statistika dasar deskriptif dan kemampuan menafsirkan data infak keagamaan.'
  }
];

const DEFAULT_EXAMS: Exam[] = [
  {
    id: 'exam-mat-vi',
    title: 'Asesmen Sumatif Akhir Semester (ASAS) Matematika Kelas VI',
    description: 'Ujian semester berbasis komputer MIS NW Korleko. Pengerjaan wajib layar penuh dengan pengawasan proktor.',
    subjectId: 'sub-mat-vi',
    subjectName: 'Matematika & Penalaran Numerasi',
    classId: 'cls-vi-a',
    className: 'Kelas VI A',
    startTime: new Date(Date.now() - 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 86400 * 1000 * 7).toISOString(),
    duration: 60,
    passingGrade: 75.0,
    isActive: true,
    randomizeQuestions: false,
    showResults: true,
    maxViolations: 3,
    token: 'KRLK26',
    questions: DEFAULT_QUESTIONS_MAT
  },
  {
    id: 'exam-kwnw-vi',
    title: 'Penilaian Akhir Semester (PAS) PAI & Ke-NW-an Kelas VI',
    description: 'Evaluasi pemahaman nilai-nilai keislaman dan perjuangan Nahdlatul Wathan Korleko.',
    subjectId: 'sub-kwnw-vi',
    subjectName: 'Pendidikan Agama Islam & Ke-NW-an',
    classId: 'cls-vi-a',
    className: 'Kelas VI A',
    startTime: new Date(Date.now() - 7200 * 1000).toISOString(),
    endTime: new Date(Date.now() + 86400 * 1000 * 5).toISOString(),
    duration: 50,
    passingGrade: 75.0,
    isActive: true,
    randomizeQuestions: false,
    showResults: true,
    maxViolations: 3,
    token: 'NW2026',
    questions: []
  },
  {
    id: 'exam-tik-vi',
    title: 'Ujian TIK - Kelas VI A',
    description: 'Evaluasi pengenalan perangkat keras komputer, jaringan, dan aplikasi digital madrasah.',
    subjectId: 'sub-tik-vi',
    subjectName: 'TIK',
    classId: 'cls-vi-a',
    className: 'Kelas VI A',
    startTime: '2026-11-03T21:00:00.000Z',
    endTime: '2026-11-03T22:00:00.000Z',
    duration: 60,
    passingGrade: 75.0,
    isActive: true,
    randomizeQuestions: false,
    showResults: true,
    maxViolations: 3,
    token: 'TIK26',
    questions: [
      {
        id: 'q-tik-1',
        examId: 'exam-tik-vi',
        type: 'MCQ',
        orderIndex: 1,
        text: 'Perangkat keras komputer yang berfungsi sebagai pemroses utama seluruh instruksi komputasi adalah...',
        options: [
          { key: 'A', text: 'Hard Disk' },
          { key: 'B', text: 'Central Processing Unit (CPU)' },
          { key: 'C', text: 'Monitor Layar' },
          { key: 'D', text: 'Keyboard' }
        ],
        correctAnswer: 'B',
        points: 25,
        explanation: 'CPU adalah unit pemroses pusat komputer.'
      },
      {
        id: 'q-tik-2',
        examId: 'exam-tik-vi',
        type: 'MCQ',
        orderIndex: 2,
        text: 'Jaringan komputer lokal yang menghubungkan komputer di dalam laboratorium komputer CBT madrasah disebut...',
        options: [
          { key: 'A', text: 'LAN (Local Area Network)' },
          { key: 'B', text: 'WAN (Wide Area Network)' },
          { key: 'C', text: 'MAN (Metropolitan Area Network)' },
          { key: 'D', text: 'Internet Global' }
        ],
        correctAnswer: 'A',
        points: 25,
        explanation: 'LAN mencakup area terbatas seperti lab komputer sekolah.'
      },
      {
        id: 'q-tik-3',
        examId: 'exam-tik-vi',
        type: 'ESSAY',
        orderIndex: 3,
        text: 'Jelaskan manfaat penggunaan aplikasi CBT (Computer Based Test) dalam pelaksanaan asesmen semester di MIS NW Korleko dibandingkan ujian kertas konvensional!',
        correctAnswer: 'Rubrik Penilaian:\n1. Efisiensi waktu koreksi otomatis (bobot 25 poin)\n2. Penghematan kertas dan ramah lingkungan (bobot 25 poin)',
        points: 50,
        explanation: 'Efisiensi penilaian, keamanan anti-curang, dan digitalisasi madrasah.'
      }
    ]
  }
];

const DEFAULT_SUBMISSIONS: Submission[] = [];

export const DEFAULT_SCHEDULES: ExamSchedule[] = [
  {
    id: 'sch-1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    examType: 'Asesmen Sumatif Akhir Semester (ASAS)',
    dayName: 'Senin',
    date: '2026-11-23',
    session: 'Sesi 1 (07.30 - 09.00)',
    startTime: '07:30',
    endTime: '09:00',
    subjectName: 'Matematika & Penalaran Numerasi',
    className: 'Kelas VI A',
    room: 'Lab Komputer CBT Madrasah',
    proctorName: 'Muhammad Nasir, S.Kom',
    examId: 'exam-mat-vi',
    status: 'ONGOING',
    notes: 'Pengerjaan via CBT layar penuh. Membawa coretan buram.'
  },
  {
    id: 'sch-2',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    examType: 'Asesmen Sumatif Akhir Semester (ASAS)',
    dayName: 'Senin',
    date: '2026-11-23',
    session: 'Sesi 2 (09.30 - 11.00)',
    startTime: '09:30',
    endTime: '11:00',
    subjectName: 'Matematika & Penalaran Numerasi',
    className: 'Kelas VI B',
    room: 'Lab Komputer CBT Madrasah',
    proctorName: 'Ustazah Halimatussadiah, S.Pd',
    examId: 'exam-mat-vi',
    status: 'UPCOMING',
    notes: 'Peserta wajib hadir 15 menit sebelum sesi dimulai.'
  },
  {
    id: 'sch-3',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    examType: 'Asesmen Sumatif Akhir Semester (ASAS)',
    dayName: 'Selasa',
    date: '2026-11-24',
    session: 'Sesi 1 (07.30 - 09.00)',
    startTime: '07:30',
    endTime: '09:00',
    subjectName: 'Bahasa Arab',
    className: 'Kelas VI A',
    room: 'Lab Komputer CBT Madrasah',
    proctorName: 'Muhammad Nasir, S.Kom',
    status: 'UPCOMING',
    notes: 'Mendukung teks berharakat & tulisan Arab kanan ke kiri (RTL).'
  },
  {
    id: 'sch-4',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    examType: 'Asesmen Sumatif Akhir Semester (ASAS)',
    dayName: 'Selasa',
    date: '2026-11-24',
    session: 'Sesi 2 (09.30 - 11.00)',
    startTime: '09:30',
    endTime: '11:00',
    subjectName: 'Bahasa Arab',
    className: 'Kelas VI B',
    room: 'Lab Komputer CBT Madrasah',
    proctorName: 'Ustazah Halimatussadiah, S.Pd',
    status: 'UPCOMING',
    notes: 'Sesi kedua Kelas VI B.'
  },
  {
    id: 'sch-5',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    examType: 'Asesmen Sumatif Akhir Semester (ASAS)',
    dayName: 'Rabu',
    date: '2026-11-25',
    session: 'Sesi 1 (07.30 - 09.00)',
    startTime: '07:30',
    endTime: '09:00',
    subjectName: 'Pendidikan Agama Islam & Ke-NW-an',
    className: 'Kelas VI A',
    room: 'Ruang Kelas VI A',
    proctorName: 'Ahmad Zaini, S.Pd.I',
    examId: 'exam-kwnw-vi',
    status: 'UPCOMING',
    notes: 'Materi Ke-NW-an, Sejarah Madrasah NW Korleko.'
  },
  {
    id: 'sch-6',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    examType: 'Asesmen Sumatif Akhir Semester (ASAS)',
    dayName: 'Kamis',
    date: '2026-11-26',
    session: 'Sesi 1 (07.30 - 09.00)',
    startTime: '07:30',
    endTime: '09:00',
    subjectName: 'Ilmu Pengetahuan Alam (IPA Terpadu)',
    className: 'Kelas VI A',
    room: 'Lab Komputer CBT Madrasah',
    proctorName: 'Muhammad Nasir, S.Kom',
    status: 'UPCOMING',
    notes: 'Siswa diperkenankan membawa alat tulis pensil.'
  },
  {
    id: 'sch-tik-vi',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    examType: 'Asesmen Sumatif Akhir Semester (ASAS)',
    dayName: 'Selasa',
    date: '2026-11-03',
    session: 'Sesi 1 (21.00-22.00)',
    startTime: '21:00',
    endTime: '22:00',
    subjectName: 'TIK',
    className: 'Kelas VI A',
    room: 'Lab Komputer CBT Madrasah',
    proctorName: 'Rohman Yadi',
    examId: 'exam-tik-vi',
    status: 'COMPLETED',
    notes: 'Pengerjaan via CBT layar penuh. Membawa coretan buram.'
  }
];

class DatabaseService {
  private getDb(): CBTDatabase {
    try {
      const raw = localStorage.getItem(DB_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.settings) {
          parsed.settings = DEFAULT_SETTINGS;
        }
        if (!parsed.schedules || !Array.isArray(parsed.schedules) || parsed.schedules.length === 0) {
          parsed.schedules = [...DEFAULT_SCHEDULES];
        } else {
          // Pastikan jadwal TIK ada jika belum ada
          if (!parsed.schedules.some((s: ExamSchedule) => s.id === 'sch-tik-vi' || (s.subjectName === 'TIK' && s.className === 'Kelas VI A'))) {
            parsed.schedules.push(DEFAULT_SCHEDULES[DEFAULT_SCHEDULES.length - 1]);
            this.saveDb(parsed);
          }
        }
        if (parsed.exams && Array.isArray(parsed.exams)) {
          if (!parsed.exams.some((e: Exam) => e.id === 'exam-tik-vi')) {
            const tikExam = DEFAULT_EXAMS.find(e => e.id === 'exam-tik-vi');
            if (tikExam) {
              parsed.exams.push(tikExam);
              this.saveDb(parsed);
            }
          }
        }
        if (parsed.users && Array.isArray(parsed.users)) {
          let cleaned = false;
          parsed.users.forEach((u: User) => {
            if (u.avatarUrl && (u.avatarUrl.includes('unsplash.com') || u.avatarUrl.includes('images.unsplash'))) {
              delete u.avatarUrl;
              cleaned = true;
            }
          });
          if (cleaned) {
            this.saveDb(parsed);
          }
        }
        // Pembersihan satu kali data simulasi lama yang sudah tersimpan di localStorage
        if (localStorage.getItem(SIM_PURGED_KEY) !== '1') {
          const simUserIds = new Set(['usr-pengawas-1', 'usr-peserta-1', 'usr-peserta-2', 'usr-peserta-3']);
          const simClassIds = new Set(['cls-vi-a', 'cls-vi-b', 'cls-v-a']);
          const simSubmIds = new Set(['subm-nabila-mat', 'subm-rizky-mat']);

          if (Array.isArray(parsed.users)) {
            parsed.users = parsed.users.filter((u: User) => {
              if (simUserIds.has(u.id)) return false;
              if (u.username === 'pengawas' && u.name === 'Ustazah Halimatussadiah, S.Pd') return false;
              if (u.username === '00812345' && u.name === 'Muhammad Fauzi Rahman') return false;
              if (u.username === '00812346' && u.name === 'Nabila Putri Az-Zahra') return false;
              if (u.username === '00812347' && u.name === 'Rizky Al-Fatih') return false;
              return true;
            });
          }
          if (Array.isArray(parsed.classes)) {
            parsed.classes = parsed.classes.filter((c: ClassRoom) => !simClassIds.has(c.id));
          }
          if (Array.isArray(parsed.submissions)) {
            parsed.submissions = parsed.submissions.filter((s: Submission) => !simSubmIds.has(s.id));
          }

          // Bersihkan kartu simulasi jika masih tersimpan di localStorage kartu
          try {
            const rawStdCards = localStorage.getItem('misnw_cbt_cards_students_v1');
            if (rawStdCards) {
              const stdCards = JSON.parse(rawStdCards);
              if (Array.isArray(stdCards)) {
                const filteredStd = stdCards.filter((c: any) => {
                  if (simUserIds.has(c.id)) return false;
                  if (c.nisn === '00812345' && c.name === 'Muhammad Fauzi Rahman') return false;
                  if (c.nisn === '00812346' && c.name === 'Nabila Putri Az-Zahra') return false;
                  if (c.nisn === '00812347' && c.name === 'Rizky Al-Fatih') return false;
                  if (c.nisn === '00812348' && c.name === 'Aisyah Humaira') return false;
                  return true;
                });
                localStorage.setItem('misnw_cbt_cards_students_v1', JSON.stringify(filteredStd));
              }
            }
            const rawPrcCards = localStorage.getItem('misnw_cbt_cards_proctors_v1');
            if (rawPrcCards) {
              const prcCards = JSON.parse(rawPrcCards);
              if (Array.isArray(prcCards)) {
                const filteredPrc = prcCards.filter((p: any) => {
                  if (p.id === 'usr-pengawas-1' || p.id === 'prc-2') return false;
                  if (p.username === 'pengawas' && p.name === 'Ustazah Halimatussadiah, S.Pd') return false;
                  return true;
                });
                localStorage.setItem('misnw_cbt_cards_proctors_v1', JSON.stringify(filteredPrc));
              }
            }
          } catch {
            // ignore card cleanup errors
          }

          localStorage.setItem(SIM_PURGED_KEY, '1');
          this.saveDb(parsed);
        }
        return parsed;
      }
    } catch {
      // Fallback
    }

    const initialDb: CBTDatabase = {
      settings: DEFAULT_SETTINGS,
      users: DEFAULT_USERS,
      classes: DEFAULT_CLASSES,
      subjects: DEFAULT_SUBJECTS,
      exams: DEFAULT_EXAMS,
      submissions: DEFAULT_SUBMISSIONS,
      schedules: DEFAULT_SCHEDULES
    };
    this.saveDb(initialDb);
    return initialDb;
  }

  private saveDb(db: CBTDatabase) {
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  // --- Real Authentication Engine ---
  public authenticate(identifier: string, passwordInput: string): { user: User | null; message?: string } {
    const db = this.getDb();
    const cleanId = identifier.trim().toLowerCase();

    // Check username, email, or nisn
    const user = db.users.find(u => 
      u.username.toLowerCase() === cleanId ||
      u.email.toLowerCase() === cleanId ||
      (u.nisn && u.nisn.toLowerCase() === cleanId)
    );

    if (!user) {
      return { user: null, message: 'Nama Pengguna / NISN tidak terdaftar di sistem MIS NW Korleko.' };
    }

    if (user.password !== passwordInput) {
      return { user: null, message: 'Kata sandi tidak sesuai. Silakan periksa kembali.' };
    }

    // Set logged in status and timestamp
    user.isLoggedIn = true;
    user.lastLoginAt = new Date().toISOString();
    this.saveDb(db);

    return { user, message: 'Berhasil masuk.' };
  }

  public logoutUser(userId: string) {
    const db = this.getDb();
    const u = db.users.find(usr => usr.id === userId);
    if (u) {
      u.isLoggedIn = false;
      this.saveDb(db);
    }
  }

  // --- Settings (Akun Proktor) ---
  public getSchoolSettings(): SchoolSettings {
    const s = this.getDb().settings || DEFAULT_SETTINGS;
    if (!s.logoUrl) {
      s.logoUrl = DEFAULT_SCHOOL_LOGO;
    }
    return s;
  }

  public updateSchoolSettings(newSettings: Partial<SchoolSettings>): SchoolSettings {
    const db = this.getDb();
    db.settings = { ...db.settings, ...newSettings };
    this.saveDb(db);
    return db.settings;
  }

  public generateNewExamToken(): string {
    const db = this.getDb();
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    const token = `NW${rand}`;
    db.settings.activeExamToken = token;
    db.settings.tokenGeneratedAt = new Date().toISOString();

    // Update active exams to use this token
    db.exams.forEach(ex => {
      ex.token = token;
    });

    this.saveDb(db);
    return token;
  }

  public resetUserLogin(userId: string): boolean {
    const db = this.getDb();
    const u = db.users.find(usr => usr.id === userId);
    if (u) {
      u.isLoggedIn = false;
      this.saveDb(db);
      return true;
    }
    return false;
  }

  public setUserLoginStatus(userId: string, isLoggedIn: boolean): boolean {
    const db = this.getDb();
    const u = db.users.find(usr => usr.id === userId);
    if (u) {
      u.isLoggedIn = isLoggedIn;
      if (isLoggedIn) {
        u.lastLoginAt = new Date().toISOString();
      }
      this.saveDb(db);
      return true;
    }
    return false;
  }

  public resetAllLogins(roleFilter?: string): number {
    const db = this.getDb();
    let count = 0;
    db.users.forEach(u => {
      if (!roleFilter || u.role === roleFilter || (roleFilter === 'PESERTA' && (u.role === 'PESERTA' || u.role === 'STUDENT'))) {
        if (u.isLoggedIn) {
          u.isLoggedIn = false;
          count++;
        }
      }
    });
    this.saveDb(db);
    return count;
  }

  // --- Users CRUD ---
  public getUsers(): User[] {
    return this.getDb().users;
  }

  public getUserById(id: string): User | undefined {
    return this.getDb().users.find(u => u.id === id);
  }

  public saveUser(user: User): User {
    const db = this.getDb();
    const idx = db.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      db.users[idx] = user;
    } else {
      db.users.push(user);
    }
    this.saveDb(db);
    return user;
  }

  public deleteUser(id: string) {
    const db = this.getDb();
    db.users = db.users.filter(u => u.id !== id);
    this.saveDb(db);
  }

  // --- Classes & Subjects ---
  public getClasses(): ClassRoom[] {
    return this.getDb().classes;
  }

  public getSubjects(): Subject[] {
    return this.getDb().subjects;
  }

  // --- Exams ---
  public getExams(): Exam[] {
    return this.getDb().exams;
  }

  public getExamById(id: string): Exam | undefined {
    return this.getDb().exams.find(e => e.id === id);
  }

  public saveExam(exam: Exam): Exam {
    const db = this.getDb();
    const idx = db.exams.findIndex(e => e.id === exam.id);
    if (idx >= 0) {
      db.exams[idx] = exam;
    } else {
      db.exams.push(exam);
    }
    this.saveDb(db);
    return exam;
  }

  public deleteExam(id: string) {
    const db = this.getDb();
    db.exams = db.exams.filter(e => e.id !== id);
    db.submissions = db.submissions.filter(s => s.examId !== id);
    this.saveDb(db);
  }

  // --- Semester Exam Schedules (Jadwal Semester) ---
  public getSchedules(): ExamSchedule[] {
    const db = this.getDb();
    return db.schedules || [];
  }

  public getScheduleById(id: string): ExamSchedule | undefined {
    return this.getDb().schedules?.find(s => s.id === id);
  }

  public saveSchedule(schedule: ExamSchedule): ExamSchedule {
    const db = this.getDb();
    if (!db.schedules) db.schedules = [];
    const idx = db.schedules.findIndex(s => s.id === schedule.id);
    if (idx >= 0) {
      db.schedules[idx] = schedule;
    } else {
      db.schedules.push(schedule);
    }
    this.saveDb(db);
    return schedule;
  }

  public deleteSchedule(id: string) {
    const db = this.getDb();
    if (!db.schedules) return;
    db.schedules = db.schedules.filter(s => s.id !== id);
    this.saveDb(db);
  }

  public resetSchedulesToDefault(): ExamSchedule[] {
    const db = this.getDb();
    db.schedules = [...DEFAULT_SCHEDULES];
    this.saveDb(db);
    return db.schedules;
  }

  // --- Submissions & Exam Session ---
  public checkAndAutoSubmitExpiredSubmissions(examId?: string): boolean {
    const db = this.getDb();
    const timers = this.getTimers();
    const now = Date.now();
    let updatedAny = false;

    db.submissions.forEach(sub => {
      if (sub.status !== 'ONGOING') return;
      if (examId && sub.examId !== examId) return;

      const exam = db.exams.find(e => e.id === sub.examId);
      const timer = timers[sub.id];

      // Sisa durasi ujian dalam milidetik
      const durationMs = (exam?.duration || 60) * 60 * 1000;
      const startedAtMs = new Date(sub.startedAt).getTime();
      const isTimerExpired = timer ? (timer.expiresAt <= now || timer.isExpired) : ((startedAtMs + durationMs) <= now);

      if (isTimerExpired) {
        // Otomatis hitung nilai PG dan kunci ujian
        let mcqScore = 0;
        let hasEssay = false;

        (exam?.questions || []).forEach(q => {
          const studentAns = sub.answers?.[q.id];
          if (q.type === 'MCQ') {
            const isCorrect = studentAns && studentAns.studentAnswer?.toUpperCase() === q.correctAnswer?.toUpperCase();
            const points = isCorrect ? q.points : 0;
            mcqScore += points;
            if (studentAns) {
              studentAns.isCorrect = isCorrect;
              studentAns.pointsAwarded = points;
            }
          } else if (q.type === 'ESSAY') {
            hasEssay = true;
            if (studentAns) {
              studentAns.isCorrect = null;
            }
          }
        });

        sub.status = hasEssay ? 'SUBMITTED' : 'GRADED';
        sub.submittedAt = new Date().toISOString();
        sub.mcqScore = mcqScore;
        sub.essayScore = sub.essayScore || 0;
        sub.score = mcqScore + (sub.essayScore || 0);
        sub.isAutoSubmitted = true;
        sub.autoSubmitReason = 'Waktu pengerjaan telah habis (Otomatis selesai oleh sistem)';
        if (!sub.teacherNotes) {
          sub.teacherNotes = 'Diselesaikan otomatis oleh sistem: Waktu pengerjaan ujian telah habis.';
        }

        if (timer) {
          timer.isExpired = true;
          timers[sub.id] = timer;
        }

        updatedAny = true;
      }
    });

    if (updatedAny) {
      this.saveDb(db);
      this.saveTimers(timers);
    }
    return updatedAny;
  }

  public getSubmissions(examId?: string): Submission[] {
    this.checkAndAutoSubmitExpiredSubmissions(examId);
    const db = this.getDb();
    if (examId) {
      return db.submissions.filter(s => s.examId === examId);
    }
    return db.submissions;
  }

  public getSubmission(examId: string, studentId: string): Submission | undefined {
    return this.getDb().submissions.find(s => s.examId === examId && s.studentId === studentId);
  }

  public getSubmissionById(submissionId: string): Submission | undefined {
    return this.getDb().submissions.find(s => s.id === submissionId);
  }

  public startExamSession(examId: string, student: User): { submission: Submission; timerSession: ExamTimerSession } {
    const db = this.getDb();
    const exam = db.exams.find(e => e.id === examId);
    if (!exam) throw new Error('Ujian tidak ditemukan');

    let submission = db.submissions.find(s => s.examId === examId && s.studentId === student.id);
    const now = Date.now();
    const durationMinutes = exam.duration;
    let expiresAt = now + durationMinutes * 60 * 1000;

    // Periksa apakah terdapat jadwal asesmen dengan batas jam selesai (endTime)
    const studentClass = student.kelas || exam.className;
    const schedule = (db.schedules || []).find(s => {
      if (s.examId && s.examId === examId) {
        if (studentClass && s.className) return s.className.toLowerCase().trim() === studentClass.toLowerCase().trim();
        return true;
      }
      const matchSubj = s.subjectName && (s.subjectName.toLowerCase().trim() === exam.subjectName?.toLowerCase().trim() || exam.title.toLowerCase().includes(s.subjectName.toLowerCase().trim()));
      const matchClass = !studentClass || !s.className || s.className.toLowerCase().trim() === studentClass.toLowerCase().trim();
      return matchSubj && matchClass;
    });

    if (schedule && schedule.date && schedule.endTime) {
      try {
        const [year, month, day] = schedule.date.trim().split('-').map(Number);
        const [hours, minutes] = schedule.endTime.trim().split(':').map(Number);
        const scheduleEnd = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
        const scheduleEndMs = scheduleEnd.getTime();
        if (!isNaN(scheduleEndMs) && scheduleEndMs > now) {
          expiresAt = Math.min(expiresAt, scheduleEndMs);
        } else if (!isNaN(scheduleEndMs) && scheduleEndMs <= now) {
          // Jadwal sudah lewat batas jam selesai
          expiresAt = now; // Langsung expired
        }
      } catch (e) {
        console.error('Error clamping schedule end time:', e);
      }
    }

    if (!submission) {
      submission = {
        id: `subm-${student.id}-${examId}`,
        examId,
        studentId: student.id,
        studentName: student.name,
        studentNisn: student.nisn || '0000000000',
        studentClass: student.kelas || exam.className || 'Kelas VI A',
        startedAt: new Date(now).toISOString(),
        status: 'ONGOING',
        score: 0,
        mcqScore: 0,
        essayScore: 0,
        violationsCount: 0,
        violationsLog: [],
        answers: {},
        lastHeartbeat: new Date(now).toISOString(),
        answeredCount: 0
      };
      db.submissions.push(submission);
      this.saveDb(db);
    }

    const timers = this.getTimers();
    let timer = timers[submission.id];
    if (!timer || timer.isExpired) {
      timer = {
        submissionId: submission.id,
        examId,
        studentId: student.id,
        startedAt: now,
        expiresAt,
        durationMinutes,
        isExpired: now >= expiresAt
      };
      timers[submission.id] = timer;
      this.saveTimers(timers);
    }

    return { submission, timerSession: timer };
  }

  public saveAnswer(submissionId: string, questionId: string, studentAnswer: string, isFlaggedReview = false) {
    const db = this.getDb();
    const submission = db.submissions.find(s => s.id === submissionId);
    if (!submission) return null;

    if (!submission.answers) submission.answers = {};

    submission.answers[questionId] = {
      id: `ans-${Date.now()}`,
      submissionId,
      questionId,
      studentAnswer,
      isFlaggedReview,
      pointsAwarded: 0,
      updatedAt: new Date().toISOString()
    };

    submission.lastHeartbeat = new Date().toISOString();
    submission.answeredCount = Object.values(submission.answers).filter(a => a.studentAnswer && a.studentAnswer.trim() !== '').length;
    this.saveDb(db);
    return submission.answers[questionId];
  }

  public recordViolation(submissionId: string, reason: string): { submission: Submission; isLocked: boolean } {
    const db = this.getDb();
    const submission = db.submissions.find(s => s.id === submissionId);
    if (!submission) throw new Error('Submission not found');

    const exam = db.exams.find(e => e.id === submission.examId);
    const maxAllowed = exam?.maxViolations || db.settings.defaultMaxViolations || 3;

    submission.violationsCount += 1;
    const event: ViolationEvent = {
      timestamp: new Date().toISOString(),
      reason,
      tabSwitchCount: submission.violationsCount
    };
    if (!submission.violationsLog) submission.violationsLog = [];
    submission.violationsLog.push(event);

    const isLocked = submission.violationsCount >= maxAllowed;
    if (isLocked) {
      submission.status = 'DISQUALIFIED';
      submission.submittedAt = new Date().toISOString();
      submission.teacherNotes = `Otomatis dikunci pengawas: Melebihi toleransi pelanggaran anti-curang (${submission.violationsCount}/${maxAllowed}).`;
    }

    this.saveDb(db);
    return { submission, isLocked };
  }

  public submitExam(submissionId: string, autoReason?: string): Submission {
    const db = this.getDb();
    const submission = db.submissions.find(s => s.id === submissionId);
    if (!submission) throw new Error('Submission not found');

    const exam = db.exams.find(e => e.id === submission.examId);
    if (!exam || !exam.questions) throw new Error('Exam data invalid');

    let mcqScore = 0;
    let hasEssay = false;

    exam.questions.forEach(q => {
      const studentAns = submission.answers[q.id];
      if (q.type === 'MCQ') {
        const isCorrect = studentAns && studentAns.studentAnswer?.toUpperCase() === q.correctAnswer?.toUpperCase();
        const points = isCorrect ? q.points : 0;
        mcqScore += points;
        if (studentAns) {
          studentAns.isCorrect = isCorrect;
          studentAns.pointsAwarded = points;
        }
      } else if (q.type === 'ESSAY') {
        hasEssay = true;
        if (studentAns) {
          studentAns.isCorrect = null;
        }
      }
    });

    submission.submittedAt = new Date().toISOString();
    submission.mcqScore = mcqScore;
    submission.essayScore = submission.essayScore || 0;
    submission.score = mcqScore + (submission.essayScore || 0);
    submission.status = hasEssay ? 'SUBMITTED' : 'GRADED';

    if (autoReason) {
      submission.isAutoSubmitted = true;
      submission.autoSubmitReason = autoReason;
      if (!submission.teacherNotes) {
        submission.teacherNotes = autoReason;
      }
    }

    const timers = this.getTimers();
    if (timers[submissionId]) {
      timers[submissionId].isExpired = true;
      this.saveTimers(timers);
    }

    this.saveDb(db);
    return submission;
  }

  public gradeEssayAnswer(submissionId: string, questionId: string, pointsAwarded: number, teacherFeedback: string): Submission {
    const db = this.getDb();
    const submission = db.submissions.find(s => s.id === submissionId);
    if (!submission) throw new Error('Submission not found');

    const exam = db.exams.find(e => e.id === submission.examId);
    if (!exam || !exam.questions) throw new Error('Exam not found');

    if (submission.answers[questionId]) {
      submission.answers[questionId].pointsAwarded = pointsAwarded;
      submission.answers[questionId].teacherFeedback = teacherFeedback;
      submission.answers[questionId].isCorrect = pointsAwarded > 0;
    }

    let totalEssayScore = 0;
    let allEssaysGraded = true;

    exam.questions.forEach(q => {
      if (q.type === 'ESSAY') {
        const ans = submission.answers[q.id];
        if (ans && ans.pointsAwarded !== undefined && ans.pointsAwarded !== null) {
          totalEssayScore += ans.pointsAwarded;
        } else {
          allEssaysGraded = false;
        }
      }
    });

    submission.essayScore = totalEssayScore;
    submission.score = submission.mcqScore + totalEssayScore;
    if (allEssaysGraded) {
      submission.status = 'GRADED';
    }

    this.saveDb(db);
    return submission;
  }

  public updateTeacherNotes(submissionId: string, notes: string) {
    const db = this.getDb();
    const sub = db.submissions.find(s => s.id === submissionId);
    if (sub) {
      sub.teacherNotes = notes;
      this.saveDb(db);
    }
  }

  // --- Redis Timers Simulator ---
  private getTimers(): Record<string, ExamTimerSession> {
    try {
      const raw = localStorage.getItem(REDIS_TIMER_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback
    }
    return {};
  }

  private saveTimers(timers: Record<string, ExamTimerSession>) {
    try {
      localStorage.setItem(REDIS_TIMER_KEY, JSON.stringify(timers));
    } catch (e) {
      console.error(e);
    }
  }

  public getTimerSession(submissionId: string): ExamTimerSession | null {
    const timers = this.getTimers();
    return timers[submissionId] || null;
  }

  public syncTimer(submissionId: string): { remainingSeconds: number; isExpired: boolean } {
    const timer = this.getTimerSession(submissionId);
    if (!timer) {
      return { remainingSeconds: 0, isExpired: true };
    }
    if (timer.isExpired) {
      return { remainingSeconds: 0, isExpired: true };
    }

    const now = Date.now();
    let effectiveExpiresAt = timer.expiresAt;

    // Periksa jadwal aktif terkait untuk memastikan website tutup otomatis saat jam selesai tercapai
    const submission = this.getSubmissionById(submissionId);
    if (submission) {
      const db = this.getDb();
      const exam = db.exams.find(e => e.id === submission.examId);
      const studentClass = submission.studentClass;
      const schedule = (db.schedules || []).find(s => {
        if (s.examId && s.examId === submission.examId) {
          if (studentClass && s.className) return s.className.toLowerCase().trim() === studentClass.toLowerCase().trim();
          return true;
        }
        if (exam) {
          const matchSubj = s.subjectName && (s.subjectName.toLowerCase().trim() === exam.subjectName?.toLowerCase().trim() || exam.title.toLowerCase().includes(s.subjectName.toLowerCase().trim()));
          const matchClass = !studentClass || !s.className || s.className.toLowerCase().trim() === studentClass.toLowerCase().trim();
          return matchSubj && matchClass;
        }
        return false;
      });

      if (schedule && schedule.date && schedule.endTime) {
        try {
          const [year, month, day] = schedule.date.trim().split('-').map(Number);
          const [hours, minutes] = schedule.endTime.trim().split(':').map(Number);
          const scheduleEnd = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
          const scheduleEndMs = scheduleEnd.getTime();
          if (!isNaN(scheduleEndMs)) {
            effectiveExpiresAt = Math.min(effectiveExpiresAt, scheduleEndMs);
          }
        } catch {
          // ignore
        }
      }
    }

    const remainingMs = effectiveExpiresAt - now;
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const isExpired = remainingSeconds <= 0;

    if (isExpired && !timer.isExpired) {
      timer.isExpired = true;
      const timers = this.getTimers();
      timers[submissionId] = timer;
      this.saveTimers(timers);
      this.submitExam(submissionId, 'Selesai otomatis: Waktu pelaksanaan asesmen sesuai jadwal telah berakhir.');
    }

    return { remainingSeconds, isExpired };
  }

  // --- Backup & Restore ---
  public exportDatabaseJson(): string {
    return JSON.stringify(this.getDb(), null, 2);
  }

  public importDatabaseJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.users && parsed.exams && parsed.settings) {
        this.saveDb(parsed);
        return true;
      }
    } catch (e) {
      console.error('Invalid JSON format for CBT Database import:', e);
    }
    return false;
  }

  public resetAllDataToDefault() {
    localStorage.removeItem(DB_STORAGE_KEY);
    localStorage.removeItem(REDIS_TIMER_KEY);
    return this.getDb();
  }
}

export const dbService = new DatabaseService();
