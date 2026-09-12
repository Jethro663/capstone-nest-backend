import { ServiceUnavailableException } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export type ResetWorkAdmission = {
  epoch: number;
  storageGeneration: string;
};

const LEGACY_GENERATION = 'legacy';
const resetAdmission = new AsyncLocalStorage<ResetWorkAdmission>();
const cleanupOwnership = new AsyncLocalStorage<() => Promise<void>>();
export function getResetWorkAdmission() {
  return resetAdmission.getStore();
}
export function getResetRequestEpoch() {
  return resetAdmission.getStore()?.epoch;
}
export function getResetStorageGeneration(): string {
  const generation = getResetWorkAdmission()?.storageGeneration;
  if (!generation)
    throw new ServiceUnavailableException(
      'Storage writes require a current reset generation.',
    );
  return generation;
}
export function assertResetUserStorageKey(key: string): string {
  const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
  if (
    !normalized ||
    normalized
      .split('/')
      .some((part) => !part || part === '.' || part === '..') ||
    normalized.startsWith('__nexora_control/') ||
    normalized === '.nexora-storage-owner'
  )
    throw new ServiceUnavailableException('Unsafe upload storage key.');
  return normalized;
}
export function resetStorageKey(key: string): string {
  const normalized = assertResetUserStorageKey(key);
  return `${getResetStorageGeneration()}/${normalized}`;
}
export function resetStorageFilename(filename: string): string {
  if (!filename || filename.includes('/') || filename.includes('\\'))
    throw new ServiceUnavailableException('Unsafe upload filename.');
  return `${getResetStorageGeneration()}_${filename}`;
}
export function runResetWorkContext<T>(
  admission: ResetWorkAdmission | number,
  work: () => T,
): T {
  return resetAdmission.run(
    typeof admission === 'number'
      ? { epoch: admission, storageGeneration: LEGACY_GENERATION }
      : admission,
    work,
  );
}

export function runResetCleanupContext<T>(
  check: () => Promise<void>,
  work: () => T,
): T {
  return cleanupOwnership.run(check, work);
}
export async function assertResetCleanupOwnership(): Promise<void> {
  await cleanupOwnership.getStore()?.();
}
