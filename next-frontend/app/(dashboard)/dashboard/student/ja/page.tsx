import StudentJaWorkspace from '@/components/student/ja/StudentJaWorkspace';
import './ja-hub.css';

interface StudentJaPageProps {
  searchParams?:
    | Promise<{
        mode?: string | string[];
        classId?: string | string[];
        entry?: string | string[];
        returnTo?: string | string[];
      }>
    | {
        mode?: string | string[];
        classId?: string | string[];
        entry?: string | string[];
        returnTo?: string | string[];
      };
}

type JaMode = 'practice' | 'ask' | 'review';
type JaEntry = 'sidebar' | 'class' | 'lxp' | 'lesson' | 'assessment';

function readSingle(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function readMode(value: string | string[] | undefined): JaMode | undefined {
  const mode = readSingle(value);
  if (mode === 'practice' || mode === 'ask' || mode === 'review') return mode;
  return undefined;
}

function readEntry(value: string | string[] | undefined): JaEntry | undefined {
  const entry = readSingle(value);
  if (
    entry === 'sidebar' ||
    entry === 'class' ||
    entry === 'lxp' ||
    entry === 'lesson' ||
    entry === 'assessment'
  ) {
    return entry;
  }
  return undefined;
}

export default async function StudentJaPage({
  searchParams,
}: StudentJaPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="ja-page-shell">
      <StudentJaWorkspace
        initialMode={readMode(resolvedSearchParams?.mode)}
        initialClassId={readSingle(resolvedSearchParams?.classId)}
        initialEntry={readEntry(resolvedSearchParams?.entry)}
        returnTo={readSingle(resolvedSearchParams?.returnTo)}
      />
    </div>
  );
}
