import { ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  lstat,
  readFile,
  readdir,
  realpath,
  rmdir,
  unlink,
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import * as path from 'node:path';
import type { StorageResetInventory } from './storage.provider';
import { assertResetCleanupOwnership } from '../../system-reset/system-reset.context';

export const LOCAL_STORAGE_OWNER_SENTINEL = '.nexora-storage-owner';

function assertOwnershipId(ownershipId: string) {
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(ownershipId))
    throw new ConflictException(
      'A stable UUID storage ownership identity must be configured before reset.',
    );
}

function ancestorOf(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

async function validateRoot(
  input: string,
  owned: boolean,
  ownershipId: string,
): Promise<string> {
  await assertResetCleanupOwnership();
  if (!owned)
    throw new ConflictException(
      'Upload storage ownership must be explicitly configured before reset.',
    );
  assertOwnershipId(ownershipId);
  const root = path.resolve(input);
  if (
    root.split(path.sep).filter(Boolean).length < 2 ||
    root === tmpdir() ||
    ancestorOf(root, process.cwd()) ||
    ancestorOf(root, homedir())
  )
    throw new ConflictException(
      'Reset requires a dedicated upload directory, not a system or workspace directory.',
    );
  try {
    const stat = await lstat(root);
    if (stat.isSymbolicLink() || (await realpath(root)) !== root)
      throw new ConflictException(
        'Reset upload root must not contain a symbolic link.',
      );
    if (!stat.isDirectory())
      throw new ConflictException('Reset upload root must be a directory.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const sentinel = path.join(root, LOCAL_STORAGE_OWNER_SENTINEL);
  try {
    const sentinelStat = await lstat(sentinel);
    if (
      sentinelStat.isSymbolicLink() ||
      !sentinelStat.isFile() ||
      (await realpath(sentinel)) !== sentinel
    )
      throw new ConflictException(
        'Reset storage ownership sentinel is not a protected regular file.',
      );
    if ((await readFile(sentinel, 'utf8')).trim() !== ownershipId)
      throw new ConflictException('Reset storage ownership identity changed.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      throw new ConflictException(
        'Reset storage ownership sentinel is missing.',
      );
    throw error;
  }
  return root;
}

function isPreservedEntry(key: string, generation?: string) {
  if (key === LOCAL_STORAGE_OWNER_SENTINEL) return true;
  if (!generation) return false;
  return key
    .split(path.sep)
    .some((part) => part === generation || part.startsWith(`${generation}_`));
}

async function entries(
  root: string,
  subdirectory = '',
): Promise<
  Array<{ key: string; size: number; modified: number; directory: boolean }>
> {
  const current = path.join(root, subdirectory);
  let names: string[];
  try {
    names = await readdir(current);
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === 'ENOENT' &&
      subdirectory === ''
    )
      return [];
    throw error;
  }
  const result: Awaited<ReturnType<typeof entries>> = [];
  for (const name of names.sort()) {
    const key = path.join(subdirectory, name);
    const stat = await lstat(path.join(root, key));
    if (stat.isSymbolicLink())
      throw new ConflictException(
        'Upload storage contains a symbolic link; review it before reset.',
      );
    if (!stat.isDirectory() && !stat.isFile())
      throw new ConflictException(
        'Upload storage contains an unsupported filesystem entry.',
      );
    if (stat.isDirectory()) result.push(...(await entries(root, key)));
    result.push({
      key,
      size: stat.isFile() ? stat.size : 0,
      modified: stat.mtimeMs,
      directory: stat.isDirectory(),
    });
  }
  return result;
}

export async function inspectResetLocalStorage(
  input: string,
  owned: boolean,
  ownershipId: string,
): Promise<StorageResetInventory> {
  const root = await validateRoot(input, owned, ownershipId);
  const files = (await entries(root)).filter(
    (entry) => !entry.directory && !isPreservedEntry(entry.key),
  );
  const targetHash = createHash('sha256').update(root).digest('hex');
  return {
    driver: 'local',
    targetHash,
    ownershipHash: createHash('sha256')
      .update(`local\0${targetHash}\0${ownershipId}`)
      .digest('hex'),
    objectCount: files.length,
    bytes: files.reduce((sum, file) => sum + file.size, 0),
    fingerprint: createHash('sha256')
      .update(JSON.stringify(files))
      .digest('hex'),
  };
}

export async function purgeResetLocalStorage(
  input: string,
  owned: boolean,
  ownershipId: string,
  preserveGeneration: string,
): Promise<void> {
  const root = await validateRoot(input, owned, ownershipId);
  // Inventory all entries first. Unknown entries must block before any deletion.
  const inventory = (await entries(root)).filter(
    (entry) => !isPreservedEntry(entry.key, preserveGeneration),
  );
  for (const entry of inventory) {
    await validateRoot(root, owned, ownershipId);
    const target = path.join(root, entry.key);
    let current;
    try {
      current = await lstat(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    await assertResetCleanupOwnership();
    if (current.isSymbolicLink())
      throw new ConflictException('Upload storage changed during reset.');
    if (entry.directory && current.isDirectory()) {
      if ((await readdir(target)).length === 0) await rmdir(target);
    } else if (!entry.directory && current.isFile()) await unlink(target);
    else throw new ConflictException('Upload storage changed during reset.');
  }
  if (
    (await entries(root)).some(
      (entry) => !isPreservedEntry(entry.key, preserveGeneration),
    )
  )
    throw new ConflictException(
      'Upload cleanup verification found remaining files.',
    );
}
