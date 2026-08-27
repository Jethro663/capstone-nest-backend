import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListTeacherAiJobsQueryDto } from './DTO/list-teacher-ai-jobs-query.dto';
import {
  TeacherAiJobQueryService,
  type TeacherAiJobSummary,
} from './teacher-ai-job-query.service';

const TEACHER_ID = '3b08d830-a9ae-4df6-bbb6-b7afc85107af';
const CLASS_ID = 'db115c25-abe4-4d1a-b417-88ae33090eb5';
const JOB_ID = '8e8fc80d-df05-4bf4-9f0a-b5fe560c1406';
const OUTPUT_ID = 'b50842fa-49e4-438f-a5ae-f7b3e97e34bd';
const ASSESSMENT_ID = 'b4f14ae6-6b68-4188-b681-d089b7ca276d';

type QueryRow = {
  job_id: string;
  job_type: string;
  class_id: string | null;
  status: string;
  source_filters: Record<string, unknown> | null;
  error_message: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  output_id: string | null;
  structured_output: Record<string, unknown> | null;
  assessment_id: string | null;
};

function row(overrides: Partial<QueryRow> = {}): QueryRow {
  return {
    job_id: JOB_ID,
    job_type: 'quiz_generation',
    class_id: CLASS_ID,
    status: 'processing',
    source_filters: {
      title: 'Requested fractions quiz',
      runtime: {
        progressPercent: '42.5',
        statusMessage: 'Generating questions',
      },
    },
    error_message: null,
    created_at: new Date('2026-08-27T01:00:00.000Z'),
    updated_at: new Date('2026-08-27T02:00:00.000Z'),
    output_id: null,
    structured_output: null,
    assessment_id: null,
    ...overrides,
  };
}

describe('ListTeacherAiJobsQueryDto', () => {
  it('accepts the bounded quiz-generation query', async () => {
    const dto = plainToInstance(ListTeacherAiJobsQueryDto, {
      classId: CLASS_ID,
      jobType: 'quiz_generation',
      limit: '6',
    });

    expect(await validate(dto)).toEqual([]);
    expect(dto.limit).toBe(6);
  });

  it('rejects an invalid class id and limit above 50', async () => {
    const dto = plainToInstance(ListTeacherAiJobsQueryDto, {
      classId: 'not-a-uuid',
      limit: '51',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property).sort()).toEqual([
      'classId',
      'limit',
    ]);
  });
});

describe('TeacherAiJobQueryService', () => {
  const execute = jest.fn();
  let service: TeacherAiJobQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TeacherAiJobQueryService({
      db: { execute },
    } as never);
  });

  it('prefers the generated title and reports terminal progress as 100', async () => {
    execute.mockResolvedValue({
      rows: [
        row({
          status: 'approved',
          source_filters: {
            title: 'Requested fractions quiz',
            runtime: { progressPercent: 97, statusMessage: 'Approved' },
          },
          output_id: OUTPUT_ID,
          structured_output: { title: 'Generated fractions quiz' },
          assessment_id: ASSESSMENT_ID,
        }),
      ],
    });

    const result = await service.listTeacherJobs(TEACHER_ID, {
      classId: CLASS_ID,
      jobType: 'quiz_generation',
      limit: 6,
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual<TeacherAiJobSummary[]>([
      {
        jobId: JOB_ID,
        jobType: 'quiz_generation',
        classId: CLASS_ID,
        title: 'Generated fractions quiz',
        status: 'approved',
        progressPercent: 100,
        statusMessage: 'Approved',
        errorMessage: null,
        outputId: OUTPUT_ID,
        assessmentId: ASSESSMENT_ID,
        createdAt: '2026-08-27T01:00:00.000Z',
        updatedAt: '2026-08-27T02:00:00.000Z',
      },
    ]);
  });

  it('uses requested and default titles when output titles are unavailable', async () => {
    execute
      .mockResolvedValueOnce({
        rows: [row({ structured_output: {}, output_id: OUTPUT_ID })],
      })
      .mockResolvedValueOnce({
        rows: [
          row({
            source_filters: { runtime: { progressPercent: 5 } },
            structured_output: {},
          }),
        ],
      });

    const [requested] = await service.listTeacherJobs(TEACHER_ID, {
      limit: 20,
    });
    const [fallback] = await service.listTeacherJobs(TEACHER_ID, {
      limit: 20,
    });

    expect(requested.title).toBe('Requested fractions quiz');
    expect(fallback.title).toBe('AI Draft Quiz');
  });

  it('normalizes active progress, runtime messages, errors, and unknown states', async () => {
    execute.mockResolvedValue({
      rows: [
        row(),
        row({
          job_id: '4fe31e25-4cc0-475e-86fa-039717c41dfc',
          status: 'unexpected',
          source_filters: {
            title: 'Fallback state quiz',
            runtime: { progressPercent: 500, errorMessage: 'Runtime failed' },
          },
          error_message: 'Database failure',
        }),
      ],
    });

    const result = await service.listTeacherJobs(TEACHER_ID, { limit: 20 });

    expect(result[0]).toMatchObject({
      status: 'processing',
      progressPercent: 43,
      statusMessage: 'Generating questions',
    });
    expect(result[1]).toMatchObject({
      status: 'processing',
      progressPercent: 100,
      errorMessage: 'Database failure',
    });
  });
});
