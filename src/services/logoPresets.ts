/**
 * Preset Logo Resmi untuk CBT Madrasah MIS NW KORLEKO
 * Menggunakan format Vector SVG Data URL berkualitas tinggi dan ringan
 */

export interface LogoPresetItem {
  id: string;
  name: string;
  description: string;
  category: 'madrasah' | 'kemenag' | 'nasional';
  svgDataUrl: string;
}

// 1. Logo Nahdlatul Wathan (Bintang Sembilan & Bulan Sabit Hijau NW)
const LOGO_NW_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="gradNW" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#047857"/>
      <stop offset="100%" stop-color="#065f46"/>
    </linearGradient>
    <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#eab308"/>
    </radialGradient>
  </defs>
  <!-- Perisai Lingkaran Luar -->
  <circle cx="100" cy="100" r="94" fill="url(#gradNW)" stroke="#f59e0b" stroke-width="6"/>
  <circle cx="100" cy="100" r="82" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="4,3"/>
  <!-- Bulan Sabit Emas -->
  <path d="M 82 55 A 48 48 0 1 0 135 142 A 42 42 0 1 1 82 55 Z" fill="url(#goldGlow)"/>
  <!-- Bintang Sembilan NW (Bintang Utama di Tengah) -->
  <polygon points="110,65 113,76 124,76 115,83 118,94 110,87 102,94 105,83 96,76 107,76" fill="#ffffff" stroke="#f59e0b" stroke-width="1"/>
  <!-- Bintang-bintang Kecil -->
  <circle cx="70" cy="80" r="4" fill="#ffffff"/>
  <circle cx="80" cy="65" r="4" fill="#ffffff"/>
  <circle cx="130" cy="80" r="4" fill="#ffffff"/>
  <circle cx="140" cy="100" r="4" fill="#ffffff"/>
  <circle cx="135" cy="120" r="4" fill="#ffffff"/>
  <circle cx="75" cy="125" r="4" fill="#ffffff"/>
  <circle cx="65" cy="105" r="4" fill="#ffffff"/>
  <!-- Pita Bertuliskan NAHDLATUL WATHAN -->
  <path d="M 40 152 Q 100 170 160 152 L 155 168 Q 100 184 45 168 Z" fill="#f59e0b" stroke="#ffffff" stroke-width="1"/>
  <text x="100" y="163" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="11" fill="#065f46">NAHDLATUL WATHAN</text>
  <text x="100" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="9" fill="#fef08a" letter-spacing="1">MIS NW KORLEKO</text>
</svg>
`)}`;

// 2. Logo Kementerian Agama RI (Ikhlas Beramal)
const LOGO_KEMENAG_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bgKemenag" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#047857"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </linearGradient>
  </defs>
  <!-- Perisai Segi Lima Kemenag -->
  <polygon points="100,10 188,72 154,182 46,182 12,72" fill="url(#bgKemenag)" stroke="#eab308" stroke-width="5"/>
  <polygon points="100,20 176,74 146,172 54,172 24,74" fill="none" stroke="#ffffff" stroke-width="2"/>
  <!-- Kitab Suci Al-Qur'an Terbuka -->
  <path d="M 100 115 Q 80 100 55 108 L 55 138 Q 80 130 100 145 Q 120 130 145 138 L 145 108 Q 120 100 100 115 Z" fill="#ffffff" stroke="#064e3b" stroke-width="2"/>
  <!-- Timbangan Keadilan -->
  <line x1="100" y1="55" x2="100" y2="115" stroke="#eab308" stroke-width="4"/>
  <line x1="68" y1="70" x2="132" y2="70" stroke="#eab308" stroke-width="3"/>
  <circle cx="100" cy="52" r="5" fill="#fef08a"/>
  <!-- Piringan Timbangan Kiri & Kanan -->
  <path d="M 60 85 Q 68 95 76 85 Z" fill="#eab308"/>
  <line x1="68" y1="70" x2="60" y2="85" stroke="#fef08a" stroke-width="1.5"/>
  <line x1="68" y1="70" x2="76" y2="85" stroke="#fef08a" stroke-width="1.5"/>
  <path d="M 124 85 Q 132 95 140 85 Z" fill="#eab308"/>
  <line x1="132" y1="70" x2="124" y2="85" stroke="#fef08a" stroke-width="1.5"/>
  <line x1="132" y1="70" x2="140" y2="85" stroke="#fef08a" stroke-width="1.5"/>
  <!-- Slogan IKHLAS BERAMAL -->
  <path d="M 45 152 Q 100 166 155 152 L 152 166 Q 100 178 48 166 Z" fill="#eab308"/>
  <text x="100" y="162" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="8.5" fill="#064e3b">IKHLAS BERAMAL</text>
  <text x="100" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="9" fill="#ffffff">KEMENAG RI</text>
