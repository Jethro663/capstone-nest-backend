import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CompleteJaPracticeSessionDto,
  CreateJaPracticeSessionDto,
  JaPracticeBootstrapQueryDto,
  LogJaPracticeEventDto,
  SubmitJaPracticeResponseDto,
} from './dto/ja-practice.dto';
import { JaService } from './ja.service';

@ApiTags('JA Practice')
@ApiBearerAuth('token')
@Controller('ai/student/ja/practice')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.Student)
export class JaController {
  constructor(private readonly jaService: JaService) {}

  @Get('bootstrap')
  @ApiOperation({ summary: 'Load JA practice bootstrap data' })
  async bootstrap(
    @Query() query: JaPracticeBootstrapQueryDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.bootstrap(user, query.classId);
    return {
      success: true,
      message: 'JA practice bootstrap loaded',
      data,
    };
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new JA practice session' })
  async createSession(
    @Body() dto: CreateJaPracticeSessionDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.createSession(user, dto);
    return {
      success: true,
      message: 'JA practice session created',
      data,
    };
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Load an existing JA practice session' })
  async getSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.getSession(user, sessionId, 'practice');
    return {
      success: true,
      message: 'JA practice session loaded',
      data,
    };
  }

  @Post('sessions/:sessionId/responses')
  @ApiOperation({ summary: 'Submit an answer for one JA practice item' })
  async submitResponse(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SubmitJaPracticeResponseDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.submitResponse(
      user,
      sessionId,
      dto,
      'practice',
    );
    return {
      success: true,
      message: 'JA practice response saved',
      data,
    };
  }

  @Post('sessions/:sessionId/events')
  @ApiOperation({
    summary: 'Record focus/visibility events for JA practice session',
  })
  async logEvent(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: LogJaPracticeEventDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.addEvent(user, sessionId, dto, 'practice');
    return {
      success: true,
      message: 'JA practice event recorded',
      data,
    };
  }

  @Post('sessions/:sessionId/complete')
  @ApiOperation({ summary: 'Complete JA practice session and award XP once' })
  async completeSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() _dto: CompleteJaPracticeSessionDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.completeSession(
      sessionId,
      user,
      'practice',
    );
    return {
      success: true,
      message: 'JA practice session completed',
      data,
    };
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Delete a JA practice session and owned data' })
  async deleteSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.deleteSession(sessionId, user);
    return {
      success: true,
      message: 'JA practice session deleted',
      data,
    };
  }
}
