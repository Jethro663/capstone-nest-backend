/**
 * Rule-Based Module Extractor — Fallback when Ollama is offline.
 *
 * Splits raw PDF text into structured lesson content blocks using
 * deterministic heuristics (regex patterns, paragraph boundaries).
 *
 * Produces the same JSON shape as the Ollama-based extraction so
 * downstream code (review UI, apply endpoint) works identically.
 *
 * This is NOT an @Injectable — it's a pure utility function.
 */

// ────────────────────────────────────────────────────────────────────────────
// Types (matches the Ollama output contract)
// ────────────────────────────────────────────────────────────────────────────

export interface ExtractedBlock {
  type: 'text' | 'question' | 'divider';
  order: number;
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ExtractedLesson {
  title: string;
  description: string;
  blocks: ExtractedBlock[];
}

export interface ExtractionResult {
  title: string;
  description: string;
  lessons: ExtractedLesson[];
}

// ────────────────────────────────────────────────────────────────────────────
// Heading / section detection patterns
// ────────────────────────────────────────────────────────────────────────────

/**
 * Matches common DepEd-module / textbook section markers:
 *   "Lesson 1: Introduction"
 *   "CHAPTER 3 — Fractions"
 *   "Module 2: Data Handling"
 *   "I. Objectives"
 *   "A. Motivation"
 */
const HEADING_RE =
  /^(?:(?:lesson|chapter|module|unit|topic|part)\s*\d*\s*[:\-–—.]\s*(.+)|([IVXLCDM]+\.\s+.+)|([A-Z]\.\s+.+))/im;

/** Matches quiz / test question patterns like  "1. What is…?"  or  "1) …" */
const QUESTION_LINE_RE = /^\s*\d+[.)]\s+.+\??\s*$/;

/** Matches multiple-choice options like  "A) …"  "a. …"  "(a) …" */
const OPTION_RE = /^\s*[\(\[]?[a-dA-D][.):\]]\s*.+/;

// ────────────────────────────────────────────────────────────────────────────
// Main extraction function
// ────────────────────────────────────────────────────────────────────────────

export function extractWithRules(rawText: string): ExtractionResult {
  // ── 1. Normalise whitespace ────────────────────────────────────────────
  const cleaned = rawText
    .replace(/\r\n/g, '\n')        // Windows → Unix line endings
    .replace(/\f/g, '\n\n')        // form-feed (PDF page breaks) → double newline
    .replace(/[ \t]+/g, ' ')       // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n');   // max two consecutive newlines

  // ── 2. Split into sections by heading patterns ─────────────────────────
  const lines = cleaned.split('\n');

  interface RawSection {
    heading: string;
    bodyLines: string[];
  }

  const sections: RawSection[] = [];
  let current: RawSection = { heading: 'Untitled Section', bodyLines: [] };

  for (const line of lines) {
    const match = HEADING_RE.exec(line.trim());
    if (match) {
      // Push previous section if it has content
      if (current.bodyLines.length > 0) {
        sections.push(current);
      }
      current = {
        heading: (match[1] || match[2] || match[3] || line).trim(),
        bodyLines: [],
      };
    } else {
      current.bodyLines.push(line);
    }
  }
  // Push the last section
  if (current.bodyLines.length > 0) {
    sections.push(current);
  }

  // If no headings were detected, treat the entire text as one section
  if (sections.length === 0) {
    sections.push({ heading: 'Extracted Content', bodyLines: lines });
  }

  // ── 3. Convert sections → lessons with content blocks ──────────────────
  const lessons: ExtractedLesson[] = sections.map((section) => {
    const blocks = buildBlocks(section.bodyLines);
    return {
      title: section.heading,
      description: '',
      blocks,
    };
  });

  // ── 4. Derive a top-level title from the first non-empty line ──────────
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || 'Extracted Module';

  return {
    title: firstNonEmpty.trim().substring(0, 200),
    description: `Auto-extracted (rule-based) from PDF — ${sections.length} section(s) detected.`,
    lessons,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Converts an array of body lines into ordered content blocks.
 *
 * Strategy:
 *  1. Accumulate consecutive text lines into a single `text` block.
 *  2. When a question pattern is detected, flush the text block and start
 *     accumulating question + option lines into a `question` block.
 *  3. Insert a `divider` between large content gaps (double blank lines).
 */
function buildBlocks(bodyLines: string[]): ExtractedBlock[] {
  const blocks: ExtractedBlock[] = [];
  let order = 0;
  let textBuffer: string[] = [];
  let questionBuffer: string[] = [];
  let inQuestion = false;

  const flushText = () => {
    const joined = textBuffer.join('\n').trim();
    if (joined.length > 0) {
      blocks.push({
        type: 'text',
        order: order++,
        content: { text: joined },
        metadata: { source: 'rule-based' },
      });
    }
    textBuffer = [];
  };

  const flushQuestion = () => {
    const joined = questionBuffer.join('\n').trim();
    if (joined.length > 0) {
      blocks.push({
        type: 'question',
        order: order++,
        content: { text: joined },
        metadata: { source: 'rule-based', detectedAs: 'question-pattern' },
      });
    }
    questionBuffer = [];
    inQuestion = false;
  };

  for (const line of bodyLines) {
    const trimmed = line.trim();

    // Blank line → potential divider / section break
    if (trimmed.length === 0) {
      if (inQuestion) {
        flushQuestion();
      }
      continue; // We don't insert a divider for every blank line — only between headings
    }

    // Detect question line
    if (QUESTION_LINE_RE.test(trimmed)) {
      if (!inQuestion) {
        flushText(); // Flush any accumulated text before the question
      }
      inQuestion = true;
      questionBuffer.push(trimmed);
      continue;
    }

    // Detect option line (belongs to current question)
    if (inQuestion && OPTION_RE.test(trimmed)) {
      questionBuffer.push(trimmed);
      continue;
    }

    // If we were in a question but this line is regular text, flush the question
    if (inQuestion) {
      flushQuestion();
    }

    // Regular text line
    textBuffer.push(trimmed);
  }

  // Flush remaining buffers
  if (inQuestion) {
    flushQuestion();
  }
  flushText();

  return blocks;
}
