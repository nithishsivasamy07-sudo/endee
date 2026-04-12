/**
 * Document Processing Utilities
 * Handles: PDF, TXT, DOCX text extraction and chunking
 */

import fs from "fs/promises";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

const MAX_CHUNK_SIZE = parseInt(process.env.MAX_CHUNK_SIZE) || 800;
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP) || 100;

/**
 * Extract text from a file based on its type
 * @param {string} filePath - Path to the file
 * @param {string} mimeType - MIME type of the file
 * @returns {string} Extracted text
 */
export async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === ".pdf" || mimeType === "application/pdf") {
      return await extractFromPDF(filePath);
    } else if (
      ext === ".docx" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return await extractFromDOCX(filePath);
    } else if (ext === ".txt" || mimeType === "text/plain") {
      return await extractFromTXT(filePath);
    } else if (ext === ".md") {
      return await extractFromTXT(filePath);
    } else {
      // Try as plain text for unknown types
      return await extractFromTXT(filePath);
    }
  } catch (error) {
    throw new Error(
      `Failed to extract text from ${path.basename(filePath)}: ${error.message}`
    );
  }
}

async function extractFromPDF(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  if (!data.text || data.text.trim().length === 0) {
    throw new Error("PDF appears to be empty or contains no extractable text");
  }
  console.log(
    `[DocProcessor] PDF: ${data.numpages} pages, ${data.text.length} chars`
  );
  return cleanText(data.text);
}

async function extractFromDOCX(filePath) {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  if (!result.value || result.value.trim().length === 0) {
    throw new Error("DOCX appears to be empty");
  }
  console.log(`[DocProcessor] DOCX: ${result.value.length} chars`);
  return cleanText(result.value);
}

async function extractFromTXT(filePath) {
  const text = await fs.readFile(filePath, "utf-8");
  if (!text || text.trim().length === 0) {
    throw new Error("File appears to be empty");
  }
  console.log(`[DocProcessor] TXT: ${text.length} chars`);
  return cleanText(text);
}

/**
 * Clean extracted text
 */
function cleanText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/^\s+|\s+$/gm, "")
    .trim();
}

/**
 * Split text into overlapping chunks for better RAG retrieval
 * Uses sentence-aware splitting to avoid breaking mid-sentence
 * 
 * @param {string} text - Full document text
 * @param {number} maxChunkSize - Max characters per chunk
 * @param {number} overlap - Overlap characters between chunks
 * @returns {Array<{text: string, index: number, charStart: number, charEnd: number}>}
 */
export function chunkText(
  text,
  maxChunkSize = MAX_CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
) {
  const chunks = [];

  // Split into sentences first for cleaner boundaries
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  let currentChunk = "";
  let currentStart = 0;
  let charPosition = 0;

  for (const sentence of sentences) {
    const testChunk = currentChunk
      ? currentChunk + " " + sentence
      : sentence;

    if (testChunk.length > maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        index: chunks.length,
        charStart: currentStart,
        charEnd: currentStart + currentChunk.length,
        wordCount: currentChunk.split(/\s+/).length,
      });

      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk, overlap);
      currentStart = currentStart + currentChunk.length - overlapText.length;
      currentChunk = overlapText ? overlapText + " " + sentence : sentence;
    } else {
      currentChunk = testChunk;
    }

    charPosition += sentence.length;
  }

  // Add final chunk
  if (currentChunk.trim().length > 20) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunks.length,
      charStart: currentStart,
      charEnd: currentStart + currentChunk.length,
      wordCount: currentChunk.split(/\s+/).length,
    });
  }

  console.log(
    `[DocProcessor] Created ${chunks.length} chunks from ${text.length} chars`
  );
  return chunks;
}

/**
 * Get the last N characters of text for overlap
 */
function getOverlapText(text, overlapSize) {
  if (text.length <= overlapSize) return text;
  const overlapText = text.slice(-overlapSize);
  // Find the first space to avoid splitting words
  const firstSpace = overlapText.indexOf(" ");
  return firstSpace > 0 ? overlapText.slice(firstSpace + 1) : overlapText;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 chars)
 */
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
