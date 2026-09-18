import { MobileWorkspaceController } from './mobile-workspace.controller';
import { MobileWorkspaceService } from './mobile-workspace.service';

describe('MobileWorkspaceController', () => {
  const service = {
    getStudentOverview: jest.fn(),
    getTeacherOverview: jest.fn(),
    getCalendar: jest.fn(),
    getTeacherLibraryIndex: jest.fn(),
  };
  const controller = new MobileWorkspaceController(
    service as unknown as MobileWorkspaceService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('derives student overview ownership from the authenticated session', async () => {
    service.getStudentOverview.mockResolvedValue({ courses: [] });
    await controller.studentOverview({ userId: 'student-1' });
    expect(service.getStudentOverview).toHaveBeenCalledWith('student-1');
  });

  it('derives teacher library ownership from the authenticated session', async () => {
    service.getTeacherLibraryIndex.mockResolvedValue({ modules: [] });
    await controller.teacherLibraryIndex({ userId: 'teacher-1' });
    expect(service.getTeacherLibraryIndex).toHaveBeenCalledWith('teacher-1');
  });

  it('derives teacher calendar ownership and role from the authenticated session', async () => {
    const query = {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-10-15T23:59:59.999Z',
    };
    service.getCalendar.mockResolvedValue({ classes: [] });
    await controller.teacherCalendar({ userId: 'teacher-1' }, query);
    expect(service.getCalendar).toHaveBeenCalledWith(
      'teacher-1',
      'teacher',
      query,
    );
  });
});
