export interface StoredObjectDescriptor {
  key: string;
  url?: string;
}

export interface SignedUploadDescriptor {
  key: string;
  url: string;
}

export interface StorageResetInventory {
  driver: 'local' | 's3';
  targetHash: string;
  ownershipHash: string;
  objectCount: number;
  pendingUploads?: number;
  bytes: number;
  fingerprint: string;
}

export interface StorageProviderInterface {
  putObject(input: {
    key: string;
    body: Buffer;
    contentType?: string;
  }): Promise<StoredObjectDescriptor>;
  deleteObject(key: string): Promise<void>;
  getSignedDownloadUrl(
    key: string,
    filename?: string,
    expiresInSeconds?: number,
  ): Promise<string>;
  getSignedUploadUrl(input: {
    key: string;
    contentType?: string;
    expiresInSeconds?: number;
  }): Promise<SignedUploadDescriptor>;
  resolvePublicUrl?(key: string): string | null;
  getObject(key: string): Promise<Buffer>;
  checkHealth?(): Promise<{ ok: boolean; message?: string }>;
  // Optional so unreviewed/new providers fail reset capability checks closed.
  inspectForReset?(): Promise<StorageResetInventory>;
  purgeForReset?(preserveGeneration: string): Promise<void>;
}

export const STORAGE_PROVIDER_TOKEN = Symbol('STORAGE_PROVIDER_TOKEN');
