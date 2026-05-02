'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { SharedAnswerInput } from './shared-answer-input';

describe('SharedAnswerInput', () => {
  it('renders option images with bounded controls for multiple choice questions', () => {
    const onChange = jest.fn();

    render(
      <SharedAnswerInput
        question={{
          id: 'question-1',
          type: 'multiple_choice',
          options: [
            {
              id: 'option-1',
              text: 'Option 1',
              imageUrl: '/api/assessments/questions/images/option-1.png',
              imageDisplayMode: 'expanded',
              imageZoom: 120,
              imagePositionX: 25,
              imagePositionY: 70,
            },
            {
              id: 'option-2',
              text: 'Option 2',
            },
          ],
        }}
        value={undefined}
        onChange={onChange}
      />,
    );

    const optionImage = screen.getByAltText('Option 1 image');
    expect(optionImage).toBeInTheDocument();
    expect(screen.getByText(/120%/i)).toBeInTheDocument();
    expect(optionImage).toHaveStyle({
      objectPosition: '25% 70%',
    });

    fireEvent.click(screen.getByLabelText('Option 1'));
    expect(onChange).toHaveBeenCalledWith('option-1');
  });
});
