import { getServerApiOrigin } from '@/lib/api-origin';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string; fileId: string }> },
) {
  const { token, fileId } = await context.params;
  const response = await fetch(
    `${getServerApiOrigin().replace(/\/$/, '')}/api/lessons/preview/${encodeURIComponent(token)}/files/${encodeURIComponent(fileId)}`,
    { cache: 'no-store' },
  );

  if (!response.ok || !response.body) {
    return Response.json(
      { success: false, message: 'Lesson preview file is unavailable' },
      { status: response.status || 502 },
    );
  }

  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Content-Type':
      response.headers.get('content-type') || 'application/octet-stream',
  });
  const disposition = response.headers.get('content-disposition');
  if (disposition) headers.set('Content-Disposition', disposition);
  const length = response.headers.get('content-length');
  if (length) headers.set('Content-Length', length);

  return new Response(response.body, { status: 200, headers });
}
