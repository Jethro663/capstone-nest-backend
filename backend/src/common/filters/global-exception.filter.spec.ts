import { BadRequestException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('public assessment error contract', () => {
  it('retains validation code and field issues without exposing arbitrary internals', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    new GlobalExceptionFilter().catch(
      new BadRequestException({
        message: 'Fix the draft',
        code: 'ASSESSMENT_NOT_READY',
        errors: ['Question is empty'],
        fieldErrors: [
          { field: 'questions.0.content', message: 'Question is empty' },
        ],
        internalSql: 'private',
      }),
      {
        switchToHttp: () => ({
          getResponse: () => ({ status }),
          getRequest: () => ({
            method: 'PUT',
            url: '/api/assessments/id/editor',
          }),
        }),
      } as never,
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'ASSESSMENT_NOT_READY',
        fieldErrors: [
          { field: 'questions.0.content', message: 'Question is empty' },
        ],
        errors: ['Question is empty'],
      }),
    );
    expect(json.mock.calls[0][0]).not.toHaveProperty('internalSql');
  });
});
