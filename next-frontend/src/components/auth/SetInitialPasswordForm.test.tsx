import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SetInitialPasswordForm } from './SetInitialPasswordForm';
import { completeActivationPasswordAction } from '@/lib/auth-actions';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams('email=teacher@example.invalid'),
}));
jest.mock('@/lib/auth-actions', () => ({
  completeActivationPasswordAction: jest.fn(),
}));

it('submits the temporary password as proof when setting the personal password', async () => {
  jest
    .mocked(completeActivationPasswordAction)
    .mockResolvedValue({ success: false, message: 'Fixture response' });
  render(<SetInitialPasswordForm />);
  fireEvent.change(screen.getByLabelText('Temporary password'), {
    target: { value: 'Temporary1!' },
  });
  fireEvent.change(screen.getByLabelText('New password'), {
    target: { value: 'Personal1!' },
  });
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: 'Personal1!' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Set password and continue to login' }),
  );
  await waitFor(() =>
    expect(completeActivationPasswordAction).toHaveBeenCalledWith({
      email: 'teacher@example.invalid',
      currentPassword: 'Temporary1!',
      newPassword: 'Personal1!',
    }),
  );
});
