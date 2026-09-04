import { fireEvent, render, screen } from '@testing-library/react';
import { SchoolGallery } from './SchoolGallery';
import { schoolPhotos } from './school-content';

describe('SchoolGallery', () => {
  it('selects photographs from the thumbnail explorer and advances the stage', () => {
    render(<SchoolGallery photos={schoolPhotos} />);

    expect(screen.getByRole('img', { name: schoolPhotos[0].alt })).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: `View photograph 2: ${schoolPhotos[1].alt}`,
      }),
    );
    expect(screen.getByRole('img', { name: schoolPhotos[1].alt })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next photograph/i }));
    expect(screen.getByRole('img', { name: schoolPhotos[2].alt })).toBeInTheDocument();
  });

  it('opens and closes a focus-managed enlarged view', () => {
    render(<SchoolGallery photos={schoolPhotos} />);

    fireEvent.click(
      screen.getByRole('button', { name: /enlarge selected photograph/i }),
    );
    expect(screen.getByRole('dialog', { name: /school photograph/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(
      screen.queryByRole('dialog', { name: /school photograph/i }),
    ).not.toBeInTheDocument();
  });
});
