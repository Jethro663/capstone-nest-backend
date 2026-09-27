import { render, screen } from '@testing-library/react';
import { useDiscussionAttachmentObjectUrl } from '@/hooks/use-discussion-attachment-object-url';
import { AuthenticatedDiscussionImageLink } from './AuthenticatedDiscussionImageLink';

jest.mock('@/hooks/use-discussion-attachment-object-url', () => ({
  useDiscussionAttachmentObjectUrl: jest.fn(),
}));

const mockedUseDiscussionAttachmentObjectUrl =
  useDiscussionAttachmentObjectUrl as jest.MockedFunction<
    typeof useDiscussionAttachmentObjectUrl
  >;

const protectedUrl =
  '/api/classes/class-1/discussion-threads/thread-1/attachments/file-1/inline';

describe('AuthenticatedDiscussionImageLink', () => {
  it('keeps the protected route out of image and link markup while loading', () => {
    mockedUseDiscussionAttachmentObjectUrl.mockReturnValue({
      objectUrl: null,
      loading: true,
      failed: false,
    });

    const { container } = render(
      <AuthenticatedDiscussionImageLink
        sourceUrl={protectedUrl}
        alt="screenshot.png"
        sizes="160px"
        className="card"
        previewClassName="preview"
      >
        <span>screenshot.png</span>
      </AuthenticatedDiscussionImageLink>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading image…');
    expect(container.querySelector('a')).not.toHaveAttribute('href');
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain(protectedUrl);
  });

  it('uses the authenticated object URL for both the image and click target', () => {
    mockedUseDiscussionAttachmentObjectUrl.mockReturnValue({
      objectUrl: 'blob:discussion-image',
      loading: false,
      failed: false,
    });

    render(
      <AuthenticatedDiscussionImageLink
        sourceUrl={protectedUrl}
        alt="screenshot.png"
        sizes="160px"
        className="card"
        previewClassName="preview"
      >
        <span>screenshot.png</span>
      </AuthenticatedDiscussionImageLink>,
    );

    expect(screen.getByRole('link', { name: /screenshot\.png/i })).toHaveAttribute(
      'href',
      'blob:discussion-image',
    );
    expect(screen.getByRole('img', { name: 'screenshot.png' })).toHaveAttribute(
      'src',
      'blob:discussion-image',
    );
  });

  it('shows an explicit unavailable state without a broken image or active link', () => {
    mockedUseDiscussionAttachmentObjectUrl.mockReturnValue({
      objectUrl: null,
      loading: false,
      failed: true,
    });

    const { container } = render(
      <AuthenticatedDiscussionImageLink
        sourceUrl={protectedUrl}
        alt="screenshot.png"
        sizes="160px"
        className="card"
        previewClassName="preview"
      >
        <span>screenshot.png</span>
      </AuthenticatedDiscussionImageLink>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Image unavailable');
    expect(container.querySelector('a')).not.toHaveAttribute('href');
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});
