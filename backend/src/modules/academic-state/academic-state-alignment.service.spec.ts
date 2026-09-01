import * as bcrypt from 'bcrypt';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AcademicStateAlignmentService } from './academic-state-alignment.service';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

const ids = {
  state: '00000000-0000-4000-8000-000000000001',
  classId: '00000000-0000-4000-8000-000000000002',
  sectionId: '00000000-0000-4000-8000-000000000003',
};

const snapshot = {
  states: [
    { id: ids.state, schoolYear: '2027-2028', quarter: 'Q1', version: 1 },
  ],
  policies: [],
  candidates: [
    {
      id: ids.classId,
      subjectCode: 'SCI-7',
      subjectName: 'Science',
      sectionId: ids.sectionId,
      sectionName: 'Grade 7',
      sectionSchoolYear: '2027-2028',
      teacherId: null,
      teacherName: null,
      isActive: true,
      counts: {
        enrollments: 1,
        assessments: 0,
        attempts: 0,
        classRecords: 1,
        finalizedRecords: 0,
        finalGradeRows: 0,
        legacyEvidenceRows: 0,
        periodRevisionRows: 0,
      },
    },
  ],
  sections: [
    {
      id: ids.sectionId,
      name: 'Grade 7',
      gradeLevel: '7',
      schoolYear: '2027-2028',
      classIds: [ids.classId],
    },
  ],
  targetClasses: [],
  targetSections: [],
  legacyEvidence: [],
  ambiguousCounts: {
    periodRevisions: 0,
    externalGrades: 0,
    annualSelections: 0,
    annualGrades: 0,
    yearOutcomes: 0,
  },
};

const previewDto = {
  sourceSchoolYear: '2027-2028',
  targetSchoolYear: '2026-2027',
  targetQuarter: 'Q1' as const,
  classIds: [ids.classId],
};

describe('AcademicStateAlignmentService', () => {
  const make = () => {
    const db: Record<string, any> = {
      transaction: jest.fn((work) => work(db)),
      execute: jest.fn().mockResolvedValue({ rows: [] }),
      query: {
        users: {
          findFirst: jest.fn().mockResolvedValue({ password: 'hash' }),
        },
      },
    };
    const databaseService = {
      db,
      academicTransaction: jest.fn((work) => work()),
    };
    const audit = {
      log: jest.fn().mockResolvedValue({ id: 'audit-id' }),
    };
    const service = new AcademicStateAlignmentService(
      databaseService as never,
      audit as never,
    );
    jest
      .spyOn(service as never, 'collectSnapshot' as never)
      .mockResolvedValue(snapshot as never);
    return { service, db, databaseService, audit };
  };

  it('builds preview inside a read-only database transaction', async () => {
    const { service, db } = make();

    const result = await service.preview(previewDto);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(result.safeToApply).toBe(true);
  });

  it('rejects stale manifest and missing exact confirmations', async () => {
    const { service } = make();
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const preview = await service.preview(previewDto);
    const common = {
      ...previewDto,
      currentPassword: 'password',
      reason: 'Correct the approved school year',
      confirmations: preview.requiredConfirmations,
    };

    await expect(
      service.execute({ ...common, manifestHash: '0'.repeat(64) }, 'admin', [
        'admin',
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.execute(
        {
          ...common,
          manifestHash: preview.manifestHash,
          confirmations: [],
        },
        'admin',
        ['admin'],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applies and audits a matching reviewed manifest atomically', async () => {
    const { service, databaseService, audit } = make();
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const preview = await service.preview(previewDto);
    jest.spyOn(service as never, 'applyAlignment' as never).mockResolvedValue({
      state: { ...snapshot.states[0], schoolYear: '2026-2027', version: 2 },
      movedClassIds: [ids.classId],
      movedSectionIds: [ids.sectionId],
      updatedLegacyEvidenceRows: 0,
    } as never);

    const result = await service.execute(
      {
        ...previewDto,
        manifestHash: preview.manifestHash,
        confirmations: preview.requiredConfirmations,
        currentPassword: 'password',
        reason: 'Correct the approved school year',
      },
      'admin',
      ['admin'],
    );

    expect(databaseService.academicTransaction).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'academic.state_alignment.repaired' }),
    );
    expect(result.auditEventId).toBe('audit-id');
  });
});
