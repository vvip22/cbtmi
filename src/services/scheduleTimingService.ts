import { Exam, ExamSchedule, ExamScheduleStatus } from '../types/cbt';
import { dbService } from './dbStore';

export interface ExamTimingInfo {
  schedule?: ExamSchedule;
  status: 'UPCOMING' | 'ONGOING' | 'EXPIRED' | 'UNSCHEDULED';
  isAccessible: boolean; // Dapat dibuka / dikerjakan siswa
  canStart: boolean;
  startDateTime?: Date;
  endDateTime?: Date;
  label: string;
  subLabel: string;
  badgeText: string;
  badgeStyle: string; // Tailwind styling class
  timeRemainingMs?: number;
  timeUntilStartMs?: number;
  countdownFormatted?: string;
}

const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Mengonversi tanggal "YYYY-MM-DD" dan jam "HH:mm" menjadi objek Date lokal akurat
 */
export function parseScheduleDateTime(dateStr: string, timeStr: string): Date {
  try {
    const [year, month, day] = dateStr.trim().split('-').map(Number);
    const [hours, minutes] = timeStr.trim().split(':').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
  } catch {
    return new Date();
  }
}

/**
 * Format tanggal Indonesia ramah pengguna: "Selasa, 3 November 2026"
 */
export function formatIndonesianFullDate(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    const dayName = INDONESIAN_DAYS[d.getDay()];
    const dateNum = d.getDate();
    const monthName = INDONESIAN_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName}, ${dateNum} ${monthName} ${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Format sisa durasi milidetik ke teks ringkas (contoh: "1 jam 25 menit" atau "45 menit")
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '0 menit';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} jam ${minutes} menit`;
  }
  if (minutes > 0) {
    return `${minutes} menit ${seconds} dtk`;
  }
  return `${seconds} detik`;
}

/**
 * Format countdown digital HH:MM:SS
 */
export function formatDigitalCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Mencari jadwal asesmen yang cocok untuk paket ujian dan rombel/kelas siswa
 */
export function findScheduleForExam(
  exam: Exam, 
  schedules: ExamSchedule[], 
  studentClass?: string
): ExamSchedule | undefined {
  if (!schedules || schedules.length === 0) return undefined;

  const cleanExamSubj = (exam.subjectName || '').toLowerCase().trim();
  const cleanExamTitle = (exam.title || '').toLowerCase().trim();
  const cleanClass = (studentClass || exam.className || '').toLowerCase().trim();

  // 1. Prioritas utama: pencocokan ID paket soal eksplisit (examId)
  const byExamId = schedules.find(s => {
    if (s.examId && s.examId === exam.id) {
      if (cleanClass && s.className) {
        return s.className.toLowerCase().trim() === cleanClass;
      }
      return true;
    }
    return false;
  });
  if (byExamId) return byExamId;

  // 2. Pencocokan berdasarkan nama mata pelajaran dan kelas siswa
  const bySubjAndClass = schedules.find(s => {
    const sSubj = (s.subjectName || '').toLowerCase().trim();
    const sClass = (s.className || '').toLowerCase().trim();
    const matchSubj = sSubj === cleanExamSubj || cleanExamTitle.includes(sSubj) || sSubj.includes(cleanExamSubj);
    const matchClass = !cleanClass || !sClass || sClass === cleanClass;
    return matchSubj && matchClass;
  });
  if (bySubjAndClass) return bySubjAndClass;

  // 3. Pencocokan mata pelajaran saja
  return schedules.find(s => {
    const sSubj = (s.subjectName || '').toLowerCase().trim();
    return sSubj === cleanExamSubj || cleanExamTitle.includes(sSubj);
  });
}

/**
 * Menghitung status pelaksanaan asesmen secara otomatis berdasarkan tanggal, hari, dan jam
 */
export function getExamTimingInfo(
  exam: Exam,
  studentClass?: string,
  providedSchedules?: ExamSchedule[],
  now: Date = new Date()
): ExamTimingInfo {
  const allSchedules = providedSchedules || dbService.getSchedules();
  const schedule = findScheduleForExam(exam, allSchedules, studentClass);

  // Jika tidak ada jadwal khusus di SemesterScheduleManager, gunakan waktu default exam (jika ada)
  if (!schedule) {
    // Periksa apakah exam memiliki startTime / endTime bawaan
    if (exam.startTime && exam.endTime) {
      const start = new Date(exam.startTime);
      const end = new Date(exam.endTime);
      const nowMs = now.getTime();
      const startMs = start.getTime();
      const endMs = end.getTime();

      if (nowMs < startMs) {
        const diff = startMs - nowMs;
        return {
          status: 'UPCOMING',
          isAccessible: false,
          canStart: false,
          startDateTime: start,
          endDateTime: end,
          label: 'Ujian Belum Dimulai',
          subLabel: `Dibuka otomatis pada ${formatIndonesianFullDate(start)} pukul ${start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA`,
          badgeText: 'Belum Dimulai',
          badgeStyle: 'bg-sky-50 text-sky-800 border-sky-200',
          timeUntilStartMs: diff,
          countdownFormatted: formatRemainingTime(diff)
        };
      } else if (nowMs > endMs) {
        return {
          status: 'EXPIRED',
          isAccessible: false,
          canStart: false,
          startDateTime: start,
          endDateTime: end,
          label: 'Ujian Telah Ditutup Otomatis',
          subLabel: `Waktu pelaksanaan telah berakhir pada ${formatIndonesianFullDate(end)} pukul ${end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA.`,
          badgeText: 'Waktu Habis / Ditutup',
          badgeStyle: 'bg-slate-100 text-slate-700 border-slate-300'
        };
      }
    }

    // Default jika tanpa pembatasan jadwal
    return {
      status: 'ONGOING',
      isAccessible: true,
      canStart: true,
      label: 'Ujian Siap Dikerjakan',
      subLabel: `Durasi pengerjaan: ${exam.duration} Menit. Pengawasan live proctoring aktif.`,
      badgeText: 'Tersedia',
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    };
  }

  // JADWAL DITEMUKAN: Analisis hari, tanggal, bulan, tahun, dan rentang jam
  const startDateTime = parseScheduleDateTime(schedule.date, schedule.startTime);
  const endDateTime = parseScheduleDateTime(schedule.date, schedule.endTime);

  const nowMs = now.getTime();
  const startMs = startDateTime.getTime();
  const endMs = endDateTime.getTime();

  // Jika proktor menandai COMPLETED secara manual, anggap sudah selesai
  if (schedule.status === 'COMPLETED' || nowMs > endMs) {
    return {
      schedule,
      status: 'EXPIRED',
      isAccessible: false,
      canStart: false,
      startDateTime,
      endDateTime,
      label: 'Ujian Telah Ditutup Otomatis',
      subLabel: `Waktu pelaksanaan sesi (${schedule.session}) telah berakhir pada ${schedule.endTime} WITA. Website ujian telah ditutup otomatis.`,
      badgeText: 'Waktu Habis / Ditutup',
      badgeStyle: 'bg-slate-200 text-slate-700 border-slate-300'
    };
  }

  // Waktu sekarang belum mencapai jadwal buka (UPCOMING)
  if (nowMs < startMs) {
    const diff = startMs - nowMs;
    const dayStr = schedule.dayName || INDONESIAN_DAYS[startDateTime.getDay()];
    return {
      schedule,
      status: 'UPCOMING',
      isAccessible: false,
      canStart: false,
      startDateTime,
      endDateTime,
      label: 'Ujian Belum Dimulai (Sesuai Jadwal)',
      subLabel: `Dibuka otomatis pada ${dayStr}, ${formatIndonesianFullDate(schedule.date)} pukul ${schedule.startTime} - ${schedule.endTime} WITA (${schedule.session}).`,
      badgeText: 'Akan Datang / Terjadwal',
      badgeStyle: 'bg-sky-100 text-sky-800 border-sky-300',
      timeUntilStartMs: diff,
      countdownFormatted: formatRemainingTime(diff)
    };
  }

  // Waktu sekarang sedang berada dalam rentang jadwal (ONGOING)
  const remainingInSchedule = endMs - nowMs;
  return {
    schedule,
    status: 'ONGOING',
    isAccessible: true,
    canStart: true,
    startDateTime,
    endDateTime,
    label: 'Ujian Sedang Berlangsung',
    subLabel: `Sesi ${schedule.session} aktif hingga pukul ${schedule.endTime} WITA. Sisa waktu sesi: ${formatRemainingTime(remainingInSchedule)}.`,
    badgeText: 'Sedang Berlangsung',
    badgeStyle: 'bg-emerald-600 text-white font-extrabold animate-pulse border-emerald-700',
    timeRemainingMs: remainingInSchedule,
    countdownFormatted: formatRemainingTime(remainingInSchedule)
  };
}

/**
 * Menghitung sisa detik batas akhir pengerjaan siswa:
 * Nilai minimum antara:
 * 1. Durasi pengerjaan ujian (misal 60 menit dari saat mulai)
 * 2. Jam penutupan jadwal asesmen (misal pukul 22:00 WITA)
 */
export function calculateAuthoritativeRemainingSeconds(
  exam: Exam,
  submissionStartedAt: string | number,
  schedule?: ExamSchedule
): number {
  const now = Date.now();
  const startMs = typeof submissionStartedAt === 'string' ? new Date(submissionStartedAt).getTime() : submissionStartedAt;
  const durationLimitMs = startMs + (exam.duration * 60 * 1000);
  let finalExpiryMs = durationLimitMs;

  if (schedule && schedule.date && schedule.endTime) {
    const scheduleEnd = parseScheduleDateTime(schedule.date, schedule.endTime);
    const scheduleEndMs = scheduleEnd.getTime();
    if (!isNaN(scheduleEndMs) && scheduleEndMs > 0) {
      finalExpiryMs = Math.min(durationLimitMs, scheduleEndMs);
    }
  }

  const remainingSeconds = Math.max(0, Math.floor((finalExpiryMs - now) / 1000));
  return remainingSeconds;
}
