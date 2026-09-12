import { S3Client } from '@aws-sdk/client-s3';
import { inspectResetS3Storage, purgeResetS3Storage } from './reset-s3-storage';
import { runResetCleanupContext } from '../../system-reset/system-reset.context';

describe('strict object storage reset', () => {
  const bucket = 'dedicated-school-uploads';
  const ownershipId = '11111111-1111-4111-8111-111111111111';
  const sender = (send: jest.Mock, sentinel = ownershipId) =>
    ({
      send: (command: { constructor: { name: string } }) =>
        command.constructor.name === 'HeadObjectCommand'
          ? Promise.resolve({
              Metadata: { 'nexora-storage-owner': sentinel },
            })
          : send(command),
    }) as unknown as Pick<S3Client, 'send'>;
  it('never begins deletion when ownership is lost while inventory is in flight', async () => {
    let lost = false;
    const send = jest.fn((command) => {
      if (command.constructor.name === 'ListObjectsV2Command')
        return Promise.resolve({
          Contents: [{ Key: 'source.txt', ETag: 'old' }],
        });
      if (command.constructor.name === 'ListMultipartUploadsCommand')
        lost = true;
      return Promise.resolve({});
    });
    await expect(
      runResetCleanupContext(
        () => {
          if (lost) throw new Error('Lost fixture ownership');
          return Promise.resolve();
        },
        () =>
          purgeResetS3Storage(
            sender(send),
            bucket,
            true,
            ownershipId,
            'g-next',
          ),
      ),
    ).rejects.toThrow('Lost fixture ownership');
    expect(
      send.mock.calls.some(
        ([command]) => command.constructor.name === 'DeleteObjectsCommand',
      ),
    ).toBe(false);
  });
  it('refuses an unowned bucket before making any request', async () => {
    const send = jest.fn();
    await expect(
      purgeResetS3Storage(sender(send), bucket, false, ownershipId, 'g-next'),
    ).rejects.toThrow('ownership');
    expect(send).not.toHaveBeenCalled();
  });
  it('handles every object page and verifies empty after deletion', async () => {
    let deleted = false;
    const send = jest.fn((command) => {
      switch (command.constructor.name) {
        case 'GetBucketVersioningCommand':
          return Promise.resolve({});
        case 'ListMultipartUploadsCommand':
          return Promise.resolve({});
        case 'ListObjectsV2Command':
          return Promise.resolve(
            deleted
              ? {}
              : command.input.ContinuationToken
                ? { Contents: [{ Key: 'second.txt', Size: 20, ETag: 'b' }] }
                : {
                    Contents: [{ Key: 'first.txt', Size: 10, ETag: 'a' }],
                    IsTruncated: true,
                    NextContinuationToken: 'page-two',
                  },
          );
        case 'DeleteObjectsCommand':
          deleted = true;
          return Promise.resolve({});
        default:
          throw new Error('unexpected command');
      }
    });
    expect(
      await inspectResetS3Storage(sender(send), bucket, true, ownershipId),
    ).toMatchObject({ driver: 's3', objectCount: 2, bytes: 30 });
    await purgeResetS3Storage(
      sender(send),
      bucket,
      true,
      ownershipId,
      'g-next',
    );
    expect(
      send.mock.calls.find(
        ([cmd]) => cmd.constructor.name === 'DeleteObjectsCommand',
      )?.[0].input,
    ).toMatchObject({
      Bucket: bucket,
      Delete: { Objects: [{ Key: 'first.txt' }, { Key: 'second.txt' }] },
    });
  });
  it('permanently removes exact historical version IDs and delete markers', async () => {
    let removed = false;
    const send = jest.fn((command) => {
      switch (command.constructor.name) {
        case 'GetBucketVersioningCommand':
          return Promise.resolve({ Status: 'Suspended' });
        case 'ListMultipartUploadsCommand':
          return Promise.resolve({});
        case 'ListObjectVersionsCommand':
          return Promise.resolve(
            removed
              ? {}
              : {
                  Versions: [
                    { Key: 'source.txt', VersionId: 'version-1', Size: 10 },
                  ],
                  DeleteMarkers: [{ Key: 'source.txt', VersionId: 'marker-1' }],
                },
          );
        case 'DeleteObjectsCommand':
          removed = true;
          return Promise.resolve({});
        default:
          throw new Error('unexpected command');
      }
    });
    await purgeResetS3Storage(
      sender(send),
      bucket,
      true,
      ownershipId,
      'g-next',
    );
    expect(
      send.mock.calls.find(
        ([cmd]) => cmd.constructor.name === 'DeleteObjectsCommand',
      )?.[0].input.Delete.Objects,
    ).toEqual([
      { Key: 'source.txt', VersionId: 'version-1' },
      { Key: 'source.txt', VersionId: 'marker-1' },
    ]);
  });
  it('does not turn individual deletion errors into success', async () => {
    const send = jest.fn((command) =>
      Promise.resolve(
        command.constructor.name === 'ListObjectsV2Command'
          ? { Contents: [{ Key: 'locked.txt', Size: 1 }] }
          : command.constructor.name === 'DeleteObjectsCommand'
            ? { Errors: [{ Key: 'locked.txt', Code: 'AccessDenied' }] }
            : {},
      ),
    );
    await expect(
      purgeResetS3Storage(sender(send), bucket, true, ownershipId, 'g-next'),
    ).rejects.toThrow('not deleted');
  });
  it('blocks unknown versioning capability and incomplete pagination before deleting', async () => {
    const unsupported = jest
      .fn()
      .mockRejectedValue(new Error('NotImplemented'));
    await expect(
      purgeResetS3Storage(
        sender(unsupported),
        bucket,
        true,
        ownershipId,
        'g-next',
      ),
    ).rejects.toThrow();
    const truncated = jest.fn((command) =>
      Promise.resolve(
        command.constructor.name === 'ListObjectsV2Command'
          ? { IsTruncated: true }
          : {},
      ),
    );
    await expect(
      purgeResetS3Storage(
        sender(truncated),
        bucket,
        true,
        ownershipId,
        'g-next',
      ),
    ).rejects.toThrow('pagination');
    expect(
      truncated.mock.calls.some(
        ([cmd]) => cmd.constructor.name === 'DeleteObjectsCommand',
      ),
    ).toBe(false);
  });
  it('aborts pending multipart uploads, then verifies they are gone', async () => {
    let aborted = false;
    const send = jest.fn((command) => {
      if (command.constructor.name === 'ListMultipartUploadsCommand')
        return Promise.resolve(
          aborted
            ? {}
            : { Uploads: [{ Key: 'partial.txt', UploadId: 'upload-1' }] },
        );
      if (command.constructor.name === 'AbortMultipartUploadCommand')
        aborted = true;
      return Promise.resolve({});
    });
    await purgeResetS3Storage(
      sender(send),
      bucket,
      true,
      ownershipId,
      'g-next',
    );
    expect(
      send.mock.calls.find(
        ([cmd]) => cmd.constructor.name === 'AbortMultipartUploadCommand',
      )?.[0].input,
    ).toEqual({ Bucket: bucket, Key: 'partial.txt', UploadId: 'upload-1' });
  });
  it('rejects the same bucket locator when its ownership sentinel changes', async () => {
    const send = jest.fn();
    await expect(
      inspectResetS3Storage(
        sender(send, '22222222-2222-4222-8222-222222222222'),
        bucket,
        true,
        ownershipId,
      ),
    ).rejects.toThrow('identity changed');
    expect(send).not.toHaveBeenCalled();
  });
  it('never lets a delayed retired-generation delete remove the new generation', async () => {
    const objects = new Map([
      ['legacy/same.txt', 'old'],
      ['g-next/same.txt', 'fresh'],
    ]);
    let releaseDelete!: () => void;
    const deletePending = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });
    let deleteStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      deleteStarted = resolve;
    });
    const send = jest.fn(async (command) => {
      switch (command.constructor.name) {
        case 'GetBucketVersioningCommand':
        case 'ListMultipartUploadsCommand':
          return {};
        case 'ListObjectsV2Command':
          return {
            Contents: [...objects.keys()].map((Key) => ({ Key, Size: 1 })),
          };
        case 'DeleteObjectsCommand':
          deleteStarted();
          await deletePending;
          for (const object of command.input.Delete.Objects)
            objects.delete(object.Key);
          return {};
        default:
          throw new Error('unexpected command');
      }
    });
    const purge = purgeResetS3Storage(
      sender(send),
      bucket,
      true,
      ownershipId,
      'g-next',
    );
    await started;
    expect(objects.get('g-next/same.txt')).toBe('fresh');
    releaseDelete();
    await purge;
    expect(objects.get('g-next/same.txt')).toBe('fresh');
    expect(objects.has('legacy/same.txt')).toBe(false);
  });
});
