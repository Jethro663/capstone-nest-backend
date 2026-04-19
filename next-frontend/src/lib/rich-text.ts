import DOMPurify from 'dompurify';

export type RichTextHtml = string & { readonly __richTextHtmlBrand: unique symbol };
const RICH_TEXT_TAG_PATTERN = /<[a-z][\s\S]*?>/i;

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'a',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'code',
  'pre',
  'span',
  'hr',
] as const;

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'] as const;

function sanitizeHref(href: string) {
  const value = href.trim();
  if (!value) return null;
  if (value.startsWith('#') || value.startsWith('/')) return value;
  const lower = value.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:')
  ) {
    return value;
  }
  return null;
}

function sanitizeServerFallback(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .trim();
}

export function sanitizeRichTextHtml(input: string): RichTextHtml {
  if (!input) return '' as RichTextHtml;
  if (typeof window === 'undefined') {
    return sanitizeServerFallback(input) as RichTextHtml;
  }

  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
    ALLOW_DATA_ATTR: false,
  });

  const parser = new window.DOMParser();
  const parsed = parser.parseFromString(`<div>${sanitized}</div>`, 'text/html');
  const root = parsed.body.firstElementChild as HTMLElement | null;
  if (!root) return '' as RichTextHtml;

  root.querySelectorAll('a').forEach((anchor) => {
    const href = sanitizeHref(anchor.getAttribute('href') || '');
    if (!href) {
      anchor.removeAttribute('href');
      anchor.removeAttribute('target');
      anchor.removeAttribute('rel');
      return;
    }
    anchor.setAttribute('href', href);
    if (href.startsWith('http://') || href.startsWith('https://')) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    } else {
      anchor.removeAttribute('target');
      anchor.removeAttribute('rel');
    }
  });

  return root.innerHTML.trim() as RichTextHtml;
}

function stripText(html: string) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s/g, '');
}

export function normalizeRichText(value: string): RichTextHtml {
  const text = value.trim();
  if (!text) return '' as RichTextHtml;

  if (RICH_TEXT_TAG_PATTERN.test(text)) {
    const cleaned = sanitizeRichTextHtml(text);
    return stripText(cleaned) ? cleaned : '' as RichTextHtml;
  }

  return plainTextToRichHtml(text);
}

export function plainTextToRichHtml(input: string): RichTextHtml {
  const text = input.trim();
  if (!text) return '' as RichTextHtml;

  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = escaped.split('\n');
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(`<p>${paragraph.join('<br />')}</p>`);
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const headingMatch = line.match(/^\s*(#{1,3})\s+(.*)$/);
    const unorderedMatch = line.match(/^\s*(?:[-*+])\s+(.*)$/);
    const orderedMatch = line.match(/^\s*(?:\d+[.)])\s+(.*)$/);

    if (headingMatch) {
      const headingText = headingMatch[2].trim();
      const headingLevel = headingMatch[1].length;
      flushParagraph();
      if (headingText) {
        blocks.push(`<h${headingLevel}>${headingText}</h${headingLevel}>`);
      }
      continue;
    }

    if (unorderedMatch) {
      flushParagraph();
      listItems = [unorderedMatch[1]];
      while (index + 1 < lines.length) {
        const nextLine = lines[index + 1];
        const nextMatch = nextLine.match(/^\s*(?:[-*+])\s+(.*)$/);
        if (!nextMatch) break;
        index += 1;
        listItems.push(nextMatch[1]);
      }
      blocks.push(
        `<ul>${listItems.map((item) => `<li>${item}</li>`).join('')}</ul>`,
      );
      listItems = [];
      continue;
    }

    if (orderedMatch) {
      flushParagraph();
      listItems = [orderedMatch[1]];
      while (index + 1 < lines.length) {
        const nextLine = lines[index + 1];
        const nextMatch = nextLine.match(/^\s*(?:\d+[.)])\s+(.*)$/);
        if (!nextMatch) break;
        index += 1;
        listItems.push(nextMatch[1]);
      }
      blocks.push(
        `<ol>${listItems.map((item) => `<li>${item}</li>`).join('')}</ol>`,
      );
      listItems = [];
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();

  return blocks.join('') as RichTextHtml;
}
