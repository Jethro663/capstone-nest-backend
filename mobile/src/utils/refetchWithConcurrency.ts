export async function refetchWithConcurrency(
  refreshers: Array<(() => Promise<unknown>) | null | undefined>,
  concurrency = 3,
): Promise<void> {
  const pending = refreshers.filter(
    (refresher): refresher is () => Promise<unknown> => Boolean(refresher),
  );
  const workerCount = Math.min(Math.max(1, concurrency), pending.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < pending.length) {
        const refresher = pending[nextIndex++];
        await Promise.resolve(refresher()).catch(() => undefined);
      }
    }),
  );
}
