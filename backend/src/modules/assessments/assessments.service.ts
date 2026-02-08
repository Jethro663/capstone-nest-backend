import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  assessments,
  assessmentQuestions,
  assessmentQuestionOptions,
  assessmentAttempts,
  assessmentResponses,
  classes,
  users,
} from '../../drizzle/schema';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  SubmitAssessmentDto,
  QuestionType,
} from './DTO/assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Get all assessments for a class
   */
  async getAssessmentsByClass(classId: string) {
    const assessmentList = await this.db.query.assessments.findMany({
      where: eq(assessments.classId, classId),
      with: {
        questions: {
          orderBy: (q, { asc }) => [asc(q.order)],
          with: {
            options: {
              orderBy: (o, { asc }) => [asc(o.order)],
            },
          },
        },
      },
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });

    return assessmentList;
  }

  /**
   * Get a single assessment by ID with all questions
   */
  async getAssessmentById(assessmentId: string) {
    const assessment = await this.db.query.assessments.findFirst({
      where: eq(assessments.id, assessmentId),
      with: {
        class: true,
        questions: {
          orderBy: (q, { asc }) => [asc(q.order)],
          with: {
            options: {
              orderBy: (o, { asc }) => [asc(o.order)],
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(
        `Assessment with ID "${assessmentId}" not found`,
      );
    }

    return assessment;
  }

  /**
   * Create a new assessment
   */
  async createAssessment(createAssessmentDto: CreateAssessmentDto) {
    // Verify class exists
    const classRecord = await this.db.query.classes.findFirst({
      where: eq(classes.id, createAssessmentDto.classId),
    });

    if (!classRecord) {
      throw new BadRequestException(
        `Class with ID "${createAssessmentDto.classId}" not found`,
      );
    }

    const [newAssessment] = await this.db
      .insert(assessments)
      .values({
        title: createAssessmentDto.title,
        description: createAssessmentDto.description,
        classId: createAssessmentDto.classId,
        type: createAssessmentDto.type,
        dueDate: createAssessmentDto.dueDate,
        totalPoints: createAssessmentDto.totalPoints,
        passingScore: createAssessmentDto.passingScore,
        isPublished: false,
      })
      .returning();

    return this.getAssessmentById(newAssessment.id);
  }

  /**
   * Update an assessment
   */
  async updateAssessment(
    assessmentId: string,
    updateAssessmentDto: UpdateAssessmentDto,
  ) {
    // Verify assessment exists
    await this.getAssessmentById(assessmentId);

    const [updated] = await this.db
      .update(assessments)
      .set({
        title: updateAssessmentDto.title,
        description: updateAssessmentDto.description,
        type: updateAssessmentDto.type,
        dueDate: updateAssessmentDto.dueDate,
        totalPoints: updateAssessmentDto.totalPoints,
        passingScore: updateAssessmentDto.passingScore,
        isPublished: updateAssessmentDto.isPublished,
      })
      .where(eq(assessments.id, assessmentId))
      .returning();

    return this.getAssessmentById(updated.id);
  }

  /**
   * Delete an assessment
   */
  async deleteAssessment(assessmentId: string) {
    await this.getAssessmentById(assessmentId);

    await this.db.delete(assessments).where(eq(assessments.id, assessmentId));

    return { success: true, message: 'Assessment deleted successfully' };
  }

  /**
   * Create a question for an assessment
   */
  async createQuestion(createQuestionDto: CreateQuestionDto) {
    // Verify assessment exists
    await this.getAssessmentById(createQuestionDto.assessmentId);

    const [newQuestion] = await this.db
      .insert(assessmentQuestions)
      .values({
        assessmentId: createQuestionDto.assessmentId,
        type: createQuestionDto.type,
        content: createQuestionDto.content,
        points: createQuestionDto.points,
        order: createQuestionDto.order,
        isRequired: createQuestionDto.isRequired,
        explanation: createQuestionDto.explanation,
      })
      .returning();

    // Add options if provided
    if (
      createQuestionDto.options &&
      createQuestionDto.options.length > 0
    ) {
      await this.db.insert(assessmentQuestionOptions).values(
        createQuestionDto.options.map((opt) => ({
          questionId: newQuestion.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          order: opt.order,
        })),
      );
    }

    return this.getQuestionById(newQuestion.id);
  }

  /**
   * Get question by ID (helper method)
   */
  private async getQuestionById(questionId: string) {
    const question = await this.db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.id, questionId),
      with: {
        options: {
          orderBy: (o, { asc }) => [asc(o.order)],
        },
      },
    });

    if (!question) {
      throw new NotFoundException(
        `Question with ID "${questionId}" not found`,
      );
    }

    return question;
  }

  /**
   * Update a question
   */
  async updateQuestion(
    questionId: string,
    updateQuestionDto: UpdateQuestionDto,
  ) {
    const question = await this.getQuestionById(questionId);

    // Update question fields
    if (
      updateQuestionDto.content ||
      updateQuestionDto.points ||
      updateQuestionDto.order ||
      updateQuestionDto.isRequired !== undefined ||
      updateQuestionDto.explanation
    ) {
      await this.db
        .update(assessmentQuestions)
        .set({
          content: updateQuestionDto.content || question.content,
          points: updateQuestionDto.points || question.points,
          order: updateQuestionDto.order || question.order,
          isRequired: updateQuestionDto.isRequired || question.isRequired,
          explanation: updateQuestionDto.explanation,
        })
        .where(eq(assessmentQuestions.id, questionId));
    }

    // Update options if provided
    if (updateQuestionDto.options && updateQuestionDto.options.length > 0) {
      // Delete old options
      await this.db
        .delete(assessmentQuestionOptions)
        .where(eq(assessmentQuestionOptions.questionId, questionId));

      // Insert new options
      await this.db.insert(assessmentQuestionOptions).values(
        updateQuestionDto.options.map((opt) => ({
          questionId,
          text: opt.text,
          isCorrect: opt.isCorrect,
          order: opt.order,
        })),
      );
    }

    return this.getQuestionById(questionId);
  }

  /**
   * Delete a question
   */
  async deleteQuestion(questionId: string) {
    await this.getQuestionById(questionId);

    await this.db
      .delete(assessmentQuestions)
      .where(eq(assessmentQuestions.id, questionId));

    return { success: true, message: 'Question deleted successfully' };
  }

  /**
   * Start an assessment attempt
   */
  async startAttempt(studentId: string, assessmentId: string) {
    // Verify assessment exists
    await this.getAssessmentById(assessmentId);

    // Check if student already has an active attempt
    const existingAttempt = await this.db.query.assessmentAttempts.findFirst({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, assessmentId),
      ),
    });

    if (existingAttempt && !existingAttempt.isSubmitted) {
      // Return existing active attempt
      return existingAttempt;
    }

    // Create new attempt
    const [newAttempt] = await this.db
      .insert(assessmentAttempts)
      .values({
        studentId,
        assessmentId,
        isSubmitted: false,
      })
      .returning();

    return newAttempt;
  }

  /**
   * Submit assessment with auto-grading for objective questions
   */
  async submitAssessment(
    studentId: string,
    submitAssessmentDto: SubmitAssessmentDto,
  ) {
    // Get the assessment with questions and options
    const assessment = await this.getAssessmentById(
      submitAssessmentDto.assessmentId,
    );

    // Get or create attempt
    let attempt = await this.db.query.assessmentAttempts.findFirst({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, submitAssessmentDto.assessmentId),
      ),
    });

    if (!attempt) {
      const [newAttempt] = await this.db
        .insert(assessmentAttempts)
        .values({
          studentId,
          assessmentId: submitAssessmentDto.assessmentId,
          isSubmitted: true,
          submittedAt: new Date(),
          timeSpentSeconds: submitAssessmentDto.timeSpentSeconds,
        })
        .returning();

      attempt = newAttempt;
    } else {
      // Update existing attempt
      const [updated] = await this.db
        .update(assessmentAttempts)
        .set({
          isSubmitted: true,
          submittedAt: new Date(),
          timeSpentSeconds: submitAssessmentDto.timeSpentSeconds,
        })
        .where(eq(assessmentAttempts.id, attempt.id))
        .returning();

      attempt = updated;
    }

    // Process responses and auto-grade
    let totalPoints = 0;
    const responses: any[] = [];

    for (const response of submitAssessmentDto.responses) {
      const question = assessment.questions.find(
        (q) => q.id === response.questionId,
      );

      if (!question) {
        throw new BadRequestException(
          `Question ${response.questionId} not found in assessment`,
        );
      }

      let isCorrect = false;
      let pointsEarned = 0;
      let selectedOptionId: string | null = null;

      // Auto-grade objective questions
      if (
        question.type === QuestionType.MULTIPLE_CHOICE ||
        question.type === QuestionType.TRUE_FALSE ||
        question.type === QuestionType.DROPDOWN
      ) {
        if (response.selectedOptionId) {
          const option = question.options.find(
            (o) => o.id === response.selectedOptionId,
          );
          if (option && option.isCorrect) {
            isCorrect = true;
            pointsEarned = question.points;
          }
          selectedOptionId = response.selectedOptionId;
        }
      } else if (question.type === QuestionType.MULTIPLE_SELECT) {
        // For multiple select, all correct options must be selected
        if (response.selectedOptionIds && response.selectedOptionIds.length > 0) {
          const correctOptions = question.options.filter((o) => o.isCorrect);
          const selectedCorrectly =
            response.selectedOptionIds.length === correctOptions.length &&
            response.selectedOptionIds.every((id) =>
              correctOptions.some((o) => o.id === id),
            );

          if (selectedCorrectly) {
            isCorrect = true;
            pointsEarned = question.points;
          }
        }
      }
      // Short answer and fill blank are not auto-graded (teacher grades manually)

      totalPoints += pointsEarned;

      // Store response
      const [storedResponse] = await this.db
        .insert(assessmentResponses)
        .values({
          attemptId: attempt.id,
          questionId: response.questionId,
          studentAnswer: response.studentAnswer,
          selectedOptionId: selectedOptionId,
          isCorrect:
            question.type === QuestionType.MULTIPLE_CHOICE ||
            question.type === QuestionType.TRUE_FALSE ||
            question.type === QuestionType.DROPDOWN ||
            question.type === QuestionType.MULTIPLE_SELECT
              ? isCorrect
              : null,
          pointsEarned,
        })
        .returning();

      responses.push(storedResponse);
    }

    // Calculate score and passing status
    const score = Math.round(
      (totalPoints / assessment.totalPoints) * 100,
    );
    const passed = score >= (assessment.passingScore || 60);

    // Update attempt with final score
    const [finalAttempt] = await this.db
      .update(assessmentAttempts)
      .set({
        score,
        passed,
      })
      .where(eq(assessmentAttempts.id, attempt.id))
      .returning();

    return {
      attempt: finalAttempt,
      responses,
      totalPoints,
      score,
      passed,
    };
  }

  /**
   * Get student's attempt results
   */
  async getAttemptResults(attemptId: string) {
    const attempt = await this.db.query.assessmentAttempts.findFirst({
      where: eq(assessmentAttempts.id, attemptId),
      with: {
        assessment: {
          with: {
            questions: {
              with: {
                options: true,
              },
            },
          },
        },
        responses: {
          with: {
            question: {
              with: {
                options: true,
              },
            },
            selectedOption: true,
          },
        },
        student: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID "${attemptId}" not found`);
    }

    return attempt;
  }

  /**
   * Get all attempts for a student in an assessment
   */
  async getStudentAttempts(studentId: string, assessmentId: string) {
    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, assessmentId),
      ),
      orderBy: (a, { desc }) => [desc(a.submittedAt)],
    });

    return attempts;
  }

  /**
   * Get all student attempts for an assessment (for teacher view)
   */
  async getAssessmentAttempts(assessmentId: string) {
    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: eq(assessmentAttempts.assessmentId, assessmentId),
      with: {
        student: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: (a, { desc }) => [desc(a.submittedAt)],
    });

    return attempts;
  }

  /**
   * Get high-level assessment stats for teacher
   */
  async getAssessmentStats(assessmentId: string) {
    const attempts = await this.getAssessmentAttempts(assessmentId);
    const submittedAttempts = attempts.filter((a) => a.isSubmitted);

    if (submittedAttempts.length === 0) {
      return {
        totalAttempts: 0,
        submittedAttempts: 0,
        averageScore: 0,
        passRate: 0,
        highestScore: 0,
        lowestScore: 0,
      };
    }

    const scores = submittedAttempts.map((a) => a.score || 0);
    const passedCount = submittedAttempts.filter((a) => a.passed).length;

    return {
      totalAttempts: attempts.length,
      submittedAttempts: submittedAttempts.length,
      averageScore: Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length,
      ),
      passRate: Math.round((passedCount / submittedAttempts.length) * 100),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
    };
  }
}
