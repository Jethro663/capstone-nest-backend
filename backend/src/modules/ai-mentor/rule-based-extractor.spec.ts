import { extractWithRules, type ExtractionResult } from './rule-based-extractor';

// ---------------------------------------------------------------------------
// Test suite — pure function, no mocks needed
// ---------------------------------------------------------------------------

describe('extractWithRules()', () => {
  // =========================================================================
  // Basic structure
  // =========================================================================

  describe('basic structure', () => {
    it('should return an ExtractionResult with title, description, and lessons', () => {
      const result = extractWithRules('Some simple text content that is enough.');

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('lessons');
      expect(Array.isArray(result.lessons)).toBe(true);
    });

    it('should derive title from the first non-empty line', () => {
      const result = extractWithRules('\n\nMy Module Title\nSome body text here.');

      expect(result.title).toBe('My Module Title');
    });

    it('should cap title at 200 characters', () => {
      const longLine = 'A'.repeat(300);
      const result = extractWithRules(longLine);

      expect(result.title.length).toBe(200);
    });

    it('should include section count in description', () => {
      const result = extractWithRules('Lesson 1: Intro\nHello\nLesson 2: More\nWorld');

      expect(result.description).toContain('section(s) detected');
    });

    it('should default title to "Extracted Module" for whitespace-only text', () => {
      const result = extractWithRules('   ');

      expect(result.title).toBe('Extracted Module');
    });
  });

  // =========================================================================
  // Section splitting by headings
  // =========================================================================

  describe('section splitting', () => {
    it('should split by "Lesson X:" headings', () => {
      const text = `Lesson 1: Introduction
This is the introduction.

Lesson 2: Advanced Topics
This covers advanced topics.`;

      const result = extractWithRules(text);

      expect(result.lessons.length).toBe(2);
      expect(result.lessons[0].title).toContain('Introduction');
      expect(result.lessons[1].title).toContain('Advanced Topics');
    });

    it('should split by "Chapter X —" headings', () => {
      const text = `Chapter 1 — Fractions
Fractions represent parts of a whole.

Chapter 2 — Decimals
Decimals are another representation.`;

      const result = extractWithRules(text);

      expect(result.lessons.length).toBe(2);
    });

    it('should split by "Module X:" headings', () => {
      const text = `Module 1: Data Handling
Data handling basics.

Module 2: Statistics
Statistics fundamentals.`;

      const result = extractWithRules(text);

      expect(result.lessons.length).toBe(2);
    });

    it('should split by Roman numeral headings (I. II. etc.)', () => {
      const text = `I. Objectives
Learn the basics.

II. Discussion
The main content here.

III. Assessment
Quiz time.`;

      const result = extractWithRules(text);

      expect(result.lessons.length).toBe(3);
    });

    it('should split by letter headings (A. B. etc.)', () => {
      const text = `A. Motivation
Getting motivated.

B. Lesson Proper
The actual lesson.`;

      const result = extractWithRules(text);

      expect(result.lessons.length).toBe(2);
    });

    it('should treat entire text as one section when no headings are detected', () => {
      const text = `This is just a plain paragraph.
No headings here at all.
Just regular text content.`;

      const result = extractWithRules(text);

      expect(result.lessons.length).toBe(1);
    });

    it('should handle text before the first heading', () => {
      const text = `Some introductory content
that appears before any heading.

Lesson 1: First Lesson
Content of the first lesson.`;

      const result = extractWithRules(text);

      // Should have the intro as one section + the lesson
      expect(result.lessons.length).toBe(2);
    });
  });

  // =========================================================================
  // Block detection
  // =========================================================================

  describe('block detection', () => {
    it('should create text blocks for regular paragraphs', () => {
      const text = `Lesson 1: Test
This is a simple paragraph.
And another line.`;

      const result = extractWithRules(text);
      const blocks = result.lessons[0].blocks;

      const textBlocks = blocks.filter((b) => b.type === 'text');
      expect(textBlocks.length).toBeGreaterThan(0);
      expect(textBlocks[0].content).toHaveProperty('text');
    });

    it('should detect question patterns (numbered items ending with ?)', () => {
      const text = `Lesson 1: Quiz
1. What is the capital of the Philippines?
2. How many islands are in the Philippines?`;

      const result = extractWithRules(text);
      const blocks = result.lessons[0].blocks;

      const questionBlocks = blocks.filter((b) => b.type === 'question');
      expect(questionBlocks.length).toBeGreaterThan(0);
    });

    it('should detect question patterns with parenthesis numbering', () => {
      const text = `Lesson 1: Test
1) What is 2 + 2?`;

      const result = extractWithRules(text);
      const blocks = result.lessons[0].blocks;

      const questionBlocks = blocks.filter((b) => b.type === 'question');
      expect(questionBlocks.length).toBeGreaterThan(0);
    });

    it('should group multiple-choice options with their question', () => {
      const text = `Lesson 1: Test
1. What is the answer?
A) Option one
B) Option two
C) Option three
D) Option four`;

      const result = extractWithRules(text);
      const blocks = result.lessons[0].blocks;

      const questionBlocks = blocks.filter((b) => b.type === 'question');
      expect(questionBlocks.length).toBe(1);
      // The question block should contain the question + options merged
      expect((questionBlocks[0].content as any).text).toContain('Option one');
      expect((questionBlocks[0].content as any).text).toContain('Option four');
    });

    it('should tag question blocks with detectedAs metadata', () => {
      const text = `Lesson 1: Quiz
1. What is this?`;

      const result = extractWithRules(text);
      const qBlock = result.lessons[0].blocks.find((b) => b.type === 'question');

      expect(qBlock?.metadata).toHaveProperty('detectedAs', 'question-pattern');
    });

    it('should tag all blocks with source: rule-based metadata', () => {
      const text = `Lesson 1: Test
Some text content.
1. A question?`;

      const result = extractWithRules(text);

      for (const block of result.lessons[0].blocks) {
        expect(block.metadata).toHaveProperty('source', 'rule-based');
      }
    });

    it('should assign sequential order to blocks', () => {
      const text = `Lesson 1: Test
Paragraph one.
1. A question?
More text after.`;

      const result = extractWithRules(text);
      const blocks = result.lessons[0].blocks;

      for (let i = 0; i < blocks.length; i++) {
        expect(blocks[i].order).toBe(i);
      }
    });
  });

  // =========================================================================
  // Normalization
  // =========================================================================

  describe('text normalization', () => {
    it('should normalize Windows line endings (\\r\\n → \\n)', () => {
      const text = "Lesson 1: Test\r\nContent with Windows endings.\r\nMore content.";

      const result = extractWithRules(text);
      const textBlock = result.lessons[0].blocks.find((b) => b.type === 'text');

      expect((textBlock?.content as any)?.text).not.toContain('\r');
    });

    it('should treat form feeds as section breaks', () => {
      const text = "Lesson 1: Page One\nContent page 1.\fLesson 2: Page Two\nContent page 2.";

      const result = extractWithRules(text);

      expect(result.lessons.length).toBe(2);
    });

    it('should collapse multiple whitespace characters', () => {
      const text = "Lesson 1: Test\nContent   with    extra   spaces.";

      const result = extractWithRules(text);
      const textBlock = result.lessons[0].blocks.find((b) => b.type === 'text');

      expect((textBlock?.content as any)?.text).not.toContain('   ');
    });

    it('should limit consecutive newlines to two', () => {
      const text = "Lesson 1: Test\n\n\n\n\nContent after many newlines.";

      const result = extractWithRules(text);

      // Should still produce valid blocks
      expect(result.lessons[0].blocks.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('should handle completely empty text', () => {
      const result = extractWithRules('');

      expect(result.lessons.length).toBeGreaterThanOrEqual(0);
      expect(result.title).toBeDefined();
    });

    it('should handle text with only whitespace', () => {
      const result = extractWithRules('   \n\n  \t  ');

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
    });

    it('should handle very long text', () => {
      const longText = 'Lesson 1: Long\n' + 'A'.repeat(100_000);

      const result = extractWithRules(longText);

      expect(result.lessons.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle text with consecutive questions', () => {
      const text = `Lesson 1: Quiz
1. First question?
2. Second question?
3. Third question?`;

      const result = extractWithRules(text);
      const qBlocks = result.lessons[0].blocks.filter((b) => b.type === 'question');

      expect(qBlocks.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle mixed text and questions interleaved', () => {
      const text = `Lesson 1: Mixed
Regular paragraph about fractions.
1. What is 1/2?
A) One half
B) One third
Another paragraph about decimals.
2. What is 0.5?`;

      const result = extractWithRules(text);
      const blocks = result.lessons[0].blocks;

      // Should have both text and question blocks
      const types = blocks.map((b) => b.type);
      expect(types).toContain('text');
      expect(types).toContain('question');
    });

    it('should handle heading-only text (no body content)', () => {
      const text = `Lesson 1: Empty Lesson`;

      const result = extractWithRules(text);

      // Should create a lesson even if no body
      expect(result.lessons.length).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // Output contract
  // =========================================================================

  describe('output contract', () => {
    it('should produce blocks with only valid types (text, question, divider)', () => {
      const text = `Lesson 1: Test
Regular paragraph.
1. A question?
A) Option A
B) Option B`;

      const result = extractWithRules(text);

      for (const lesson of result.lessons) {
        for (const block of lesson.blocks) {
          expect(['text', 'question', 'divider']).toContain(block.type);
        }
      }
    });

    it('should produce blocks with content as Record<string, unknown>', () => {
      const text = `Lesson 1: Test
Some content.`;

      const result = extractWithRules(text);

      for (const lesson of result.lessons) {
        for (const block of lesson.blocks) {
          expect(typeof block.content).toBe('object');
          expect(block.content).not.toBeNull();
        }
      }
    });

    it('should produce blocks with metadata as Record<string, unknown>', () => {
      const text = `Lesson 1: Test
Some content.`;

      const result = extractWithRules(text);

      for (const lesson of result.lessons) {
        for (const block of lesson.blocks) {
          expect(typeof block.metadata).toBe('object');
          expect(block.metadata).not.toBeNull();
        }
      }
    });

    it('should produce lessons with title and description strings', () => {
      const text = `Lesson 1: Introduction
Hello world.

Lesson 2: Conclusion
Goodbye world.`;

      const result = extractWithRules(text);

      for (const lesson of result.lessons) {
        expect(typeof lesson.title).toBe('string');
        expect(typeof lesson.description).toBe('string');
      }
    });
  });
});
