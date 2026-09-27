'use client';

import { render, screen } from '@testing-library/react';
import EditClassPage from './page';
import { classService } from '@/services/class-service';
import { sectionService } from '@/services/section-service';
import { userService } from '@/services/user-service';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'class-1' }),
  useRouter: () => ({ push }),
}));

jest.mock('@/services/class-service', () => ({
  classService: { getById: jest.fn(), update: jest.fn() },
}));

jest.mock('@/services/section-service', () => ({
  sectionService: { getAll: jest.fn() },
}));

jest.mock('@/services/user-service', () => ({
  userService: { getAll: jest.fn() },
}));

jest.mock('@/components/admin/ClassForm', () => {
  const actual = jest.requireActual('@/components/admin/ClassForm');
  return {
    ...actual,
    __esModule: true,
    default: ({ layout }: { layout?: string }) => (
      <div data-testid="class-form" data-layout={layout}>Class editor</div>
    ),
  };
});

describe('EditClassPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(classService.getById).mockResolvedValue({
      success: true,
      message: 'Class loaded',
      data: {
        id: 'class-1',
        subjectName: 'Mathematics',
        subjectCode: 'MATH-7',
        subjectGradeLevel: '7',
        sectionId: 'section-1',
        teacherId: 'teacher-1',
        schoolYear: '2026-2027',
        room: '201',
        isActive: true,
      },
    });
    jest.mocked(sectionService.getAll).mockResolvedValue({
      success: true,
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    jest.mocked(userService.getAll).mockResolvedValue({
      success: true,
      users: [],
      page: 1,
      limit: 200,
      total: 0,
      totalPages: 0,
    });
  });

  it('opts the existing class form into its sectioned editor layout', async () => {
    render(<EditClassPage />);

    expect(await screen.findByRole('heading', { name: 'Edit Mathematics' })).toBeInTheDocument();
    expect(screen.getByTestId('class-form')).toHaveAttribute('data-layout', 'sectioned');
  });
});
