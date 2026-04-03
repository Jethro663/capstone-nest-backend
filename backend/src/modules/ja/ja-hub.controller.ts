import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CompleteJaPracticeSessionDto,
  CreateJaAskThreadDto,
  CreateJaReviewSessionDto,
  JaAskBootstrapQueryDto,
  JaHubQueryDto,
  JaReviewBootstrapQueryDto,
  JaReviewEventDto,
  JaReviewSubmitResponseDto,
  SendJaAskMessageDto,
} from './dto/ja-practice.dto';
import { JaService } from './ja.service';

@ApiTags('JA Hub')
@ApiBearerAuth('token')
@Controller('ai/student/ja')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.Student)
export class JaHubController {
  constructor(private readonly jaService: JaService) {}

  @Get('hub')
  @ApiOperation({ summary: 'Load unified JA hub data for student workspace' })
  async hub(
    @Query() query: JaHubQueryDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.hub(user, query.classId);
    return {
      success: true,
      message: 'JA hub loaded',
      data,
    };
  }

  @Get('ask/bootstrap')
  @ApiOperation({ summary: 'Load JA Ask bootstrap for selected class' })
  async askBootstrap(
    @Query() query: JaAskBootstrapQueryDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.askBootstrap(user, query.classId);
    return {
      success: true,
      message: 'JA Ask bootstrap loaded',
      data,
    };
  }

  @Post('ask/threads')
  @ApiOperation({ summary: 'Create a JA Ask thread' })
  async createAskThread(
    @Body() dto: CreateJaAskThreadDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.createAskThread(user, dto);
    return {
      success: true,
      message: 'JA Ask thread created',
      data,
    };
  }

  @Get('ask/threads/:threadId')
  @ApiOperation({ summary: 'Load a JA Ask thread with latest messages' })
  async getAskThread(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.getAskThread(user, threadId);
    return {
      success: true,
      message: 'JA Ask thread loaded',
      data,
    };
  }

  @Post('ask/threads/:threadId/messages')
  @ApiOperation({ summary: 'Send JA Ask message and get grounded reply' })
  async sendAskMessage(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Body() dto: SendJaAskMessageDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.sendAskMessage(user, threadId, dto);
    return {
      success: true,
      message: 'JA Ask response generated',
      data,
    };
  }

  @Get('review/bootstrap')
  @ApiOperation({ summary: 'Load JA Review bootstrap for selected class' })
  async reviewBootstrap(
    @Query() query: JaReviewBootstrapQueryDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.reviewBootstrap(user, query.classId);
    return {
      success: true,
      message: 'JA Review bootstrap loaded',
      data,
    };
  }

  @Post('review/sessions')
  @ApiOperation({ summary: 'Create a new JA Review session' })
  async createReviewSession(
    @Body() dto: CreateJaReviewSessionDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.createReviewSession(user, dto);
    return {
      success: true,
      message: 'JA Review session created',
      data,
    };
  }

  @Get('review/sessions/:sessionId')
  @ApiOperation({ summary: 'Load an existing JA Review session' })
  async getReviewSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.getSession(user, sessionId, 'review');
    return {
      success: true,
      message: 'JA Review session loaded',
      data,
    };
  }

  @Post('review/sessions/:sessionId/responses')
  @ApiOperation({ summary: 'Submit an answer for one JA Review item' })
  async submitReviewResponse(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: JaReviewSubmitResponseDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.submitResponse(user, sessionId, dto, 'review');
    return {
      success: true,
      message: 'JA Review response saved',
      data,
    };
  }

  @Post('review/sessions/:sessionId/events')
  @ApiOperation({ summary: 'Record events for JA Review session' })
  async logReviewEvent(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: JaReviewEventDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.addEvent(user, sessionId, dto, 'review');
    return {
      success: true,
      message: 'JA Review event recorded',
      data,
    };
  }

  @Post('review/sessions/:sessionId/complete')
  @ApiOperation({ summary: 'Complete JA Review session and award XP once' })
  async completeReviewSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() _dto: CompleteJaPracticeSessionDto,
    @CurrentUser()
    user: { id: string; userId?: string; email: string; roles: string[] },
  ) {
    const data = await this.jaService.completeSession(sessionId, user, 'review');
    return {
      success: true,
      message: 'JA Review session completed',
      data,
    };
  }
}
