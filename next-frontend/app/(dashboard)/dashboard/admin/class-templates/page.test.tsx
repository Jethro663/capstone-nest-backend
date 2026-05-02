import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClassTemplatesPage from './page';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/services/class-template-service', () => ({
  classTemplateService: {
    create: jest.fn(),
    getAll: jest.fn(),
    importEngine: jest.fn(),
    remove: jest.fn(),
    validateEngineImport: jest.fn(),
  },
}));

describe('ClassTemplatesPage', () => {
  const { classTemplateService } = jest.requireMock('@/services/class-template-service') as {
    classTemplateService: {
      create: jest.Mock;
      getAll: jest.Mock;
      importEngine: jest.Mock;
      remove: jest.Mock;
      validateEngineImport: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    classTemplateService.getAll.mockResolvedValue({ data: [] });
  });

  it('imports a template manifest and redirects to class setup with the imported template seed', async () => {
    classTemplateService.importEngine.mockResolvedValue({
      data: {
        template: {
          id: 'template-123',
          name: 'Quarter 1 Mathematics',
          subjectCode: 'MATH-7',
          subjectGradeLevel: '7',
          status: 'draft',
          createdBy: 'admin-1',
        },
      },
    });

    render(<ClassTemplatesPage />);

    await waitFor(() => expect(classTemplateService.getAll).toHaveBeenCalled());

    fireEvent.change(
      screen.getByPlaceholderText(/paste template yaml manifest here/i),
      {
        target: { value: 'schemaVersion: 1.0' },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: /import template/i }));

    await waitFor(() =>
      expect(classTemplateService.importEngine).toHaveBeenCalledWith(
        'schemaVersion: 1.0',
      ),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        '/dashboard/admin/classes/new?templateId=template-123&subjectName=Mathematics&subjectCode=MATH-7&subjectGradeLevel=7',
      ),
    );
  });
});
