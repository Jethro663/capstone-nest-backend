import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  symlink,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import {
  inspectResetLocalStorage,
  LOCAL_STORAGE_OWNER_SENTINEL,
  purgeResetLocalStorage,
} from './reset-local-storage';

describe('strict local upload reset', () => {
  const ownershipId = '11111111-1111-4111-8111-111111111111';
  let fixture: string, uploads: string;
  beforeEach(async () => {
    fixture = await mkdtemp(path.join(tmpdir(), 'nexora-reset-files-'));
    uploads = path.join(fixture, 'uploads');
    await mkdir(path.join(uploads, 'library'), { recursive: true });
    await writeFile(
      path.join(uploads, 'library', 'source.txt'),
      'private lesson',
    );
    await writeFile(path.join(fixture, 'keep.txt'), 'application asset');
    await writeFile(
      path.join(uploads, LOCAL_STORAGE_OWNER_SENTINEL),
      ownershipId,
    );
  });
  afterEach(async () => {
    await rm(fixture, { recursive: true, force: true });
  });
  it('requires explicit installation ownership before inventory or deletion', async () => {
    await expect(
      inspectResetLocalStorage(uploads, false, ownershipId),
    ).rejects.toThrow('ownership');
    await expect(
      purgeResetLocalStorage(uploads, false, ownershipId, 'g-next'),
    ).rejects.toThrow('ownership');
    expect(
      await readFile(path.join(uploads, 'library', 'source.txt'), 'utf8'),
    ).toBe('private lesson');
  });
  it('clears only the owned upload directory and verifies it is empty', async () => {
    expect(
      await inspectResetLocalStorage(uploads, true, ownershipId),
    ).toMatchObject({
      driver: 'local',
      objectCount: 1,
      bytes: 14,
    });
    await purgeResetLocalStorage(uploads, true, ownershipId, 'g-next');
    expect(await readdir(uploads)).toEqual([LOCAL_STORAGE_OWNER_SENTINEL]);
    expect(await readFile(path.join(fixture, 'keep.txt'), 'utf8')).toBe(
      'application asset',
    );
    expect(
      await inspectResetLocalStorage(uploads, true, ownershipId),
    ).toMatchObject({
      objectCount: 0,
      bytes: 0,
    });
    await expect(
      purgeResetLocalStorage(uploads, true, ownershipId, 'g-next'),
    ).resolves.toBeUndefined();
  });
  it('refuses a symlink target or linked child instead of following it', async () => {
    const link = path.join(fixture, 'linked-root');
    await symlink(uploads, link);
    await expect(
      inspectResetLocalStorage(link, true, ownershipId),
    ).rejects.toThrow('symbolic');
    await symlink(
      path.join(fixture, 'keep.txt'),
      path.join(uploads, 'linked-file'),
    );
    await expect(
      purgeResetLocalStorage(uploads, true, ownershipId, 'g-next'),
    ).rejects.toThrow('symbolic');
    expect(await readFile(path.join(fixture, 'keep.txt'), 'utf8')).toBe(
      'application asset',
    );
  });
  it.each(['/', process.cwd(), tmpdir()])(
    'refuses a broad directory %s even with ownership configured',
    async (root) => {
      await expect(
        inspectResetLocalStorage(root, true, ownershipId),
      ).rejects.toThrow('dedicated');
    },
  );
  it('rejects a different volume identity at the same path before deletion', async () => {
    await writeFile(
      path.join(uploads, LOCAL_STORAGE_OWNER_SENTINEL),
      '22222222-2222-4222-8222-222222222222',
    );
    await expect(
      purgeResetLocalStorage(uploads, true, ownershipId, 'g-next'),
    ).rejects.toThrow('identity changed');
    expect(
      await readFile(path.join(uploads, 'library', 'source.txt'), 'utf8'),
    ).toBe('private lesson');
  });
  it('preserves the next generation while deleting retired files', async () => {
    await mkdir(path.join(uploads, 'g-next', 'library'), { recursive: true });
    await writeFile(
      path.join(uploads, 'g-next', 'library', 'fresh.txt'),
      'fresh',
    );
    await purgeResetLocalStorage(uploads, true, ownershipId, 'g-next');
    expect(
      await readFile(
        path.join(uploads, 'g-next', 'library', 'fresh.txt'),
        'utf8',
      ),
    ).toBe('fresh');
  });
});
