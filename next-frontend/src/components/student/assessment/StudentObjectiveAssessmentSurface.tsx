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
  imageDisplayMode?: 'default' | 'expanded';
  imageZoom?: number;
  imagePositionX?: number;
  imagePositionY?: number;
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
      className="student-page rounded-2xl p-1 sm:rounded-3xl"
      onKeyDown={onSurfaceKeyDown}
    >
      <div className="sticky top-0 z-30 rounded-2xl border border-[var(--student-outline)] bg-[var(--student-glass)] p-3 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--student-text-strong)]">{title}</p>
            <p className="text-xs student-muted-text">{questionLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">{statusChips}</div>
        </div>
        <Progress value={progressValue} className="mt-2 h-2" />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_250px]">
        <Card className="student-card overflow-hidden">
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
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
                    className="text-base font-semibold leading-relaxed text-[var(--student-text-strong)] sm:text-lg"
                  />
                  {question.imageUrl ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-3">
                      <div
                        className="mx-auto overflow-hidden rounded-xl"
                        style={{
                          maxWidth: question.imageDisplayMode === 'expanded' ? '100%' : '780px',
                          height: question.imageDisplayMode === 'expanded' ? 'min(55vw, 440px)' : 'min(50vw, 360px)',
                        }}
                      >
                        <Image
                          src={question.imageUrl}
                          alt="Question"
                          width={1200}
                          height={675}
                          unoptimized
                          className="h-full w-full rounded-xl object-cover"
                          style={{
                            objectPosition: `${Math.min(Math.max(question.imagePositionX ?? 50, 0), 100)}% ${Math.min(Math.max(question.imagePositionY ?? 50, 0), 100)}%`,
                            transform: `scale(${Math.max(question.imageZoom ?? 100, 100) / 100})`,
                            transformOrigin: 'center',
                          }}
                        />
                      </div>
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

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">{footerLeft}</div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">{footerRight}</div>
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
