import { Test, TestingModule } from '@nestjs/testing';
import { ContentModulesController } from './content-modules.controller';
import { ContentModulesService } from './content-modules.service';

const CLASS_ID = '00000000-0000-0000-0000-000000000201';
const MODULE_ID = '00000000-0000-0000-0000-000000000202';
const USER = {
  userId: '00000000-0000-0000-0000-000000000203',
  roles: ['student'],
};

describe('ContentModulesController', () => {
  let controller: ContentModulesController;

  const mockService = {
    getModulesByClass: jest.fn(),
    getModuleByClass: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentModulesController],
      providers: [
        {
          provide: ContentModulesService,
          useValue: mockService,
        },
      ],
    }).compile();
    controller = module.get<ContentModulesController>(ContentModulesController);
  });

  it('returns class module list envelope with count', async () => {
    mockService.getModulesByClass.mockResolvedValue([{ id: MODULE_ID }, { id: 'module-2' }]);

    const result = await controller.getByClass(CLASS_ID, USER);

    expect(mockService.getModulesByClass).toHaveBeenCalledWith(
      CLASS_ID,
      USER.userId,
      USER.roles,
    );
    expect(result).toEqual({
      success: true,
      message: 'Modules retrieved successfully',
      data: [{ id: MODULE_ID }, { id: 'module-2' }],
      count: 2,
    });
  });

  it('returns module detail envelope for class + module id', async () => {
    mockService.getModuleByClass.mockResolvedValue({ id: MODULE_ID });

    const result = await controller.getByClassAndModule(CLASS_ID, MODULE_ID, USER);

    expect(mockService.getModuleByClass).toHaveBeenCalledWith(
      CLASS_ID,
      MODULE_ID,
      USER.userId,
      USER.roles,
    );
    expect(result).toEqual({
      success: true,
      message: 'Module retrieved successfully',
      data: { id: MODULE_ID },
    });
  });
});
