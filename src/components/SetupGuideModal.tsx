import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Server, Database, ShieldAlert, Cpu } from 'lucide-react';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'prisma' | 'docker' | 'redis' | 'security'>('prisma');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const PRISMA_SCHEMA_CODE = `// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  TEACHER
  STUDENT
}

enum QuestionType {
  MCQ
  ESSAY
}

enum SubmissionStatus {
  ONGOING
  SUBMITTED
  GRADED
  DISQUALIFIED
}

model User {
  id          String       @id @default(uuid())
  name        String
  email       String       @unique
  password    String
  role        Role         @default(STUDENT)
  nisn        String?      @unique
  nip         String?      @unique
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  teachingClasses Class[]  @relation("TeacherClasses")
  submissions     Submission[]
}

model Class {
  id          String   @id @default(uuid())
  name        String
  grade       Int
  academicYear String
  teacherId   String
  teacher     User     @relation("TeacherClasses", fields: [teacherId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  exams       Exam[]
}

model Subject {
  id          String   @id @default(uuid())
  name        String
  code        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  exams       Exam[]
}

model Exam {
  id                String       @id @default(uuid())
  title             String
  description       String?
  subjectId         String
  subject           Subject      @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  classId           String
  class             Class        @relation(fields: [classId], references: [id], onDelete: Cascade)
  startTime         DateTime
  endTime           DateTime
  duration          Int          // menit
  passingGrade      Float        @default(75.0)
  isActive          Boolean      @default(true)
  randomizeQuestions Boolean     @default(false)
  showResults       Boolean      @default(true)
  maxViolations     Int          @default(3)
  token             String?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  questions         Question[]
  submissions       Submission[]
}

model Question {
  id            String       @id @default(uuid())
  examId        String
  exam          Exam         @relation(fields: [examId], references: [id], onDelete: Cascade)
  type          QuestionType @default(MCQ)
  text          String
  imageUrl      String?
  options       Json?
  correctAnswer String?
  points        Float        @default(5.0)
  orderIndex    Int          @default(1)
  explanation   String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  answers       Answer[]
}

model Submission {
  id              String           @id @default(uuid())
  examId          String
  exam            Exam             @relation(fields: [examId], references: [id], onDelete: Cascade)
  studentId       String
  student         User             @relation(fields: [studentId], references: [id], onDelete: Cascade)
  startedAt       DateTime         @default(now())
  submittedAt     DateTime?
  status          SubmissionStatus @default(ONGOING)
  score           Float            @default(0.0)
  mcqScore        Float            @default(0.0)
  essayScore      Float            @default(0.0)
  violationsCount Int              @default(0)
  violationsLog   Json?
  teacherNotes    String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  answers         Answer[]

  @@unique([examId, studentId])
}

model Answer {
  id              String      @id @default(uuid())
  submissionId    String
  submission      Submission  @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  questionId      String
  question        Question    @relation(fields: [questionId], references: [id], onDelete: Cascade)
  studentAnswer   String?
  isFlaggedReview Boolean     @default(false)
  isCorrect       Boolean?
  pointsAwarded   Float       @default(0.0)
  teacherFeedback String?
  updatedAt       DateTime    @updatedAt

  @@unique([submissionId, questionId])
}`;

  const DOCKER_COMPOSE_CODE = `# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: eduexam_postgres
    restart: always
    environment:
      POSTGRES_USER: eduexam_user
      POSTGRES_PASSWORD: StrongPassword123
      POSTGRES_DB: eduexam_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: eduexam_redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:

# Jalankan dengan:
# docker compose up -d
# npx prisma migrate dev --name init_schema
# npx prisma db seed`;

  const REDIS_EXPLANATION = `// Arsitektur Redis Timer Real-Time Authoritative
// 1. Saat Siswa Klik "Mulai Ujian":
//    POST /api/exam/start -> Set session di PostgreSQL & simpan epoch kedaluwarsa di Redis:
//    redis.set("exam:session:{submissionId}:expires_at", Date.now() + duration * 60 * 1000);
//    redis.expire("exam:session:{submissionId}:expires_at", (duration * 60) + 300);

// 2. Heartbeat Timer (Setiap 5-10 detik atau saat refresh):
//    GET /api/exam/sync-timer?submissionId=xxx
//    remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
//    return { remainingSeconds, isExpired: remainingSeconds <= 0 };

// 3. Auto-Submit Engine:
//    Jika remainingSeconds <= 0, server otomatis mengeksekusi Auto-Grade
//    dan mengubah status submission menjadi SUBMITTED tanpa bergantung pada browser siswa.`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Arsitektur Sistem & Spesifikasi Database
              </h2>
              <p className="text-xs text-slate-500">
                Prisma ORM (PostgreSQL), Docker Compose, Redis Real-Time Timer, dan Anti-Cheating
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-2 bg-white">
          <button
            onClick={() => setActiveTab('prisma')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'prisma'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            schema.prisma
          </button>
          <button
            onClick={() => setActiveTab('docker')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'docker'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            docker-compose.yml
          </button>
          <button
            onClick={() => setActiveTab('redis')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'redis'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Redis Timer TTL
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Mekanisme Anti-Curang
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900 text-slate-100 font-mono text-xs">
          {activeTab === 'prisma' && (
            <div className="relative">
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <button
                  onClick={() => handleCopy(PRISMA_SCHEMA_CODE)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[11px] flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin Schema'}</span>
                </button>
              </div>
              <pre className="overflow-x-auto p-4 leading-relaxed text-indigo-300">
                {PRISMA_SCHEMA_CODE}
              </pre>
            </div>
          )}

          {activeTab === 'docker' && (
            <div className="relative">
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <button
                  onClick={() => handleCopy(DOCKER_COMPOSE_CODE)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[11px] flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin Docker Compose'}</span>
                </button>
              </div>
              <pre className="overflow-x-auto p-4 leading-relaxed text-emerald-300">
                {DOCKER_COMPOSE_CODE}
              </pre>
            </div>
          )}

          {activeTab === 'redis' && (
            <div className="p-4 space-y-4">
              <div className="text-slate-300 font-sans text-xs leading-relaxed space-y-2">
                <p className="font-semibold text-white text-sm">Prinsip Server-Authoritative Timer:</p>
                <p>
                  1. Timer ujian <strong>TIDAK DISIMPAN DI CLIENT</strong>. Menyimpan countdown di browser rentan kecurangan (refresh halaman, ubah jam lokal, atau modifikasi memori JS).
                </p>
                <p>
                  2. Saat ujian dimulai, server menyimpan <code>expiresAt = now() + (duration * 60 * 1000)</code> ke Redis dengan TTL.
                </p>
                <p>
                  3. Setiap kali halaman siswa dimuat ulang atau mengalami lag koneksi, hook <code>useExamTimer</code> memanggil endpoint sync, menghitung selisih <code>Math.max(0, expiresAt - Date.now())</code>, sehingga sisa waktu detik selalu akurat 100%.
                </p>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto text-amber-300">
                {REDIS_EXPLANATION}
              </pre>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="p-4 space-y-4 font-sans text-xs text-slate-200">
              <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-rose-300 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Protokol Keamanan & Anti-Curang CBT
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  EduExam mengimplementasikan perlindungan berlapis di sisi browser dan server:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li><strong>Window Blur & Visibility Change:</strong> Memantau saat kursor meninggalkan jendela ujian, membuka tab baru, atau berpindah ke aplikasi lain.</li>
                  <li><strong>Toleransi Pelanggaran:</strong> Dibatasi maksimal 3 kali (dapat dikonfigurasi per ujian). Setiap pelanggaran dicatat dengan stempel waktu ISO.</li>
                  <li><strong>Auto-Submit / Diskualifikasi:</strong> Jika melewati batas, ujian dikunci seketika dan nilai dikirimkan ke guru sebagai pelanggaran.</li>
                  <li><strong>Interception Input:</strong> Menonaktifkan klik kanan (context menu), copy (Ctrl+C), paste (Ctrl+V), view source (Ctrl+U), dan developer tools (F12).</li>
                  <li><strong>Full-Screen Enforcement:</strong> Meminta siswa mengaktifkan mode layar penuh untuk menghilangkan distraksi notifikasi taskbar.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>File acuan: <code className="text-slate-700 font-mono">/prisma/schema.prisma</code> & <code className="text-slate-700 font-mono">/docs/SETUP_GUIDE.md</code></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
