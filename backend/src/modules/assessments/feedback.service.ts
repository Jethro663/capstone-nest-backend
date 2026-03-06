import { Injectable } from '@nestjs/common';
import { QuestionType } from './DTO/assessment.dto';

/**
 * Handles assessment feedback filtering logic.
 *
 * Extracted from AssessmentsService to keep feedback rules
 * (immediate / standard / detailed) in a single, testable place.
 * No database access needed — this is pure filtering logic.
 */
@Injectable()
export class FeedbackService {
  /**
   * Apply feedback filtering based on assessment's feedbackLevel and delay.
   * Prevents cheating while supporting learning.
   */
  applyFeedbackFiltering(attemptWithData: any) {
    const assessment = attemptWithData.assessment;
    const feedbackLevel = assessment.feedbackLevel || 'standard';
    const feedbackDelayHours = assessment.feedbackDelayHours || 24;

    // Check if feedback delay has passed
    const submittedTime = new Date(attemptWithData.submittedAt);
    const now = new Date();
    const hoursElapsed =
      (now.getTime() - submittedTime.getTime()) / (1000 * 60 * 60);
    const feedbackUnlocked = hoursElapsed >= feedbackDelayHours;

    const filteredAttempt = JSON.parse(JSON.stringify(attemptWithData));

    if (feedbackLevel === 'immediate') {
      return this.applyImmediateFeedback(filteredAttempt);
    } else if (feedbackLevel === 'standard') {
      return this.applyStandardFeedback(
        filteredAttempt,
        feedbackUnlocked,
        feedbackDelayHours,
        hoursElapsed,
      );
    } else if (feedbackLevel === 'detailed') {
      return this.applyDetailedFeedback(
        filteredAttempt,
        feedbackUnlocked,
        feedbackDelayHours,
        hoursElapsed,
      );
    }

    return filteredAttempt;
  }

  /**
   * IMMEDIATE: Show ONLY score, pass/fail, and question count.
   * Hide all answer information and options.
   */
  private applyImmediateFeedback(filteredAttempt: any) {
    filteredAttempt.responses = filteredAttempt.responses.map((r: any) => ({
      id: r.id,
      questionId: r.questionId,
      studentAnswer: null,
      selectedOptionId: null,
      isCorrect: null,
      pointsEarned: null,
      question: {
        id: r.question.id,
        content: r.question.content,
        type: r.question.type,
        points: r.question.points,
        options: [],
      },
    }));

    filteredAttempt.assessment.questions =
      filteredAttempt.assessment.questions.map((q: any) => ({
        id: q.id,
        content: q.content,
        type: q.type,
        points: q.points,
        options: [],
      }));

    filteredAttempt.feedbackStatus = {
      level: 'immediate',
      unlocked: true,
      message:
        'You can see your score. Detailed feedback not available for immediate assessments.',
    };

    return filteredAttempt;
  }

  /**
   * STANDARD: Show answers ONLY after delay.
   */
  private applyStandardFeedback(
    filteredAttempt: any,
    feedbackUnlocked: boolean,
    feedbackDelayHours: number,
    hoursElapsed: number,
  ) {
    if (!feedbackUnlocked) {
      filteredAttempt.responses = filteredAttempt.responses.map((r: any) => ({
        id: r.id,
        questionId: r.questionId,
        studentAnswer: null,
        selectedOptionId: null,
        isCorrect: null,
        pointsEarned: null,
        question: {
          id: r.question.id,
          content: r.question.content,
          type: r.question.type,
          points: r.question.points,
          options:
            r.question.options?.map((o: any) => ({
              id: o.id,
              text: o.text,
              order: o.order,
              isCorrect: null,
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
      filteredAttempt.feedbackStatus = {
        level: 'standard',
        unlocked: true,
        message:
          'Detailed feedback is now available. Review your answers and explanations.',
      };
    }

    return filteredAttempt;
  }

  /**
   * DETAILED: Longer delay, more detailed hints.
   */
  private applyDetailedFeedback(
    filteredAttempt: any,
    feedbackUnlocked: boolean,
    feedbackDelayHours: number,
    hoursElapsed: number,
  ) {
    if (!feedbackUnlocked) {
      const hoursUntilUnlock = Math.ceil(feedbackDelayHours - hoursElapsed);

      filteredAttempt.responses = filteredAttempt.responses.map((r: any) => ({
        id: r.id,
        questionId: r.questionId,
        studentAnswer: null,
        selectedOptionId: null,
        isCorrect: r.isCorrect,
        pointsEarned: null,
        questionType: r.question.type,
        hint: this.generateLearningHint(r.question, r.isCorrect),
        question: {
          id: r.question.id,
          content: r.question.content,
          type: r.question.type,
          points: r.question.points,
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
      filteredAttempt.responses = filteredAttempt.responses.map((r: any) => ({
        ...r,
        hint: this.generateLearningHint(r.question, r.isCorrect),
      }));

      filteredAttempt.feedbackStatus = {
        level: 'detailed',
        unlocked: true,
        message:
          'Full feedback with learning hints available. Review to improve!',
      };
    }

    return filteredAttempt;
  }

  /**
   * Generate learning-focused hints rather than just showing answers.
   */
  generateLearningHint(question: any, isCorrect: boolean): string {
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
}
