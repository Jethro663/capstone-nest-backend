import { createHash } from 'node:crypto';
import { getDefaultAcademicPolicy, type PeriodKey } from './academic-policy';

export interface AcademicAlignmentInput {
  sourceSchoolYear: string;
  targetSchoolYear: string;
  targetQuarter: PeriodKey;
  classIds: string[];
}

export interface AcademicAlignmentCounts {
  enrollments: number;
  assessments: number;
  attempts: number;
  classRecords: number;
  finalizedRecords: number;
  finalGradeRows: number;
  legacyEvidenceRows: number;
  periodRevisionRows: number;
}

export interface AcademicAlignmentCandidate {
  id: string;
  subjectCode: string;
  subjectName: string;
  sectionId: string;
  sectionName: string;
  sectionSchoolYear: string;
  teacherId: string | null;
  teacherName: string | null;
  isActive: boolean;
  counts: AcademicAlignmentCounts;
}

export interface AcademicAlignmentSnapshot {
  states: Array<{
    id: string;
    schoolYear: string;
    quarter: string;
    version: number;
  }>;
  policies: Array<{
    schoolYear: string;
    policyId: string;
    policy: unknown;
  }>;
  candidates: AcademicAlignmentCandidate[];
  sections: Array<{
    id: string;
    name: string;
    gradeLevel: string;
    schoolYear: string;
    classIds: string[];
  }>;
  targetClasses: Array<{
    id: string;
    subjectCode: string;
    sectionId: string;
  }>;
  targetSections: Array<{
    id: string;
    name: string;
    gradeLevel: string;
  }>;
  legacyEvidence: Array<{
    id: string;
    sourceFinalGradeId: string;
    classRecordId: string;
    classId: string;
    studentId: string;
    schoolYear: string;
    period: PeriodKey;
    sourceSnapshot: Record<string, unknown>;
    archivedAt: string;
  }>;
  ambiguousCounts: {
    periodRevisions: number;
    externalGrades: number;
    annualSelections: number;
    annualGrades: number;
    yearOutcomes: number;
  };
}

