import { forgotPasswordAction, logoutAction, logoutAllAction } from './auth-actions';
import * as authService from './auth-service';
import {
  STUDENT_ANNOUNCEMENT_BOARD_STORAGE_KEY,
} from './student-announcement-board';

jest.mock('./api-client', () => ({
  clearAccessToken: jest.fn(),
  setAccessToken: jest.fn(),
}));

jest.mock('./auth-service', () => ({
  logout: jest.fn().mockResolvedValue({ success: true }),
  logoutAll: jest.fn().mockResolvedValue({ success: true }),
  forgotPassword: jest.fn(),
}));

describe('auth-actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it('clears the student announcement dismissal on logout', async () => {
    sessionStorage.setItem(
      STUDENT_ANNOUNCEMENT_BOARD_STORAGE_KEY,
      'dismissed',
    );

    await logoutAction();

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(
      sessionStorage.getItem(STUDENT_ANNOUNCEMENT_BOARD_STORAGE_KEY),
    ).toBeNull();
  });

  it('clears the student announcement dismissal on logout-all', async () => {
    sessionStorage.setItem(
      STUDENT_ANNOUNCEMENT_BOARD_STORAGE_KEY,
      'dismissed',
    );

    await logoutAllAction('manual-reset');

    expect(authService.logoutAll).toHaveBeenCalledTimes(1);
    expect(
      sessionStorage.getItem(STUDENT_ANNOUNCEMENT_BOARD_STORAGE_KEY),
    ).toBeNull();
  });

  it('preserves the backend status when forgot-password fails', async () => {
    (authService.forgotPassword as jest.Mock).mockRejectedValue({
      success: false,
      message: 'Account does not exist.',
      status: 404,
    });

    const result = await forgotPasswordAction('missing@example.com');

    expect(result).toEqual({
      success: false,
      message: 'Account does not exist.',
      errors: undefined,
      status: 404,
    });
  });
});
