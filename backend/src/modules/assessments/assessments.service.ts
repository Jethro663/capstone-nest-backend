import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, desc, inArray, sql, sum } from 'drizzle-orm';
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
  constructor(
    private databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
   * Get all assessments for a teacher (across all their classes)
   */
  async getAssessmentsByTeacher(teacherId: string) {
    // Get all classes for this teacher
    const teacherClasses = await this.db.query.classes.findMany({
      where: eq(classes.teacherId, teacherId),
      columns: { id: true },
    });

    const classIds = teacherClasses.map((c) => c.id);

    // If teacher has no classes, return empty array
    if (classIds.length === 0) {
      return [];
    }

    // Get all assessments for those classes
    const assessmentList = await this.db
      .select()
      .from(assessments)
      .where(inArray(assessments.classId, classIds));

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
        totalPoints: 0,
        passingScore: createAssessmentDto.passingScore,
        maxAttempts: createAssessmentDto.maxAttempts ?? 1,
        timeLimitMinutes: createAssessmentDto.timeLimitMinutes,
        isPublished: false,
        feedbackLevel: createAssessmentDto.feedbackLevel,
        feedbackDelayHours: createAssessmentDto.feedbackDelayHours,
      })
      .returning();

    return this.getAssessmentById(newAssessment.id);
  }

  /**
   * Validate assessment is ready for publishing
   */
  private async validateForPublish(assessmentId: string) {
    const assessment = await this.getAssessmentById(assessmentId);
    const errors: string[] = [];

    if (!assessment.title || !assessment.title.trim()) {
      errors.push('Title is required');
    }
    if (!assessment.type) {
      errors.push('Assessment type is required');
    }
    if (!assessment.questions || assessment.questions.length === 0) {
      errors.push('At least one question is required');
    }
    if (assessment.passingScore === null || assessment.passingScore === undefined) {
      errors.push('Passing score is required');
    }

    // Validate each question
    const optionTypes = [
      QuestionType.MULTIPLE_CHOICE,
      QuestionType.MULTIPLE_SELECT,
      QuestionType.TRUE_FALSE,
      QuestionType.DROPDOWN,
    ];

    if (assessment.questions) {
      for (let i = 0; i < assessment.questions.length; i++) {
        const q = assessment.questions[i];
        if (!q.content || !q.content.trim()) {
          errors.push(`Question ${i + 1}: Content is required`);
        }
        if (optionTypes.includes(q.type as QuestionType)) {
          if (!q.options || q.options.length < 2) {
            errors.push(`Question ${i + 1}: Choice questions need at least 2 options`);
          } else {
            const hasCorrect = q.options.some((o) => o.isCorrect);
            if (!hasCorrect) {
              errors.push(`Question ${i + 1}: At least one option must be marked correct`);
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Assessment cannot be published',
        errors,
      });
    }
  }

  /**
   * Recalculate totalPoints from sum of question points
   */
  private async recalculateTotalPoints(assessmentId: string) {
    const result = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${assessmentQuestions.points}), 0)` })
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, assessmentId));

    const total = Number(result[0]?.total) || 0;

    await this.db
      .update(assessments)
      .set({ totalPoints: total, updatedAt: new Date() })
      .where(eq(assessments.id, assessmentId));

    return total;
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

    // Validate before publishing
    if (updateAssessmentDto.isPublished === true) {
      await this.validateForPublish(assessmentId);
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (updateAssessmentDto.title !== undefined) updateData.title = updateAssessmentDto.title;
    if (updateAssessmentDto.description !== undefined) updateData.description = updateAssessmentDto.description;
    if (updateAssessmentDto.type !== undefined) updateData.type = updateAssessmentDto.type;
    if (updateAssessmentDto.dueDate !== undefined) updateData.dueDate = updateAssessmentDto.dueDate;
    if (updateAssessmentDto.passingScore !== undefined) updateData.passingScore = updateAssessmentDto.passingScore;
    if (updateAssessmentDto.maxAttempts !== undefined) updateData.maxAttempts = updateAssessmentDto.maxAttempts;
    if (updateAssessmentDto.timeLimitMinutes !== undefined) updateData.timeLimitMinutes = updateAssessmentDto.timeLimitMinutes;
    if (updateAssessmentDto.isPublished !== undefined) updateData.isPublished = updateAssessmentDto.isPublished;
    if (updateAssessmentDto.feedbackLevel !== undefined) updateData.feedbackLevel = updateAssessmentDto.feedbackLevel;
    if (updateAssessmentDto.feedbackDelayHours !== undefined) updateData.feedbackDelayHours = updateAssessmentDto.feedbackDelayHours;

    const [updated] = await this.db
      .update(assessments)
      .set(updateData)
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

    // Recalculate total points
    await this.recalculateTotalPoints(createQuestionDto.assessmentId);

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
      updateQuestionDto.content !== undefined ||
      updateQuestionDto.points !== undefined ||
      updateQuestionDto.order !== undefined ||
      updateQuestionDto.isRequired !== undefined ||
      updateQuestionDto.explanation !== undefined
    ) {
      const setData: Record<string, any> = { updatedAt: new Date() };
      if (updateQuestionDto.content !== undefined) setData.content = updateQuestionDto.content;
      if (updateQuestionDto.points !== undefined) setData.points = updateQuestionDto.points;
      if (updateQuestionDto.order !== undefined) setData.order = updateQuestionDto.order;
      if (updateQuestionDto.isRequired !== undefined) setData.isRequired = updateQuestionDto.isRequired;
      if (updateQuestionDto.explanation !== undefined) setData.explanation = updateQuestionDto.explanation;

      await this.db
        .update(assessmentQuestions)
        .set(setData)
        .where(eq(assessmentQuestions.id, questionId));
    }

    // Update options if provided (replace all)
    if (updateQuestionDto.options) {
      // Delete old options
      await this.db
        .delete(assessmentQuestionOptions)
        .where(eq(assessmentQuestionOptions.questionId, questionId));

      // Insert new options
      if (updateQuestionDto.options.length > 0) {
        await this.db.insert(assessmentQuestionOptions).values(
          updateQuestionDto.options.map((opt) => ({
            questionId,
            text: opt.text,
            isCorrect: opt.isCorrect,
            order: opt.order,
          })),
        );
      }
    }

    // Recalculate total points if points changed
    const updatedQuestion = await this.getQuestionById(questionId);
    // Look up the assessmentId from the question
    const qRecord = await this.db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.id, questionId),
      columns: { assessmentId: true },
    });
    if (qRecord) {
      await this.recalculateTotalPoints(qRecord.assessmentId);
    }

    return updatedQuestion;
  }

  /**
   * Delete a question
   */
  async deleteQuestion(questionId: string) {
    const question = await this.getQuestionById(questionId);

    // Look up assessmentId before deletion
    const qRecord = await this.db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.id, questionId),
      columns: { assessmentId: true },
    });

    await this.db
      .delete(assessmentQuestions)
      .where(eq(assessmentQuestions.id, questionId));

    // Recalculate total points
    if (qRecord) {
      await this.recalculateTotalPoints(qRecord.assessmentId);
    }

    return { success: true, message: 'Question deleted successfully' };
  }

  /**
   * Start an assessment attempt
   */
  async startAttempt(studentId: string, assessmentId: string) {
    // Verify assessment exists and is published
    const assessment = await this.getAssessmentById(assessmentId);

    if (!assessment.isPublished) {
      throw new ForbiddenException('This assessment is not published yet');
    }

    // Check due date
    if (assessment.dueDate && new Date(assessment.dueDate) < new Date()) {
      throw new ForbiddenException('This assessment is past its due date');
    }

    // Check for existing unsubmitted attempt (resume)
    const existingUnsubmitted = await this.db.query.assessmentAttempts.findFirst({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, assessmentId),
        eq(assessmentAttempts.isSubmitted, false),
      ),
    });

    if (existingUnsubmitted) {
      // Check if time limit exceeded for existing attempt
      if (assessment.timeLimitMinutes) {
        const startedAt = new Date(existingUnsubmitted.startedAt);
        const elapsed = (Date.now() - startedAt.getTime()) / (1000 * 60);
        if (elapsed > assessment.timeLimitMinutes + 1) {
          // Auto-submit the expired attempt with 0 score
          await this.db
            .update(assessmentAttempts)
            .set({
              isSubmitted: true,
              submittedAt: new Date(),
              score: 0,
              passed: false,
            })
            .where(eq(assessmentAttempts.id, existingUnsubmitted.id));
          // Fall through to create a new attempt
        } else {
          return { attempt: existingUnsubmitted, timeLimitMinutes: assessment.timeLimitMinutes };
        }
      } else {
        return { attempt: existingUnsubmitted, timeLimitMinutes: null };
      }
    }

    // Count submitted attempts
    const submittedAttempts = await this.db.query.assessmentAttempts.findMany({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, assessmentId),
        eq(assessmentAttempts.isSubmitted, true),
      ),
    });

    const maxAttempts = assessment.maxAttempts ?? 1;
    if (submittedAttempts.length >= maxAttempts) {
      throw new ForbiddenException(
        `Maximum attempts reached (${maxAttempts}). You cannot retake this assessment.`,
      );
    }

    // Create new attempt
    const attemptNumber = submittedAttempts.length + 1;
    const [newAttempt] = await this.db
      .insert(assessmentAttempts)
      .values({
        studentId,
        assessmentId,
        attemptNumber,
        isSubmitted: false,
      })
      .returning();

    return { attempt: newAttempt, timeLimitMinutes: assessment.timeLimitMinutes ?? null };
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

    // Get existing unsubmitted attempt
    let attempt = await this.db.query.assessmentAttempts.findFirst({
      where: and(
        eq(assessmentAttempts.studentId, studentId),
        eq(assessmentAttempts.assessmentId, submitAssessmentDto.assessmentId),
        eq(assessmentAttempts.isSubmitted, false),
      ),
    });

    if (!attempt) {
      throw new BadRequestException(
        'No active attempt found. Please start the assessment first.',
      );
    }

    // Check time limit enforcement (with 60s grace)
    if (assessment.timeLimitMinutes) {
      const startedAt = new Date(attempt.startedAt);
      const elapsedMinutes = (Date.now() - startedAt.getTime()) / (1000 * 60);
      if (elapsedMinutes > assessment.timeLimitMinutes + 1) {
        // Still accept but mark as time-exceeded
      }
    }

    // Mark attempt as submitted
    const [updatedAttempt] = await this.db
      .update(assessmentAttempts)
      .set({
        isSubmitted: true,
        submittedAt: new Date(),
        timeSpentSeconds: submitAssessmentDto.timeSpentSeconds,
      })
      .where(eq(assessmentAttempts.id, attempt.id))
      .returning();
    attempt = updatedAttempt;

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
      let selectedOptionIds: string[] | null = null;

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
          selectedOptionIds = response.selectedOptionIds;
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
          selectedOptionIds: selectedOptionIds,
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

    // Calculate score as percentage using actual totalPoints from questions
    const assessmentTotal = assessment.totalPoints || 1;
    const score = Math.round(
      (totalPoints / assessmentTotal) * 100,
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

    // Emit event for gradebook score auto-sync
    this.eventEmitter.emit('assessment.submitted', {
      assessmentId: submitAssessmentDto.assessmentId,
      studentId,
      rawScore: totalPoints,
      totalPoints: assessmentTotal,
    });

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

    // Apply smart feedback filtering based on assessment settings
    return this.applyFeedbackFiltering(attempt);
  }

  /**
   * Apply feedback filtering based on assessment's feedbackLevel and delay
   * Prevents cheating while supporting learning
   */
  private applyFeedbackFiltering(attemptWithData: any) {
    const assessment = attemptWithData.assessment;
    const feedbackLevel = assessment.feedbackLevel || 'standard';
    const feedbackDelayHours = assessment.feedbackDelayHours || 24;
    
    // Check if feedback delay has passed
    const submittedTime = new Date(attemptWithData.submittedAt);
    const now = new Date();
    const hoursElapsed = (now.getTime() - submittedTime.getTime()) / (1000 * 60 * 60);
    const feedbackUnlocked = hoursElapsed >= feedbackDelayHours;

    let filteredAttempt = JSON.parse(JSON.stringify(attemptWithData));

    if (feedbackLevel === 'immediate') {
      // IMMEDIATE: Show ONLY score, pass/fail, and question count
      // Hide all answer information and options
      filteredAttempt.responses = filteredAttempt.responses.map(r => ({
        id: r.id,
        questionId: r.questionId,
        // Strip out all answer details
        studentAnswer: null,
        selectedOptionId: null,
        isCorrect: null,
        pointsEarned: null,
        question: {
          id: r.question.id,
          content: r.question.content,
          type: r.question.type,
          points: r.question.points,
          // No options shown
          options: [],
        },
      }));

      filteredAttempt.assessment.questions = filteredAttempt.assessment.questions.map(q => ({
        id: q.id,
        content: q.content,
        type: q.type,
        points: q.points,
        // No options shown
        options: [],
      }));

      // Add feedback locked message
      filteredAttempt.feedbackStatus = {
        level: 'immediate',
        unlocked: true,
        message: 'You can see your score. Detailed feedback not available for immediate assessments.',
      };

    } else if (feedbackLevel === 'standard') {
      // STANDARD: Show answers ONLY after delay
      if (!feedbackUnlocked) {
        // Hide all answer information until delay passes
        filteredAttempt.responses = filteredAttempt.responses.map(r => ({
          id: r.id,
          questionId: r.questionId,
          // Strip out answers, show only question
          studentAnswer: null,
          selectedOptionId: null,
          isCorrect: null,
          pointsEarned: null,
          question: {
            id: r.question.id,
            content: r.question.content,
            type: r.question.type,
            points: r.question.points,
            // Mark options but don't show which is correct
            options: r.question.options?.map(o => ({
              id: o.id,
              text: o.text,
              order: o.order,
              isCorrect: null, // Hidden
            })) || [],
          },
        }));

        const hoursUntilUnlock = Math.ceil(feedbackDelayHours - hoursElapsed);
        filteredAttempt.feedbackStatus = {
          level: 'standard',
          unlocked: false,
          hoursRemaining: Math.max(0, hoursUntilUnlock),
          message: `Detailed feedback available in ${Math.max(0, hoursUntilUnlock)} hours. Review lessons to learn why answers are correct!`,
        };
      } else {
        // Feedback unlocked - show everything
        filteredAttempt.feedbackStatus = {
          level: 'standard',
          unlocked: true,
          message: 'Detailed feedback is now available. Review your answers and explanations.',
        };
      }

    } else if (feedbackLevel === 'detailed') {
      // DETAILED: Longer delay, more detailed hints
      if (!feedbackUnlocked) {
        const hoursUntilUnlock = Math.ceil(feedbackDelayHours - hoursElapsed);
        
        // Show hints about which questions were wrong, but NOT the answers
        filteredAttempt.responses = filteredAttempt.responses.map(r => ({
          id: r.id,
          questionId: r.questionId,
          // Show if correct/wrong as hint, but not the actual answer
          studentAnswer: null,
          selectedOptionId: null,
          isCorrect: r.isCorrect, // Hint: show if they got it right/wrong
          pointsEarned: null,      // Hide partial credit until unlocked
          questionType: r.question.type,
          hint: this.generateLearningHint(r.question, r.isCorrect),
          question: {
            id: r.question.id,
            content: r.question.content,
            type: r.question.type,
            points: r.question.points,
            // No options shown
            options: [],
          },
        }));

        filteredAttempt.feedbackStatus = {
          level: 'detailed',
          unlocked: false,
          hoursRemaining: Math.max(0, hoursUntilUnlock),
          message: `Full feedback available in ${Math.max(0, hoursUntilUnlock)} hours. Use the hints below to study!`,
        };
      } else {
        // Full feedback available
        filteredAttempt.responses = filteredAttempt.responses.map(r => ({
          ...r,
          hint: this.generateLearningHint(r.question, r.isCorrect),
        }));

        filteredAttempt.feedbackStatus = {
          level: 'detailed',
          unlocked: true,
          message: 'Full feedback with learning hints available. Review to improve!',
        };
      }
    }

    return filteredAttempt;
  }

  /**
   * Generate learning-focused hints rather than just showing answers
   */
  private generateLearningHint(question: any, isCorrect: boolean): string {
    if (isCorrect) {
      return `✓ Correct! You understood the concept in question "${question.content.substring(0, 50)}..."`;
    }

    switch (question.type) {
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.DROPDOWN:
        return `Review the lesson content about this topic. The correct answer involves understanding the key concept.`;
      
      case QuestionType.TRUE_FALSE:
        return `Think about whether the statement is always true or if there are exceptions. Review the lesson.`;
      
      case QuestionType.MULTIPLE_SELECT:
        return `This question requires selecting ALL correct answers. Review which concepts apply.`;
      
      case QuestionType.SHORT_ANSWER:
      case QuestionType.FILL_BLANK:
        return `Compare your answer with the key terms in the lesson. Make sure you used precise language.`;
      
      default:
        return `Review this question and the related lesson content.`;
    }
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
