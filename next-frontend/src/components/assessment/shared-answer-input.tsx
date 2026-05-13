import Image from 'next/image';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { Button } from '@/components/ui/button';

export type SharedQuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_answer'
  | 'fill_blank'
  | 'dropdown';

export interface SharedQuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean | null;
  imageUrl?: string;
  imageDisplayMode?: 'default' | 'expanded';
  imageZoom?: number;
  imagePositionX?: number;
  imagePositionY?: number;
}

export interface SharedAssessmentQuestion {
  id: string;
  type: SharedQuestionType;
  options?: SharedQuestionOption[];
}

function getOptionAccessibleText(text: string) {
  const withoutTags = text.replace(/<[^>]*>/g, ' ');
  const decoded =
    typeof document === 'undefined'
      ? withoutTags
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/gi, "'")
      : (() => {
          const textArea = document.createElement('textarea');
          textArea.innerHTML = withoutTags;
          return textArea.value;
        })();

  return decoded.replace(/\s+/g, ' ').trim() || 'Option';
}

function optionFeedbackLabel(isCorrect: boolean, selected: boolean) {
  if (isCorrect) return 'Correct answer';
  if (selected) return 'Your answer';
  return null;
}

function optionFeedbackClass(isCorrect: boolean, selected: boolean) {
  if (isCorrect) {
    return 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-[0_16px_28px_-24px_rgba(16,185,129,0.7)]';
  }

  if (selected) {
    return 'border-rose-300 bg-rose-50 text-rose-800 shadow-[0_16px_28px_-24px_rgba(244,63,94,0.62)]';
  }

  return 'border-[var(--student-outline)] bg-[var(--student-elevated)] text-[var(--student-text-muted)] opacity-75';
}

