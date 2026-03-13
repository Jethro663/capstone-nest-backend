import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

import { AiProxyService } from './ai-proxy.service';
import { ChatRequestDto } from './DTO/chat.dto';
import {
  ExtractModuleDto,
  ApplyExtractionDto,
  UpdateExtractionDto,
} from './DTO/extract-module.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('AI Mentor')
@ApiBearerAuth('token')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiMentorController {
  constructor(private readonly proxy: AiProxyService) {}

  // ─── JAKIPIR Chat ──────────────────────────────────────────────────────

  /**
   * POST /api/ai/chat
   * Multi-turn AI Mentor chat with JAKIPIR ("Ja").
   * Students only — Ja is a personalized learning detective.
   *
   * First message:   { "message": "Hi Ja!" }
   * Follow-up:       { "message": "Tell me more", "sessionId": "<from-prev>" }
   */
  @Post('chat')
  @Roles(RoleName.Student, RoleName.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with Ja (JAKIPIR AI Mentor)' })
  @ApiResponse({ status: 200, description: "Ja's reply + session ID" })
  async chat(
    @Body() dto: ChatRequestDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('POST', '/chat', user, dto);
  }

  // ─── Health check ─────────────────────────────────────────────────────

  /**
   * GET /api/ai/health
   * Returns Ollama availability + configured model.
   * Public so the frontend can show a status indicator.
   */
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Check Ollama availability' })
  async health() {
    return this.proxy.forward('GET', '/health', {
      id: '',
      email: '',
      roles: [],
    });
  }

  // ─── Module Extraction ─────────────────────────────────────────────────

  /**
   * POST /api/ai/extract-module
   * Queues a PDF → structured lesson extraction job.
   * Returns immediately with extractionId for polling.
   */
  @Post('extract-module')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Queue extraction of structured lessons from an uploaded PDF',
  })
  @ApiResponse({
    status: 202,
    description: 'Extraction queued — poll for status',
  })
  async extractModule(
    @Body() dto: ExtractModuleDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('POST', '/extract', user, dto);
  }

  // ─── Extraction status (polling) ──────────────────────────────────────

  /**
   * GET /api/ai/extractions/:id/status
   * Returns extraction progress for polling.
   */
  @Get('extractions/:id/status')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Poll extraction status and progress' })
  async getExtractionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('GET', `/extractions/${id}/status`, user);
  }

  // ─── List extractions ─────────────────────────────────────────────────

  /**
   * GET /api/ai/extractions?classId=...
   * Lists past extraction attempts for a class.
   */
  @Get('extractions')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'List module extractions for a class' })
  @ApiQuery({ name: 'classId', type: String, required: true })
  async listExtractions(
    @Query('classId', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('GET', `/extractions?classId=${classId}`, user);
  }

  // ─── Get single extraction ─────────────────────────────────────────────

  /**
   * GET /api/ai/extractions/:id
   * Retrieves a single extraction with full structured content.
   */
  @Get('extractions/:id')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Get extraction details' })
  async getExtraction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('GET', `/extractions/${id}`, user);
  }

  // ─── Update extraction (edit before applying) ─────────────────────────

  /**
   * PATCH /api/ai/extractions/:id
   * Updates the structured content of a completed extraction.
   * Teacher can edit lesson titles, block content, reorder, etc. before applying.
   */
  @Patch('extractions/:id')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({
    summary: 'Edit extraction structured content before applying',
  })
  @ApiResponse({ status: 200, description: 'Extraction updated' })
  async updateExtraction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExtractionDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('PATCH', `/extractions/${id}`, user, dto);
  }

  // ─── Apply extraction → create lessons ─────────────────────────────────

  /**
   * POST /api/ai/extractions/:id/apply
   * Takes a completed extraction and creates actual lesson + content block
   * records in the database. Supports selective lesson application.
   */
  @Post('extractions/:id/apply')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Apply extraction → create lessons (optionally selective)',
  })
  @ApiResponse({ status: 201, description: 'Lessons created from extraction' })
  async applyExtraction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyExtractionDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('POST', `/extractions/${id}/apply`, user, dto);
  }

  // ─── Delete extraction ─────────────────────────────────────────────────

  /**
   * DELETE /api/ai/extractions/:id
   * Deletes an extraction that hasn't been applied yet.
   */
  @Delete('extractions/:id')
  @Roles(RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Delete an unapplied extraction' })
  async deleteExtraction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('DELETE', `/extractions/${id}`, user);
  }

  // ─── AI interaction history ────────────────────────────────────────────

  /**
   * GET /api/ai/history
   * Returns the current user's AI interaction log (latest 20).
   */
  @Get('history')
  @Roles(RoleName.Student, RoleName.Teacher, RoleName.Admin)
  @ApiOperation({ summary: 'Get AI interaction history' })
  async history(
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.proxy.forward('GET', '/history', user);
  }
}
