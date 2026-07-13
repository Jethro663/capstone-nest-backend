import { AuditService } from './audit.service';
import { DatabaseService } from '../../database/database.service';

describe('AuditService', () => {
  it('does not issue a write for an empty bulk log', async () => {
    const insert = jest.fn();
    const service = new AuditService({
      db: { insert },
    } as unknown as DatabaseService);

    await expect(service.logBulk([])).resolves.toEqual([]);
    expect(insert).not.toHaveBeenCalled();
  });

  it('caps list pagination at 100 rows and returns stable metadata', async () => {
    const where = jest.fn().mockResolvedValue([{ total: 205 }]);
    const from = jest.fn().mockReturnValue({ where });
    const select = jest.fn().mockReturnValue({ from });
    const findMany = jest.fn().mockResolvedValue([{ id: 'audit-1' }]);
    const service = new AuditService({
      db: { select, query: { auditLogs: { findMany } } },
    } as unknown as DatabaseService);

    const result = await service.list({ page: 2, limit: 500 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100, offset: 100 }),
    );
    expect(result).toMatchObject({
      page: 2,
      limit: 100,
      total: 205,
      totalPages: 3,
    });
  });
});
