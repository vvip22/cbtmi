/**
 * DocumentParser Service for CBT MIS NW Korleko
 * Menggunakan 'mammoth.js' untuk mengekstrak teks, tabel, dan gambar dari file .docx.
 * Dilengkapi dengan Regex-based parser cerdas untuk memetakan elemen dokumen ke dalam
 * struktur Exam dan Question:
 * - Soal Pilihan Ganda (MCQ): Opsi A-D (Latin) dan أ-د (Arab) sebaris atau baris baru
 * - Soal Uraian / Isian (ESSAY): Otomatis terdeteksi bila butir soal tidak memiliki opsi A-D
 * - Dukungan Bahasa Arab: Teks berharakat, angka Arab-Hindi (٠-٩), arah baca RTL (Right-to-Left)
 * - Gambar tersemat (Base64) & Tabel Data terformat rapi
 * - Kunci Jawaban otomatis (inline maupun seksi daftar kunci di bagian bawah dokumen)
 */

import mammoth from 'mammoth';
import { Question, QuestionOption, QuestionType, Exam } from '../types/cbt';

export interface ExtractedImage {
  src: string;
  contentType: string;
}

export interface ExtractedTable {
  html: string;
  rowCount: number;
  colCount: number;
}

export interface DocxExtractionResult {
  rawHtml: string;
  rawText: string;
  title: string;
  images: ExtractedImage[];
  tables: ExtractedTable[];
}

export interface ParsedExamResult {
  title: string;
  subjectName?: string;
  className?: string;
  questions: Question[];
  rawHtml?: string;
}

/**
 * Konversi angka Arab-Hindi (Eastern Arabic-Indic Numerals: ٠, ١, ٢, ٣, ٤, ٥, ٦, ٧, ٨, ٩)
 * serta angka Persia (۰-۹) menjadi angka Latin standar (0-9).
 */
export function convertArabicIndicNumerals(str: string): string {
  if (!str) return '';
  const arabicIndicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  return str.replace(/[٠-٩۰-۹]/g, (char) => {
    let idx = arabicIndicDigits.indexOf(char);
    if (idx === -1) idx = persianDigits.indexOf(char);
    return idx !== -1 ? idx.toString() : char;
  });
}

/**
 * Deteksi apakah teks memuat karakter abjad / teks Bahasa Arab
 */
export function hasArabicCharacters(text: string): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Pemetaan opsi huruf Arab ke opsi Latin standar CBT
 * أ -> A, ب -> B, ج -> C, د -> D, هـ/ه -> E
 */
export const ARABIC_OPTION_MAP: Record<string, string> = {
  'أ': 'A',
  'إ': 'A',
  'ا': 'A',
  'ب': 'B',
  'ج': 'C',
  'د': 'D',
  'هـ': 'E',
  'ه': 'E'
};

export const LATIN_TO_ARABIC_OPTION_MAP: Record<string, string> = {
  'A': 'أ',
  'B': 'ب',
  'C': 'ج',
  'D': 'د',
  'E': 'هـ'
};

export class DocumentParser {
  /**
   * Mengekstrak konten file .docx menggunakan mammoth.js
   * Mengubah gambar menjadi Data URL Base64 dan memformat tabel ke HTML bersih.
   */
  async extractFromDocx(file: File | ArrayBuffer, fileName = 'Dokumen Soal'): Promise<DocxExtractionResult> {
    const arrayBuffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
    const extractedImages: ExtractedImage[] = [];

    const mammothOptions = {
      convertImage: mammoth.images.imgElement((image: any) => {
        return image.read('base64').then((imageBuffer: string) => {
          const src = `data:${image.contentType};base64,${imageBuffer}`;
          extractedImages.push({
            src,
            contentType: image.contentType
          });
          return { src };
        });
      })
    };

    const result = await mammoth.convertToHtml({ arrayBuffer }, mammothOptions);
    const rawHtml = result.value;

    // Hitung tabel dari rawHtml
    const extractedTables: ExtractedTable[] = [];
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rawHtml;
      tempDiv.querySelectorAll('table').forEach((tbl) => {
        const rows = tbl.querySelectorAll('tr');
        const rowCount = rows.length;
        const colCount = rows.length > 0 ? rows[0].querySelectorAll('th, td').length : 0;
        extractedTables.push({
          html: tbl.outerHTML,
          rowCount,
          colCount
        });
      });
    }

