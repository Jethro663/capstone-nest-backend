import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'node:path';
import { UPLOAD_ROOT } from '../file-upload/constants/file-upload.constants';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProviderInterface,
} from '../file-upload/storage/storage.provider';
import {
  inspectResetLocalStorage,
  purgeResetLocalStorage,
} from '../file-upload/storage/reset-local-storage';

@Injectable()
export class SystemResetAssets {
  constructor(
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProviderInterface,
    private readonly config: ConfigService,
  ) {}

  private roots() {
    // Avatar and roster controllers also use ./uploads when UPLOAD_DIR differs.
    const roots = [
      ...new Set([path.resolve(UPLOAD_ROOT), path.resolve('./uploads')]),
    ];
    return roots.filter(
      (root) =>
        !roots.some(
          (other) => other !== root && root.startsWith(`${other}${path.sep}`),
        ),
    );
  }
  private owned() {
    return (
      this.config.get('SYSTEM_RESET_STORAGE_OWNERSHIP') ===
      'dedicated-upload-storage'
    );
  }
  private ownershipId() {
    return this.config.get<string>('SYSTEM_RESET_STORAGE_ID') ?? '';
  }
  async inspect() {
    if (!this.storage.inspectForReset || !this.storage.purgeForReset)
      throw new ConflictException('Storage does not support verified reset.');
    return {
      primary: await this.storage.inspectForReset(),
      local: await Promise.all(
        this.roots().map((root) =>
          inspectResetLocalStorage(root, this.owned(), this.ownershipId()),
        ),
      ),
    };
  }
  async purge(preserveGeneration: string) {
    await this.inspect(); // Validate every scope before the first deletion.
    await this.storage.purgeForReset!(preserveGeneration);
    for (const root of this.roots())
      await purgeResetLocalStorage(
        root,
        this.owned(),
        this.ownershipId(),
        preserveGeneration,
      );
    await this.verify();
  }
  async verify() {
    const inventory = await this.inspect();
    if (
      [inventory.primary, ...inventory.local].some(
        (entry) => entry.objectCount !== 0 || (entry.pendingUploads ?? 0) !== 0,
      )
    )
      throw new ConflictException('File cleanup has not finished.');
  }
}
