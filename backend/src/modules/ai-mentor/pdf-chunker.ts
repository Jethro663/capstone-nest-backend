/**
 * PDF Chunker — Splits large PDF text into manageable chunks for
 * LLM extraction, preserving natural document boundaries.
 *
 * Priority order for splitting:
 *   1. Heading-based (Lesson/Chapter/Module markers)
 *   2. Page-based (form-feed characters)
 *   3. Character-based (fixed size with overlap)
 */

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface TextChunk {
  /** Chunk number (1-indexed) */
  index: number;
  /** Total number of chunks */
  total: number;
  /** The chunk text content */
  text: string;
  /** Context header prepended to each chunk for the LLM */
  contextHeader: string;
  /** How this chunk was split */
  splitMethod: 'heading' | 'page' | 'character' | 'single';
}

export interface ChunkOptions {
  /** Maximum characters per chunk sent to LLM (default: 8000) */
  maxChunkSize?: number;
  /** Overlap characters between character-based chunks (default: 500) */
  overlapSize?: number;
  /** Threshold below which the text is sent as a single chunk (default: 10000) */
  singleChunkThreshold?: number;
  /** Document title for context headers */
  documentTitle?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_MAX_CHUNK_SIZE = 8000;
const DEFAULT_OVERLAP_SIZE = 500;
const DEFAULT_SINGLE_CHUNK_THRESHOLD = 10000;

/**
 * Heading patterns that indicate natural document boundaries.
 * Reuses the same patterns as the rule-based extractor for consistency.
 */
const HEADING_PATTERNS = [
  /^(?:lesson|chapter|module|unit|topic|part)\s+\d+/im,
  /^(?:lesson|chapter|module|unit|topic|part)\s*[:\-–—.]/im,
  /^[IVXLCDM]+\.\s+\S/m,        // Roman numeral headings
  /^[A-Z]\.\s+[A-Z]/m,           // Letter headings (A. Objectives)
];

// ────────────────────────────────────────────────────────────────────────────
// Main chunking function
// ────────────────────────────────────────────────────────────────────────────

/**
 * Splits text into chunks using the best available strategy.
 * Returns an array of TextChunk objects ready to be sent to the LLM.
 */
export function chunkText(rawText: string, options: ChunkOptions = {}): TextChunk[] {
  const {
    maxChunkSize = DEFAULT_MAX_CHUNK_SIZE,
    overlapSize = DEFAULT_OVERLAP_SIZE,
    singleChunkThreshold = DEFAULT_SINGLE_CHUNK_THRESHOLD,
    documentTitle = 'Uploaded Module',
  } = options;

  // Normalize whitespace first
  const text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  // If text is small enough, return as single chunk
  if (text.length <= singleChunkThreshold) {
    return [{
      index: 1,
      total: 1,
      text,
      contextHeader: `Document: "${documentTitle}"`,
      splitMethod: 'single',
    }];
  }

  // Try heading-based splitting first
  const headingChunks = splitByHeadings(text, maxChunkSize);
  if (headingChunks.length > 1) {
    return formatChunks(headingChunks, documentTitle, 'heading');
  }

  // Try page-based splitting
  const pageChunks = splitByPages(text, maxChunkSize);
  if (pageChunks.length > 1) {
    return formatChunks(pageChunks, documentTitle, 'page');
  }

  // Fall back to character-based splitting
  const charChunks = splitByCharacters(text, maxChunkSize, overlapSize);
  return formatChunks(charChunks, documentTitle, 'character');
}

// ────────────────────────────────────────────────────────────────────────────
// Splitting strategies
// ────────────────────────────────────────────────────────────────────────────

interface RawChunk {
  text: string;
  heading?: string;
}

/**
 * Strategy 1: Split by detected headings (Lesson, Chapter, Module, etc.)
 * Groups text between heading markers, merging small adjacent sections
 * if they'd be under the minimum useful size.
 */
function splitByHeadings(text: string, maxSize: number): RawChunk[] {
  const lines = text.split('\n');
  const sections: RawChunk[] = [];
  let currentSection: RawChunk = { text: '', heading: undefined };

  for (const line of lines) {
    const isHeading = HEADING_PATTERNS.some(p => p.test(line.trim()));

    if (isHeading && currentSection.text.trim().length > 0) {
      sections.push(currentSection);
      currentSection = { text: line + '\n', heading: line.trim() };
    } else {
      currentSection.text += line + '\n';
      if (!currentSection.heading && isHeading) {
        currentSection.heading = line.trim();
      }
    }
  }

  // Push final section
  if (currentSection.text.trim().length > 0) {
    sections.push(currentSection);
  }

  // Merge small adjacent sections and split oversized ones
  return mergeAndSplit(sections, maxSize);
}

/**
 * Strategy 2: Split by page breaks (form-feed characters in PDF text)
 */
function splitByPages(text: string, maxSize: number): RawChunk[] {
  // Split on form-feed characters (common in PDF output)
  const pages = text.split(/\f+/);

  if (pages.length <= 1) {
    return [{ text }]; // No page breaks found
  }

  const sections: RawChunk[] = pages
    .map((page, i) => ({
      text: page.trim(),
      heading: `Page ${i + 1}`,
    }))
    .filter(s => s.text.length > 0);

  return mergeAndSplit(sections, maxSize);
}

/**
 * Strategy 3: Fixed-size character splitting with overlap.
 * Used as a last resort when no natural boundaries are found.
 */
function splitByCharacters(text: string, maxSize: number, overlap: number): RawChunk[] {
  const chunks: RawChunk[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);

    // Try to break at a paragraph boundary (double newline)
    if (end < text.length) {
      const nearestParagraph = text.lastIndexOf('\n\n', end);
      if (nearestParagraph > start + maxSize * 0.5) {
        end = nearestParagraph + 2; // Include the newlines
      } else {
        // Try to break at a sentence boundary
        const nearestSentence = text.lastIndexOf('. ', end);
        if (nearestSentence > start + maxSize * 0.5) {
          end = nearestSentence + 2;
        }
      }
    }

    chunks.push({
      text: text.substring(start, end).trim(),
      heading: `Section ${chunks.length + 1}`,
    });

    // Move start forward, applying overlap
    start = end - (end < text.length ? overlap : 0);
  }