    // Ambil rawText
    let rawText = '';
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rawHtml
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n');
      rawText = tempDiv.textContent || tempDiv.innerText || '';
    }

    const title = fileName.replace(/\.[^/.]+$/, '');

    return {
      rawHtml,
      rawText,
      title,
      images: extractedImages,
      tables: extractedTables
    };
  }

  /**
   * Parser Regex Master untuk memetakan HTML/Teks dari Word ke struktur CBT (Question & Exam)
   */
  parseWithRegex(input: string, defaultTitle = 'Ujian Baru'): ParsedExamResult {
    const isHtml = input.includes('<p') || input.includes('<div') || input.includes('<table') || input.includes('<br') || input.includes('<img');
    let workingText = input;

    if (isHtml && typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = input;

      // 1. Ekstrak dan tandai gambar <img src="..."> menjadi token [[IMG:...]]
      const imgTags = tempDiv.querySelectorAll('img');
      imgTags.forEach((img) => {
        if (img.src) {
          const marker = document.createTextNode(`\n[[IMG:${img.src}]]\n`);
          img.parentNode?.replaceChild(marker, img);
        }
      });

      // 2. Format tabel <table>...</table> menjadi wrapper HTML responsif
      const tableTags = tempDiv.querySelectorAll('table');
      tableTags.forEach((table) => {
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'overflow-x-auto my-3 border border-slate-300 rounded-lg shadow-2xs';

        const cleanTable = table.cloneNode(true) as HTMLTableElement;
        cleanTable.className = 'min-w-full divide-y divide-slate-200 text-xs border-collapse';
        cleanTable.querySelectorAll('th').forEach(th => {
          th.className = 'bg-slate-100 px-3 py-1.5 font-bold text-slate-700 border border-slate-300 text-left';
        });
        cleanTable.querySelectorAll('td').forEach(td => {
          td.className = 'px-3 py-1.5 text-slate-800 border border-slate-200';
        });
        tableWrapper.appendChild(cleanTable);

        const marker = document.createTextNode(`\n[[TABLE:${tableWrapper.outerHTML}]]\n`);
        table.parentNode?.replaceChild(marker, table);
      });

      // 3. Konversi tag baris menjadi newline
      workingText = tempDiv.innerHTML
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n');

      const cleanDiv = document.createElement('div');
      cleanDiv.innerHTML = workingText;
      workingText = cleanDiv.textContent || cleanDiv.innerText || '';
    }

    // 4. Pisahkan Dokumen menjadi 3 Bagian jika ada header seksi
    const { mcqSectionText, isianSectionText, keySectionText } = this.splitDocumentSections(workingText);

    // 5. Ekstrak Kunci Jawaban (baik PG maupun Uraian/Isian)
    const { mcqKeys, isianKeys } = this.parseAnswerKeysSection(keySectionText);

    // 6. Parsing Soal Pilihan Ganda & Soal Uraian otomatis
    const mcqQuestions = this.parseMcqSection(mcqSectionText, mcqKeys, isianKeys);

    // 7. Parsing Soal Uraian / Isian terpisah (jika ada seksi tersendiri)
    const isianStartIndex = mcqQuestions.length + 1;
    const isianQuestions = this.parseIsianSection(isianSectionText, isianKeys, isianStartIndex);

    const allQuestions = [...mcqQuestions, ...isianQuestions];

    // Fallback jika tidak terdeteksi via struktur standar
    if (allQuestions.length === 0) {
      const fallbackQuestions = this.parseFallbackLineByLine(workingText);
      return {
        title: defaultTitle,
        questions: fallbackQuestions,
        rawHtml: input
      };
    }

    return {
      title: defaultTitle,
      questions: allQuestions,
      rawHtml: input
    };
  }

  /**
   * Memisahkan teks dokumen berdasarkan header:
   * - Soal Pilihan Ganda (atau الاختيار من متعدد / القسم الأول)
   * - Soal Uraian / Isian / Esai (atau الأسئلة المقالية / الأسئلة الإنشائية / أجب عن الأسئلة)
   * - Kunci Jawaban (atau مفتاح الإجابة / الإجابة النموذجية / كشف الإجابة)
   */
  private splitDocumentSections(text: string) {
    const isianHeaderRegex = /(?:^|\n)\s*(?:[B-D]\.?\s*)?(?:Soal\s+Uraian|Uraian|Soal\s+Isian|Isian|Soal\s+Esai|Esai|Essay|Bagian\s+(?:II|III)|(?:II|III)\.\s*(?:Uraian|Isian|Esai)|الأسئلة\s+المقالية|الأسئلة\s+الإنشائية|أجب\s+عن\s+الأسئلة|القسم\s+الثاني|القسم\s+الثالث)\b/i;
    const keyHeaderRegex = /(?:^|\n)\s*(?:Kunci\s+Jawaban|Kunci\s+Soal|Kunci\s+Uraian|Kunci\s+PG|Answer\s+Keys?|مفتاح\s+الإجابة|كشف\s+الإجابة|الإجابة\s+النموذجية|الإجابات)\b/i;

    let mcqSectionText = text;
    let isianSectionText = '';
    let keySectionText = '';

    const keyMatch = text.match(keyHeaderRegex);
    if (keyMatch && keyMatch.index !== undefined) {
      keySectionText = text.substring(keyMatch.index);
      text = text.substring(0, keyMatch.index);
    }

    const isianMatch = text.match(isianHeaderRegex);
    if (isianMatch && isianMatch.index !== undefined) {
      isianSectionText = text.substring(isianMatch.index);
      mcqSectionText = text.substring(0, isianMatch.index);
    } else {
      mcqSectionText = text;
    }

    mcqSectionText = mcqSectionText.replace(/(?:^|\n)\s*(?:A\.?\s*)?(?:Soal\s+Pilihan\s+Ganda|Pilihan\s+Ganda|Bagian\s+I|القسم\s+الأول|الاختيار\s+من\s+متعدد)\b[^\n]*/i, '');
    isianSectionText = isianSectionText.replace(/(?:^|\n)\s*(?:[B-D]\.?\s*)?(?:Soal\s+Uraian|Uraian|Soal\s+Isian|Isian|Soal\s+Esai|Bagian\s+II|II\.\s*Isian|الأسئلة\s+المقالية|الأسئلة\s+الإنشائية|أجب\s+عن\s+الأسئلة)\b[^\n]*/i, '');

    return { mcqSectionText, isianSectionText, keySectionText };
  }

  /**
   * Parsing Kunci Jawaban untuk Pilihan Ganda dan Soal Uraian
   */
  private parseAnswerKeysSection(keySectionText: string) {
    const mcqKeys: Record<number, string> = {};
    const isianKeys: Record<number, string> = {};

    if (!keySectionText) return { mcqKeys, isianKeys };

    let mcqPart = keySectionText;
    let isianPart = '';

    const isianSubHeaderRegex = /(?:Uraian|Isian|Esai|Essay|المقالية|الإنشائية)\s*[:]/i;
    const isianSubMatch = keySectionText.match(isianSubHeaderRegex);

    if (isianSubMatch && isianSubMatch.index !== undefined) {
      isianPart = keySectionText.substring(isianSubMatch.index);
      mcqPart = keySectionText.substring(0, isianSubMatch.index);
    }

    // Parsing Kunci PG (Latin dan Arab: 1.A, 1.B, ١. أ, 1. أ)
    const normalizedMcqPart = convertArabicIndicNumerals(mcqPart);
    const keyRegex = /(?:^|\s|[\t\r\n]|;)([0-9]{1,3})[\.\s:\)\-]+([A-Ea-eأ-د])\b/g;
    let match;
    while ((match = keyRegex.exec(normalizedMcqPart)) !== null) {
      const qNum = parseInt(match[1], 10);
      let letter = match[2];
      if (ARABIC_OPTION_MAP[letter]) {
        letter = ARABIC_OPTION_MAP[letter];
      }
      mcqKeys[qNum] = letter.toUpperCase();
    }

    // Parsing Kunci Uraian/Isian
    const targetIsianText = isianPart || keySectionText;
    const isianLines = targetIsianText.split(/\r?\n/);
    for (const rawLine of isianLines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (/^(?:Kunci|Pilihan|Isian|Uraian|مفتاح|الإجابة)/i.test(line)) continue;

      const convertedLine = convertArabicIndicNumerals(line);
      const isianKeyMatch = convertedLine.match(/^([0-9]{1,3})[\.\s:\)\-]+(.*)$/);
      if (isianKeyMatch) {
        const qNum = parseInt(isianKeyMatch[1], 10);
        const ansText = isianKeyMatch[2].trim();
        if (ansText) {
          if (!mcqKeys[qNum] || ansText.length > 2 || hasArabicCharacters(ansText)) {
            isianKeys[qNum] = ansText;
          }
        }
      }
    }

    return { mcqKeys, isianKeys };
  }

  /**
   * Parsing Seksi Soal PG dan deteksi otomatis Soal Uraian bila tanpa opsi
   */
  private parseMcqSection(
    text: string, 
    answerKeys: Record<number, string>, 
    isianKeys: Record<number, string>
  ): Question[] {
    const questions: Question[] = [];
    const lines = text.split(/\r?\n/);

    const questionStartRegex = /^(?:([0-9]{1,3}|[٠-٩]{1,3})[\.\)\-\:]\s*|(?:No|Nomor)\.?\s*([0-9]{1,3})\s*[\.\:\-]?\s*)(.*)$/i;

    let currentQNumber: number | null = null;
    let currentQText = '';
    let currentOptions: QuestionOption[] = [];
    let currentImageUrl: string | undefined = undefined;
    let currentInlineKey: string | null = null;

    const commitCurrent = () => {
      if (currentQNumber !== null && (currentQText.trim() || currentOptions.length > 0)) {
        let cleanText = currentQText.trim();
        cleanText = cleanText.replace(/\[\[IMG:(.*?)\]\]/g, (_, src) => {
          if (!currentImageUrl) currentImageUrl = src;
          return '';
        }).trim();

        cleanText = cleanText.replace(/\[\[TABLE:(.*?)\]\]/g, '$1').trim();

        const detectedInlineKeyMatch = cleanText.match(/(?:Kunci(?:\s+Jawaban)?|Jawaban|Ans(?:wer)?|مفتاح(?:\s+الإجابة)?|الإجابة|الجواب)\s*[:=]\s*([A-Ea-eأ-د]|\b[^\n\r]+)/i);
        if (detectedInlineKeyMatch) {
          currentInlineKey = detectedInlineKeyMatch[1].trim();
          cleanText = cleanText.replace(/(?:Kunci(?:\s+Jawaban)?|Jawaban|Ans(?:wer)?|مفتاح(?:\s+الإجابة)?|الإجابة|الجواب)\s*[:=]\s*([^\n\r]+)/i, '').trim();
        }

        // AUTO-CLASSIFICATION: Jika tidak ada opsi A-D, ini adalah SOAL URAIAN (ESSAY)
        if (currentOptions.length === 0) {
          let rubricAnswer = isianKeys[currentQNumber] || currentInlineKey || 'Rubrik acuan koreksi guru...';
          questions.push({
            id: `q-docx-essay-${currentQNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            examId: '',
            type: 'ESSAY',
            text: cleanText,
            points: 15,
            orderIndex: currentQNumber,
            correctAnswer: rubricAnswer,
            imageUrl: currentImageUrl
          });
        } else {
          // Soal Pilihan Ganda
          let finalKey = 'A';
          if (currentInlineKey) {
            let mapped = currentInlineKey;
            if (ARABIC_OPTION_MAP[mapped]) mapped = ARABIC_OPTION_MAP[mapped];
            finalKey = mapped.toUpperCase();
          } else if (answerKeys[currentQNumber]) {
            finalKey = answerKeys[currentQNumber].toUpperCase();
          }

          if (currentOptions.length < 4 && !hasArabicCharacters(cleanText)) {
            const existingKeys = currentOptions.map(o => o.key.toUpperCase());
            const needed = ['A', 'B', 'C', 'D'].filter(k => !existingKeys.includes(k));
            for (const k of needed) {
              if (currentOptions.length < 4) {
                currentOptions.push({ key: k, text: `Pilihan ${k}` });
              }
            }
          }

          questions.push({
            id: `q-docx-mcq-${currentQNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            examId: '',
            type: 'MCQ',
            text: cleanText,
            options: currentOptions,
            correctAnswer: finalKey,
            points: 5,
            orderIndex: currentQNumber,
            imageUrl: currentImageUrl
          });
        }
      }

      currentQNumber = null;
      currentQText = '';
      currentOptions = [];
      currentImageUrl = undefined;
      currentInlineKey = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;

      const qMatch = trimmed.match(questionStartRegex);
      if (qMatch) {
        commitCurrent();
        const rawNum = qMatch[1] || qMatch[2];
        const normalizedNum = convertArabicIndicNumerals(rawNum);
        currentQNumber = parseInt(normalizedNum, 10);
        currentQText = qMatch[3] || '';
        continue;
      }

      if (currentQNumber !== null) {
        const extractedOpts = this.extractOptionsFromLine(trimmed);
        if (extractedOpts.length > 0) {
          currentOptions.push(...extractedOpts);
        } else {
          currentQText += (currentQText ? '\n' : '') + trimmed;
        }
      }
    }

    commitCurrent();
    return questions;
  }

  /**
   * Ekstraksi opsi jawaban dari satu baris
   */
  private extractOptionsFromLine(line: string): QuestionOption[] {
    const options: QuestionOption[] = [];
    const optionTokenRegex = /(?:^|[\s\t\r\n])(?:(?:\(([A-Ea-eأ-د])\))|([A-Ea-eأ-د])[\.\)\-])\s+/g;
    const matches: { index: number; key: string; length: number }[] = [];

    let match;
    while ((match = optionTokenRegex.exec(line)) !== null) {
      let rawKey = (match[1] || match[2]);
      if (ARABIC_OPTION_MAP[rawKey]) {
        rawKey = ARABIC_OPTION_MAP[rawKey];
      }
      matches.push({
        index: match.index,
        key: rawKey.toUpperCase(),
        length: match[0].length
      });
    }

    if (matches.length === 0) return [];

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const startIndex = current.index + current.length;
      const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : line.length;
      const optText = line.substring(startIndex, endIndex).trim();

      if (!options.some(o => o.key === current.key)) {
        options.push({
          key: current.key,
          text: optText || `Pilihan ${current.key}`
        });
      }
    }

    return options;
  }

  /**
   * Parsing Seksi Soal Uraian / Isian Khusus
   */
  private parseIsianSection(
    text: string, 
    isianKeys: Record<number, string>, 
    startIndex: number
  ): Question[] {
    const questions: Question[] = [];
    if (!text.trim()) return questions;

    const lines = text.split(/\r?\n/);
    const questionStartRegex = /^(?:([0-9]{1,3}|[٠-٩]{1,3})[\.\)\-\:]\s*|(?:No|Nomor)\.?\s*([0-9]{1,3})\s*[\.\:\-]?\s*)(.*)$/i;

    let currentQNumber: number | null = null;
    let currentQText = '';
    let currentImageUrl: string | undefined = undefined;
    let currentInlineKey: string | null = null;
    let localIndex = 0;

    const commitIsian = () => {
      if (currentQNumber !== null && currentQText.trim()) {
        localIndex++;
        let cleanText = currentQText.trim();
        cleanText = cleanText.replace(/\[\[IMG:(.*?)\]\]/g, (_, src) => {
          if (!currentImageUrl) currentImageUrl = src;
          return '';
        }).trim();
        cleanText = cleanText.replace(/\[\[TABLE:(.*?)\]\]/g, '$1').trim();

        const detectedInlineKeyMatch = cleanText.match(/(?:Kunci(?:\s+Jawaban)?|Jawaban|Ans(?:wer)?|مفتاح(?:\s+الإجابة)?|الإجابة|الجواب)\s*[:=]\s*([^\n\r]+)/i);
        if (detectedInlineKeyMatch) {
          currentInlineKey = detectedInlineKeyMatch[1].trim();
          cleanText = cleanText.replace(/(?:Kunci(?:\s+Jawaban)?|Jawaban|Ans(?:wer)?|مفتاح(?:\s+الإجابة)?|الإجابة|الجواب)\s*[:=]\s*([^\n\r]+)/i, '').trim();
        }

        const answer = isianKeys[currentQNumber] || isianKeys[localIndex] || currentInlineKey || 'Rubrik acuan guru...';

        questions.push({
          id: `q-docx-isian-${currentQNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          examId: '',
          type: 'ESSAY',
          text: cleanText,
          points: 10,
          orderIndex: currentQNumber,
          correctAnswer: answer,
          imageUrl: currentImageUrl
        });
      }

      currentQNumber = null;
      currentQText = '';
      currentImageUrl = undefined;
      currentInlineKey = null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;

      const qMatch = trimmed.match(questionStartRegex);
      if (qMatch) {
        commitIsian();
        const rawNum = qMatch[1] || qMatch[2];
        const normalizedNum = convertArabicIndicNumerals(rawNum);
        currentQNumber = parseInt(normalizedNum, 10);
        currentQText = qMatch[3] || '';
        continue;
      }

      if (currentQNumber !== null) {
        currentQText += (currentQText ? '\n' : '') + trimmed;
      }
    }

    commitIsian();
    return questions;
  }

  /**
   * Fallback Parser jika dokumen tidak memiliki pola penomoran standar
   */
  private parseFallbackLineByLine(text: string): Question[] {
    const questions: Question[] = [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    let currentQ: Question | null = null;
    let orderCounter = 1;

    for (const line of lines) {
      if (/^(?:Soal|Kunci|Pilihan|Daftar|Petunjuk)/i.test(line)) continue;

      const qMatch = line.match(/^([0-9]{1,3})[\.\)\-]\s*(.*)$/);
      if (qMatch) {
        if (currentQ) questions.push(currentQ);
        currentQ = {
          id: `q-fallback-${orderCounter}-${Date.now()}`,
          examId: '',
          type: 'MCQ',
          text: qMatch[2],
          options: [],
          correctAnswer: 'A',
          points: 5,
          orderIndex: parseInt(qMatch[1], 10) || orderCounter++
        };
        continue;
      }

      const optMatch = line.match(/^([A-Ea-eأ-د])[\.\)\-]\s*(.*)$/);
      if (optMatch && currentQ) {
        let key = optMatch[1];
        if (ARABIC_OPTION_MAP[key]) key = ARABIC_OPTION_MAP[key];
        key = key.toUpperCase();
        if (!currentQ.options?.some(o => o.key === key)) {
          currentQ.options = currentQ.options || [];
          currentQ.options.push({
            key,
            text: optMatch[2] || `Pilihan ${key}`
          });
        }
        continue;
      }

      if (currentQ) {
        currentQ.text += '\n' + line;
      }
    }

    if (currentQ) questions.push(currentQ);

    questions.forEach(q => {
      if (!q.options || q.options.length === 0) {
        q.type = 'ESSAY';
        q.points = 15;
      }
    });

    return questions;
  }

  /**
   * Mengonversi hasil ekstraksi menjadi instance Exam lengkap yang siap disimpan ke database
   */
  createExamFromExtraction(
    result: ParsedExamResult, 
    meta: { subjectName: string; className: string; duration?: number; passingGrade?: number }
  ): Exam {
    const autoTitle = `Ujian ${meta.subjectName.trim()} - ${meta.className.trim()}`;
    const autoInstructions = 
      `Petunjuk Pengerjaan Ujian:\n` +
      `1. Bacalah basmalah sebelum memulai pengerjaan ujian.\n` +
      `2. Periksa kelengkapan butir soal pilihan ganda dan esai sebelum menjawab.\n` +
      `3. Dilarang berpindah jendela/tab browser atau membuka aplikasi lain selama ujian.\n` +
      `4. Kerjakan soal yang lebih mudah terlebih dahulu, gunakan tombol ragu-ragu bila perlu.\n` +
      `5. Seluruh jawaban tersimpan otomatis oleh sistem server CBT MIS NW Korleko.`;

    return {
      id: `exam-${Date.now()}`,
      title: autoTitle,
      description: autoInstructions,
      subjectId: `sub-${Date.now()}`,
      subjectName: meta.subjectName.trim(),
      classId: `cls-${Date.now()}`,
      className: meta.className.trim(),
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 86400 * 1000 * 7).toISOString(),
      duration: meta.duration || 60,
      passingGrade: meta.passingGrade || 75,
      isActive: true,
      randomizeQuestions: false,
      showResults: true,
      maxViolations: 3,
      token: '', // Mode bebas token sesuai arahan proktor
      questions: result.questions
    };
  }
}

// Singleton instance
export const documentParser = new DocumentParser();

/**
 * Helper pembungkus untuk kemudahan impor
 */
export async function parseDocxFile(file: File): Promise<ParsedExamResult> {
  const extracted = await documentParser.extractFromDocx(file);
  return documentParser.parseWithRegex(extracted.rawHtml, extracted.title);
}

export function parsePlainText(rawText: string, defaultTitle = 'Ujian Asesmen Baru'): ParsedExamResult {
  return documentParser.parseWithRegex(rawText, defaultTitle);
}
