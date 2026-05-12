import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PptxDeckViewer } from './PptxDeckViewer';
import { parsePptxSlides } from '@/lib/pptx-viewer';

jest.mock('@/lib/pptx-viewer', () => ({
  parsePptxSlides: jest.fn(),
}));

const mockedParsePptxSlides = parsePptxSlides as jest.MockedFunction<
  typeof parsePptxSlides
>;

describe('PptxDeckViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedParsePptxSlides.mockResolvedValue([
      {
        slideNumber: 1,
        title: 'Opening',
        lines: ['Opening', 'Welcome class'],
      },
      {
        slideNumber: 2,
        title: 'Activity',
        lines: ['Activity', 'Solve the problem'],
      },
    ]);
  });

  it('navigates slides with controls, thumbnails, and keyboard arrows', async () => {
    render(
      <PptxDeckViewer
        title="Quarter Deck"
        loadFile={() => Promise.resolve(new Blob(['pptx']))}
        onDownload={jest.fn()}
      />,
    );

    expect(await screen.findAllByText('Opening')).not.toHaveLength(0);
    expect(screen.getByText('Slide 1 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getAllByText('Activity')).not.toHaveLength(0);
    expect(screen.getByText('Slide 2 of 2')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getAllByText('Opening')).not.toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Open slide 2' }));
    expect(screen.getAllByText('Activity')).not.toHaveLength(0);
  });

  it('requests fullscreen and keeps download available', async () => {
    const requestFullscreen = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    });
    const onDownload = jest.fn();

    render(
      <PptxDeckViewer
        title="Quarter Deck"
        loadFile={() => Promise.resolve(new Blob(['pptx']))}
        onDownload={onDownload}
      />,
    );

    await screen.findAllByText('Opening');
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    await waitFor(() => expect(requestFullscreen).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Download deck/i }));
    expect(onDownload).toHaveBeenCalled();
  });
});
