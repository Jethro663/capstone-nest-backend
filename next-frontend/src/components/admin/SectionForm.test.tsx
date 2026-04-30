'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import SectionForm, { createEmptySectionForm } from './SectionForm';

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
  });

  it('sanitizes section name and room before submit', async () => {
    render(<SectionForm {...baseProps} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. Kamia'), {
      target: { value: "  Kamia @🙂 Section  " },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 201'), {
      target: { value: ' Room #201/<A>🙂 ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Section' }));

    expect(baseProps.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Kamia Section',
        roomNumber: 'Room #201/A',
      }),
    );
  });
});
