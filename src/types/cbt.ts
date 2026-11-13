/**
 * Definisi Tipe Data EduExam CBT - MIS NW KORLEKO
 * Sesuai arsitektur CBT Madrasah Terintegrasi
 */

export type Role = 'PROKTOR' | 'PENGAWAS' | 'PESERTA' | 'ADMIN' | 'TEACHER' | 'STUDENT';

export type QuestionType = 'MCQ' | 'ESSAY';

export type SubmissionStatus = 'ONGOING' | 'SUBMITTED' | 'GRADED' | 'DISQUALIFIED';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  nisn?: string; // Khusus Peserta / Siswa
  nip?: string;  // Khusus Proktor / Pengawas
  kelas?: string; // Khusus Peserta (contoh: "Kelas VI A")
  avatarUrl?: string;
  isLoggedIn?: boolean; // Status login perangkat siswa (dapat di-reset oleh Proktor)
  lastLoginAt?: string;
}

export interface SchoolSettings {
  schoolName: string;
  foundationName: string;
  nsm: string;
  npsn: string;
  headmasterName: string;
  headmasterNip: string;
  proktorName: string;
  address: string;
  city: string;
  province: string;
  academicYear: string;
  semester: string;
  logoUrl?: string; // Tautan gambar atau data URL (Base64) Logo Madrasah
  activeExamToken: string;
  tokenGeneratedAt: string;
  defaultMaxViolations: number;
  allowStudentViewResults: boolean;
  randomizeQuestions?: boolean;
  enforceFullscreen: boolean;
  soundAlertEnabled: boolean;
}

export interface ClassRoom {
  id: string;
  name: string;
  grade: number;
  academicYear: string;
  teacherId: string;
  teacherName?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface QuestionOption {
  key: string; // 'A', 'B', 'C', 'D' (untuk MI umumnya 4 opsi A-D atau A-E)
  text: string;
}

export interface Question {
  id: string;
  examId: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  options?: QuestionOption[];
  correctAnswer?: string; // misal 'A' untuk MCQ, rubrik untuk Esai
  points: number;
  orderIndex: number;
  explanation?: string;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  subjectId: string;
  subjectName?: string;
  classId: string;
  className?: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  duration: number;  // Menit
  passingGrade: number; // KKM
  isActive: boolean;
  randomizeQuestions: boolean;
  showResults: boolean;
  maxViolations: number;
  token?: string;
  questions?: Question[];
}

export interface ViolationEvent {
  timestamp: string;
  reason: string;
  tabSwitchCount: number;
}

export interface Answer {
  id: string;
  submissionId: string;
  questionId: string;
  studentAnswer: string;
  isFlaggedReview: boolean;
  isCorrect?: boolean | null;
  pointsAwarded: number;
  teacherFeedback?: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  examId: string;
  studentId: string;
  studentName?: string;
  studentNisn?: string;
  studentClass?: string;
  startedAt: string;
  submittedAt?: string;
  status: SubmissionStatus;
  score: number;
  mcqScore: number;
  essayScore: number;
  violationsCount: number;
  violationsLog: ViolationEvent[];
  teacherNotes?: string;
  isAutoSubmitted?: boolean;
  autoSubmitReason?: string;
  answers: Record<string, Answer>;
  lastHeartbeat?: string;
  answeredCount?: number;
}

export interface ExamTimerSession {
  submissionId: string;
  examId: string;
  studentId: string;
  startedAt: number;
  expiresAt: number;
  durationMinutes: number;
  isExpired: boolean;
}

export type ExamSemesterType = 'Ganjil' | 'Genap';
export type ExamCategory = 'Penilaian Akhir Semester (PAS)' | 'Asesmen Sumatif Akhir Semester (ASAS)' | 'Penilaian Tengah Semester (PTS)' | 'Asesmen Madrasah (AM)';
export type ExamScheduleStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';

export interface ExamSchedule {
  id: string;
  academicYear: string; // e.g. "2026/2027"
  semester: ExamSemesterType;
  examType: ExamCategory | string;
  dayName: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | string;
  date: string; // "YYYY-MM-DD"
  session: string; // "Sesi 1 (07.30 - 09.00)"
  startTime: string; // "07:30"
  endTime: string; // "09:00"
  subjectName: string;
  className: string;
  room: string;
  proctorName: string;
  examId?: string; // Optional ID paket soal CBT
  status: ExamScheduleStatus;
  notes?: string;
}