export interface AcademicAlignmentMessage {
  code: string;
  message: string;
  classId?: string;
  sectionId?: string;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(canonicalize)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function hashAcademicAlignmentManifest(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

export function buildAcademicAlignmentManifest(
  snapshot: AcademicAlignmentSnapshot,
  input: AcademicAlignmentInput,
) {
  const selectedClassIds = [...new Set(input.classIds)].sort();
  const selected = snapshot.candidates
    .filter((candidate) => selectedClassIds.includes(candidate.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  const candidateIds = snapshot.candidates.map((candidate) => candidate.id);
  const blockers: AcademicAlignmentMessage[] = [];
  const warnings: AcademicAlignmentMessage[] = [];
  const state = [...snapshot.states].sort((left, right) =>
    left.id.localeCompare(right.id),
  )[0];

  if (
    snapshot.states.length !== 1 ||
    state?.schoolYear !== input.sourceSchoolYear
  )
    blockers.push({
      code: 'academic_state_mismatch',
      message:
        'The authoritative academic state no longer matches the source year.',
    });
  const sourceStart = Number(input.sourceSchoolYear.slice(0, 4));
  const targetStart = Number(input.targetSchoolYear.slice(0, 4));
  if (sourceStart !== targetStart + 1)
    blockers.push({
      code: 'invalid_year_alignment',
      message:
        'The source year must be the academic year immediately after the target year.',
    });
  if (
    !getDefaultAcademicPolicy(input.targetSchoolYear).periods.some(
      (period) => period.key === input.targetQuarter,
    )
  )
    blockers.push({
      code: 'invalid_target_period',
      message: 'The target quarter is not part of the target-year policy.',
    });
  if (!selectedClassIds.length)
    blockers.push({
      code: 'class_selection_required',
      message: 'Select the reviewed source-year classes to align.',
    });
  const unknownIds = selectedClassIds.filter(
    (id) => !candidateIds.includes(id),
  );
  if (unknownIds.length)
    blockers.push({
      code: 'invalid_class_selection',
      message:
        'One or more selected classes are no longer active source-year candidates.',
    });
  const unselected = candidateIds.filter(
    (id) => !selectedClassIds.includes(id),
  );
  if (unselected.length)
    blockers.push({
      code: 'unselected_source_classes',
      message: `${unselected.length} active source-year class(es) remain unselected.`,
    });

  const selectedSet = new Set(selectedClassIds);
  const movedSectionIds: string[] = [];
  for (const section of snapshot.sections) {
    const selectedInSection = section.classIds.filter((id) =>
      selectedSet.has(id),
    );
    if (!selectedInSection.length) continue;
    if (section.schoolYear === input.sourceSchoolYear) {
      if (section.classIds.some((id) => !selectedSet.has(id)))
        blockers.push({
          code: 'mixed_source_section',
          message:
            'A source-year section contains a class outside the reviewed selection.',
          sectionId: section.id,
        });
      else movedSectionIds.push(section.id);
      if (
        snapshot.targetSections.some(
          (target) =>
            target.id !== section.id &&
            target.name === section.name &&
            target.gradeLevel === section.gradeLevel,
        )
      )
        blockers.push({
          code: 'duplicate_target_section',
          message:
            'Moving this section would conflict with an existing target-year section.',
          sectionId: section.id,
        });
    } else if (section.schoolYear !== input.targetSchoolYear) {
      blockers.push({
        code: 'section_year_mismatch',
        message:
          'A selected class belongs to a section outside both alignment years.',
        sectionId: section.id,
      });
    }
  }

  for (const candidate of selected) {
    if (
      snapshot.targetClasses.some(
        (target) =>
          target.subjectCode.trim().toUpperCase() ===
            candidate.subjectCode.trim().toUpperCase() &&
          target.sectionId === candidate.sectionId,
      )
    )
      blockers.push({
        code: 'duplicate_target_class',
        message: 'A target-year class already owns this subject and section.',
        classId: candidate.id,
      });
  }

  const ambiguousTotal = Object.values(snapshot.ambiguousCounts).reduce(
    (sum, value) => sum + Number(value),
    0,
  );
  if (ambiguousTotal)
    blockers.push({
      code: 'ambiguous_official_records',
      message: `${ambiguousTotal} annual or revision record(s) require separate review.`,
    });

  const resultBearing = selected.filter(
    (candidate) =>
      candidate.counts.finalizedRecords > 0 ||
      candidate.counts.finalGradeRows > 0 ||
      candidate.counts.legacyEvidenceRows > 0,
  );
  const legacyEvidenceRows = resultBearing.reduce(
    (sum, candidate) => sum + candidate.counts.legacyEvidenceRows,
    0,
  );
  if (resultBearing.length)
    warnings.push({
      code: 'result_bearing_evidence',
      message: `${resultBearing.length} selected class(es) contain finalized or preserved evidence.`,
    });

  const requiredConfirmations = [
    {
      code: 'ALIGN_STATE',
      text: `ALIGN ${input.sourceSchoolYear} TO ${input.targetSchoolYear} ${input.targetQuarter}`,
    },
    ...(legacyEvidenceRows > 0
      ? [
          {
            code: 'RESULT_BEARING_EVIDENCE',
            text: `MOVE ${legacyEvidenceRows} LEGACY EVIDENCE ROWS TO ${input.targetSchoolYear}`,
          },
        ]
      : []),
  ];
  const manifest = {
    input: {
      sourceSchoolYear: input.sourceSchoolYear,
      targetSchoolYear: input.targetSchoolYear,
      targetQuarter: input.targetQuarter,
      classIds: selectedClassIds,
    },
    state,
    policies: snapshot.policies,
    proposedPolicies: [
      getDefaultAcademicPolicy(input.targetSchoolYear),
      getDefaultAcademicPolicy(input.sourceSchoolYear),
    ].sort((left, right) => left.schoolYear.localeCompare(right.schoolYear)),
    selectedClasses: selected,
    legacyEvidence: snapshot.legacyEvidence.filter((evidence) =>
      selectedSet.has(evidence.classId),
    ),
    movedSectionIds: [...movedSectionIds].sort(),
    ambiguousCounts: snapshot.ambiguousCounts,
    requiredConfirmations,
  };

  return {
    ...manifest,
    candidates: [...snapshot.candidates].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
    sections: snapshot.sections,
    selectedClassIds,
    blockers,
    warnings,
    safeToApply: blockers.length === 0,
    manifestHash: hashAcademicAlignmentManifest(manifest),
  };
}