  return chunks;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Merges small adjacent sections (< 500 chars) and splits oversized ones.
 */
function mergeAndSplit(sections: RawChunk[], maxSize: number): RawChunk[] {
  const MIN_SECTION_SIZE = 500;
  const result: RawChunk[] = [];

  let buffer: RawChunk = { text: '', heading: undefined };

  for (const section of sections) {
    // If adding this section would exceed max, flush buffer first
    if (buffer.text.length > 0 && buffer.text.length + section.text.length > maxSize) {
      result.push(buffer);
      buffer = { text: '', heading: undefined };
    }

    if (buffer.text.length === 0) {
      buffer = { ...section };
    } else {
      buffer.text += '\n\n' + section.text;
      // Keep original heading if buffer doesn't have one
      if (!buffer.heading) {
        buffer.heading = section.heading;
      }
    }

    // If buffer is large enough on its own, flush it
    if (buffer.text.length >= maxSize) {
      result.push(buffer);
      buffer = { text: '', heading: undefined };
    }
  }

  // Flush remaining buffer
  if (buffer.text.trim().length > 0) {
    // If buffer is too small and there's a previous chunk, merge with it
    if (buffer.text.length < MIN_SECTION_SIZE && result.length > 0) {
      result[result.length - 1].text += '\n\n' + buffer.text;
    } else {
      result.push(buffer);
    }
  }

  // Post-process: split any chunks that are still too large
  const finalResult: RawChunk[] = [];
  for (const chunk of result) {
    if (chunk.text.length > maxSize * 1.5) {
      // Force-split large chunks by character
      const subChunks = splitByCharacters(chunk.text, maxSize, 200);
      subChunks.forEach((sc, i) => {
        finalResult.push({
          text: sc.text,
          heading: i === 0 ? chunk.heading : `${chunk.heading} (cont.)`,
        });
      });
    } else {
      finalResult.push(chunk);
    }
  }

  return finalResult;
}

/**
 * Formats raw chunks into TextChunk objects with context headers.
 */
function formatChunks(
  rawChunks: RawChunk[],
  documentTitle: string,
  splitMethod: 'heading' | 'page' | 'character',
): TextChunk[] {
  const total = rawChunks.length;

  return rawChunks.map((chunk, i) => ({
    index: i + 1,
    total,
    text: chunk.text,
    contextHeader: buildContextHeader(documentTitle, i + 1, total, chunk.heading, splitMethod),
    splitMethod,
  }));
}

/**
 * Builds a context header that's prepended to each chunk so the LLM
 * understands its position within the larger document.
 */
function buildContextHeader(
  title: string,
  chunkIndex: number,
  totalChunks: number,
  sectionHeading: string | undefined,
  method: string,
): string {
  const parts = [
    `Document: "${title}"`,
    `Chunk ${chunkIndex} of ${totalChunks}`,
  ];

  if (sectionHeading) {
    parts.push(`Section: "${sectionHeading}"`);
  }

  if (chunkIndex > 1) {
    parts.push('Continue extracting lessons from the previous chunk context');
  }

  if (chunkIndex < totalChunks) {
    parts.push('More content follows in subsequent chunks');
  }

  return parts.join(' | ');
}

// ────────────────────────────────────────────────────────────────────────────
// Merge results from multiple chunks
// ────────────────────────────────────────────────────────────────────────────

interface MergeableResult {
  title: string;
  description: string;
  lessons: Array<{
    title: string;
    description: string;
    blocks: Array<{
      type: string;
      order: number;
      content: Record<string, unknown>;
      metadata: Record<string, unknown>;
    }>;
  }>;
}

/**
 * Merges extraction results from multiple chunks into a single result.
 * Deduplicates lessons by title similarity and renumbers orders.
 */
export function mergeChunkResults(results: MergeableResult[]): MergeableResult {
  if (results.length === 0) {
    return { title: 'Empty Extraction', description: '', lessons: [] };
  }

  if (results.length === 1) {
    return results[0];
  }

  // Use the first chunk's title and description as the base
  const merged: MergeableResult = {
    title: results[0].title || 'Extracted Module',
    description: results[0].description || '',
    lessons: [],
  };

  const seenTitles = new Set<string>();

  for (const result of results) {
    for (const lesson of result.lessons) {
      // Deduplicate by normalized title
      const normalizedTitle = lesson.title.toLowerCase().trim().replace(/\s+/g, ' ');

      if (seenTitles.has(normalizedTitle)) {
        // Merge blocks into existing lesson instead of creating a duplicate
        const existingLesson = merged.lessons.find(
          l => l.title.toLowerCase().trim().replace(/\s+/g, ' ') === normalizedTitle
        );
        if (existingLesson && lesson.blocks?.length) {
          const nextOrder = existingLesson.blocks.length;
          for (const block of lesson.blocks) {
            existingLesson.blocks.push({
              ...block,
              order: nextOrder + (block.order || 0),
            });
          }
        }
      } else {
        seenTitles.add(normalizedTitle);
        merged.lessons.push({ ...lesson });
      }
    }
  }

  // Renumber lesson block orders sequentially
  for (const lesson of merged.lessons) {
    lesson.blocks.forEach((block, idx) => {
      block.order = idx;
    });
  }

  // Update description with merge info
  merged.description = `${merged.description} [Merged from ${results.length} chunk(s), ${merged.lessons.length} lesson(s) total]`.trim();

  return merged;
}
