'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import {
  SharedAnswerInput,
  type SharedQuestionOption,
  type SharedQuestionType,
} from '@/components/assessment/shared-answer-input';
import { SharedQuestionNavigator } from '@/components/assessment/shared-question-navigator';

interface ObjectiveAssessmentSurfaceQuestion {
  id: string;
  type: SharedQuestionType;
  points?: number | null;
  promptHtml: string;
  imageUrl?: string | null;
  options?: SharedQuestionOption[];
}

interface StudentObjectiveAssessmentSurfaceProps {
  title: string;
  questionLabel: string;
  progressValue: number;
  statusChips?: ReactNode;
  question: ObjectiveAssessmentSurfaceQuestion;
  currentIdx: number;
  questionIds: string[];
  answeredById: Record<string, boolean>;
  navigationLocked: boolean;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
  onNavigate: (index: number) => void;
  metaBadges?: ReactNode;
  promptSupplement?: ReactNode;
  feedback?: ReactNode;
  footerLeft: ReactNode;
  footerRight: ReactNode;
  optionTextMode?: 'text' | 'rich';
  protectContent?: boolean;
  onSurfaceKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

export function StudentObjectiveAssessmentSurface({
  title,
  questionLabel,
  progressValue,
  statusChips,
  question,
  currentIdx,
  questionIds,
  answeredById,
  navigationLocked,
  value,
  onChange,
  onNavigate,
  metaBadges,
  promptSupplement,
  feedback,
  footerLeft,
  footerRight,
  optionTextMode = 'text',
  protectContent = false,
  onSurfaceKeyDown,
}: StudentObjectiveAssessmentSurfaceProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="student-page rounded-3xl p-1"
      onKeyDown={onSurfaceKeyDown}
    >
      <div className="sticky top-0 z-30 rounded-2xl border border-[var(--student-outline)] bg-[var(--student-glass)] p-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--student-text-strong)]">{title}</p>
            <p className="text-xs student-muted-text">{questionLabel}</p>
          </div>
          <div className="flex items-center gap-2">{statusChips}</div>
        </div>
        <Progress value={progressValue} className="mt-2 h-2" />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_250px]">
        <Card className="student-card overflow-hidden">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-2">
              {metaBadges ?? (
                <>
                  <Badge variant="outline" className="capitalize">
                    {question.type.replace('_', ' ')}
                  </Badge>
                  {typeof question.points === 'number' ? (
                    <Badge variant="secondary">{question.points} pts</Badge>
                  ) : null}
                </>
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={question.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                exit={reduceMotion ? {} : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className="select-none"
                  onCopy={protectContent ? (event) => event.preventDefault() : undefined}
                  onCut={protectContent ? (event) => event.preventDefault() : undefined}
                  onContextMenu={protectContent ? (event) => event.preventDefault() : undefined}
                >
                  <RichTextRenderer
                    html={question.promptHtml}
                    className="text-lg font-semibold leading-relaxed text-[var(--student-text-strong)]"
                  />
                  {question.imageUrl ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-3">
                      <Image
                        src={question.imageUrl}
                        alt="Question"
                        width={1200}
                        height={675}
                        unoptimized
                        className="max-h-[360px] h-auto w-full rounded-xl object-contain"
                      />
                    </div>
                  ) : null}
                </div>

                {promptSupplement ? <div className="mt-4">{promptSupplement}</div> : null}

                <div className="mt-4">
                  <SharedAnswerInput
                    question={{
                      id: question.id,
                      type: question.type,
                      options: question.options,
                    }}
                    value={value}
                    onChange={onChange}
                    optionTextMode={optionTextMode}
                  />
                </div>

                {feedback ? <div className="mt-4">{feedback}</div> : null}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between border-t pt-4">
              <div>{footerLeft}</div>
              <div>{footerRight}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="student-card h-fit">
          <CardContent className="p-4">
            <SharedQuestionNavigator
              questionIds={questionIds}
              currentIdx={currentIdx}
              answeredById={answeredById}
              navigationLocked={navigationLocked}
              onNavigate={onNavigate}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
