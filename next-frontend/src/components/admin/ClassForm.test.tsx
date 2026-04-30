'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClassForm, { createEmptyClassForm } from './ClassForm';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock('@/services/class-service', () => ({
  classService: {
    getBySection: jest.fn().mockResolvedValue({ data: [] }),
  },
}));

jest.mock('@/components/admin/ScheduleCalendarCreator', () => ({
  ScheduleCalendarCreator: () => <div data-testid="schedule-calendar" />,
}));

const mockedToast = toast as jest.Mocked<typeof toast>;

describe('ClassForm', () => {
  const baseProps = {
    sections: [
      {
        id: 'section-1',
        name: 'Grade 7 - Rizal',
        gradeLevel: '7',
        schoolYear: '2026-2027',
        capacity: 40,
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
  });

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

    fireEvent.click(screen.getByRole('button', { name: 'Create Class' }));

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        'Room and at least one schedule slot are required',
      ),
    );
    expect(baseProps.onSubmit).not.toHaveBeenCalled();
  });

  it('sanitizes subject code and room before submit', async () => {
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
          room: '',
          schedules: [{ days: ['M'], startTime: '08:00', endTime: '09:00' }],
        }}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. MATH-7'), {
      target: { value: ' math-7 / rm🙂 ' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Room 201'), {
      target: { value: ' Room #201/<A>🙂 ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Class' }));

    await waitFor(() =>
      expect(baseProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectCode: 'MATH-7RM',
          room: 'Room #201/A',
        }),
      ),
    );
  });
});
