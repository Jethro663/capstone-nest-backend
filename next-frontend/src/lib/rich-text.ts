import DOMPurify from 'dompurify';

export type RichTextHtml = string & { readonly __richTextHtmlBrand: unique symbol };

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

export function plainTextToRichHtml(input: string): RichTextHtml {
  const text = input.trim();
  if (!text) return '' as RichTextHtml;
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
    .join('') as RichTextHtml;
}
