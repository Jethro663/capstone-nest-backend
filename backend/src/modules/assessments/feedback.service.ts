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
      filteredAttempt.responses = filteredAttempt.responses.map((r: any) => ({
        ...r,
        hint: r.hint || this.generateLearningHint(r.question, r.isCorrect),
      }));

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
        hint: r.hint || this.generateLearningHint(r.question, r.isCorrect),
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

  private stripHtml(text: string): string {
    return String(text ?? '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate learning-focused hints based on question content, concept tags, and explanation.
   */
  generateLearningHint(question: any, isCorrect?: boolean | null): string {
    if (!question) {
      return 'Review the core subject concepts in this module.';
    }

    if (
      question.hint &&
      typeof question.hint === 'string' &&
      question.hint.trim()
    ) {
      return question.hint.trim();
    }

    if (
      question.reviewHint &&
      typeof question.reviewHint === 'string' &&
      question.reviewHint.trim()
    ) {
      return question.reviewHint.trim();
    }

    const rawExplanation = question.explanation
      ? this.stripHtml(question.explanation)
      : '';
    const rawContent = question.content ? this.stripHtml(question.content) : '';

    if (rawExplanation.length > 5) {
      return `Key Concept: ${rawExplanation}`;
    }

    const conceptTags = Array.isArray(question.conceptTags)
      ? question.conceptTags.join(', ')
      : typeof question.weakConceptTag === 'string'
        ? question.weakConceptTag
        : '';

    if (conceptTags) {
      return `Focus Concept: This question tests ${conceptTags}. Recall key definitions and rules from the lesson modules.`;
    }

    const shortContent =
      rawContent.length > 70 ? `${rawContent.substring(0, 70)}...` : rawContent;
    if (shortContent) {
      return `Educational Clue: Pay close attention to the terms in "${shortContent}". Compare your reasoning with module core concepts.`;
    }

    return 'Educational Clue: Review the key principles in your class module materials for this question topic.';
  }
}
