import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName, Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClassTemplatesService } from './class-templates.service';
import {
  CreateClassTemplateDto,
  PublishClassTemplateDto,
  UpdateClassTemplateContentDto,
  UpdateClassTemplateDto,
} from './dto/class-template.dto';

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
}
