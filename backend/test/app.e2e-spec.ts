import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthController } from '../src/modules/health/health.controller';
import { HealthService } from '../src/modules/health/health.service';

describe('Health routes (e2e)', () => {
  let app: INestApplication<App>;

  const mockHealthService = {
    getReadiness: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/health/live (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health/live')
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('ok');
        expect(typeof response.body.timestamp).toBe('string');
      });
  });

  it('/api/health/ready (GET)', () => {
    mockHealthService.getReadiness.mockResolvedValue({
      ready: true,
      dependencies: {
        database: { ok: true },
        redis: { ok: true },
        aiService: { ok: true },
      },
      timestamp: '2026-03-23T00:00:00.000Z',
    });

    return request(app.getHttpServer())
      .get('/api/health/ready')
      .expect(200)
      .expect({
        success: true,
        message: 'Service is ready',
        data: {
          ready: true,
          dependencies: {
            database: { ok: true },
            redis: { ok: true },
            aiService: { ok: true },
          },
          timestamp: '2026-03-23T00:00:00.000Z',
        },
      });
  });
});
