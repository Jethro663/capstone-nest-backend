import { Test, TestingModule } from '@nestjs/testing';
import { RolesService, Role } from './roles.service';
import { DatabaseService } from '../../database/database.service';

// Mock drizzle-orm operators so we can inspect the normalised values
// passed to them without hitting circular-reference serialisation issues.
const mockEq = jest.fn();
const mockInArray = jest.fn();
jest.mock('drizzle-orm', () => ({
  ...jest.requireActual('drizzle-orm'),
  eq: (...args: unknown[]) => {
    mockEq(...args);
    return {};
  },
  inArray: (...args: unknown[]) => {
    mockInArray(...args);
    return {};
  },
}));

const makeRole = (overrides: Partial<Role> = {}): Role => ({
  id: 'role-uuid-1',
  name: 'student',
  description: 'Student role',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

describe('RolesService', () => {
  let service: RolesService;
  let mockDb: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDb = {
      query: {
        roles: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: DatabaseService,
          useValue: { db: mockDb },
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all roles', async () => {
      const allRoles = [
        makeRole({ name: 'admin' }),
        makeRole({ id: 'role-uuid-2', name: 'teacher' }),
        makeRole({ id: 'role-uuid-3', name: 'student' }),
      ];
      mockDb.query.roles.findMany.mockResolvedValueOnce(allRoles);

      const result = await service.findAll();

      expect(result).toEqual(allRoles);
      expect(mockDb.query.roles.findMany).toHaveBeenCalledTimes(1);
    });

    it('returns an empty array when there are no roles', async () => {
      mockDb.query.roles.findMany.mockResolvedValueOnce([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // findByName
  // ─────────────────────────────────────────────────────────────────────────

  describe('findByName', () => {
    it('returns the matching role when found', async () => {
      const role = makeRole({ name: 'admin' });
      mockDb.query.roles.findFirst.mockResolvedValueOnce(role);

      const result = await service.findByName('admin');

      expect(result).toEqual(role);
      expect(mockDb.query.roles.findFirst).toHaveBeenCalledTimes(1);
    });

    it('returns undefined when the role does not exist', async () => {
      mockDb.query.roles.findFirst.mockResolvedValueOnce(undefined);

      const result = await service.findByName('nonexistent');

      expect(result).toBeUndefined();
    });

    it('normalises the name — trims whitespace', async () => {
      mockDb.query.roles.findFirst.mockResolvedValueOnce(undefined);
      mockEq.mockClear();

      await service.findByName('  admin  ');

      // The second argument to eq() is the normalised value passed to the query.
      expect(mockEq).toHaveBeenCalledWith(expect.anything(), 'admin');
    });

    it('normalises the name — lowercases input', async () => {
      mockDb.query.roles.findFirst.mockResolvedValueOnce(undefined);
      mockEq.mockClear();

      await service.findByName('ADMIN');

      expect(mockEq).toHaveBeenCalledWith(expect.anything(), 'admin');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // findManyByNames
  // ─────────────────────────────────────────────────────────────────────────

  describe('findManyByNames', () => {
    it('returns matched roles for the given names', async () => {
      const matched = [
        makeRole({ name: 'admin' }),
        makeRole({ id: 'role-uuid-2', name: 'teacher' }),
      ];
      mockDb.query.roles.findMany.mockResolvedValueOnce(matched);

      const result = await service.findManyByNames(['admin', 'teacher']);

      expect(result).toEqual(matched);
      expect(mockDb.query.roles.findMany).toHaveBeenCalledTimes(1);
    });

    it('returns an empty array immediately without hitting the DB when given an empty array', async () => {
      const result = await service.findManyByNames([]);

      expect(result).toEqual([]);
      expect(mockDb.query.roles.findMany).not.toHaveBeenCalled();
    });

    it('normalises each name before querying', async () => {
      mockDb.query.roles.findMany.mockResolvedValueOnce([]);
      mockInArray.mockClear();

      await service.findManyByNames(['  Admin ', 'TEACHER']);

      // The second argument to inArray() is the normalised names array.
      expect(mockInArray).toHaveBeenCalledWith(expect.anything(), [
        'admin',
        'teacher',
      ]);
    });
  });
});
