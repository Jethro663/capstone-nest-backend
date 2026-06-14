import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { RoleName, Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClassTemplatesService } from './class-templates.service';
import {
  CreateClassTemplateDto,
  EngineImportDto,
  EngineImportValidateDto,
  PublishClassTemplateDto,
  UpdateClassTemplateContentDto,
  UpdateClassTemplateDto,
} from './dto/class-template.dto';

const IMAGE_UPLOAD_DEST = './uploads/question-images';
const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function isAllowedImageUpload(file: {
  originalname: string;
  mimetype: string;
}) {
  const extension = path.extname(file.originalname).toLowerCase();
  return (
    ALLOWED_IMAGE_MIMES.includes(file.mimetype) &&
    ALLOWED_IMAGE_EXTENSIONS.includes(extension)
  );
}

@ApiTags('Class Templates')
@ApiBearerAuth('token')
@Controller('class-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassTemplatesController {
  constructor(private readonly classTemplatesService: ClassTemplatesService) {}

  @Get()
  @Roles(RoleName.Admin)
  async getAll(
    @CurrentUser() user: any,
    @Query('subjectCode') subjectCode?: string,
    @Query('subjectGradeLevel') subjectGradeLevel?: string,
  ) {
    const data = await this.classTemplatesService.findAll({
      subjectCode,
      subjectGradeLevel,
    });
    return { success: true, message: 'Templates retrieved', data };
  }

  @Get('compatible')
  @Roles(RoleName.Admin)
  async getCompatible(
    @Query('subjectCode') subjectCode: string,
    @Query('subjectGradeLevel') subjectGradeLevel: string,
  ) {
    const data = await this.classTemplatesService.getPublishedByCompatibility(
      subjectCode,
      subjectGradeLevel,
    );
    return { success: true, message: 'Compatible templates retrieved', data };
  }

  @Post()
  @Roles(RoleName.Admin)
  async create(@Body() dto: CreateClassTemplateDto, @CurrentUser() user: any) {
    const data = await this.classTemplatesService.create(
      dto,
      user?.userId,
      user?.roles ?? [],
    );
    return { success: true, message: 'Template created', data };
  }

  @Get(':id')
  @Roles(RoleName.Admin)
  async getOne(@Param('id') id: string) {
    const data = await this.classTemplatesService.findOne(id);
    return { success: true, message: 'Template retrieved', data };
  }

  @Patch(':id')
  @Roles(RoleName.Admin)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClassTemplateDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.classTemplatesService.update(
      id,
      dto,
      user?.userId,
      user?.roles ?? [],
    );
    return { success: true, message: 'Template updated', data };
  }

  @Delete(':id')
  @Roles(RoleName.Admin)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.classTemplatesService.remove(
      id,
      user?.userId,
      user?.roles ?? [],
    );
    return { success: true, message: 'Template deleted', data };
  }

  @Post(':id/publish')
  @Roles(RoleName.Admin)
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishClassTemplateDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.classTemplatesService.publish(
      id,
      dto,
      user?.userId,
      user?.roles ?? [],
    );
    return { success: true, message: 'Template published', data };
  }

  @Get(':id/content')
  @Roles(RoleName.Admin)
  async getContent(@Param('id') id: string) {
    const data = await this.classTemplatesService.getContent(id);
    return { success: true, message: 'Template content retrieved', data };
  }

  @Put(':id/content')
  @Roles(RoleName.Admin)
  async updateContent(
    @Param('id') id: string,
    @Body() dto: UpdateClassTemplateContentDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.classTemplatesService.updateContent(
      id,
      dto,
      user?.userId,
      user?.roles ?? [],
    );
    return { success: true, message: 'Template content saved', data };
  }

  @Post(':id/assessment-images')
  @Roles(RoleName.Admin)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(IMAGE_UPLOAD_DEST, { recursive: true });
          cb(null, IMAGE_UPLOAD_DEST);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${uuidv4()}_${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (isAllowedImageUpload(file)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only JPG, PNG, GIF, and WEBP image files are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadAssessmentImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    return {
      success: true,
      message: 'Template assessment image uploaded',
      data: {
        imageUrl: `/api/class-templates/images/${file.filename}`,
      },
    };
  }

  @Public()
  @Get('images/:filename')
  async serveAssessmentImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const sanitized = path.basename(filename);
    const filePath = path.join(IMAGE_UPLOAD_DEST, sanitized);
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Image not found');
    }
    return res.sendFile(path.resolve(filePath));
  }

  @Get(':id/engine-export')
  @Roles(RoleName.Admin)
  async getEngineExport(@Param('id') id: string) {
    const data = await this.classTemplatesService.getEngineExport(id);
    return { success: true, message: 'Template engine export generated', data };
  }

  @Post('engine-import/validate')
  @Roles(RoleName.Admin)
  async validateEngineImport(@Body() dto: EngineImportValidateDto) {
    const data = await this.classTemplatesService.validateEngineImport(
      dto.manifest,
    );
    return {
      success: true,
      message: 'Template engine import validation completed',
      data,
    };
  }

  @Post('engine-import')
  @Roles(RoleName.Admin)
  async importEngine(@Body() dto: EngineImportDto, @CurrentUser() user: any) {
    const data = await this.classTemplatesService.importEngine(
      dto.manifest,
      user?.userId,
      user?.roles ?? [],
      Boolean(dto.publish),
    );
    return { success: true, message: 'Template engine imported', data };
  }
}
