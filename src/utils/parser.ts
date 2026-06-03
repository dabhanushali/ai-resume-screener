// Use standard Node require to bypass ESM wrapper interop issues in Next.js/Turbopack
const { CanvasFactory } = require('pdf-parse/worker');
const { PDFParse } = require('pdf-parse');
import mammoth from 'mammoth';
import crypto from 'crypto';

/**
 * Parses raw text from a PDF file buffer.
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  let parser: any = null;
  try {
    // Instantiate Mehmet Kozan's modern PDFParse parser
    parser = new PDFParse({ data: buffer, CanvasFactory });
    const result = await parser.getText();
    return result.text || '';
  } catch (e: any) {
    console.error('PDF parsing error:', e);
    throw new Error('Could not parse PDF file. ' + e.message);
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch (err) {
        // Ignore destroy errors
      }
    }
  }
}

/**
 * Parses raw text from a DOCX file buffer.
 */
export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (e: any) {
    console.error('DOCX parsing error:', e);
    throw new Error('Could not parse Word document. The file may be empty or corrupted.');
  }
}

/**
 * Computes a standardized SHA-256 hash of resume text to prevent exact duplicate uploads.
 */
export function computeHash(text: string): string {
  const normalized = (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
