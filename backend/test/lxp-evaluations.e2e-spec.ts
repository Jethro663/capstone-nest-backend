import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { LxpController } from '../src/modules/lxp/lxp.controller';
import { LxpService } from '../src/modules/lxp/lxp.service';

describe('LXP evaluations (e2e)', () => {
  let app: INestApplication<App>;

  const mockLxpService = {
    getStudentEligibility: jest.fn(),
    getStudentPlaylist: jest.fn(),
    getStudentOverview: jest.fn(),
    completeCheckpoint: jest.fn(),
    getTeacherQueue: jest.fn(),
    assignIntervention: jest.fn(),
    resolveIntervention: jest.fn(),
    getClassReport: jest.fn(),
    submitSystemEvaluation: jest.fn(),
    listSystemEvaluations: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockLxpService.listSystemEvaluations.mockResolvedValue({
      count: 1,
      rows: [
        {
          id: 'eval-1',
          targetModule: 'lxp',
        },
      ],
      summary: {
        averages: {
          usabilityScore: 4,
          functionalityScore: 4,
          performanceScore: 4,
          satisfactionScore: 4,
        },
        feedbackCount: 1,
        moduleBreakdown: [
          {
            targetModule: 'lxp',
            count: 1,
            averages: {
              usabilityScore: 4,
              functionalityScore: 4,
              performanceScore: 4,
              satisfactionScore: 4,
            },
          },
        ],
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [LxpController],
      providers: [
        Reflector,
        RolesGuard,
        { provide: LxpService, useValue: mockLxpService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req: any, _res: any, next: () => void) => {
      const role = req.headers['x-test-role'];
      if (typeof role === 'string' && role.trim()) {
        req.user = {
          id: `${role}-1`,
          userId: `${role}-1`,
          email: `${role}@nexora.test`,
          roles: [role.trim()],
        };
      }
      next();
    });
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows teacher role and returns evaluation summary payload', async () => {
    await request(app.getHttpServer())
      .get('/api/lxp/evaluations?targetModule=lxp')
      .set('x-test-role', 'teacher')
      .expect(200)
      .expect((response) => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.count).toBe(1);
        expect(response.body.data.summary.averages.usabilityScore).toBe(4);
      });

    expect(mockLxpService.listSystemEvaluations).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'teacher-1',
        roles: ['teacher'],
      }),
      'lxp',
    );
  });

  it('allows admin role for evaluation listing', async () => {
    await request(app.getHttpServer())
      .get('/api/lxp/evaluations')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(mockLxpService.listSystemEvaluations).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        roles: ['admin'],
      }),
      undefined,
    );
  });

  it('rejects student role for evaluation listing', async () => {
    await request(app.getHttpServer())
      .get('/api/lxp/evaluations')
      .set('x-test-role', 'student')
      .expect(403);

    expect(mockLxpService.listSystemEvaluations).not.toHaveBeenCalled();
  });
});
