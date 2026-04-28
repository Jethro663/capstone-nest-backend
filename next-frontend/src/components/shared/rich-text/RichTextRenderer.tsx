'use client';

import { cn } from '@/utils/cn';
import { normalizeRichText } from '@/lib/rich-text';

interface RichTextRendererProps {
  html: string;
  className?: string;
}

export function RichTextRenderer({ html, className }: RichTextRendererProps) {
  const safeHtml = normalizeRichText(html);

  return (
    <div
      className={cn('rich-text-renderer', className)}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
