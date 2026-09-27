'use client';

import Image from 'next/image';
import type { MouseEvent, ReactNode } from 'react';
import { useDiscussionAttachmentObjectUrl } from '@/hooks/use-discussion-attachment-object-url';

export interface AuthenticatedDiscussionImageLinkProps {
  sourceUrl: string;
  alt: string;
  sizes: string;
  className: string;
  previewClassName: string;
  children: ReactNode;
}

export function AuthenticatedDiscussionImageLink({
  sourceUrl,
  alt,
  sizes,
  className,
  previewClassName,
  children,
}: AuthenticatedDiscussionImageLinkProps) {
  const { objectUrl, loading, failed } =
    useDiscussionAttachmentObjectUrl(sourceUrl);

  const preventUnavailableNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!objectUrl) {
      event.preventDefault();
    }
  };

  return (
    <a
      href={objectUrl ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={className}
      aria-busy={loading || undefined}
      aria-disabled={!objectUrl || undefined}
      onClick={preventUnavailableNavigation}
    >
      <div className={previewClassName}>
        {objectUrl ? (
          <Image src={objectUrl} alt={alt} fill unoptimized sizes={sizes} />
        ) : (
          <span
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs font-semibold"
          >
            {failed ? 'Image unavailable' : 'Loading image…'}
          </span>
        )}
      </div>
      {children}
    </a>
  );
}
