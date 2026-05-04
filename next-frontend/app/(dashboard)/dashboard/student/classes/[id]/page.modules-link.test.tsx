import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  SVGProps,
} from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentClassDetailPage from './page';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { schoolEventService } from '@/services/school-event-service';
import { discussionBoardService } from '@/services/discussion-board-service';

let currentView = 'modules';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'class-1' }),
  useSearchParams: () => ({ get: (key: string) => (key === 'view' ? currentView : null) }),
}));

jest.mock('framer-motion', () => ({
  __esModule: true,
  motion: {
    section: ({ children, ...props }: HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>,
    article: ({ children, ...props }: HTMLAttributes<HTMLElement>) => <article {...props}>{children}</article>,
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: (props: ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => {
      const domProps = { ...props } as Record<string, unknown>;
      delete domProps.children;
      delete domProps.whileTap;
      delete domProps.whileHover;
      delete domProps.variants;
      delete domProps.initial;
      delete domProps.animate;
      delete domProps.transition;
      return <button {...(domProps as ButtonHTMLAttributes<HTMLButtonElement>)}>{props.children}</button>;
    },
    circle: (props: SVGProps<SVGCircleElement>) => <circle {...props} />,
  },
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

const subscribeMock = jest.fn();
let notificationSubscriber:
  | ((notification: { type: string; referenceId?: string | null }) => void)
  | null = null;

jest.mock('@/providers/NotificationProvider', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getById: jest.fn(),
    getByStudent: jest.fn(),
  },
}));

jest.mock('@/services/module-service', () => ({
  moduleService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/assessment-service', () => ({
  assessmentService: {
    getByClass: jest.fn(),
    getStudentAttempts: jest.fn(),
  },
}));

jest.mock('@/services/announcement-service', () => ({
  announcementService: {
    getByClass: jest.fn(),
  },
}));

jest.mock('@/services/school-event-service', () => ({
  schoolEventService: {
    getAll: jest.fn(),
  },
}));

jest.mock('@/services/discussion-board-service', () => ({
  discussionBoardService: {
    listThreads: jest.fn(),
    getThread: jest.fn(),
    createComment: jest.fn(),
    uploadCommentImage: jest.fn(),
    deleteComment: jest.fn(),
    setReaction: jest.fn(),
    removeReaction: jest.fn(),
  },
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;
const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedModuleService = moduleService as jest.Mocked<typeof moduleService>;
const mockedAssessmentService = assessmentService as jest.Mocked<typeof assessmentService>;
const mockedAnnouncementService = announcementService as jest.Mocked<typeof announcementService>;
const mockedSchoolEventService = schoolEventService as jest.Mocked<typeof schoolEventService>;
const mockedDiscussionBoardService = discussionBoardService as jest.Mocked<typeof discussionBoardService>;

describe('StudentClassDetailPage module links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentView = 'modules';
    notificationSubscriber = null;
    subscribeMock.mockImplementation((handler) => {
      notificationSubscriber = handler;
      return () => {
        if (notificationSubscriber === handler) {
          notificationSubscriber = null;
        }
      };
    });
    mockedUseAuth.mockReturnValue({
      role: 'student',
      user: { id: 'student-1', firstName: 'Jamie', lastName: 'Cruz' },
    } as ReturnType<typeof useAuth>);
    mockedUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      loading: false,
      fetchNotifications: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      subscribe: subscribeMock,
    } as ReturnType<typeof useNotifications>);

    mockedClassService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'class-1',
        subjectName: 'Mathematics',
        subjectCode: 'MATH',
        sectionId: 'section-1',
        teacherId: 'teacher-1',
        schoolYear: '2025-2026',
        isActive: true,
        section: { id: 'section-1', name: 'Rizal', gradeLevel: '10' },
        teacher: { id: 'teacher-1', firstName: 'Jamie', lastName: 'Cruz' },
        enrollments: [],
        schedules: [],
      },
    } as Awaited<ReturnType<typeof classService.getById>>);
    mockedClassService.getByStudent.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    } as Awaited<ReturnType<typeof classService.getByStudent>>);

    mockedModuleService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      count: 1,
      data: [
        {
          id: 'module-1',
          classId: 'class-1',
          title: 'Module One',
          description: 'Desc',
          order: 1,
          isVisible: true,
          isLocked: false,
          sections: [],
          gradingScaleEntries: [],
        },
      ],
    } as Awaited<ReturnType<typeof moduleService.getByClass>>);

    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
      count: 0,
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    } as Awaited<ReturnType<typeof assessmentService.getByClass>>);
    mockedAnnouncementService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
      count: 0,
    } as Awaited<ReturnType<typeof announcementService.getByClass>>);
    mockedSchoolEventService.getAll.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
    } as Awaited<ReturnType<typeof schoolEventService.getAll>>);
    mockedDiscussionBoardService.listThreads.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { items: [], page: 1, limit: 50, total: 0 },
    } as Awaited<ReturnType<typeof discussionBoardService.listThreads>>);
    mockedDiscussionBoardService.getThread.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'thread-1',
        classId: 'class-1',
        authorId: 'teacher-1',
        title: 'Reminder',
        bodyHtml: '<p>Reply here.</p>',
        themeId: 'default',
        commentLimitPerStudent: null,
        allowComments: true,
        isPinned: false,
        status: 'published',
        publishedAt: '2026-04-10T08:00:00.000Z',
        closedAt: null,
        createdAt: '2026-04-10T08:00:00.000Z',
        updatedAt: '2026-04-10T08:00:00.000Z',
        commentCount: 0,
        attachments: [],
        comments: [],
      },
    } as Awaited<ReturnType<typeof discussionBoardService.getThread>>);
    mockedDiscussionBoardService.createComment.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'comment-created',
        threadId: 'thread-1',
        authorId: 'student-1',
        bodyHtml: '<p>Hello</p>',
        createdAt: '2026-04-10T09:00:00.000Z',
        updatedAt: '2026-04-10T09:00:00.000Z',
        canDelete: true,
        reactions: { like: 0, heart: 0, wow: 0, total: 0, userReaction: null, reactors: [] },
        attachments: [],
      },
    } as Awaited<ReturnType<typeof discussionBoardService.createComment>>);
    mockedDiscussionBoardService.uploadCommentImage.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { id: 'upload-1' },
    } as Awaited<ReturnType<typeof discussionBoardService.uploadCommentImage>>);
    mockedDiscussionBoardService.setReaction.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        commentId: 'comment-1',
        reactions: { like: 1, heart: 0, wow: 0, total: 1, userReaction: 'like', reactors: [] },
      },
    } as Awaited<ReturnType<typeof discussionBoardService.setReaction>>);
    mockedDiscussionBoardService.removeReaction.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        commentId: 'comment-1',
        reactions: { like: 0, heart: 0, wow: 0, total: 0, userReaction: null, reactors: [] },
      },
    } as Awaited<ReturnType<typeof discussionBoardService.removeReaction>>);
  });

  it('routes module card open link to student module detail page', async () => {
    render(<StudentClassDetailPage />);

    const openLink = await screen.findByRole('link', { name: 'Open' });
    expect(openLink).toHaveAttribute(
      'href',
      '/dashboard/student/classes/class-1/modules/module-1',
    );

    const bodyLink = await screen.findByRole('link', { name: 'Open Module One module' });
    expect(bodyLink).toHaveAttribute(
      'href',
      '/dashboard/student/classes/class-1/modules/module-1',
    );
  });

  it('does not render a fallback description when a module has no description', async () => {
    mockedModuleService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      count: 1,
      data: [
        {
          id: 'module-1',
          classId: 'class-1',
          title: 'Module One',
          order: 1,
          isVisible: true,
          isLocked: false,
          sections: [],
          gradingScaleEntries: [],
        },
      ],
    } as Awaited<ReturnType<typeof moduleService.getByClass>>);

    render(<StudentClassDetailPage />);

    await screen.findByRole('link', { name: 'Open' });
    expect(
      screen.queryByText('Extended learning and higher-order thinking activities.'),
    ).not.toBeInTheDocument();
  });

  it('renders manual and backend-gated copied template assignments returned by the API', async () => {
    currentView = 'assignments';
    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'manual-assessment-1',
          classId: 'class-1',
          title: 'Manual Essay',
          type: 'assignment',
          totalPoints: 20,
          isPublished: true,
          questions: [],
        },
        {
          id: 'core-assessment-1',
          classId: 'class-1',
          title: 'Given Core Quiz',
          type: 'quiz',
          totalPoints: 10,
          isPublished: true,
          isCoreTemplateAsset: true,
          questions: [],
        },
      ],
      count: 2,
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    } as Awaited<ReturnType<typeof assessmentService.getByClass>>);
    mockedAssessmentService.getStudentAttempts.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
      count: 0,
    } as Awaited<ReturnType<typeof assessmentService.getStudentAttempts>>);

    render(<StudentClassDetailPage />);

    expect(await screen.findByText('Manual Essay')).toBeInTheDocument();
    expect(screen.getByText('Given Core Quiz')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manual Essay/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Given Core Quiz/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Take' })).not.toBeInTheDocument();
  });

  it('groups assignments into upcoming, past due, and completed tabs with student status tags', async () => {
    currentView = 'assignments';
    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'assessment-upcoming',
          classId: 'class-1',
          title: 'Future Quiz',
          type: 'quiz',
          totalPoints: 20,
          maxAttempts: 1,
          dueDate: '2099-04-10T00:00:00.000Z',
          isPublished: true,
          questions: [],
        },
        {
          id: 'assessment-past',
          classId: 'class-1',
          title: 'Old Seatwork',
          type: 'assignment',
          totalPoints: 15,
          maxAttempts: 1,
          dueDate: '2000-04-10T00:00:00.000Z',
          isPublished: true,
          questions: [],
        },
        {
          id: 'assessment-completed',
          classId: 'class-1',
          title: 'Submitted Lab',
          type: 'performance_task',
          totalPoints: 25,
          maxAttempts: 1,
          dueDate: '2099-04-12T00:00:00.000Z',
          isPublished: true,
          questions: [],
        },
        {
          id: 'assessment-out',
          classId: 'class-1',
          title: 'Used Quiz',
          type: 'quiz',
          totalPoints: 10,
          maxAttempts: 1,
          dueDate: '2099-04-14T00:00:00.000Z',
          isPublished: true,
          questions: [],
        },
      ],
      count: 4,
      total: 4,
      page: 1,
      limit: 20,
      totalPages: 1,
    } as Awaited<ReturnType<typeof assessmentService.getByClass>>);
    mockedAssessmentService.getStudentAttempts
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [],
        count: 0,
      } as Awaited<ReturnType<typeof assessmentService.getStudentAttempts>>)
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [],
        count: 0,
      } as Awaited<ReturnType<typeof assessmentService.getStudentAttempts>>)
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [
          {
            id: 'attempt-1',
            assessmentId: 'assessment-completed',
            studentId: 'student-1',
            score: 23,
            totalPoints: 25,
            isSubmitted: true,
            isReturned: true,
            submittedAt: '2099-04-11T10:00:00.000Z',
            updatedAt: '2099-04-11T10:00:00.000Z',
            createdAt: '2099-04-11T09:00:00.000Z',
          },
        ],
        count: 1,
      } as Awaited<ReturnType<typeof assessmentService.getStudentAttempts>>)
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [
          {
            id: 'attempt-2',
            assessmentId: 'assessment-out',
            studentId: 'student-1',
            score: 6,
            totalPoints: 10,
            isSubmitted: true,
            isReturned: false,
            submittedAt: '2099-04-13T10:00:00.000Z',
            updatedAt: '2099-04-13T10:00:00.000Z',
            createdAt: '2099-04-13T09:00:00.000Z',
          },
        ],
        count: 1,
      } as Awaited<ReturnType<typeof assessmentService.getStudentAttempts>>);

    render(<StudentClassDetailPage />);

    expect(await screen.findByText('Future Quiz')).toBeInTheDocument();
    expect(screen.queryByText('Old Seatwork')).not.toBeInTheDocument();
    expect(screen.queryByText('Submitted Lab')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Past Due' }));
    expect(await screen.findByText('Old Seatwork')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
    expect(await screen.findByText('Submitted Lab')).toBeInTheDocument();
    expect(screen.getAllByText('Graded').length).toBeGreaterThan(0);
    expect(screen.getByText('Used Quiz')).toBeInTheDocument();
    expect(screen.getAllByText('Out of Attempts').length).toBeGreaterThan(0);
  });

  it('does not render JA as an embedded class surface', async () => {
    render(<StudentClassDetailPage />);

    expect(await screen.findByRole('link', { name: 'Open' })).toBeInTheDocument();
    expect(screen.queryByText('Study support for this class')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ask JA/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Practice with JA/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /^JA Hub$/i }),
    ).not.toBeInTheDocument();
  });

  it('supports module card and long-card view switch with persistence', async () => {
    render(<StudentClassDetailPage />);

    const gridButton = await screen.findByRole('button', { name: 'Grid View' });
    const wideButton = await screen.findByRole('button', { name: 'Wide Card View' });

    expect(wideButton).toHaveAttribute('data-active', 'true');
    fireEvent.click(gridButton);

    expect(gridButton).toHaveAttribute('data-active', 'true');
    expect(window.localStorage.getItem('nexora.student.class.modules.view.class-1')).toBe(
      'card',
    );
  });

  it('opens the class page guide, walks through each page, and closes it', async () => {
    render(<StudentClassDetailPage />);

    fireEvent.click(await screen.findByRole('button', { name: /class page help/i }));

    expect(await screen.findByText('Student guide: Class Page')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 7')).toBeInTheDocument();
    expect(screen.getByText('Start here on the class page')).toBeInTheDocument();
    expect(screen.getByText('Class tabs')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 2 of 7')).toBeInTheDocument();
    expect(screen.getByText('Open modules to study step by step')).toBeInTheDocument();
    expect(screen.getByText('View switch')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 3 of 7')).toBeInTheDocument();
    expect(screen.getByText('Use assignments to find class work fast')).toBeInTheDocument();
    expect(screen.getByText('Assignment row')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 4 of 7')).toBeInTheDocument();
    expect(screen.getByText('Check updates and join class discussions')).toBeInTheDocument();
    expect(screen.getByText('Discussion thread')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 5 of 7')).toBeInTheDocument();
    expect(screen.getByText('Use classmates when you need names and section info')).toBeInTheDocument();
    expect(screen.getByText('Student row')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 6 of 7')).toBeInTheDocument();
    expect(screen.getByText('Read grades as your class record snapshot')).toBeInTheDocument();
    expect(screen.getByText('Ledger row')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 7 of 7')).toBeInTheDocument();
    expect(screen.getByText('Use the class calendar for due dates and events')).toBeInTheDocument();
    expect(screen.getByText('Kind tag')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
    expect(screen.getByText('Page 6 of 7')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close guide/i }));
    await waitFor(() => {
      expect(screen.queryByText('Student guide: Class Page')).not.toBeInTheDocument();
    });
  });

  it('renders classmate names and emails from enriched enrollments', async () => {
    currentView = 'classmates';
    mockedClassService.getById.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'class-1',
        subjectName: 'Mathematics',
        subjectCode: 'MATH',
        sectionId: 'section-1',
        teacherId: 'teacher-1',
        schoolYear: '2025-2026',
        subjectGradeLevel: '10',
        isActive: true,
        section: { id: 'section-1', name: 'Rizal', gradeLevel: '10' },
        teacher: { id: 'teacher-1', firstName: 'Jamie', lastName: 'Cruz' },
        enrollments: [
          {
            id: 'enrollment-1',
            studentId: 'student-1',
            classId: 'class-1',
            student: {
              id: 'student-1',
              firstName: 'Liam',
              lastName: 'Navarro',
              email: 'student71@lms.local',
            },
          },
          {
            id: 'enrollment-2',
            studentId: 'student-2',
            classId: 'class-1',
            student: {
              id: 'student-2',
              firstName: 'Mia',
              lastName: 'Villanueva',
              email: 'student72@lms.local',
            },
          },
        ],
        schedules: [],
      },
    } as Awaited<ReturnType<typeof classService.getById>>);

    render(<StudentClassDetailPage />);

    expect(await screen.findByText('Liam Navarro')).toBeInTheDocument();
    expect(screen.getByText('student71@lms.local')).toBeInTheDocument();
    expect(screen.getByText('Mia Villanueva')).toBeInTheDocument();
    expect(screen.getByText('student72@lms.local')).toBeInTheDocument();
    expect(screen.queryByText('Unnamed student')).not.toBeInTheDocument();
  });

  it('renders the discussion thread feed with attachments, reactions, and plain reply composer', async () => {
    currentView = 'discussion';
    mockedDiscussionBoardService.listThreads.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        items: [
          {
            id: 'thread-1',
            classId: 'class-1',
            authorId: 'teacher-1',
            title: 'Lab reflection',
            bodyHtml: '<p>Share what surprised you in today&apos;s activity.</p>',
            themeId: 'default',
            commentLimitPerStudent: null,
            allowComments: true,
            isPinned: true,
            status: 'published',
            publishedAt: '2026-04-10T08:00:00.000Z',
            closedAt: null,
            createdAt: '2026-04-10T08:00:00.000Z',
            updatedAt: '2026-04-10T08:00:00.000Z',
            author: {
              id: 'teacher-1',
              firstName: 'Jamie',
              lastName: 'Cruz',
              profilePicture: '/api/profiles/images/teacher.png',
            },
            commentCount: 1,
            attachments: [
              {
                id: 'thread-file-1',
                type: 'image',
                originalName: 'experiment.jpg',
                mimeType: 'image/jpeg',
                inlineUrl: '/api/files/experiment.jpg',
              },
            ],
          },
        ],
        page: 1,
        limit: 50,
        total: 1,
      },
    } as Awaited<ReturnType<typeof discussionBoardService.listThreads>>);

    mockedDiscussionBoardService.getThread.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'thread-1',
        classId: 'class-1',
        authorId: 'teacher-1',
        title: 'Lab reflection',
        bodyHtml: '<p>Share what surprised you in today&apos;s activity.</p>',
        themeId: 'default',
        commentLimitPerStudent: null,
        allowComments: true,
        isPinned: true,
        status: 'published',
        publishedAt: '2026-04-10T08:00:00.000Z',
        closedAt: null,
        createdAt: '2026-04-10T08:00:00.000Z',
        updatedAt: '2026-04-10T08:00:00.000Z',
        author: {
          id: 'teacher-1',
          firstName: 'Jamie',
          lastName: 'Cruz',
          profilePicture: '/api/profiles/images/teacher.png',
        },
        commentCount: 1,
        attachments: [
          {
            id: 'thread-file-1',
            type: 'image',
            originalName: 'experiment.jpg',
            mimeType: 'image/jpeg',
            inlineUrl: '/api/files/experiment.jpg',
          },
        ],
        comments: [
          {
            id: 'comment-1',
            threadId: 'thread-1',
            authorId: 'student-1',
            bodyHtml: '<p>I liked the volcano part.</p>',
            createdAt: '2026-04-10T09:00:00.000Z',
            updatedAt: '2026-04-10T09:00:00.000Z',
            canDelete: true,
            author: {
              id: 'student-1',
              firstName: 'Jamie',
              lastName: 'Cruz',
              profilePicture: '/api/profiles/images/student.png',
            },
            reactions: {
              like: 0,
              heart: 0,
              wow: 0,
              total: 0,
              userReaction: null,
              reactors: [],
            },
            attachments: [
              {
                id: 'comment-file-1',
                type: 'image',
                originalName: 'notes.png',
                mimeType: 'image/png',
                inlineUrl: '/api/files/notes.png',
              },
            ],
          },
        ],
      },
    } as Awaited<ReturnType<typeof discussionBoardService.getThread>>);

    render(<StudentClassDetailPage />);

    expect(await screen.findByText('Lab reflection')).toBeInTheDocument();
    expect(screen.getByText('experiment.jpg')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Thread' }));

    expect(await screen.findByText('Post a reply')).toBeInTheDocument();
    expect(screen.getAllByText('Jamie Cruz').length).toBeGreaterThan(0);
    expect(screen.getByText('notes.png')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Write your comment...')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Like reaction' }));
    await waitFor(() => {
      expect(mockedDiscussionBoardService.setReaction).toHaveBeenCalledWith(
        'class-1',
        'thread-1',
        'comment-1',
        'like',
      );
    });

    fireEvent.change(screen.getByPlaceholderText('Write a respectful reply...'), {
      target: { value: 'First line\nSecond line' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Post Comment/i }));

    await waitFor(() => {
      expect(mockedDiscussionBoardService.createComment).toHaveBeenCalledWith(
        'class-1',
        'thread-1',
        expect.objectContaining({
          bodyHtml: '<p>First line<br />Second line</p>',
        }),
      );
    });
  });

  it('disables the reply composer when the student reached the thread comment limit', async () => {
    currentView = 'discussion';
    mockedDiscussionBoardService.listThreads.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        items: [
          {
            id: 'thread-1',
            classId: 'class-1',
            authorId: 'teacher-1',
            title: 'Quick check-in',
            bodyHtml: '<p>Share one takeaway from the lesson.</p>',
            themeId: 'default',
            commentLimitPerStudent: 1,
            allowComments: true,
            isPinned: false,
            status: 'published',
            publishedAt: '2026-04-10T08:00:00.000Z',
            closedAt: null,
            createdAt: '2026-04-10T08:00:00.000Z',
            updatedAt: '2026-04-10T08:00:00.000Z',
            author: {
              id: 'teacher-1',
              firstName: 'Jamie',
              lastName: 'Cruz',
              profilePicture: '/api/profiles/images/teacher.png',
            },
            commentCount: 1,
            attachments: [],
          },
        ],
        page: 1,
        limit: 50,
        total: 1,
      },
    } as Awaited<ReturnType<typeof discussionBoardService.listThreads>>);

    mockedDiscussionBoardService.getThread.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'thread-1',
        classId: 'class-1',
        authorId: 'teacher-1',
        title: 'Quick check-in',
        bodyHtml: '<p>Share one takeaway from the lesson.</p>',
        themeId: 'default',
        commentLimitPerStudent: 1,
        allowComments: true,
        isPinned: false,
        status: 'published',
        publishedAt: '2026-04-10T08:00:00.000Z',
        closedAt: null,
        createdAt: '2026-04-10T08:00:00.000Z',
        updatedAt: '2026-04-10T08:00:00.000Z',
        commentCount: 1,
        author: {
          id: 'teacher-1',
          firstName: 'Jamie',
          lastName: 'Cruz',
          profilePicture: '/api/profiles/images/teacher.png',
        },
        attachments: [],
        comments: [
          {
            id: 'comment-1',
            threadId: 'thread-1',
            authorId: 'student-1',
            bodyHtml: '<p>My answer is already posted.</p>',
            createdAt: '2026-04-10T09:00:00.000Z',
            updatedAt: '2026-04-10T09:00:00.000Z',
            canDelete: true,
            author: {
              id: 'student-1',
              firstName: 'Jamie',
              lastName: 'Cruz',
              profilePicture: '/api/profiles/images/student.png',
            },
            reactions: {
              like: 0,
              heart: 0,
              wow: 0,
              total: 0,
              userReaction: null,
              reactors: [],
            },
            attachments: [],
          },
        ],
      },
    } as Awaited<ReturnType<typeof discussionBoardService.getThread>>);

    render(<StudentClassDetailPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Open Thread' }));

    expect(await screen.findByText('Comment limit reached')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Write a respectful reply...')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Post Comment/i })).toBeDisabled();
  });

  it('renders the grades tab as a compact gradebook table', async () => {
    currentView = 'grades';
    mockedAssessmentService.getByClass.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'assessment-1',
          classId: 'class-1',
          title: 'Seatwork 1',
          type: 'assignment',
          totalPoints: 20,
          dueDate: '2026-04-10T00:00:00.000Z',
          isPublished: true,
          questions: [],
        },
        {
          id: 'assessment-2',
          classId: 'class-1',
          title: 'Performance Task 1',
          type: 'performance_task',
          totalPoints: 40,
          dueDate: '2026-04-12T00:00:00.000Z',
          isPublished: true,
          questions: [],
        },
        {
          id: 'assessment-3',
          classId: 'class-1',
          title: 'Quarter Exam',
          type: 'quarterly_assessment',
          totalPoints: 50,
          dueDate: '2026-04-15T00:00:00.000Z',
          isPublished: true,
          questions: [],
        },
      ],
      count: 3,
      total: 3,
      page: 1,
      limit: 20,
      totalPages: 1,
    } as Awaited<ReturnType<typeof assessmentService.getByClass>>);
    mockedAssessmentService.getStudentAttempts
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [
          {
            id: 'attempt-1',
            assessmentId: 'assessment-1',
            studentId: 'student-1',
            score: 18,
            totalPoints: 20,
            isSubmitted: true,
            submittedAt: '2026-04-10T10:00:00.000Z',
            updatedAt: '2026-04-10T10:00:00.000Z',
            createdAt: '2026-04-10T09:00:00.000Z',
          },
        ],
        count: 1,
      } as Awaited<ReturnType<typeof assessmentService.getStudentAttempts>>)
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [
          {
            id: 'attempt-2',
            assessmentId: 'assessment-2',
            studentId: 'student-1',
            score: 34,
            totalPoints: 40,
            isSubmitted: true,
            submittedAt: '2026-04-12T10:00:00.000Z',
            updatedAt: '2026-04-12T10:00:00.000Z',
            createdAt: '2026-04-12T09:00:00.000Z',
          },
        ],
        count: 1,
      } as Awaited<ReturnType<typeof assessmentService.getStudentAttempts>>)
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: [],
        count: 0,
      } as Awaited<ReturnType<typeof assessmentService.getStudentAttempts>>);

    render(<StudentClassDetailPage />);

    expect(await screen.findByText('Gradebook')).toBeInTheDocument();
    expect(screen.getByText('Item Name')).toBeInTheDocument();
    expect(screen.getByText('Due Date')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Grade')).toBeInTheDocument();
    expect(screen.getAllByText('Graded').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not graded').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'View' })).toHaveLength(3);
    expect(screen.queryByText('Class Record Snapshot')).not.toBeInTheDocument();
  });

  it('refetches the open discussion thread when a matching realtime notification arrives', async () => {
    currentView = 'discussion';
    mockedDiscussionBoardService.listThreads.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        items: [
          {
            id: 'thread-1',
            classId: 'class-1',
            authorId: 'teacher-1',
            title: 'Reminder',
            bodyHtml: '<p>Reply here.</p>',
            themeId: 'default',
            commentLimitPerStudent: null,
            allowComments: true,
            isPinned: false,
            status: 'published',
            publishedAt: '2026-04-10T08:00:00.000Z',
            closedAt: null,
            createdAt: '2026-04-10T08:00:00.000Z',
            updatedAt: '2026-04-10T08:00:00.000Z',
            commentCount: 0,
            attachments: [],
            author: {
              id: 'teacher-1',
              firstName: 'Jamie',
              lastName: 'Cruz',
              email: 'teacher@example.com',
            },
          },
        ],
        page: 1,
        limit: 50,
        total: 1,
      },
    } as Awaited<ReturnType<typeof discussionBoardService.listThreads>>);

    render(<StudentClassDetailPage />);

    expect(await screen.findByText('Discussion Board')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /open thread/i }));

    await waitFor(() => {
      expect(mockedDiscussionBoardService.getThread).toHaveBeenCalledWith(
        'class-1',
        'thread-1',
      );
    });

    expect(subscribeMock).toHaveBeenCalled();
    notificationSubscriber?.({
      type: 'discussion_comment_posted',
      referenceId: 'thread-other',
    });

    await waitFor(() => {
      expect(mockedDiscussionBoardService.getThread).toHaveBeenCalledTimes(1);
      expect(mockedDiscussionBoardService.listThreads).toHaveBeenCalledTimes(1);
    });

    notificationSubscriber?.({
      type: 'discussion_comment_posted',
      referenceId: 'thread-1',
    });

    await waitFor(() => {
      expect(mockedDiscussionBoardService.getThread).toHaveBeenCalledTimes(2);
      expect(mockedDiscussionBoardService.listThreads).toHaveBeenCalledTimes(2);
    });
  });
});
