import { ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  AbortMultipartUploadCommand,
  DeleteObjectsCommand,
  GetBucketVersioningCommand,
  HeadObjectCommand,
  ListMultipartUploadsCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { StorageResetInventory } from './storage.provider';
import { assertResetCleanupOwnership } from '../../system-reset/system-reset.context';

type Client = Pick<S3Client, 'send'>;
type ObjectEntry = {
  Key: string;
  VersionId?: string;
  size: number;
  etag?: string;
  modified?: string;
};
type UploadEntry = { Key: string; UploadId: string };
export const S3_STORAGE_CONTROL_PREFIX = '__nexora_control/';
export const S3_STORAGE_OWNER_SENTINEL = `${S3_STORAGE_CONTROL_PREFIX}storage-owner`;

function assertOwnership(bucket: string, owned: boolean, ownershipId: string) {
  if (
    !owned ||
    !bucket ||
    !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(ownershipId)
  )
    throw new ConflictException(
      'Bucket ownership and a stable UUID identity must be explicitly configured before reset.',
    );
}

async function verifySentinel(
  client: Client,
  bucket: string,
  owned: boolean,
  ownershipId: string,
) {
  await assertResetCleanupOwnership();
  assertOwnership(bucket, owned, ownershipId);
  let sentinel;
  try {
    sentinel = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: S3_STORAGE_OWNER_SENTINEL }),
    );
  } catch {
    throw new ConflictException('Reset storage ownership sentinel is missing.');
  }
  if (sentinel.Metadata?.['nexora-storage-owner'] !== ownershipId)
    throw new ConflictException('Reset storage ownership identity changed.');
}

function isPreservedKey(key: string, generation?: string) {
  if (key === S3_STORAGE_OWNER_SENTINEL) return true;
  if (key.startsWith(S3_STORAGE_CONTROL_PREFIX))
    throw new ConflictException('Unknown reset storage control object.');
  return !!generation && key.startsWith(`${generation}/`);
}

function isKnownUnversionedEndpoint(endpoint?: string) {
  if (!endpoint) return false;
  const host = new URL(endpoint).hostname.toLowerCase();
  // These providers document no S3 object versioning. Do not infer this from a
  // generic NotImplemented/AccessDenied response on an arbitrary S3 endpoint.
  // https://developers.cloudflare.com/r2/api/s3/api/
  // https://docs.railway.com/storage-buckets
  return (
    /^[a-z0-9]+(?:\.eu|\.fedramp)?\.r2\.cloudflarestorage\.com$/.test(host) ||
    host === 't3.storageapi.dev'
  );
}

