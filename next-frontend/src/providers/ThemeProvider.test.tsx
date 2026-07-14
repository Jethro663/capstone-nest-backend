import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { THEME_STORAGE_KEY } from '@/lib/themes';
import { ThemeProvider, useTheme } from './ThemeProvider';

const usePathnameMock = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

function ThemeProbe() {
  const { theme, themes, setTheme } = useTheme();

  return (
    <div>
      <span data-testid="active-theme">{theme}</span>
      <span>{themes.length} themes</span>
      <button type="button" onClick={() => setTheme('soft-ocean')}>
        Use Soft Ocean
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue('/dashboard/student/courses');
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.studentRoute;
  });

  it('restores and persists a selection while exposing all nine student themes', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'stone-mountain');

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByText('9 themes')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('active-theme')).toHaveTextContent('stone-mountain');
    });
    expect(document.documentElement).toHaveAttribute('data-theme', 'stone-mountain');
    expect(document.documentElement).toHaveAttribute('data-student-route', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Use Soft Ocean' }));

    await waitFor(() => {
      expect(screen.getByTestId('active-theme')).toHaveTextContent('soft-ocean');
      expect(document.documentElement).toHaveAttribute('data-theme', 'soft-ocean');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('soft-ocean');
    });
  });
});
