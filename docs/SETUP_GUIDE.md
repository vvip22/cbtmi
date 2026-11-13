# Panduan Setup & Arsitektur Sistem CBT (Computer-Based Test)
## Sistem Ujian Semester Online - EduExam CBT

Dokumen ini menyediakan panduan lengkap bagi DevOps dan Backend/Full-Stack Engineer untuk menjalankan dan mengonfigurasi sistem di lingkungan produksi maupun lokal.

---

### 1. Struktur Tech Stack
- **Frontend**: Next.js 14 (App Router) / React 19 + TypeScript + Tailwind CSS + Lucide Icons + Framer Motion.
- **Backend**: Next.js API Routes / Express Node.js Runtime.
- **ORM**: Prisma ORM v5+.
- **Database**: PostgreSQL 15+.
- **In-Memory Cache & Session Timer**: Redis 7+ (Alpine).
- **Authentication**: JWT-based RBAC (Admin, Teacher/Guru, Student/Siswa) dengan HTTP-only cookie.
- **Export & Reporting**: XLSX Engine (`xlsx`) & Official PDF Engine (`jspdf`).

---

### 2. Environment Variables (.env)
Buat file `.env` di root project:

```env
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://eduexam_user:StrongPassword123@localhost:5432/eduexam_db?schema=public"

# Redis Cache & Real-Time Exam Timer
REDIS_URL="redis://localhost:6379"

# NextAuth / JWT Secret
NEXTAUTH_SECRET="super-secret-jwt-key-min-32-characters-cbt-2026"
NEXTAUTH_URL="http://localhost:3000"

# Application Config
NEXT_PUBLIC_APP_NAME="EduExam CBT"
NEXT_PUBLIC_MAX_VIOLATIONS_DEFAULT=3
SESSION_TIMEOUT_MINUTES=120
```

---

### 3. Docker Compose (PostgreSQL + Redis)
Gunakan `docker-compose.yml` berikut untuk menjalankan PostgreSQL dan Redis dalam 1 perintah:

```yaml
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
```

Jalankan container:
```bash
docker compose up -d
```

---

### 4. Setup Prisma ORM & Database Migration
1. Instal dependensi Prisma:
   ```bash
   npm install @prisma/client
   npm install -D prisma
   ```
2. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```
3. Jalankan migrasi schema ke PostgreSQL:
   ```bash
   npx prisma migrate dev --name init_cbt_schema
   ```
4. Eksekusi database seeder:
   ```bash
   npx prisma db seed
   ```

---

### 5. Arsitektur Redis Timer Real-Time
Untuk mencegah kecurangan (siswa me-refresh browser atau mengubah jam komputer lokal), timer hitung mundur dikelola secara **Server-Authoritative** menggunakan Redis:

1. **Inisialisasi Ujian (`POST /api/exam/start`)**:
   - Server mencatat waktu mulai `startedAt = now()`.
   - Redis menyimpan key: `exam:session:{submissionId}:expires_at` dengan nilai Unix Timestamp (`startedAt + duration_in_seconds`).
   - Redis mengatur TTL (Time-To-Live) sesuai sisa durasi + buffer 5 menit.
2. **Sinkronisasi / Heartbeat (`GET /api/exam/sync-timer`)**:
   - Klien mengambil `remainingSeconds = Math.max(0, expiresAt - Math.floor(Date.now() / 1000))`.
   - Jika `remainingSeconds <= 0`, server otomatis mengunci status menjadi `SUBMITTED`.
3. **Keunggulan**:
   - Refresh browser tidak menambah waktu.
   - Pindah device tetap melanjutkan sisa waktu yang tepat.
   - Tidak ada manipulasi jam di sisi inspect element atau client time.

---

### 6. Mekanisme Anti-Curang (Anti-Cheating Shield)
1. **Deteksi Perpindahan Tab / Jendela (`visibilitychange` & `blur`)**:
   - Setiap kali siswa membuka tab baru, browser dev tools, atau aplikasi chat (Alt+Tab), event ditangkap.
   - Peringatan instan dimunculkan di layar.
   - Log pelanggaran dicatat ke backend: timestamp, event type, dan sisa waktu.
   - Jika pelanggaran $\ge$ batas (default: 3x), sistem melakukan **Auto-Submit Paksa** dengan status `DISQUALIFIED` atau penalti pengurangan nilai.
2. **Blokir Interaksi Tertentu**:
   - `contextmenu` (klik kanan) dinonaktifkan.
   - `copy`, `cut`, `paste` dinonaktifkan di area soal.
   - Tombol keyboard `F12`, `Ctrl+Shift+I`, `Ctrl+U`, `PrintScreen` dicegat.
3. **Mode Fullscreen (Layar Penuh)**:
   - Ujian mewajibkan browser memasuki mode layar penuh untuk meminimalkan gangguan notifikasi desktop.

---

### 7. Alur Penilaian & Pelaporan
1. **Pilihan Ganda (Auto-Grade)**:
   - Langsung diperiksa server saat siswa klik "Kumpulkan Ujian".
   - Skor otomatis dihitung berdasarkan bobot poin per nomor.
2. **Koreksi Esai Guru (Manual Grading Dashboard)**:
   - Guru membuka tab penilaian untuk membaca jawaban siswa vs rubrik acuan.
   - Guru memasukkan skor per butir esai (0 sampai bobot maksimum) dan memberikan catatan perbaikan personal.
   - Nilai akhir diakumulasikan: `Total = Nilai PG + Nilai Esai`.
3. **Ekspor Nilai Excel**:
   - Menghasilkan file `.xlsx` resmi berisi data NISN, Nama, Kelas, Benar/Salah PG, Skor Esai, Total Nilai, KKM, dan Status Kelulusan (LULUS / REMEDIAL).
4. **Cetak Rapor Siswa PDF**:
   - Standar cetak Rapor Hasil Ujian Resmi dengan Kop Sekolah, identitas siswa, rincian kompetensi, skala nilai huruf (A/B/C/D), deskripsi capaian, dan tanda tangan digital kepala sekolah serta guru mata pelajaran.
