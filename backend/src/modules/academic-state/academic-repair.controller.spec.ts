import { AcademicRepairController } from './academic-repair.controller';

describe('AcademicRepairController state alignment', () => {
  const preview = {
    sourceSchoolYear: '2027-2028',
    targetSchoolYear: '2026-2027',
    targetQuarter: 'Q1' as const,
    classIds: ['00000000-0000-4000-8000-000000000001'],
  };
  const user = { userId: 'admin-id', roles: ['admin'] };

  const make = () => {
    const alignment = {
      preview: jest.fn().mockResolvedValue({ manifestHash: 'a'.repeat(64) }),
      execute: jest.fn().mockResolvedValue({ auditEventId: 'audit-id' }),
    };
    const controller = new AcademicRepairController(
      {} as never,
      {} as never,
      alignment as never,
    );
    return { controller, alignment };
  };

  it('returns a preview in the existing API envelope', async () => {
    const { controller, alignment } = make();

    await expect(controller.previewStateAlignment(preview)).resolves.toEqual({
      success: true,
      message: 'Academic state alignment preview generated',
      data: { manifestHash: 'a'.repeat(64) },
    });
    expect(alignment.preview).toHaveBeenCalledWith(preview);
  });

  it('delegates execution with the authenticated administrator', async () => {
    const { controller, alignment } = make();
    const dto = {
      ...preview,
      manifestHash: 'a'.repeat(64),
      confirmations: [{ code: 'ALIGN_STATE', text: 'exact' }],
      reason: 'Approved school correction',
      currentPassword: 'secret',
    };

    await expect(controller.executeStateAlignment(dto, user)).resolves.toEqual({
      success: true,
      message: 'Academic state alignment repaired',
      data: { auditEventId: 'audit-id' },
    });
    expect(alignment.execute).toHaveBeenCalledWith(
      dto,
      user.userId,
      user.roles,
    );
  });
});
