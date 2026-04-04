import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Res,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  SubmitAssessmentDto,
  StartAssessmentDto,
  UpdateAttemptProgressDto,
  ReturnGradeDto,
  BulkReturnGradesDto,
} from './DTO/assessment.dto';

const IMAGE_UPLOAD_DEST = './uploads/question-images';
const FILE_UPLOAD_DEST = './uploads/assessment-files';
const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const ALLOWED_ASSESSMENT_FILE_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.oasis.opendocument.spreadsheet',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/octet-stream',
];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

@ApiTags('Assessments')
@ApiBearerAuth('token')
@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentsController {
  constructor(private assessmentsService: AssessmentsService) {}

  /**
   * Get all assessments for a class
   * Teacher and Admin can access
   */
  @Get('class/:classId')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getAssessmentsByClass(
    @Param('classId') classId: string,
    @Query('page') pageQuery: string | undefined,
    @Query('limit') limitQuery: string | undefined,
    @Query('status')
    statusQuery: 'all' | 'upcoming' | 'past_due' | 'completed' | undefined,
    @CurrentUser() user: any,
  ) {
    const assessmentPage = await this.assessmentsService.getAssessmentsByClass(
      classId,
      {
        page: pageQuery ? Math.max(Number.parseInt(pageQuery, 10) || 1, 1) : 1,
        limit: limitQuery
          ? Math.min(Math.max(Number.parseInt(limitQuery, 10) || 20, 1), 100)
          : 20,
        status:
          statusQuery === 'upcoming' ||
          statusQuery === 'past_due' ||
          statusQuery === 'completed'
            ? statusQuery
            : 'all',
        studentId:
          Array.isArray(user?.roles) && user.roles.includes(RoleName.Student)
            ? user.userId
            : undefined,
      },
      user,
    );

    return {
      success: true,
      message: 'Assessments retrieved successfully',
      data: assessmentPage.data,
      count: assessmentPage.data.length,
      total: assessmentPage.total,
      page: assessmentPage.page,
      limit: assessmentPage.limit,
      totalPages: assessmentPage.totalPages,
    };
  }

  /**
   * Get a single assessment by ID with all questions
   * Teacher and Admin can access
   */
  @Get(':id')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getAssessmentById(@Param('id') id: string, @CurrentUser() user: any) {
    const viewerRole =
      Array.isArray(user?.roles) && user.roles.includes(RoleName.Student)
        ? 'student'
        : undefined;
    const assessment = await this.assessmentsService.getAssessmentById(
      id,
      viewerRole,
      user,
    );

    return {
      success: true,
      message: 'Assessment retrieved successfully',
      data: assessment,
    };
  }

  /**
   * Create a new assessment
   * Teacher and Admin can access
   */
  @Post()
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.CREATED)
  async createAssessment(
    @Body() createAssessmentDto: CreateAssessmentDto,
    @CurrentUser() user: any,
  ) {
    const assessment = await this.assessmentsService.createAssessment(
      createAssessmentDto,
      user,
    );

    return {
      success: true,
      message: 'Assessment created successfully',
      data: assessment,
    };
  }

  /**
   * Update an assessment
   * Teacher and Admin can access
   */
  @Put(':id')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async updateAssessment(
    @Param('id') id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto,
    @CurrentUser() user: any,
  ) {
    const assessment = await this.assessmentsService.updateAssessment(
      id,
      updateAssessmentDto,
      user,
    );

    return {
      success: true,
      message: 'Assessment updated successfully',
      data: assessment,
    };
  }

  /**
   * Delete an assessment
   * Teacher and Admin can access
   */
  @Delete(':id')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.OK)
  async deleteAssessment(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.assessmentsService.deleteAssessment(
      id,
      user,
    );

    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * Create a question for an assessment
   * Teacher and Admin can access
   */
  @Post('questions')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.CREATED)
  async createQuestion(
    @Body() createQuestionDto: CreateQuestionDto,
    @CurrentUser() user: any,
  ) {
    const question =
      await this.assessmentsService.createQuestion(createQuestionDto, user);

    return {
      success: true,
      message: 'Question created successfully',
      data: question,
    };
  }

  /**
   * Update a question
   * Teacher and Admin can access
   */
  @Put('questions/:id')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async updateQuestion(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @CurrentUser() user: any,
  ) {
    const question = await this.assessmentsService.updateQuestion(
      id,
      updateQuestionDto,
      user,
    );

    return {
      success: true,
      message: 'Question updated successfully',
      data: question,
    };
  }

  /**
   * Delete a question
   * Teacher and Admin can access
   */
  @Delete('questions/:id')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.OK)
  async deleteQuestion(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.assessmentsService.deleteQuestion(id, user);

    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * Upload an image for a question
   * Teacher and Admin can access
   */
  @Post('questions/:id/image')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @ApiConsumes('multipart/form-data')
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
        if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only JPEG, PNG, GIF and WebP images are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadQuestionImage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const imageUrl = `/api/assessments/questions/images/${file.filename}`;
    await this.assessmentsService.updateQuestion(id, { imageUrl }, user);

    return {
      success: true,
      message: 'Image uploaded successfully',
      data: { imageUrl },
    };
  }

  /**
   * Serve a question image (public — used by img tags)
   */
  @Public()
  @Get('questions/images-private/:filename')
  async serveQuestionImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Sanitize filename to prevent path traversal
    const sanitized = path.basename(filename);
    const filePath = path.join(IMAGE_UPLOAD_DEST, sanitized);
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Image not found');
    }
    return res.sendFile(path.resolve(filePath));
  }

  /**
   * Upload optional teacher reference attachment for a file-upload assessment
   */
  @Post(':assessmentId/teacher-attachment')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(FILE_UPLOAD_DEST, { recursive: true });
          cb(null, FILE_UPLOAD_DEST);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${uuidv4()}_${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_ASSESSMENT_FILE_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Unsupported file format'), false);
        }
      },
    }),
  )
  async uploadTeacherAttachment(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Attachment file is required');
    }

    const uploaded = await this.assessmentsService.uploadTeacherAttachment(
      assessmentId,
      user,
      file,
    );

    return {
      success: true,
      message: 'Teacher attachment uploaded successfully',
      data: uploaded,
    };
  }

  /**
   * Upload student submission file for file-upload assessments
   */
  @Post(':assessmentId/submission-file')
  @Roles(RoleName.Student)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(FILE_UPLOAD_DEST, { recursive: true });
          cb(null, FILE_UPLOAD_DEST);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${uuidv4()}_${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_ASSESSMENT_FILE_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Unsupported file format'), false);
        }
      },
    }),
  )
  async uploadSubmissionFile(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Submission file is required');
    }

    const uploaded = await this.assessmentsService.uploadStudentSubmissionFile(
      assessmentId,
      user,
      file,
    );

    return {
      success: true,
      message: 'Submission file uploaded successfully',
      data: uploaded,
    };
  }

  /**
   * Download the teacher reference attachment for an assessment
   */
  @Get(':assessmentId/teacher-attachment/download')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async downloadTeacherAttachment(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const file = await this.assessmentsService.getTeacherAttachmentDownload(
      assessmentId,
      user,
    );

    const absolutePath = path.resolve(file.filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new BadRequestException('File not found on disk');
    }

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${file.originalName}"`,
    );
    return res.sendFile(absolutePath);
  }

  /**
   * Download a student's submitted file for a specific attempt
   */
  @Get('attempts/:attemptId/submission-file/download')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async downloadAttemptSubmissionFile(
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const file = await this.assessmentsService.getAttemptSubmissionDownload(
      attemptId,
      user,
    );

    const absolutePath = path.resolve(file.filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new BadRequestException('File not found on disk');
    }

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${file.originalName}"`,
    );
    return res.sendFile(absolutePath);
  }

  /**
   * Start an assessment attempt
   * Student can access
   */
  @Post(':assessmentId/start')
  @Roles(RoleName.Admin, RoleName.Student)
  @HttpCode(HttpStatus.CREATED)
  async startAttempt(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.assessmentsService.startAttempt(
      user.userId,
      assessmentId,
    );

    return {
      success: true,
      message: 'Assessment attempt started',
      data: result,
    };
  }

  @Get(':assessmentId/ongoing-attempt')
  @Roles(RoleName.Admin, RoleName.Student)
  async getOngoingAttempt(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
  ) {
    const ongoing = await this.assessmentsService.getOngoingAttempt(
      user.userId,
      assessmentId,
    );

    return {
      success: true,
      message: ongoing
        ? 'Ongoing attempt retrieved successfully'
        : 'No ongoing attempt found',
      data: ongoing,
    };
  }

  @Get('attempts/ongoing')
  @Roles(RoleName.Admin, RoleName.Student)
  async getOngoingAttempts(@CurrentUser() user: any) {
    const ongoing = await this.assessmentsService.getOngoingAttempts(
      user.userId,
    );

    return {
      success: true,
      message: 'Ongoing attempts retrieved successfully',
      data: ongoing,
      count: ongoing.length,
    };
  }

  @Patch('attempts/:attemptId/progress')
  @Roles(RoleName.Admin, RoleName.Student)
  async updateAttemptProgress(
    @Param('attemptId') attemptId: string,
    @Body() updateAttemptProgressDto: UpdateAttemptProgressDto,
    @CurrentUser() user: any,
  ) {
    const updated = await this.assessmentsService.updateAttemptProgress(
      user.userId,
      attemptId,
      updateAttemptProgressDto,
    );

    return {
      success: true,
      message: 'Attempt progress updated successfully',
      data: updated,
    };
  }

  /**
   * Submit an assessment with all answers
   * Student can access
   */
  @Post('submit')
  @Roles(RoleName.Admin, RoleName.Student)
  @HttpCode(HttpStatus.OK)
  async submitAssessment(
    @Body() submitAssessmentDto: SubmitAssessmentDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.assessmentsService.submitAssessment(
      user.userId,
      submitAssessmentDto,
    );

    return {
      success: true,
      message: 'Assessment submitted successfully',
      data: result,
    };
  }

  @Post(':assessmentId/rubric-source')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(FILE_UPLOAD_DEST, { recursive: true });
          cb(null, FILE_UPLOAD_DEST);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${uuidv4()}_${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (
          ['application/pdf', 'text/plain'].includes(file.mimetype) ||
          file.originalname.toLowerCase().endsWith('.docx')
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only PDF, DOCX, and TXT rubric files are supported',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadRubricSource(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Rubric file is required');
    }

    const result = await this.assessmentsService.uploadRubricSource(
      assessmentId,
      user,
      file,
    );

    return {
      success: true,
      message: 'Rubric uploaded and parsed successfully',
      data: result,
    };
  }

  @Put(':assessmentId/rubric-review')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async reviewRubric(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateAssessmentDto,
  ) {
    const assessment = await this.assessmentsService.reviewRubric(
      assessmentId,
      user,
      dto.rubricCriteria ?? [],
    );

    return {
      success: true,
      message: 'Rubric reviewed successfully',
      data: assessment,
    };
  }

  @Post(':assessmentId/unsubmit-file-upload')
  @Roles(RoleName.Admin, RoleName.Student)
  @HttpCode(HttpStatus.OK)
  async unsubmitFileUploadAssessment(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
  ) {
    const attempt = await this.assessmentsService.unsubmitFileUploadAssessment(
      user.userId,
      assessmentId,
    );

    return {
      success: true,
      message: 'File upload assessment submission restored to draft state',
      data: attempt,
    };
  }

  /**
   * Get attempt results
   * Student can view own (score hidden until returned), Teacher can view all
   */
  @Get('attempts/:attemptId/results')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getAttemptResults(
    @Param('attemptId') attemptId: string,
    @CurrentUser() user: any,
  ) {
    const viewerRole =
      Array.isArray(user?.roles) && user.roles.includes(RoleName.Student)
        ? 'student'
        : undefined;
    const results = await this.assessmentsService.getAttemptResults(
      attemptId,
      user,
      viewerRole,
    );

    return {
      success: true,
      message: 'Attempt results retrieved successfully',
      data: results,
    };
  }

  /**
   * Get student's all attempts for an assessment
   * Student can access for own, Teacher can access any
   */
  @Get(':assessmentId/student-attempts')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getStudentAttempts(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
  ) {
    const attempts = await this.assessmentsService.getStudentAttempts(
      user.userId,
      assessmentId,
      user,
    );

    return {
      success: true,
      message: 'Student attempts retrieved successfully',
      data: attempts,
      count: attempts.length,
    };
  }

  /**
   * Get all submission attempts for an assessment
   * Teacher and Admin can access
   */
  @Get(':assessmentId/all-attempts')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getAssessmentAttempts(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
  ) {
    const attempts =
      await this.assessmentsService.getAssessmentAttempts(assessmentId, user);

    return {
      success: true,
      message: 'Assessment attempts retrieved successfully',
      data: attempts,
      count: attempts.length,
    };
  }

  /**
   * Get assessment statistics
   * Teacher and Admin can access
   */
  @Get(':assessmentId/stats')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getAssessmentStats(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
  ) {
    const stats =
      await this.assessmentsService.getAssessmentStats(assessmentId, user);

    return {
      success: true,
      message: 'Assessment statistics retrieved successfully',
      data: stats,
    };
  }

  /**
   * Get per-question analytics for an assessment
   * Teacher and Admin can access
   */
  @Get(':assessmentId/question-analytics')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getQuestionAnalytics(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
  ) {
    const analytics =
      await this.assessmentsService.getQuestionAnalytics(assessmentId, user);

    return {
      success: true,
      message: 'Question analytics retrieved successfully',
      data: analytics,
    };
  }

  // ==========================================
  // MS Teams-like Submission & Grade Return
  // ==========================================

  /**
   * Get all student submissions for an assessment
   * Teacher and Admin can access
   */
  @Get(':assessmentId/submissions')
  @Roles(RoleName.Admin, RoleName.Teacher)
  async getAssessmentSubmissions(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: any,
  ) {
    const submissions =
      await this.assessmentsService.getAssessmentSubmissions(assessmentId, user);

    return {
      success: true,
      message: 'Assessment submissions retrieved successfully',
      data: submissions,
    };
  }

  /**
   * Return a grade to a student (make score visible)
   * Teacher and Admin can access
   */
  @Post('attempts/:attemptId/return')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.OK)
  async returnGrade(
    @Param('attemptId') attemptId: string,
    @Body() returnGradeDto: ReturnGradeDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.assessmentsService.returnGrade(
      attemptId,
      returnGradeDto,
      user,
    );

    return {
      success: true,
      message: 'Grade returned to student successfully',
      data: result,
    };
  }

  /**
   * Return all submitted grades for an assessment
   * Teacher and Admin can access
   */
  @Post(':assessmentId/return-all')
  @Roles(RoleName.Admin, RoleName.Teacher)
  @HttpCode(HttpStatus.OK)
  async returnAllGrades(
    @Param('assessmentId') assessmentId: string,
    @Body() returnGradeDto: ReturnGradeDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.assessmentsService.returnAllGrades(
      assessmentId,
      returnGradeDto.teacherFeedback,
      user,
    );

    return {
      success: true,
      message: `${result.returned} grades returned to students`,
      data: result,
    };
  }
}
