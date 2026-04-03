import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RoleName, Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  AttachModuleItemDto,
  CreateModuleDto,
  CreateModuleSectionDto,
  ModuleThemeKind,
  ReplaceModuleGradingScaleDto,
  ReorderModuleItemsDto,
  ReorderModulesDto,
  ReorderModuleSectionsDto,
  UpdateModuleDto,
  UpdateModuleItemDto,
  UpdateModuleSectionDto,
} from './DTO/module.dto';
import { ContentModulesService } from './content-modules.service';

const MODULE_COVER_UPLOAD_DEST = './uploads/module-covers';
const moduleCoverMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(MODULE_COVER_UPLOAD_DEST, { recursive: true });
      cb(null, MODULE_COVER_UPLOAD_DEST);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `${uuidv4()}_${Date.now()}${ext}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
};

@ApiTags('Modules')
@ApiBearerAuth('token')
@Controller('modules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContentModulesController {
  constructor(private readonly contentModulesService: ContentModulesService) {}

  @Get('class/:classId')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getByClass(@Param('classId') classId: string, @CurrentUser() user: any) {
    const data = await this.contentModulesService.getModulesByClass(
      classId,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Modules retrieved successfully',
      data,
      count: data.length,
    };
  }

  @Get('class/:classId/:moduleId')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getByClassAndModule(
    @Param('classId') classId: string,
    @Param('moduleId') moduleId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.contentModulesService.getModuleByClass(
      classId,
      moduleId,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module retrieved successfully',
      data,
    };
  }

  @Post()
  @Roles(RoleName.Admin, RoleName.Teacher)
  async create(@Body() dto: CreateModuleDto, @CurrentUser() user: any) {
    const data = await this.contentModulesService.createModule(
      dto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module created successfully',
      data,
    };
  }

  @Patch(':moduleId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async update(
    @Param('moduleId') moduleId: string,
    @Body() dto: UpdateModuleDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.contentModulesService.updateModule(
      moduleId,
      dto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module updated successfully',
      data,
    };
  }

  @Delete(':moduleId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async delete(@Param('moduleId') moduleId: string, @CurrentUser() user: any) {
    const data = await this.contentModulesService.deleteModule(
      moduleId,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module deleted successfully',
      data,
    };
  }

  @Put('class/:classId/reorder')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async reorderModules(
    @Param('classId') classId: string,
    @Body() dto: ReorderModulesDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.contentModulesService.reorderModules(
      classId,
      dto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Modules reordered successfully',
      data,
      count: data.length,
    };
  }

  @Post(':moduleId/sections')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async createSection(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateModuleSectionDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.contentModulesService.createSection(
      moduleId,
      dto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module section created successfully',
      data,
    };
  }

  @Patch('sections/:sectionId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async updateSection(
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateModuleSectionDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.contentModulesService.updateSection(
      sectionId,
      dto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module section updated successfully',
      data,
    };
  }

  @Delete('sections/:sectionId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async deleteSection(@Param('sectionId') sectionId: string, @CurrentUser() user: any) {
    const data = await this.contentModulesService.deleteSection(
      sectionId,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module section deleted successfully',
      data,
    };
  }

  @Put(':moduleId/sections/reorder')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async reorderSections(
    @Param('moduleId') moduleId: string,
    @Body() dto: ReorderModuleSectionsDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.contentModulesService.reorderSections(
      moduleId,
      dto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module sections reordered successfully',
      data,
      count: data.length,
    };
  }

  @Post('sections/:sectionId/items')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async attachItem(
    @Param('sectionId') sectionId: string,
    @Body() dto: AttachModuleItemDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.contentModulesService.attachItem(
      sectionId,
      dto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module item attached successfully',
      data,
    };
  }

  @Patch('items/:itemId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateModuleItemDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.contentModulesService.updateItem(
      itemId,
      dto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module item updated successfully',
      data,
    };
  }

  @Delete('items/:itemId')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async deleteItem(@Param('itemId') itemId: string, @CurrentUser() user: any) {
    const data = await this.contentModulesService.deleteItem(
      itemId,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module item detached successfully',
      data,
    };
  }

  @Put('sections/:sectionId/items/reorder')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async reorderItems(
    @Param('sectionId') sectionId: string,
    @Body() dto: ReorderModuleItemsDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.contentModulesService.reorderItems(
      sectionId,
      dto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module items reordered successfully',
      data,
      count: data.length,
    };
  }

  @Put(':moduleId/grading-scale')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async replaceGradingScale(
    @Param('moduleId') moduleId: string,
    @Body() dto: ReplaceModuleGradingScaleDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.contentModulesService.replaceGradingScale(
      moduleId,
      dto,
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module grading scale replaced successfully',
      data,
      count: data.length,
    };
  }

  @Post(':moduleId/cover')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image', moduleCoverMulterOptions))
  async uploadModuleCover(
    @Param('moduleId') moduleId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('Image upload is required');
    }

    const coverImageUrl = `/api/modules/covers/${file.filename}`;
    const data = await this.contentModulesService.updateModule(
      moduleId,
      { themeKind: ModuleThemeKind.Image, coverImageUrl },
      user?.userId,
      user?.roles ?? [],
    );

    return {
      success: true,
      message: 'Module cover uploaded successfully',
      data: {
        coverImageUrl,
        module: data,
      },
    };
  }

  @Public()
  @Get('covers/:filename')
  async serveModuleCover(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const sanitized = path.basename(filename);
    const filePath = path.join(MODULE_COVER_UPLOAD_DEST, sanitized);
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Cover image not found');
    }
    return res.sendFile(path.resolve(filePath));
  }
}
