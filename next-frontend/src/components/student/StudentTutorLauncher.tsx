'use client';

import { Bot, Sparkles } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export function StudentTutorLauncher() {
  const pathname = usePathname();
  const router = useRouter();
  const isStudentRoute = pathname.startsWith('/dashboard/student');
  const isChatbotPage = pathname.startsWith('/dashboard/student/chatbot');

  if (!isStudentRoute || isChatbotPage) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.push('/dashboard/student/chatbot')}
      className="fixed bottom-5 right-5 z-30 flex items-center gap-3 rounded-full border border-[var(--student-outline-strong)] bg-[var(--student-elevated)] px-4 py-3 text-left shadow-[var(--student-shadow)] backdrop-blur md:bottom-6 md:right-6"
      aria-label="Open AI chatbot"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--student-accent)] text-[var(--student-accent-contrast)]">
        <Bot className="h-5 w-5" />
      </span>
      <span className="hidden sm:block">
        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--student-accent)]">
          <Sparkles className="h-3 w-3" />
          AI Tutor
        </span>
        <span className="block text-sm font-semibold text-[var(--student-text-strong)]">
          Continue with Ja
        </span>
      </span>
    </button>
  );
}
