export type ClassRecordAccountState = 'active' | 'archived';

export function toClassRecordAccountState(
  status: string | null | undefined,
): ClassRecordAccountState {
  return status === 'DELETED' ? 'archived' : 'active';
}

export function withClassRecordAccountState<
  T extends { status?: string | null },
>(person: T): Omit<T, 'status'> & { accountState: ClassRecordAccountState } {
  const { status, ...identity } = person;
  return {
    ...identity,
    accountState: toClassRecordAccountState(status),
  };
}