</svg>
`)}`;

// 3. Logo Madrasah Mandiri Berprestasi
const LOGO_MADRASAH_MANDIRI_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bgMadrasah" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="92" fill="url(#bgMadrasah)" stroke="#ffffff" stroke-width="4"/>
  <circle cx="100" cy="100" r="82" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3,3"/>
  <!-- Toga Kelulusan & Pena Emas -->
  <polygon points="100,50 155,75 100,100 45,75" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
  <polygon points="100,88 135,75 100,62 65,75" fill="#0284c7"/>
  <line x1="145" y1="75" x2="145" y2="105" stroke="#f59e0b" stroke-width="3"/>
  <circle cx="145" cy="108" r="4" fill="#f59e0b"/>
  <!-- Buku Terbuka Bawah -->
  <path d="M 100 125 Q 75 110 50 118 L 50 148 Q 75 140 100 155 Q 125 140 150 148 L 150 118 Q 125 110 100 125 Z" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>
  <text x="100" y="176" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="10" fill="#f8fafc" letter-spacing="0.5">MADRASAH MAJU</text>
  <text x="100" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="9" fill="#fde047">BERMUTU & MENDUNIA</text>
</svg>
`)}`;

// 4. Logo Tut Wuri Handayani (Pendidikan Nasional)
const LOGO_TUTWURI_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <!-- Perisai Segi Lima Biru Pendidikan -->
  <polygon points="100,10 188,72 154,182 46,182 12,72" fill="#0284c7" stroke="#eab308" stroke-width="5"/>
  <polygon points="100,20 176,74 146,172 54,172 24,74" fill="none" stroke="#ffffff" stroke-width="2"/>
  <!-- Burung Garuda / Sayap Tut Wuri -->
  <path d="M 100 65 L 120 95 L 145 90 L 130 110 L 155 125 L 100 145 L 45 125 L 70 110 L 55 90 L 80 95 Z" fill="#eab308" stroke="#ffffff" stroke-width="1.5"/>
  <!-- Nyala Api Kemenyan / Lilin Ilmu di Tengah -->
  <circle cx="100" cy="85" r="12" fill="#ef4444" stroke="#fef08a" stroke-width="2"/>
  <circle cx="100" cy="85" r="6" fill="#fef08a"/>
  <!-- Teks Bawah -->
  <text x="100" y="165" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="8.5" fill="#ffffff" letter-spacing="1">TUT WURI HANDAYANI</text>
</svg>
`)}`;

export const LOGO_PRESETS: LogoPresetItem[] = [
  {
    id: 'nw-korleko',
    name: 'Nahdlatul Wathan (NW)',
    description: 'Logo resmi Bintang Sembilan & Bulan Sabit NW Korleko',
    category: 'madrasah',
    svgDataUrl: LOGO_NW_SVG
  },
  {
    id: 'kemenag-ri',
    name: 'Kemenag RI (Ikhlas Beramal)',
    description: 'Lambang resmi Kementerian Agama Republik Indonesia',
    category: 'kemenag',
    svgDataUrl: LOGO_KEMENAG_SVG
  },
  {
    id: 'madrasah-mandiri',
    name: 'Madrasah Mandiri Berprestasi',
    description: 'Lambang pendidikan madrasah inovatif & digital',
    category: 'madrasah',
    svgDataUrl: LOGO_MADRASAH_MANDIRI_SVG
  },
  {
    id: 'tut-wuri',
    name: 'Tut Wuri Handayani',
    description: 'Lambang pendidikan nasional Indonesia',
    category: 'nasional',
    svgDataUrl: LOGO_TUTWURI_SVG
  }
];

export const DEFAULT_SCHOOL_LOGO = LOGO_NW_SVG;
