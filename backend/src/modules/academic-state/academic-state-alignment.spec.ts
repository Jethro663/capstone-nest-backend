import { buildAcademicAlignmentManifest } from './academic-state-alignment';

const ids = {
  state: '00000000-0000-4000-8000-000000000001',
  classA: '00000000-0000-4000-8000-000000000002',
  classB: '00000000-0000-4000-8000-000000000003',
  section: '00000000-0000-4000-8000-000000000004',
};

const input = {
  sourceSchoolYear: '2027-2028',
  targetSchoolYear: '2026-2027',
  targetQuarter: 'Q1' as const,
  classIds: [ids.classA, ids.classB],
};

const candidate = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  subjectCode: id === ids.classA ? 'AP-7' : 'SCI-7',
  subjectName: id === ids.classA ? 'Araling Panlipunan' : 'Science',
  sectionId: ids.section,
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
  ...overrides,
});

const snapshot = () => ({
  states: [
    {
      id: ids.state,
      schoolYear: '2027-2028',
      quarter: 'Q1',
      version: 1,
    },
  ],
  policies: [],
  candidates: [candidate(ids.classB), candidate(ids.classA)],
  sections: [
    {
      id: ids.section,
      name: 'Grade 7',
      gradeLevel: '7',
      schoolYear: '2027-2028',
      classIds: [ids.classB, ids.classA],
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
});

describe('academic state alignment manifest', () => {
  it('is deterministic after canonical sorting', () => {
    const first = buildAcademicAlignmentManifest(snapshot(), input);
    const second = buildAcademicAlignmentManifest(snapshot(), {
      ...input,
      classIds: [...input.classIds].reverse(),
    });

    expect(first.safeToApply).toBe(true);
    expect(first.manifestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(second.manifestHash).toBe(first.manifestHash);
    expect(first.selectedClassIds).toEqual([ids.classA, ids.classB]);
    expect(first.movedSectionIds).toEqual([ids.section]);
  });

  it('requires an extra exact confirmation for result-bearing evidence', () => {
    const data = snapshot();
    data.candidates[1] = candidate(ids.classA, {
      counts: {
        ...data.candidates[1].counts,
        finalizedRecords: 1,
        finalGradeRows: 16,
        legacyEvidenceRows: 16,
      },
    });

    const result = buildAcademicAlignmentManifest(data, input);

    expect(result.safeToApply).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'result_bearing_evidence' }),
    );
    expect(result.requiredConfirmations).toContainEqual({
      code: 'RESULT_BEARING_EVIDENCE',
      text: 'MOVE 16 LEGACY EVIDENCE ROWS TO 2026-2027',
    });
  });

  it('warns for finalized records without inventing a zero-row evidence confirmation', () => {
    const data = snapshot();
    data.candidates[1] = candidate(ids.classA, {
      counts: {
        ...data.candidates[1].counts,
        finalizedRecords: 1,
      },
    });

    const result = buildAcademicAlignmentManifest(data, input);

    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'result_bearing_evidence' }),
    );
    expect(result.requiredConfirmations).toEqual([
      expect.objectContaining({ code: 'ALIGN_STATE' }),
    ]);
  });

  it('blocks a source and target pair that is not the reviewed prior-year correction', () => {
    const result = buildAcademicAlignmentManifest(snapshot(), {
      ...input,
      targetSchoolYear: '2025-2026',
    });

    expect(result.blockers).toContainEqual(
      expect.objectContaining({ code: 'invalid_year_alignment' }),
    );
  });

  it('blocks incomplete, mixed, duplicate, and ambiguous selections', () => {
    const data = snapshot();
    data.targetClasses.push({
      id: 'target',
      subjectCode: 'AP-7',
      sectionId: ids.section,
    });
    data.ambiguousCounts.annualGrades = 1;

    const result = buildAcademicAlignmentManifest(data, {
      ...input,
      classIds: [ids.classA],
    });

    expect(result.safeToApply).toBe(false);
    expect(result.blockers.map((blocker) => blocker.code)).toEqual(
      expect.arrayContaining([
        'unselected_source_classes',
        'mixed_source_section',
        'duplicate_target_class',
        'ambiguous_official_records',
      ]),
    );
  });
});
