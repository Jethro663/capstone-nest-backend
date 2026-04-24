import StudentJaWorkspace from '@/components/student/ja/StudentJaWorkspace';
import './ja-hub.css';

interface StudentJaPageProps {
  searchParams?:
    | Promise<{
        mode?: string | string[];
        classId?: string | string[];
      }>
    | {
        mode?: string | string[];
        classId?: string | string[];
      };
}

type JaMode = 'practice' | 'ask' | 'review';

function readSingle(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function readMode(value: string | string[] | undefined): JaMode | undefined {
  const mode = readSingle(value);
  if (mode === 'practice' || mode === 'ask' || mode === 'review') return mode;
  return undefined;
}

export default async function StudentJaPage({
  searchParams,
}: StudentJaPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <StudentJaWorkspace
      initialMode={readMode(resolvedSearchParams?.mode)}
      initialClassId={readSingle(resolvedSearchParams?.classId)}
    />
  );
}
