import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './DTO/create-section.dto';
import { UpdateSectionDto } from './DTO/update-section.dto';
import { BulkStudentsDto } from './DTO/bulk-students.dto';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SECTION_ID = 'section-uuid-1';
const STUDENT_ID = 'student-uuid-1';
const SCHOOL_YEAR = '2026-2027';

const ADMIN_USER = { userId: 'admin-uuid-1', roles: ['admin'] };
const TEACHER_USER = { userId: 'teacher-uuid-1', roles: ['teacher'] };

const makeSection = (overrides: Partial<any> = {}) => ({
  id: SECTION_ID,
  name: 'Rizal',
  gradeLevel: '7',
  schoolYear: SCHOOL_YEAR,
  capacity: 40,
  isActive: true,
  adviserId: TEACHER_USER.userId,
  adviser: {
    id: TEACHER_USER.userId,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@school.edu',
  },
  ...overrides,
});

const makePaginatedResult = (items: any[] = [makeSection()], total = 1) => ({
  data: items,
  pagination: { page: 1, limit: 50, total, totalPages: 1 },
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSectionsService = {
  findAll: jest.fn(),
  findById: jest.fn(),
  updatePresentation: jest.fn(),
  setSectionHiddenState: jest.fn(),
  getRoster: jest.fn(),
  getCandidates: jest.fn(),
  addStudentsToSection: jest.fn(),
  removeStudentFromSection: jest.fn(),
  createSection: jest.fn(),
  updateSection: jest.fn(),
  archiveSection: jest.fn(),
  restoreSection: jest.fn(),
  deleteSection: jest.fn(),
  permanentlyDeleteSection: jest.fn(),
  bulkLifecycleAction: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SectionsController', () => {
  let controller: SectionsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SectionsController],
      providers: [{ provide: SectionsService, useValue: mockSectionsService }],
    }).compile();

    controller = module.get<SectionsController>(SectionsController);
  });

  // =========================================================================
  // getAllSections
  // =========================================================================

  describe('getAllSections', () => {
    it('returns success:true and spreads the paginated service result', async () => {
      const paginated = makePaginatedResult();
      mockSectionsService.findAll.mockResolvedValue(paginated);

      const result = await controller.getAllSections();

      expect(result).toEqual({ success: true, ...paginated });
    });

    it('passes parsed filters to the service', async () => {
      mockSectionsService.findAll.mockResolvedValue(makePaginatedResult());

      await controller.getAllSections(
        '7',
        SCHOOL_YEAR,
        'true',
        'riz',
        '2',
        '10',
      );

      expect(mockSectionsService.findAll).toHaveBeenCalledWith({
        gradeLevel: '7',
        schoolYear: SCHOOL_YEAR,
        isActive: true,
        search: 'riz',
        page: 2,
        limit: 10,
      });
    });

    it('does not add isActive to filters when the query param is absent', async () => {
      mockSectionsService.findAll.mockResolvedValue(makePaginatedResult());

      await controller.getAllSections(undefined, undefined, undefined);

      const [filtersArg] = mockSectionsService.findAll.mock.calls[0];
      expect(filtersArg).not.toHaveProperty('isActive');
    });

    it('throws BadRequestException for invalid page or limit values', async () => {
      await expect(
        controller.getAllSections(
          undefined,
          undefined,
          undefined,
          undefined,
          '0',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.getAllSections(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'not-a-number',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // getMySections
  // =========================================================================

  describe('getMySections', () => {
    it('passes the currentUser.userId as adviserId filter', async () => {
      mockSectionsService.findAll.mockResolvedValue(makePaginatedResult());

      await controller.getMySections(undefined, TEACHER_USER);

      expect(mockSectionsService.findAll).toHaveBeenCalledWith({
        adviserId: TEACHER_USER.userId,
        requesterId: TEACHER_USER.userId,
        status: 'all',
      });
    });

    it('returns success:true and the paginated result', async () => {
      const paginated = makePaginatedResult();
      mockSectionsService.findAll.mockResolvedValue(paginated);

      const result = await controller.getMySections('hidden', TEACHER_USER);

      expect(result).toEqual({ success: true, ...paginated });
      expect(mockSectionsService.findAll).toHaveBeenCalledWith({
        adviserId: TEACHER_USER.userId,
        requesterId: TEACHER_USER.userId,
        status: 'hidden',
      });
    });
  });

  // =========================================================================
  // getSectionById
  // =========================================================================

  describe('getSectionById', () => {
    it('returns success:true and the section data', async () => {
      mockSectionsService.findById.mockResolvedValue(makeSection());

      const result = await controller.getSectionById(SECTION_ID, ADMIN_USER);

      expect(result).toEqual({ success: true, data: makeSection() });
    });

    it('passes the requestingUser to the service for ownership checks', async () => {
      mockSectionsService.findById.mockResolvedValue(makeSection());

      await controller.getSectionById(SECTION_ID, TEACHER_USER);

      expect(mockSectionsService.findById).toHaveBeenCalledWith(
        SECTION_ID,
        TEACHER_USER,
      );
    });

    it('propagates ForbiddenException when the service throws it', async () => {
      mockSectionsService.findById.mockRejectedValue(
        new ForbiddenException('You do not have access to this section'),
      );

      await expect(
        controller.getSectionById(SECTION_ID, TEACHER_USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('propagates NotFoundException when the section does not exist', async () => {
      mockSectionsService.findById.mockRejectedValue(
        new NotFoundException('Section not found'),
      );

      await expect(
        controller.getSectionById('nonexistent-id', ADMIN_USER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // createSection
  // =========================================================================

  describe('createSection', () => {
    const dto: CreateSectionDto = {
      name: 'Rizal',
      gradeLevel: '7',
      schoolYear: SCHOOL_YEAR,
      capacity: 40,
    };

    it('returns success message and the created section', async () => {
      mockSectionsService.createSection.mockResolvedValue(makeSection());

      const result = await controller.createSection(dto, ADMIN_USER);

      expect(result).toEqual({
        success: true,
        message: 'Section created successfully',
        data: makeSection(),
      });
      expect(mockSectionsService.createSection).toHaveBeenCalledWith(
        dto,
        ADMIN_USER.userId,
        ADMIN_USER.roles,
      );
    });

    it('propagates ConflictException from the service', async () => {
      const { ConflictException } = jest.requireActual('@nestjs/common');
      mockSectionsService.createSection.mockRejectedValue(
        new ConflictException('Duplicate section'),
      );

      await expect(controller.createSection(dto, ADMIN_USER)).rejects.toThrow();
    });
  });

  // =========================================================================
  // updateSection
  // =========================================================================

  describe('updateSection', () => {
    it('returns success message and the updated section', async () => {
      const updated = makeSection({ name: 'Bonifacio' });
      mockSectionsService.updateSection.mockResolvedValue(updated);

      const result = await controller.updateSection(
        SECTION_ID,
        {
          name: 'Bonifacio',
        } as UpdateSectionDto,
        ADMIN_USER,
      );

      expect(result).toEqual({
        success: true,
        message: 'Section updated successfully',
        data: updated,
      });
      expect(mockSectionsService.updateSection).toHaveBeenCalledWith(
        SECTION_ID,
        {
          name: 'Bonifacio',
        },
        ADMIN_USER.userId,
        ADMIN_USER.roles,
      );
    });
  });

  describe('updateSectionPresentation', () => {
    it('returns success message and updated section payload', async () => {
      const updated = makeSection({ cardBannerUrl: '/api/sections/banners/a.png' });
      mockSectionsService.updatePresentation.mockResolvedValue(updated);

      const result = await controller.updateSectionPresentation(
        SECTION_ID,
        { cardBannerUrl: '/api/sections/banners/a.png' },
        TEACHER_USER,
      );

      expect(mockSectionsService.updatePresentation).toHaveBeenCalledWith(
        SECTION_ID,
        { cardBannerUrl: '/api/sections/banners/a.png' },
        TEACHER_USER.userId,
        TEACHER_USER.roles,
      );
      expect(result).toEqual({
        success: true,
        message: 'Section presentation updated successfully',
        data: updated,
      });
    });
  });

  describe('uploadSectionBanner', () => {
    it('returns validation message when no file is provided', async () => {
      const result = await controller.uploadSectionBanner(
        SECTION_ID,
        undefined as unknown as Express.Multer.File,
        TEACHER_USER,
      );

      expect(result).toEqual({
        success: false,
        message: 'Image upload is required',
      });
    });
  });

  // =========================================================================
  // deleteSection
  // =========================================================================

  describe('deleteSection', () => {
    it('returns success message on soft delete', async () => {
      mockSectionsService.archiveSection.mockResolvedValue(undefined);

      const result = await controller.deleteSection(SECTION_ID, ADMIN_USER);

      expect(result).toEqual({
        success: true,
        message: 'Section archived successfully',
      });
      expect(mockSectionsService.archiveSection).toHaveBeenCalledWith(
        SECTION_ID,
        ADMIN_USER.userId,
        ADMIN_USER.roles,
      );
    });
  });

  describe('restoreSection', () => {
    it('forwards actor context and returns success message', async () => {
      mockSectionsService.restoreSection.mockResolvedValue(undefined);

      const result = await controller.restoreSection(SECTION_ID, ADMIN_USER);

      expect(mockSectionsService.restoreSection).toHaveBeenCalledWith(
        SECTION_ID,
        ADMIN_USER.userId,
        ADMIN_USER.roles,
      );
      expect(result).toEqual({
        success: true,
        message: 'Section restored successfully',
      });
    });
  });

  describe('bulkLifecycle', () => {
    it('returns the response envelope with section bulk summary data', async () => {
      mockSectionsService.bulkLifecycleAction.mockResolvedValue({
        message: '2 sections archived; 1 failed.',
        data: {
          action: 'archive',
          requested: 3,
          succeeded: ['s1', 's2'],
          failed: [{ sectionId: 's3', reason: 'Section is already archived.' }],
        },
      });

      const result = await controller.bulkLifecycle(
        {
          action: 'archive',
          sectionIds: ['s1', 's2', 's3'],
        },
        ADMIN_USER,
      );

      expect(mockSectionsService.bulkLifecycleAction).toHaveBeenCalledWith({
        action: 'archive',
        sectionIds: ['s1', 's2', 's3'],
      },
      ADMIN_USER.userId,
      ADMIN_USER.roles);
      expect(result).toEqual({
        success: true,
        message: '2 sections archived; 1 failed.',
        data: {
          action: 'archive',
          requested: 3,
          succeeded: ['s1', 's2'],
          failed: [{ sectionId: 's3', reason: 'Section is already archived.' }],
        },
      });
    });
  });

  describe('hideSection / unhideSection', () => {
    it('returns hide response envelope', async () => {
      mockSectionsService.setSectionHiddenState.mockResolvedValue({
        sectionId: SECTION_ID,
        isHidden: true,
      });

      const result = await controller.hideSection(SECTION_ID, TEACHER_USER);
      expect(mockSectionsService.setSectionHiddenState).toHaveBeenCalledWith(
        SECTION_ID,
        TEACHER_USER.userId,
        TEACHER_USER.roles,
        true,
      );
      expect(result).toEqual({
        success: true,
        message: 'Section hidden successfully',
        data: { sectionId: SECTION_ID, isHidden: true },
      });
    });

    it('returns unhide response envelope', async () => {
      mockSectionsService.setSectionHiddenState.mockResolvedValue({
        sectionId: SECTION_ID,
        isHidden: false,
      });

      const result = await controller.unhideSection(SECTION_ID, TEACHER_USER);
      expect(mockSectionsService.setSectionHiddenState).toHaveBeenCalledWith(
        SECTION_ID,
        TEACHER_USER.userId,
        TEACHER_USER.roles,
        false,
      );
      expect(result).toEqual({
        success: true,
        message: 'Section restored successfully',
        data: { sectionId: SECTION_ID, isHidden: false },
      });
    });
  });

  // =========================================================================
  // getRoster
  // =========================================================================

  describe('getRoster', () => {
    const rosterRows = [
      {
        enrollmentId: 'e1',
        studentId: STUDENT_ID,
        status: 'enrolled',
        enrolledAt: new Date(),
        student: {},
      },
    ];

    it('returns roster data with a count', async () => {
      mockSectionsService.getRoster.mockResolvedValue(rosterRows);

      const result = await controller.getRoster(SECTION_ID, ADMIN_USER);

      expect(result).toEqual({ success: true, data: rosterRows, count: 1 });
    });

    it('passes requestingUser to the service', async () => {
      mockSectionsService.getRoster.mockResolvedValue(rosterRows);

      await controller.getRoster(SECTION_ID, TEACHER_USER);

      expect(mockSectionsService.getRoster).toHaveBeenCalledWith(
        SECTION_ID,
        TEACHER_USER,
      );
    });

    it('returns count:0 when there are no enrolled students', async () => {
      mockSectionsService.getRoster.mockResolvedValue([]);

      const result = await controller.getRoster(SECTION_ID, ADMIN_USER);

      expect(result.count).toBe(0);
      expect(result.data).toEqual([]);
    });
  });

  // =========================================================================
  // getCandidates
  // =========================================================================

  describe('getCandidates', () => {
    const candidateRows = [
      {
        id: STUDENT_ID,
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        email: 'juan@school.edu',
        gradeLevel: '7',
      },
    ];

    it('returns candidate data with count', async () => {
      mockSectionsService.getCandidates.mockResolvedValue(candidateRows);

      const result = await controller.getCandidates(
        SECTION_ID,
        ADMIN_USER,
        '7',
        'juan',
      );

      expect(result).toEqual({ success: true, data: candidateRows, count: 1 });
    });

    it('passes filters to the service', async () => {
      mockSectionsService.getCandidates.mockResolvedValue([]);

      await controller.getCandidates(SECTION_ID, ADMIN_USER, '8', 'dela');

      expect(mockSectionsService.getCandidates).toHaveBeenCalledWith(
        SECTION_ID,
        {
          gradeLevel: '8',
          search: 'dela',
        },
        ADMIN_USER,
      );
    });

    it('passes an empty object when no filters are given', async () => {
      mockSectionsService.getCandidates.mockResolvedValue([]);

      await controller.getCandidates(SECTION_ID, ADMIN_USER);

      expect(mockSectionsService.getCandidates).toHaveBeenCalledWith(
        SECTION_ID,
        {},
        ADMIN_USER,
      );
    });
  });

  // =========================================================================
  // addStudentsToSection
  // =========================================================================

  describe('addStudentsToSection', () => {
    const dto: BulkStudentsDto = { studentIds: [STUDENT_ID] };

    it('returns success message and service result', async () => {
      const serviceResult = { createdCount: 1, created: [{}], skipped: 0 };
      mockSectionsService.addStudentsToSection.mockResolvedValue(serviceResult);

      const result = await controller.addStudentsToSection(
        SECTION_ID,
        undefined,
        dto,
      );

      expect(result).toEqual({
        success: true,
        message: '1 student(s) added to section',
        data: serviceResult,
      });
    });

    it('passes the DTO directly to the service', async () => {
      mockSectionsService.addStudentsToSection.mockResolvedValue({
        createdCount: 0,
        created: [],
        skipped: 0,
      });

      await controller.addStudentsToSection(SECTION_ID, undefined, dto);

      expect(mockSectionsService.addStudentsToSection).toHaveBeenCalledWith(
        SECTION_ID,
        dto,
        undefined,
      );
    });

    it('propagates BadRequestException from the service (e.g. capacity exceeded)', async () => {
      mockSectionsService.addStudentsToSection.mockRejectedValue(
        new BadRequestException('Exceeds capacity'),
      );

      await expect(
        controller.addStudentsToSection(SECTION_ID, undefined, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // removeStudentFromSection
  // =========================================================================

  describe('removeStudentFromSection', () => {
    it('returns success:true and the service result', async () => {
      mockSectionsService.removeStudentFromSection.mockResolvedValue({
        removed: true,
      });

      const result = await controller.removeStudentFromSection(
        SECTION_ID,
        STUDENT_ID,
      );

      expect(result).toEqual({ success: true, data: { removed: true } });
    });

    it('propagates BadRequestException when removal is blocked by class enrollment', async () => {
      mockSectionsService.removeStudentFromSection.mockRejectedValue(
        new BadRequestException('Remove class enrollment first'),
      );

      await expect(
        controller.removeStudentFromSection(SECTION_ID, STUDENT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // permanentlyDeleteSection
  // =========================================================================

  describe('permanentlyDeleteSection', () => {
    it('returns success message after permanent deletion', async () => {
      mockSectionsService.permanentlyDeleteSection.mockResolvedValue(undefined);

      const result = await controller.permanentlyDeleteSection(
        SECTION_ID,
        ADMIN_USER,
      );

      expect(result).toEqual({
        success: true,
        message: 'Section permanently deleted',
      });
      expect(mockSectionsService.permanentlyDeleteSection).toHaveBeenCalledWith(
        SECTION_ID,
        ADMIN_USER.userId,
        ADMIN_USER.roles,
      );
    });

    it('propagates BadRequestException when section has active data', async () => {
      mockSectionsService.permanentlyDeleteSection.mockRejectedValue(
        new BadRequestException('Cannot delete: has active classes'),
      );

      await expect(
        controller.permanentlyDeleteSection(SECTION_ID, ADMIN_USER),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
