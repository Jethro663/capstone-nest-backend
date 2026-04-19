import type { IOptions as SanitizeOptions } from 'sanitize-html';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sanitizeHtml = require('sanitize-html') as (
  dirty: string,
  options?: SanitizeOptions,
) => string;

const RTF_SANITIZE_CONFIG: SanitizeOptions = {
  allowedTags: [
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
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    span: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
};

export function sanitizeRichTextHtml(input: string): string {
  if (!input) return '';
  return sanitizeHtml(input, RTF_SANITIZE_CONFIG).trim();
}

