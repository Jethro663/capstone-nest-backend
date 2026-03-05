import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  SubmitAssessmentDto,
  StartAssessmentDto,
  ReturnGradeDto,
  BulkReturnGradesDto,
} from './DTO/assessment.dto';

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
  async getAssessmentsByClass(@Param('classId') classId: string) {
    const assessmentList =
      await this.assessmentsService.getAssessmentsByClass(classId);

    return {
      success: true,
      message: 'Assessments retrieved successfully',
      data: assessmentList,
      count: assessmentList.length,
    };
  }

  /**
   * Get a single assessment by ID with all questions
   * Teacher and Admin can access
   */
  @Get(':id')
  @Roles(RoleName.Admin, RoleName.Teacher, RoleName.Student)
  async getAssessmentById(@Param('id') id: string) {
    const assessment = await this.assessmentsService.getAssessmentById(id);

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
  async createAssessment(@Body() createAssessmentDto: CreateAssessmentDto) {
    const assessment =
      await this.assessmentsService.createAssessment(createAssessmentDto);

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
  ) {
    const assessment = await this.assessmentsService.updateAssessment(
      id,
      updateAssessmentDto,
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
  async deleteAssessment(@Param('id') id: string) {
    const result = await this.assessmentsService.deleteAssessment(id);

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
  async createQuestion(@Body() createQuestionDto: CreateQuestionDto) {
    const question = await this.assessmentsService.createQuestion(
      createQuestionDto,
    );

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
  ) {
    const question = await this.assessmentsService.updateQuestion(
      id,
      updateQuestionDto,
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
  async deleteQuestion(@Param('id') id: string) {
    const result = await this.assessmentsService.deleteQuestion(id);

    return {
      success: result.success,
      message: result.message,
    };
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
      data: {
        attempt: result.attempt,
        timeLimitMinutes: result.timeLimitMinutes,
      },
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
    const results = await this.assessmentsService.getAttemptResults(
      attemptId,
      user.role,
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
  async getAssessmentAttempts(@Param('assessmentId') assessmentId: string) {
    const attempts = await this.assessmentsService.getAssessmentAttempts(
      assessmentId,
    );

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
  async getAssessmentStats(@Param('assessmentId') assessmentId: string) {
    const stats = await this.assessmentsService.getAssessmentStats(
      assessmentId,
    );

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
  async getQuestionAnalytics(@Param('assessmentId') assessmentId: string) {
    const analytics =
      await this.assessmentsService.getQuestionAnalytics(assessmentId);

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
  async getAssessmentSubmissions(@Param('assessmentId') assessmentId: string) {
    const submissions =
      await this.assessmentsService.getAssessmentSubmissions(assessmentId);

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
  ) {
    const result = await this.assessmentsService.returnGrade(
      attemptId,
      returnGradeDto,
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
  ) {
    const result = await this.assessmentsService.returnAllGrades(
      assessmentId,
      returnGradeDto.teacherFeedback,
    );

    return {
      success: true,
      message: `${result.returned} grades returned to students`,
      data: result,
    };
  }
}
