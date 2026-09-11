'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import SectionForm, { createEmptySectionForm } from './SectionForm';

let demoModeActive = false;

jest.mock('@/providers/AdminDemoModeProvider', () => ({
  useAdminDemoMode: () => ({
    status: demoModeActive
      ? {
          active: true,
          relaxedRules: [{ code: 'room_adviser_exclusivity' }],
        }
      : { active: false, relaxedRules: [] },
  }),
}));

describe('SectionForm', () => {
  const baseProps = {
    initialValues: createEmptySectionForm('2026-2027'),
    teachers: [],
    schoolYears: ['2026-2027'],
    onSubmit: jest.fn().mockResolvedValue(undefined),
    onCancel: jest.fn(),
    submitLabel: 'Create Section',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    demoModeActive = false;
  });

  it('sanitizes section name and submits selected room', async () => {
    render(<SectionForm {...baseProps} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. Kamia'), {
      target: { value: "  Kamia @🙂 Section  " },
    });
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: '201' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Section' }));

    expect(baseProps.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Kamia Section',
        roomNumber: '201',
      }),
    );
  });

  it('keeps conflicting room and adviser choices disabled in normal mode', () => {
    render(
      <SectionForm
        {...baseProps}
        teachers={[
          {
            id: 'teacher-1',
            firstName: 'Ana',
            lastName: 'Reyes',
            email: 'ana@example.com',
            roles: ['teacher'],
            status: 'ACTIVE',
            isEmailVerified: true,
          },
        ]}
        roomDisabledReasonByNumber={{ '201': 'Assigned to Grade 7 - Rizal' }}
        adviserDisabledReasonById={{
          'teacher-1': 'Already assigned to Grade 7 - Rizal',
        }}
      />,
    );

    expect(
      screen.getByRole('option', {
        name: 'Room 201 - Assigned to Grade 7 - Rizal',
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole('option', {
        name: 'Ana Reyes - Already assigned to Grade 7 - Rizal',
      }),
    ).toBeDisabled();
  });

  it('keeps conflicts visible but selectable when the exact Demo mode rule is active', () => {
    demoModeActive = true;
    render(
      <SectionForm
        {...baseProps}
        teachers={[
          {
            id: 'teacher-1',
            firstName: 'Ana',
            lastName: 'Reyes',
            email: 'ana@example.com',
            roles: ['teacher'],
            status: 'ACTIVE',
            isEmailVerified: true,
          },
        ]}
        roomDisabledReasonByNumber={{ '201': 'Assigned to Grade 7 - Rizal' }}
        adviserDisabledReasonById={{
          'teacher-1': 'Already assigned to Grade 7 - Rizal',
        }}
      />,
    );

    expect(
      screen.getByRole('option', {
        name: 'Room 201 - conflict allowed in Demo mode',
      }),
    ).toBeEnabled();
    expect(
      screen.getByRole('option', {
        name: 'Ana Reyes - conflict allowed in Demo mode',
      }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Create Section' })).toBeDisabled();
  });
});
