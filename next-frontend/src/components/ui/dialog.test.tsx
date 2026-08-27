import { render, screen } from '@testing-library/react';
import { Dialog, DialogContent, DialogTitle } from './dialog';

describe('DialogContent variants', () => {
  it('places the admin variable-host class on portaled content', async () => {
    render(
      <Dialog open>
        <DialogContent variant="admin">
          <DialogTitle>Admin dialog</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(await screen.findByRole('dialog')).toHaveClass('admin-dialog');
  });
});