export function SharedAnswerInput({
  question,
  value,
  onChange,
  optionTextMode = 'text',
  showCorrectness = false,
}: {
  question: SharedAssessmentQuestion;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
  optionTextMode?: 'text' | 'rich';
  showCorrectness?: boolean;
}) {
  const options = question.options || [];
  const correctOptionIds = new Set(options.filter((opt) => opt.isCorrect).map((opt) => opt.id));
  const selectedOptionIds = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const hasAnswered = selectedOptionIds.size > 0 || (typeof value === 'string' && value.trim().length > 0);
  const shouldRevealCorrectness = showCorrectness && hasAnswered && correctOptionIds.size > 0;

  const getOptionClassName = (optionId: string, selected: boolean) => {
    if (shouldRevealCorrectness) {
      return optionFeedbackClass(correctOptionIds.has(optionId), selected);
    }

    return selected
      ? 'border-[var(--student-accent-soft-strong)] bg-[var(--student-accent-soft)]'
      : 'border-[var(--student-outline)] hover:bg-[var(--student-surface-soft)]';
  };

  const renderFeedbackTag = (optionId: string, selected: boolean) => {
    if (!shouldRevealCorrectness) return null;
    const isCorrect = correctOptionIds.has(optionId);
    const label = optionFeedbackLabel(isCorrect, selected);
    if (!label) return null;

    return (
      <span
        className={`ml-auto rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.08em] ${
          isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}
      >
        {label}
      </span>
    );
  };

  const renderCorrectAnswerSummary = () => {
    if (!shouldRevealCorrectness) return null;
    const correctLabels = options
      .filter((opt) => correctOptionIds.has(opt.id))
      .map((opt) => getOptionAccessibleText(opt.text));

    if (correctLabels.length === 0) return null;

    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
        Correct answer: {correctLabels.join(', ')}
      </div>
    );
  };

  const renderOptionText = (text: string) =>
    optionTextMode === 'rich' ? (
      <RichTextRenderer
        html={text}
        className="min-w-0 flex-1 text-[var(--student-text-strong)] [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0"
      />
    ) : (
      <span className="select-none text-[var(--student-text-strong)]">{text}</span>
    );
  const renderOptionImage = (option: SharedQuestionOption) => {
    if (!option.imageUrl) return null;

    const zoom = Math.max(option.imageZoom ?? 100, 100);
    const isExpanded = option.imageDisplayMode === 'expanded';
    const positionX = Math.min(Math.max(option.imagePositionX ?? 50, 0), 100);
    const positionY = Math.min(Math.max(option.imagePositionY ?? 50, 0), 100);

    return (
      <div
        className={`mt-3 overflow-hidden rounded-xl border border-[var(--student-outline)] bg-[var(--student-elevated)] p-3 ${
          isExpanded ? 'w-full' : ''
        }`}
      >
        <div
          className="mx-auto overflow-hidden rounded-lg"
          style={{
            maxWidth: isExpanded ? '100%' : '420px',
            height: isExpanded ? '260px' : '180px',
          }}
        >
          <Image
            src={option.imageUrl}
            alt={`${option.text || 'Option'} image`}
            width={1200}
            height={675}
            unoptimized
            className="h-full w-full object-cover"
            style={{
              objectPosition: `${positionX}% ${positionY}%`,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'center',
            }}
          />
        </div>
        <p className="mt-2 text-xs font-medium text-[var(--student-text-muted)]">{zoom}% view</p>
      </div>
    );
  };

  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {options.map((opt) => {
            const selected = value === opt.id;
            return (
              <label
                key={opt.id}
                aria-label={getOptionAccessibleText(opt.text)}
                className={`flex cursor-pointer flex-col gap-3 rounded-2xl border p-3 transition ${getOptionClassName(opt.id, selected)}`}
              >
                <div className="flex w-full items-center gap-3">
                  <input
                    type="radio"
                    name={question.id}
                    checked={selected}
                    onChange={() => onChange(opt.id)}
                    className="accent-[var(--student-accent)]"
                  />
                  {renderOptionText(opt.text)}
                  {renderFeedbackTag(opt.id, selected)}
                </div>
                {renderOptionImage(opt)}
              </label>
            );
          })}
        </div>
      );

    case 'multiple_select':
      return (
        <div className="space-y-2">
          {options.map((opt) => {
            const selected = Array.isArray(value) ? value.includes(opt.id) : false;
            const optionLabel = getOptionAccessibleText(opt.text);
            return (
              <label
                key={opt.id}
                aria-label={optionLabel}
                className={`flex cursor-pointer flex-col gap-3 rounded-2xl border p-3 transition ${getOptionClassName(opt.id, selected)}`}
              >
                <div className="flex w-full items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const current = Array.isArray(value) ? value : [];
                      onChange(selected ? current.filter((id) => id !== opt.id) : [...current, opt.id]);
                    }}
                    className="accent-[var(--student-accent)]"
                  />
                  {renderOptionText(opt.text)}
                  {renderFeedbackTag(opt.id, selected)}
                </div>
                {renderOptionImage(opt)}
              </label>
            );
          })}
        </div>
      );

    case 'true_false':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {['True', 'False'].map((label) => {
            const opt = options.find((o) => o.text.toLowerCase() === label.toLowerCase());
            const optId = opt?.id || label.toLowerCase();
            const selected = value === optId;
            const isCorrect = shouldRevealCorrectness && correctOptionIds.has(optId);
            const isWrongPick = shouldRevealCorrectness && selected && !isCorrect;

            return (
              <div key={label} className="space-y-2">
                <Button
                  variant={selected || isCorrect ? 'default' : 'outline'}
                  className={`w-full rounded-2xl ${
                    isCorrect
                      ? 'border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700'
                      : isWrongPick
                        ? 'border-rose-300 bg-rose-600 text-white hover:bg-rose-700'
                        : selected
                          ? 'student-button-solid'
                          : ''
                  }`}
                  onClick={() => onChange(optId)}
                >
                  {label}
                </Button>
                {opt ? renderOptionImage(opt) : null}
              </div>
            );
          })}
        </div>
      );

    case 'short_answer':
    case 'fill_blank':
      return (
        <textarea
          value={(value as string) || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Type your answer..."
          className="min-h-[120px] w-full resize-y rounded-xl border border-[var(--student-outline)] bg-[var(--student-elevated)] p-3 text-[var(--student-text-strong)] focus:border-[var(--student-accent)] focus:outline-none"
        />
      );

    case 'dropdown':
      return (
        <div className="space-y-3">
          {options.some((opt) => opt.imageUrl) ? (
            <div className="space-y-2 rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-3">
              {options.map((opt) => (
                <div key={`preview-${opt.id}`} className={`rounded-lg border p-3 ${getOptionClassName(opt.id, value === opt.id)}`}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--student-text-strong)]">{opt.text}</p>
                    {renderFeedbackTag(opt.id, value === opt.id)}
                  </div>
                  {renderOptionImage(opt)}
                </div>
              ))}
            </div>
          ) : null}
          <select
            value={(value as string) || ''}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-xl border border-[var(--student-outline)] bg-[var(--student-elevated)] p-3 text-[var(--student-text-strong)] focus:border-[var(--student-accent)] focus:outline-none"
          >
            <option value="">Select an answer...</option>
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.text}
              </option>
            ))}
          </select>
          {renderCorrectAnswerSummary()}
        </div>
      );

    default:
      return <p className="text-[var(--student-text-muted)]">Unsupported question type</p>;
  }
}
