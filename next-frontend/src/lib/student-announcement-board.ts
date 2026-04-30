'use client';

export const STUDENT_ANNOUNCEMENT_BOARD_STORAGE_KEY =
  'nexora.student.announcement-board.dismissed';

export function clearStudentAnnouncementBoardDismissal() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STUDENT_ANNOUNCEMENT_BOARD_STORAGE_KEY);
}
