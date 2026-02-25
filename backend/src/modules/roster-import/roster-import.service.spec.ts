import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RosterImportService } from './roster-import.service';
import { DatabaseService } from '../../database/database.service';

// --- mock parsers ---
jest.mock('./parsers/xlsx.parser', () => ({
  parseXlsx: jest.fn(),
}));
jest.mock('./parsers/csv.parser', () => ({
  parseCsv: jest.fn(),
}));

import { parseXlsx } from './parsers/xlsx.parser';
import { parseCsv } from './parsers/csv.parser';

// helpers --------------------------------------------------------------
const TEACHER_USER = { id: 't1', email: 't@school.edu', roles: ['teacher'] };
const ADMIN_USER   = { id: 'a1', email: 'a@school.edu', roles: ['admin'] };
const SECTION_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_SECTION_ID = '22222222-2222-4222-8222-222222222222';
const STUDENT_USER_ID = '33333333-3333-4333-8333-333333333333';

function makeFileObj(originalname: string, mimetype: string) {
  return ({
    originalname,
    mimetype,
    path: '/tmp/file',
  } as any) as Express.Multer.File;
}

// create a fake section row + header
const SECTION_HEADER = ['GRADE_7 HUMSS-A'];
const HEADER_ROW = ['Student Name', 'LRN', 'Email'];

const SAMPLE_DATA = [
  ['Dela Cruz, Juan A.', '123456780001', 'juan@example.com'],
  ['Unreg, Person', '000000000000', 'nobody@nowhere.com'],
];

// minimal stubbed db object; methods return chainable mocks
function createDbStub() {
  const stub: any = {};
  // chainable builders
  const chain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
    innerJoin: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
    values: jest.fn().mockReturnThis(),
    onConflictDoNothing: jest.fn().mockReturnThis(),
  };
  stub.select = jest.fn().mockReturnValue(chain);
  stub.insert = jest.fn().mockReturnValue(chain);
  stub.update = jest.fn().mockReturnValue(chain);
  stub.transaction = jest.fn(async (cb: any) => cb(stub));
  stub.query = {
    sections: { findFirst: jest.fn() },
    users: { findFirst: jest.fn() },
    pendingRoster: { findFirst: jest.fn() },
  };
  return stub;
}

let service: RosterImportService;
let dbStub: any;

beforeEach(() => {
  jest.clearAllMocks();
  dbStub = createDbStub();
  const databaseService = { db: dbStub } as unknown as DatabaseService;
  service = new RosterImportService(databaseService);
});

// --- parseAndPreview tests ------------------------------------------------
describe('parseAndPreview', () => {
  it('throws NotFoundException when section is missing', async () => {
    dbStub.query.sections.findFirst.mockResolvedValue(null);
    await expect(
      service.parseAndPreview('sec1', makeFileObj('roster.csv', 'text/csv'), ADMIN_USER),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws when section header does not match route param', async () => {
    dbStub.query.sections.findFirst.mockResolvedValue({
      id: SECTION_ID,
      gradeLevel: '8',
      name: 'STEM',
      isActive: true,
    });
    (parseCsv as jest.Mock).mockReturnValue([['GRADE_7 HUMSS-A'], HEADER_ROW]);
    await expect(
      service.parseAndPreview(SECTION_ID, makeFileObj('roster.csv', 'text/csv'), ADMIN_USER),
    ).rejects.toThrow(/does not match the target section/i);
  });

  it('correctly separates registered vs pending and errors', async () => {
    dbStub.query.sections.findFirst.mockResolvedValue({
      id: SECTION_ID,
      gradeLevel: '7',
      name: 'HUMSS-A',
      isActive: true,
    });
    (parseCsv as jest.Mock).mockReturnValue([SECTION_HEADER, HEADER_ROW, ...SAMPLE_DATA]);

    // simulate one existing user by email
    dbStub.select.mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ id: 'u1', email: 'juan@example.com' }]),
    });

    // simulate enrollments query
    dbStub.select.mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ studentId: 'u1' }]),
    });

    const resp = await service.parseAndPreview(
      SECTION_ID,
      makeFileObj('roster.csv', 'text/csv'),
      ADMIN_USER,
    );
    expect(resp.registered).toHaveLength(1);
    expect(resp.pending).toHaveLength(1);
    expect(resp.errors).toHaveLength(0);
    expect(resp.summary.totalDataRows).toBe(2);
  });
});

