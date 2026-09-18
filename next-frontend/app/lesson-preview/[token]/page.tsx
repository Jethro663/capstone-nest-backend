import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { LessonBlockStudentRenderer } from '@/features/lesson-blocks/LessonBlockStudentRenderer';
import { getLessonPreview } from '@/features/lesson-preview/preview-api';

export const dynamic = 'force-dynamic';

export default async function LessonPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let lesson: Awaited<ReturnType<typeof getLessonPreview>> | null;
  try {
    lesson = await getLessonPreview(token);
  } catch {
    lesson = null;
  }

  if (!lesson) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f6fa] px-5 text-[#14213d]">
        <section className="w-full max-w-md rounded-2xl border border-[#d9deea] bg-white px-5 py-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a51c30]">
            Preview unavailable
          </p>
          <h1 className="mt-2 text-xl font-black">Open a fresh preview from Nexora</h1>
          <p className="mt-2 text-sm leading-6 text-[#64708a]">
            This secure lesson preview link is invalid or has expired. Return to the mobile editor and open Web preview again.
          </p>
        </section>
      </main>
    );
  }

  const blocks = [...(lesson.contentBlocks ?? [])].sort(
    (left, right) => left.order - right.order,
  );

  return (
      <main className="min-h-screen bg-[#f4f6fa] px-4 py-6 text-[#14213d] sm:px-6">
        <div className="mx-auto max-w-3xl">
          <header className="mb-4 flex items-center justify-between gap-4 border-b border-[#d9deea] pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#a51c30]">
                Student web preview
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">
                {lesson.title}
              </h1>
            </div>
            <span className="rounded-full bg-[#14213d] px-3 py-1.5 text-xs font-bold text-white">
              Read only
            </span>
          </header>

          {lesson.description ? (
            <section className="mb-4 rounded-2xl border border-[#d9deea] bg-white px-4 py-4">
              <RichTextRenderer html={lesson.description} />
            </section>
          ) : null}

          <section className="grid gap-4" aria-label="Lesson content preview">
            {blocks.length ? (
              blocks.map((block) => (
                <LessonBlockStudentRenderer
                  key={block.id}
                  block={block}
                  previewFileBaseUrl={`/lesson-preview/${encodeURIComponent(token)}/files`}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#c8cedd] bg-white px-4 py-8 text-center text-sm font-semibold text-[#64708a]">
                This lesson does not have content blocks yet.
              </div>
            )}
          </section>
        </div>
      </main>
  );
}