async function inventory(
  client: Client,
  bucket: string,
  owned: boolean,
  ownershipId: string,
  endpoint?: string,
  preserveGeneration?: string,
) {
  await verifySentinel(client, bucket, owned, ownershipId);
  const versioning = isKnownUnversionedEndpoint(endpoint)
    ? undefined
    : (await client.send(new GetBucketVersioningCommand({ Bucket: bucket })))
        .Status;
  if (versioning && !['Enabled', 'Suspended'].includes(versioning))
    throw new ConflictException('Unrecognized object versioning state.');
  const objects: ObjectEntry[] = [];
  if (versioning) {
    let KeyMarker: string | undefined, VersionIdMarker: string | undefined;
    const seen = new Set<string>();
    let listing = true;
    while (listing) {
      await assertResetCleanupOwnership();
      const page = await client.send(
        new ListObjectVersionsCommand({
          Bucket: bucket,
          KeyMarker,
          VersionIdMarker,
        }),
      );
      for (const object of [
        ...(page.Versions ?? []),
        ...(page.DeleteMarkers ?? []),
      ]) {
        if (!object.Key || !object.VersionId)
          throw new ConflictException(
            'Object version inventory is incomplete.',
          );
        if (isPreservedKey(object.Key, preserveGeneration)) continue;
        objects.push({
          Key: object.Key,
          VersionId: object.VersionId,
          size:
            'Size' in object && typeof object.Size === 'number'
              ? object.Size
              : 0,
          etag:
            'ETag' in object && typeof object.ETag === 'string'
              ? object.ETag
              : undefined,
          modified: object.LastModified?.toISOString(),
        });
      }
      if (!page.IsTruncated) {
        listing = false;
        continue;
      }
      const marker = JSON.stringify([
        page.NextKeyMarker,
        page.NextVersionIdMarker,
      ]);
      if (!page.NextKeyMarker || seen.has(marker))
        throw new ConflictException(
          'Object version pagination did not advance.',
        );
      seen.add(marker);
      KeyMarker = page.NextKeyMarker;
      VersionIdMarker = page.NextVersionIdMarker;
    }
  } else {
    let ContinuationToken: string | undefined;
    const seen = new Set<string>();
    let listing = true;
    while (listing) {
      await assertResetCleanupOwnership();
      const page = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, ContinuationToken }),
      );
      for (const object of page.Contents ?? []) {
        if (!object.Key)
          throw new ConflictException('Object inventory is incomplete.');
        if (isPreservedKey(object.Key, preserveGeneration)) continue;
        objects.push({
          Key: object.Key,
          size: object.Size ?? 0,
          etag: object.ETag,
          modified: object.LastModified?.toISOString(),
        });
      }
      if (!page.IsTruncated) {
        listing = false;
        continue;
      }
      if (!page.NextContinuationToken || seen.has(page.NextContinuationToken))
        throw new ConflictException('Object pagination did not advance.');
      seen.add(page.NextContinuationToken);
      ContinuationToken = page.NextContinuationToken;
    }
  }
  const uploads: UploadEntry[] = [];
  let KeyMarker: string | undefined, UploadIdMarker: string | undefined;
  const seenUploads = new Set<string>();
  let listingUploads = true;
  while (listingUploads) {
    await assertResetCleanupOwnership();
    const page = await client.send(
      new ListMultipartUploadsCommand({
        Bucket: bucket,
        KeyMarker,
        UploadIdMarker,
      }),
    );
    for (const upload of page.Uploads ?? []) {
      if (!upload.Key || !upload.UploadId)
        throw new ConflictException(
          'Multipart upload inventory is incomplete.',
        );
      if (isPreservedKey(upload.Key, preserveGeneration)) continue;
      uploads.push({ Key: upload.Key, UploadId: upload.UploadId });
    }
    if (!page.IsTruncated) {
      listingUploads = false;
      continue;
    }
    const marker = JSON.stringify([
      page.NextKeyMarker,
      page.NextUploadIdMarker,
    ]);
    if (!page.NextKeyMarker || seenUploads.has(marker))
      throw new ConflictException('Multipart pagination did not advance.');
    seenUploads.add(marker);
    KeyMarker = page.NextKeyMarker;
    UploadIdMarker = page.NextUploadIdMarker;
  }
  return { objects, uploads };
}

export async function inspectResetS3Storage(
  client: Client,
  bucket: string,
  owned: boolean,
  ownershipId: string,
  endpoint?: string,
  region?: string,
): Promise<StorageResetInventory> {
  const result = await inventory(client, bucket, owned, ownershipId, endpoint);
  const targetHash = createHash('sha256')
    .update(
      JSON.stringify({
        bucket,
        endpoint: endpoint ?? 'aws',
        region: region ?? '',
      }),
    )
    .digest('hex');
  return {
    driver: 's3',
    targetHash,
    ownershipHash: createHash('sha256')
      .update(`s3\0${targetHash}\0${ownershipId}`)
      .digest('hex'),
    objectCount: result.objects.length,
    pendingUploads: result.uploads.length,
    bytes: result.objects.reduce((sum, object) => sum + object.size, 0),
    fingerprint: createHash('sha256')
      .update(JSON.stringify(result))
      .digest('hex'),
  };
}

export async function purgeResetS3Storage(
  client: Client,
  bucket: string,
  owned: boolean,
  ownershipId: string,
  preserveGeneration: string,
  endpoint?: string,
): Promise<void> {
  const result = await inventory(
    client,
    bucket,
    owned,
    ownershipId,
    endpoint,
    preserveGeneration,
  );
  await assertResetCleanupOwnership();
  for (const upload of result.uploads) {
    await verifySentinel(client, bucket, owned, ownershipId);
    await client.send(
      new AbortMultipartUploadCommand({ Bucket: bucket, ...upload }),
    );
  }
  for (let offset = 0; offset < result.objects.length; offset += 1000) {
    await verifySentinel(client, bucket, owned, ownershipId);
    const Objects = result.objects
      .slice(offset, offset + 1000)
      .map(({ Key, VersionId }) => ({
        Key,
        ...(VersionId !== undefined ? { VersionId } : {}),
      }));
    const deleted = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects, Quiet: true },
      }),
    );
    if (deleted.Errors?.length)
      throw new ConflictException(
        'Some upload objects were not deleted. Cleanup must be retried.',
      );
  }
  const remaining = await inventory(
    client,
    bucket,
    owned,
    ownershipId,
    endpoint,
    preserveGeneration,
  );
  if (remaining.objects.length || remaining.uploads.length)
    throw new ConflictException(
      'Upload cleanup verification found remaining objects or partial uploads.',
    );
}
