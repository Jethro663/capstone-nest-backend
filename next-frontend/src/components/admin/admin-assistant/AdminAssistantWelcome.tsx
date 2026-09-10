'use client';

import {
  Activity,
  FileSearch,
  FileText,
  ShieldAlert,
} from 'lucide-react';

type StarterTask = {
  title: string;
  description: string;
  prompt: string;
  icon: typeof Activity;
};

const STARTER_TASKS: StarterTask[] = [
  {
    title: 'Investigate a problem',
    description: 'Trace unusual activity, risk signals, or recent failures.',
    prompt:
      'Investigate the most important operational or learner risk signals in the current grading period. Show the evidence and tell me what needs attention first.',
    icon: ShieldAlert,
  },
  {
    title: 'Find records',
    description: 'Locate report entries, evaluations, or audit activity.',
    prompt:
      'Find recent evaluation and audit records that need admin review. Group the results by type and show the matching evidence.',
    icon: FileSearch,
  },
  {
    title: 'Summarize school activity',
    description: 'Turn recent platform data into a concise briefing.',
    prompt:
      'Give me a concise summary of recent school activity, including usage, assessment, learner performance, and any notable exceptions.',
    icon: Activity,
  },
  {
    title: 'Prepare admin work',
    description: 'Draft a safe next step without changing official records.',
    prompt:
      'Review the current admin data and prepare the most useful next step for me. Create a draft when appropriate, but do not publish or change official records.',
    icon: FileText,
  },
];

export function AdminAssistantWelcome({
  firstName,
  onSelect,
}: {
  firstName?: string;
  onSelect: (prompt: string) => void;
}) {
  return (
    <section className="admin-assistant-welcome">
      <div className="admin-assistant-welcome-copy">
        <span className="admin-assistant-orb" aria-hidden="true">
          N
        </span>
        <p>Admin Assistant</p>
        <h2>What can I help you understand{firstName ? `, ${firstName}` : ''}?</h2>
        <p>
          Ask in plain language. I can inspect approved Nexora data, explain what
          it means, and prepare safe next steps for your review.
        </p>
      </div>

      <div className="admin-assistant-starters">
        {STARTER_TASKS.map((task) => {
          const Icon = task.icon;
          return (
            <button
              key={task.title}
              type="button"
              onClick={() => onSelect(task.prompt)}
            >
              <span className="admin-assistant-starter-icon">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <strong>{task.title}</strong>
                <small>{task.description}</small>
              </span>
            </button>
          );
        })}
      </div>

      <p className="admin-assistant-boundary">
        The assistant can read approved admin data and prepare drafts. It cannot
        silently change official records.
      </p>
    </section>
  );
}
