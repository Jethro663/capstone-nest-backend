'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClassForm, { createEmptyClassForm } from './ClassForm';
import { toast } from 'sonner';
import { classService } from '@/services/class-service';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getAll: jest.fn().mockResolvedValue({ data: { data: [] } }),
  },
}));

jest.mock('@/components/admin/ScheduleCalendarCreator', () => ({
  ScheduleCalendarCreator: () => <div data-testid="schedule-calendar" />,
}));

const mockedToast = toast as jest.Mocked<typeof toast>;

describe('ClassForm', () => {
  const baseProps: Omit<
    React.ComponentProps<typeof ClassForm>,
    'initialValues'
  > = {
    sections: [
      {
        id: 'section-1',
        name: 'Grade 7 - Rizal',
        gradeLevel: '7',
        schoolYear: '2026-2027',
        capacity: 40,
        roomNumber: '201',
        isActive: true,
      },
    ],
    teachers: [
      {
        id: 'teacher-1',
        firstName: 'Tina',
        lastName: 'Teacher',
        email: 'teacher@nexora.edu',
        roles: ['teacher'],
        status: 'ACTIVE',
        isEmailVerified: true,
      },
    ],
    schoolYears: ['2026-2027'],
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    submitLabel: 'Create Class',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (classService.getAll as jest.Mock).mockResolvedValue({
      data: { data: [] },
    });
  });

  const waitForClassLookups = async (expectedCalls = 2) => {
    await waitFor(() =>
      expect(classService.getAll).toHaveBeenCalledTimes(expectedCalls),
    );
    await waitFor(() => {
      expect(
        screen.queryByText(
          /Checking subjects already assigned to this section/i,
        ),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          /Checking teachers already assigned to this section/i,
        ),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Checking room/i)).not.toBeInTheDocument();
    });
  };

  it('blocks saving when room or schedule is missing', async () => {
    render(
      <ClassForm
        {...baseProps}
        initialValues={{
          ...createEmptyClassForm('2026-2027'),
          subjectName: 'Mathematics',
          subjectCode: 'MATH-7',
          subjectGradeLevel: '7',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          room: '',
          schedules: [],
        }}
      />,
    );
    await waitForClassLookups();

    fireEvent.click(screen.getByRole('button', { name: 'Create Class' }));

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        'Select a room and at least one schedule slot',
      ),
    );
    expect(baseProps.onSubmit).not.toHaveBeenCalled();
  });

  it('sanitizes subject code and submits selected room before submit', async () => {
    render(
      <ClassForm
        {...baseProps}
        initialValues={{
          ...createEmptyClassForm('2026-2027'),
          subjectName: 'Mathematics',
          subjectCode: '',
          subjectGradeLevel: '7',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          room: '201',
          schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
        }}
      />,
    );
    await waitForClassLookups(1);

    fireEvent.change(screen.getByPlaceholderText('e.g. MATH-7'), {
      target: { value: ' math-7 / rm@ ' },
    });
    await waitForClassLookups();

    fireEvent.click(screen.getByRole('button', { name: 'Create Class' }));

    await waitFor(() =>
      expect(baseProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectCode: 'MATH-7RM',
          room: '201',
        }),
      ),
    );
  });

  it('disables grading inputs by default and enables them after Edit Grade', async () => {
    render(
      <ClassForm
        {...baseProps}
        showGradingProfile
        initialValues={{
          ...createEmptyClassForm('2026-2027'),
          subjectName: 'Mathematics',
          subjectCode: 'MATH-7',
          subjectGradeLevel: '7',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          room: '201',
          schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
          gradingProfile: {
            writtenWork: 50,
            performanceTask: 20,
            quarterlyAssessment: 40,
          },
        }}
      />,
    );
    await waitForClassLookups();

    const writtenWorkInput = screen.getByRole('textbox', {
      name: 'Written Works',
    });
    const performanceTaskInput = screen.getByRole('textbox', {
      name: 'Performance Tasks',
    });
    const quarterlyAssessmentInput = screen.getByRole('textbox', {
      name: 'Quarterly Assessment',
    });

    expect(writtenWorkInput).toBeDisabled();
    expect(performanceTaskInput).toBeDisabled();
    expect(quarterlyAssessmentInput).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Grade' }));

    expect(writtenWorkInput).toBeEnabled();
    expect(performanceTaskInput).toBeEnabled();
    expect(quarterlyAssessmentInput).toBeEnabled();
  });

  it('rejects leading zeros, non-digit input, and three-digit inputs', async () => {
    render(
      <ClassForm
        {...baseProps}
        showGradingProfile
        initialValues={{
          ...createEmptyClassForm('2026-2027'),
          subjectName: 'Mathematics',
          subjectCode: 'MATH-7',
          subjectGradeLevel: '7',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          room: '201',
          schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
          gradingProfile: {
            writtenWork: 30,
            performanceTask: 30,
            quarterlyAssessment: 50,
          },
        }}
      />,
    );
    await waitForClassLookups();

    const writtenWorkInput = screen.getByRole('textbox', {
      name: 'Written Works',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Edit Grade' }));
    fireEvent.change(writtenWorkInput, { target: { value: '0' } });
    expect(writtenWorkInput).toHaveValue('0');

    fireEvent.change(writtenWorkInput, { target: { value: '01' } });
    expect(writtenWorkInput).toHaveValue('1');

    fireEvent.change(writtenWorkInput, { target: { value: 'ABC' } });
    expect(writtenWorkInput).toHaveValue('1');

    fireEvent.change(writtenWorkInput, { target: { value: '123' } });
    expect(writtenWorkInput).toHaveValue('1');
  });

  it('allows clearing the first digit and replacing the grading number', async () => {
    render(
      <ClassForm
        {...baseProps}
        showGradingProfile
        initialValues={{
          ...createEmptyClassForm('2026-2027'),
          subjectName: 'Mathematics',
          subjectCode: 'MATH-7',
          subjectGradeLevel: '7',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          room: '201',
          schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
          gradingProfile: {
            writtenWork: 50,
            performanceTask: 20,
            quarterlyAssessment: 30,
          },
        }}
      />,
    );
    await waitForClassLookups();

    const writtenWorkInput = screen.getByRole('textbox', {
      name: 'Written Works',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Edit Grade' }));
    fireEvent.change(writtenWorkInput, { target: { value: '' } });
    expect(writtenWorkInput).toHaveValue('');
    fireEvent.change(writtenWorkInput, { target: { value: '40' } });
    expect(writtenWorkInput).toHaveValue('40');
  });

  it('rejects totals above 100 and only enables saving at exact total', async () => {
    render(
      <ClassForm
        {...baseProps}
        showGradingProfile
        initialValues={{
          ...createEmptyClassForm('2026-2027'),
          subjectName: 'Mathematics',
          subjectCode: 'MATH-7',
          subjectGradeLevel: '7',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          room: '201',
          schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
          gradingProfile: {
            writtenWork: 30,
            performanceTask: 50,
            quarterlyAssessment: 20,
          },
        }}
      />,
    );
    await waitForClassLookups();

    const writtenWorkInput = screen.getByRole('textbox', {
      name: 'Written Works',
    });
    const performanceTaskInput = screen.getByRole('textbox', {
      name: 'Performance Tasks',
    });
    const quarterlyAssessmentInput = screen.getByRole('textbox', {
      name: 'Quarterly Assessment',
    });
    const createButton = screen.getByRole('button', { name: 'Create Class' });

    fireEvent.click(screen.getByRole('button', { name: 'Edit Grade' }));
    const saveGradingButton = screen.getByRole('button', {
      name: 'Save Grading',
    });

    fireEvent.change(writtenWorkInput, { target: { value: '99' } });
    expect(writtenWorkInput).toHaveValue('30');

    fireEvent.change(writtenWorkInput, { target: { value: '20' } });
    fireEvent.change(performanceTaskInput, { target: { value: '99' } });
    expect(performanceTaskInput).toHaveValue('50');

    fireEvent.change(performanceTaskInput, { target: { value: '40' } });
    fireEvent.change(quarterlyAssessmentInput, { target: { value: '40' } });

    expect(writtenWorkInput).toHaveValue('20');
    expect(performanceTaskInput).toHaveValue('40');
    expect(quarterlyAssessmentInput).toHaveValue('40');
    expect(saveGradingButton).toBeEnabled();
    expect(createButton).toBeDisabled();

    fireEvent.click(saveGradingButton);
    expect(writtenWorkInput).toBeDisabled();
    expect(performanceTaskInput).toBeDisabled();
    expect(quarterlyAssessmentInput).toBeDisabled();
    expect(createButton).toBeEnabled();
  });

  it('does not allow class submission while grading editor is unlocked or invalid', async () => {
    render(
      <ClassForm
        {...baseProps}
        showGradingProfile
        initialValues={{
          ...createEmptyClassForm('2026-2027'),
          subjectName: 'Mathematics',
          subjectCode: 'MATH-7',
          subjectGradeLevel: '7',
          sectionId: 'section-1',
          teacherId: 'teacher-1',
          room: '201',
          schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
          gradingProfile: {
            writtenWork: 30,
            performanceTask: 50,
            quarterlyAssessment: 20,
          },
        }}
      />,
    );
    await waitForClassLookups();

    const performanceTaskInput = screen.getByRole('textbox', {
      name: 'Performance Tasks',
    });
    const createButton = screen.getByRole('button', { name: 'Create Class' });

    expect(createButton).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Grade' }));
    expect(createButton).toBeDisabled();

    fireEvent.change(performanceTaskInput, { target: { value: '35' } });
    expect(createButton).toBeDisabled();
  });

  it('disables subjects and teachers already assigned to the selected section', async () => {
    (classService.getAll as jest.Mock).mockImplementation(
      async (query?: { sectionId?: string }) => {
        if (query?.sectionId === 'section-1') {
          return {
            data: {
              data: [
                {
                  id: 'class-existing',
                  subjectName: 'Science',
                  subjectCode: 'SCI-7',
                  subjectGradeLevel: '7',
                  sectionId: 'section-1',
                  teacherId: 'teacher-1',
                  schoolYear: '2026-2027',
                  room: '201',
                  isActive: true,
                },
              ],
            },
          };
        }

        return { data: { data: [] } };
      },
    );

    render(
      <ClassForm
        {...baseProps}
        teachers={[
          ...baseProps.teachers,
          {
            id: 'teacher-2',
            firstName: 'Rico',
            lastName: 'Ramos',
            email: 'rico@nexora.edu',
            roles: ['teacher'],
            status: 'ACTIVE',
            isEmailVerified: true,
          },
        ]}
        initialValues={{
          ...createEmptyClassForm('2026-2027'),
          subjectGradeLevel: '7',
          sectionId: 'section-1',
          room: '201',
        }}
      />,
    );

    await waitForClassLookups(1);

    await waitFor(() =>
      expect(
        screen.getByRole('option', {
          name: 'Science (already in this section)',
        }),
      ).toBeDisabled(),
    );

    expect(screen.getByRole('option', { name: 'Mathematics' })).toBeEnabled();
    expect(
      screen.getByRole('option', {
        name: 'Tina Teacher (already assigned in this section)',
      }),
    ).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Rico Ramos' })).toBeEnabled();
    expect(
      screen.getByText('1 subject is already assigned here and disabled.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('1 teacher is already assigned here and disabled.'),
    ).toBeInTheDocument();
  });
});
