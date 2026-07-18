import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleName, Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ImpactPreviewQueryDto } from './DTO/impact-preview-query.dto';
import { TransitionAcademicStateDto } from './DTO/transition-academic-state.dto';
import { AcademicStateService } from './academic-state.service';

@ApiTags('Academic State')
@ApiBearerAuth('token')
@Controller('academic-state')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicStateController {
  constructor(private readonly academicStateService: AcademicStateService) {}

  @Get('current')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getCurrent() {
    const data = await this.academicStateService.getCurrentState();
    return {
      success: true,
      message: 'Current academic state retrieved',
      data,
    };
  }

  @Get('impact-preview')
  @Roles(RoleName.Admin)
  async getImpactPreview(@Query() query: ImpactPreviewQueryDto) {
    const data = await this.academicStateService.getImpactPreview(
      query.schoolYear,
    );
    return {
      success: true,
      message: 'Academic transition impact preview retrieved',
      data,
    };
  }

  @Post('transition')
  @Roles(RoleName.Admin)
  async transition(
    @Body() dto: TransitionAcademicStateDto,
    @CurrentUser() user: any,
  ) {
    const actorId = user?.userId ?? user?.id;
    const data = await this.academicStateService.transition(dto, actorId);
    return {
      success: true,
      message: 'Academic state updated',
      data,
    };
  }
}
