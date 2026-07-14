import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { StudentLessonReaderPanel } from './StudentLessonReaderPanel';

const baseProps: ComponentProps<typeof StudentLessonReaderPanel> = {
  classItem: {
    id: 'class-1',
    subjectName: 'Mathematics',
    subjectCode: 'MATH-7',
    subjectGradeLevel: '7',
    sectionId: 'section-1',
    section: { id: 'section-1', name: 'Newton', gradeLevel: '7' },
    teacherId: 'teacher-1',
    teacher: { id: 'teacher-1', firstName: 'Maria', lastName: 'Santos' },
    schoolYear: '2026-2027',
    isActive: true,
  },
  module: {
    id: 'module-1',
    classId: 'class-1',
    title: 'Module 1: Ratios',
    order: 1,
    isVisible: true,
    isLocked: false,
    requiredCompletedCount: 1,
    requiredVisibleCount: 2,
    progressPercent: 50,
    sections: [],
    gradingScaleEntries: [],
  },
  lesson: {
    id: 'lesson-1',
    classId: 'class-1',
    title: 'Fractions and ratios',
    description: '<p>Compare two quantities using a ratio.</p>',
    order: 1,
    isDraft: false,
    contentBlocks: [],
  },
  lessonBlocks: [],
  lessonLoading: false,
  lessonCompleted: false,
  completingLesson: false,
  bottomReachedAt: null,
  countdownLeft: 30,
  checkpointGate: { ready: true, correct: 0, total: 0 },
  checkpointSelections: {},
  checkpointResults: {},
  lessonAttachments: [],
  lessonPoints: 10,
  backHref: '/dashboard/student/courses',
  backLabel: 'Back',
  inlineBackLabel: 'Back to Module',
  onInlineBack: jest.fn(),
  onCompleteLesson: jest.fn(),
  onCheckpointAnswer: jest.fn(),
  onDownloadAttachment: jest.fn(),
};

function renderReader(overrides: Partial<ComponentProps<typeof StudentLessonReaderPanel>> = {}) {
  return render(<StudentLessonReaderPanel {...baseProps} {...overrides} />);
}

describe('StudentLessonReaderPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('puts the lesson title and course context first with semantic available facts', () => {
    const { container } = renderReader();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Fractions and ratios' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Mathematics · Grade 7 - Newton - Maria Santos'),
    ).toBeInTheDocument();

    const details = screen.getByLabelText('Lesson details');
    expect(within(details).getByText('Module')).toBeInTheDocument();
    expect(within(details).getByText('Module 1: Ratios')).toBeInTheDocument();
    expect(within(details).getByText('Availability')).toBeInTheDocument();
    expect(within(details).getByText('Available')).toBeInTheDocument();
    expect(within(details).getByText('Required progress')).toBeInTheDocument();
    expect(within(details).getByText('1 of 2 complete')).toBeInTheDocument();
    expect(within(details).getByText('Overall progress')).toBeInTheDocument();
    expect(within(details).getByText('50%')).toBeInTheDocument();
    expect(details.querySelectorAll('dt')).toHaveLength(4);
    expect(details.querySelectorAll('dd')).toHaveLength(4);

    expect(screen.queryByText('M1')).not.toBeInTheDocument();
    expect(container.querySelector('.student-module-view__pill')).not.toBeInTheDocument();
    expect(container.querySelector('.student-module-view__meta')).not.toBeInTheDocument();
  });

  it('keeps a sparse draft lesson truthful without inventing module facts or filler panels', () => {
    const { container } = renderReader({
      classItem: null,
      module: null,
      lesson: {
        id: 'lesson-sparse',
        classId: 'class-1',
        title: 'Short teacher note',
        order: 2,
        isDraft: true,
        contentBlocks: [],
      },
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Short teacher note' })).toBeInTheDocument();
    expect(screen.getByText('No lesson content available.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Attachments' })).not.toBeInTheDocument();

    const details = screen.getByLabelText('Lesson details');
    expect(within(details).getByText('Availability')).toBeInTheDocument();
    expect(within(details).getByText('Draft')).toBeInTheDocument();
    expect(details.querySelectorAll('dt')).toHaveLength(1);
    expect(details.querySelectorAll('dd')).toHaveLength(1);
    expect(container.querySelectorAll('.student-module-view__reader')).toHaveLength(1);
  });

  it('preserves attachments, download actions, and the completed lesson footer', () => {
    const onDownloadAttachment = jest.fn();
    renderReader({
      lessonCompleted: true,
      lessonPoints: 12,
      onDownloadAttachment,
      lessonAttachments: [
        {
          id: 'attachment-1',
          moduleSectionId: 'section-1',
          itemType: 'file',
          fileId: 'file-1',
          order: 2,
          isVisible: true,
          isRequired: false,
          isGiven: true,
          file: {
            id: 'file-1',
            originalName: 'ratio-guide.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1200,
            scope: 'private',
          },
        },
      ],
    });

    expect(screen.getByRole('heading', { name: 'Attachments' })).toBeInTheDocument();
    expect(screen.getByText('ratio-guide.pdf')).toBeInTheDocument();
    expect(screen.getByText('application/pdf')).toBeInTheDocument();
    expect(screen.getByText('Completed - +12 pts awarded')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(onDownloadAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'attachment-1' }),
    );
  });
});
