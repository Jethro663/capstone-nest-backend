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
}

export interface SharedAssessmentQuestion {
  id: string;
  type: SharedQuestionType;
  options?: SharedQuestionOption[];
}

export function SharedAnswerInput({
  question,
  value,
  onChange,
}: {
  question: SharedAssessmentQuestion;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
}) {
  const options = question.options || [];

  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                value === opt.id
                  ? 'border-[var(--student-accent-soft-strong)] bg-[var(--student-accent-soft)]'
                  : 'border-[var(--student-outline)] hover:bg-[var(--student-surface-soft)]'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === opt.id}
                onChange={() => onChange(opt.id)}
                className="accent-[var(--student-accent)]"
              />
              <span className="select-none text-[var(--student-text-strong)]">{opt.text}</span>
            </label>
          ))}
        </div>
      );

    case 'multiple_select':
      return (
        <div className="space-y-2">
          {options.map((opt) => {
            const selected = Array.isArray(value) ? value.includes(opt.id) : false;
            return (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                  selected
                    ? 'border-[var(--student-accent-soft-strong)] bg-[var(--student-accent-soft)]'
                    : 'border-[var(--student-outline)] hover:bg-[var(--student-surface-soft)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const current = Array.isArray(value) ? value : [];
                    onChange(selected ? current.filter((id) => id !== opt.id) : [...current, opt.id]);
                  }}
                  className="accent-[var(--student-accent)]"
                />
                <span className="select-none text-[var(--student-text-strong)]">{opt.text}</span>
              </label>
            );
          })}
        </div>
      );

    case 'true_false':
      return (
        <div className="grid grid-cols-2 gap-3">
          {['True', 'False'].map((label) => {
            const opt = options.find((o) => o.text.toLowerCase() === label.toLowerCase());
            const optId = opt?.id || label.toLowerCase();
            return (
              <Button
                key={label}
                variant={value === optId ? 'default' : 'outline'}
                className={value === optId ? 'student-button-solid' : ''}
                onClick={() => onChange(optId)}
              >
                {label}
              </Button>
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
          className="min-h-[120px] w-full resize-y rounded-xl border border-[var(--student-outline)] bg-[var(--student-elevated)] text-[var(--student-text-strong)] p-3 focus:border-[var(--student-accent)] focus:outline-none"
        />
      );

    case 'dropdown':
      return (
        <select
          value={(value as string) || ''}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-[var(--student-outline)] bg-[var(--student-elevated)] text-[var(--student-text-strong)] p-3 focus:border-[var(--student-accent)] focus:outline-none"
        >
          <option value="">Select an answer...</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.text}
            </option>
          ))}
        </select>
      );

    default:
      return <p className="text-[var(--student-text-muted)]">Unsupported question type</p>;
  }
}

