import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminAssistantHistory } from './AdminAssistantHistory';

const items = [
  {
    sessionId: '11111111-1111-1111-1111-111111111111',
    title: 'Weekly risk review',
    preview: 'Two learner records need attention.',
    updatedAt: '2026-09-11T00:00:00.000Z',
  },
  {
    sessionId: '22222222-2222-2222-2222-222222222222',
    title: 'Audit watch',
    preview: 'No unexplained changes were found.',
    updatedAt: '2026-09-10T00:00:00.000Z',
  },
];

describe('AdminAssistantHistory', () => {
  it('searches, renames, and deletes user-owned conversations', async () => {
    const onRename = jest.fn().mockResolvedValue(undefined);
    const onDelete = jest.fn().mockResolvedValue(undefined);

    render(
      <AdminAssistantHistory
        items={items}
        activeSessionId={null}
        loading={false}
        onOpen={jest.fn()}
        onNew={jest.fn()}
        onRename={onRename}
        onDelete={onDelete}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Search conversations'), {
      target: { value: 'audit' },
    });
    expect(screen.getByText('Audit watch')).toBeInTheDocument();
    expect(screen.queryByText('Weekly risk review')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search conversations'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rename Weekly risk review' }));
    fireEvent.change(screen.getByLabelText('Conversation title'), {
      target: { value: 'Priority learners' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save conversation title' }));

    await waitFor(() =>
      expect(onRename).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        'Priority learners',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Audit watch' }));
    await waitFor(() =>
      expect(onDelete).toHaveBeenCalledWith(
        '22222222-2222-2222-2222-222222222222',
      ),
    );
  });
});
