/**
 * Утилиты для работы с PDF без Python (только TypeScript/Node).
 * Используются pdf-lib и pdf2json.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { PDFDocument } from "pdf-lib";

// Типы для pdf2json (упрощённая структура)
interface Pdf2JsonPage {
  Texts?: Array<{ R?: Array<{ T?: string }> }>;
  [key: string]: unknown;
}

interface Pdf2JsonData {
  Pages?: Pdf2JsonPage[];
  [key: string]: unknown;
}

/**
 * Возвращает количество страниц в PDF (pdf-lib).
 */
export async function getPdfPageCount(filePath: string): Promise<number> {
  const buffer = fs.readFileSync(filePath);
  const doc = await PDFDocument.load(buffer);
  return doc.getPageCount();
}

/**
 * Определяет тип PDF по количеству извлечённого текста (pdf2json).
 * Если текста много — "pdf-text", иначе "mistral-ocr".
 */
export async function detectPdfEngine(filePath: string): Promise<string> {
  try {
    const text = await getPdfRawText(filePath, 3);
    return text.length > 500 ? "pdf-text" : "mistral-ocr";
  } catch {
    return "pdf-text";
  }
}

/**
 * Извлекает сырой текст из первых N страниц через pdf2json.
 */
function getPdfRawText(filePath: string, maxPages: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFParser = require("pdf2json");
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", (err: Error) => reject(err));
    parser.on("pdfParser_dataReady", (pdfData: Pdf2JsonData) => {
      try {
        const text = parser.getRawTextContent?.() || getTextFromPages(pdfData, maxPages);
        resolve(text || "");
      } catch (e) {
        resolve("");
      }
    });

    parser.loadPDF(filePath);
  });
}

function getTextFromPages(pdfData: Pdf2JsonData, maxPages: number): string {
  const pages = pdfData.Pages || [];
  const toProcess = pages.slice(0, maxPages);
  const parts: string[] = [];
  for (const page of toProcess) {
    parts.push(getTextFromPage(page));
  }
  return parts.join("\n");
}

function getTextFromPage(page: Pdf2JsonPage): string {
  const texts = page.Texts || [];
  const parts: string[] = [];
  for (const t of texts) {
    const runs = t.R || [];
    for (const r of runs) {
      if (r.T) parts.push(decodeURIComponent(r.T));
    }
  }
  return parts.join(" ");
}

/**
 * Находит диапазон страниц (start, end) по произвольной строке поиска (адрес, регистрационный № и т.д.).
 * Ищет первую страницу, содержащую эту строку (нормализованную), возвращает 10 страниц начиная с неё.
 */
export async function findPageRangeBySearchTerm(
  filePath: string,
  searchTerm: string,
): Promise<{ start: number; end: number }> {
  if (!searchTerm || !String(searchTerm).trim()) {
    const total = await getPdfPageCount(filePath);
    return { start: 1, end: Math.min(10, total) };
  }

  try {
    const pdfData = await loadPdf2Json(filePath);
    const pages = pdfData.Pages || [];
    const termNorm = normalizeText(String(searchTerm).trim());
    const termParts = termNorm.split(/\s+/).filter((p) => p.length > 1).slice(0, 6);

    for (let i = 0; i < pages.length; i++) {
      const pageText = getTextFromPage(pages[i]);
      const textNorm = normalizeText(pageText);
      if (termNorm && textNorm.includes(termNorm)) {
        const start = i + 1;
        const end = Math.min(start + 9, pages.length);
        return { start, end };
      }
      for (const part of termParts) {
        if (part.length >= 3 && textNorm.includes(part)) {
          const start = i + 1;
          const end = Math.min(start + 9, pages.length);
          return { start, end };
        }
      }
    }

    const total = pages.length || (await getPdfPageCount(filePath));
    return { start: 1, end: Math.min(10, total) };
  } catch (error) {
    console.warn(`⚠️ Поиск страниц по строке не удался: ${(error as Error).message}`);
    const total = await getPdfPageCount(filePath);
    return { start: 1, end: Math.min(10, total) };
  }
}

/**
 * Находит номер первой страницы (1-based) в диапазоне [startPage, endPage], на которой встречается текст searchText.
 */
export async function findPageWithText(
  filePath: string,
  searchText: string,
  startPage: number,
  endPage: number,
): Promise<number | null> {
  if (!searchText || !String(searchText).trim()) return null;
  try {
    const pdfData = await loadPdf2Json(filePath);
    const pages = pdfData.Pages || [];
    const searchNorm = normalizeText(String(searchText).trim());
    const startIdx = Math.max(0, startPage - 1);
    const endIdx = Math.min(pages.length, endPage);
    for (let i = startIdx; i < endIdx; i++) {
      const pageText = getTextFromPage(pages[i]);
      if (normalizeText(pageText).includes(searchNorm)) return i + 1;
    }
    return null;
  } catch {
    return null;
  }
}

const RESULTS_SECTION_HEADER = "РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ";
const RESULTS_PAGES_COUNT = 5;

/**
 * Для отчёта, найденного по регистрационному №: ищет страницу с заголовком "РЕЗУЛЬТАТЫ ОБСЛЕДОВАНИЯ"
 * и возвращает диапазон из 5 страниц начиная с неё (только нужный блок для парсинга).
 */
export async function findPageRangeForResultsSection(
  filePath: string,
  searchTerm: string,
): Promise<{ start: number; end: number }> {
  const initial = await findPageRangeBySearchTerm(filePath, searchTerm);
  const total = await getPdfPageCount(filePath);
  const resultsPage = await findPageWithText(
    filePath,
    RESULTS_SECTION_HEADER,
    initial.start,
    initial.end,
  );
  if (resultsPage != null) {
    const end = Math.min(resultsPage + RESULTS_PAGES_COUNT - 1, total);
    return { start: resultsPage, end };
  }
  const end = Math.min(initial.start + RESULTS_PAGES_COUNT - 1, total);
  return { start: initial.start, end };
}

/**
 * Находит диапазон страниц (start, end) по адресу: ищет страницу с текстом адреса, возвращает 10 страниц с неё.
 */
export async function findPageRangeByAddress(
  filePath: string,
  address: string,
): Promise<{ start: number; end: number }> {
  return findPageRangeBySearchTerm(filePath, address);
}

function normalizeText(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function loadPdf2Json(filePath: string): Promise<Pdf2JsonData> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFParser = require("pdf2json");
    const parser = new PDFParser();
    parser.on("pdfParser_dataError", (err: Error) => reject(err));
    parser.on("pdfParser_dataReady", (pdfData: Pdf2JsonData) => resolve(pdfData));
    parser.loadPDF(filePath);
  });
}

/**
 * Извлекает страницы [startPage..endPage] (1-based) в отдельный временный PDF (pdf-lib).
 */
export async function extractPdfPages(
  filePath: string,
  startPage: number,
  endPage: number,
): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const srcDoc = await PDFDocument.load(buffer);
  const totalPages = srcDoc.getPageCount();
  const startIdx = Math.max(0, startPage - 1);
  const endIdx = Math.min(totalPages, endPage);
  const pageIndices = Array.from({ length: endIdx - startIdx }, (_, i) => startIdx + i);

  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(srcDoc, pageIndices);
  copied.forEach((p) => newDoc.addPage(p));

  const outPath = path.join(os.tmpdir(), `pdf_chunk_${Date.now()}_${startPage}-${endPage}.pdf`);
  const outBytes = await newDoc.save();
  fs.writeFileSync(outPath, outBytes);
  return outPath;
}