// --- commitRoster tests ---------------------------------------------------
describe('commitRoster', () => {
  it('rejects when sectionId mismatches dto', async () => {
    dbStub.query.sections.findFirst.mockResolvedValue({
      id: SECTION_ID,
      gradeLevel: '7',
      name: 'HUMSS',
      isActive: true,
    });
    const dto = { sectionId: OTHER_SECTION_ID, enrolledRows: [], pendingRows: [] };
    await expect(service.commitRoster(SECTION_ID, dto as any, ADMIN_USER)).rejects.toThrow(
      /does not match route parameter/i,
    );
  });

  it('rejects if section is inactive', async () => {
    dbStub.query.sections.findFirst.mockResolvedValue({
      id: SECTION_ID,
      isActive: false,
      gradeLevel: '7',
      name: 'HUMSS',
    });
    const dto = { sectionId: SECTION_ID, enrolledRows: [], pendingRows: [] };
    await expect(service.commitRoster(SECTION_ID, dto as any, ADMIN_USER)).rejects.toThrow(
      /inactive/i,
    );
  });

  it('rejects when teacher not adviser', async () => {
    dbStub.query.sections.findFirst.mockResolvedValue({
      id: SECTION_ID,
      isActive: true,
      adviserId: 'other',
      gradeLevel: '7',
      name: 'HUMSS',
    });
    const dto = { sectionId: SECTION_ID, enrolledRows: [], pendingRows: [] };
    await expect(service.commitRoster(SECTION_ID, dto as any, TEACHER_USER)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws capacity error when over limit', async () => {
    dbStub.query.sections.findFirst.mockResolvedValue({
      id: SECTION_ID,
      isActive: true,
      gradeLevel: '7',
      name: 'HUMSS',
      capacity: 1,
    });
    // first where (capacity count)
    dbStub.select.mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ count: 1 }]),
    });

    // enrollments check returns none
    dbStub.select.mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([]),
    });

    const dto = {
      sectionId: SECTION_ID,
      enrolledRows: [
        {
          userId: STUDENT_USER_ID,
          name: { lastName: 'Dela Cruz', firstName: 'Juan', middleInitial: 'A' },
          lrn: '123456780001',
          email: 'a@b.com',
        },
      ],
      pendingRows: [],
    };
    await expect(service.commitRoster(SECTION_ID, dto as any, ADMIN_USER)).rejects.toThrow(
      /exceed the section capacity/i,
    );
  });

  it('successfully enrolls and inserts pending rows', async () => {
    dbStub.query.sections.findFirst.mockResolvedValue({
      id: SECTION_ID,
      isActive: true,
      gradeLevel: '7',
      name: 'HUMSS',
      capacity: 10,
    });
    // helper that produces a fresh chain object with innerJoin
    const freshChain = () => ({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([]),
      innerJoin: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
      values: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockReturnThis(),
    });

    // capacity count returns 0
    dbStub.select.mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ count: 0 }]),
    });
    // already enrolled returns []
    dbStub.select.mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([]),
    });
    // student role verification: return a chain with innerJoin and custom where
    const chainForRole = freshChain();
    chainForRole.where = jest.fn().mockResolvedValue([{ userId: STUDENT_USER_ID }]);
    dbStub.select.mockReturnValueOnce(chainForRole);
    // override transaction to simulate inserts for enrollments then pending rows
    const enrollResult = [{ studentId: STUDENT_USER_ID }];
    const pendingResult = [{ id: 'p1' }];
    dbStub.transaction = jest.fn(async (cb: any) => {
      const tx = {
        select: dbStub.select,
        update: dbStub.update,
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnThis(),
          // returning invoked twice: first for enroll, then for pending
          returning: jest
            .fn()
            .mockResolvedValueOnce(enrollResult)
            .mockResolvedValueOnce(pendingResult),
          onConflictDoNothing: jest.fn().mockReturnThis(),
        }),
      } as any;
      return cb(tx);
    });

    const dto = {
      sectionId: SECTION_ID,
      enrolledRows: [
        {
          userId: STUDENT_USER_ID,
          name: { lastName: 'Dela Cruz', firstName: 'Juan', middleInitial: 'A' },
          lrn: '123456780001',
          email: 'a@b.com',
        },
      ],
      pendingRows: [
        {
          name: { lastName: 'Unreg', firstName: 'Person', middleInitial: null },
          lrn: '000000000000',
          email: 'x@y.com',
        },
      ],
    };

    const res = await service.commitRoster(SECTION_ID, dto as any, ADMIN_USER);
    expect(res.enrolledUserIds).toEqual([STUDENT_USER_ID]);
    expect(res.pendingRosterIds).toEqual(['p1']);
    expect(res.summary.enrolled).toBe(1);
    expect(res.summary.pending).toBe(1);
  });
});
