import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  SignedUploadDescriptor,
  StorageProviderInterface,
  StoredObjectDescriptor,
} from './storage.provider';

@Injectable()
export class S3StorageProvider implements StorageProviderInterface {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicUrl?: string;

  constructor() {
    this.bucket =
      process.env.STORAGE_BUCKET ||
      process.env.AWS_S3_BUCKET ||
      'nexora-uploads';
    this.region =
      process.env.STORAGE_REGION || process.env.AWS_REGION || 'us-east-1';
    this.publicUrl =
      process.env.STORAGE_PUBLIC_URL || process.env.AWS_S3_PUBLIC_URL;

    const endpoint =
      process.env.STORAGE_ENDPOINT || process.env.AWS_S3_ENDPOINT;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    this.s3Client = new S3Client({
      region: this.region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }

  async putObject(input: {
    key: string;
    body: Buffer;
    contentType?: string;
  }): Promise<StoredObjectDescriptor> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    });
    await this.s3Client.send(command);
    const publicUrl = this.resolvePublicUrl(input.key);
    return {
      key: input.key,
      ...(publicUrl ? { url: publicUrl } : {}),
    };
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
    } catch (error) {
      this.logger.warn(
        `Failed to delete S3 object ${key} from bucket ${this.bucket}: ${(error as Error).message}`,
      );
    }
  }

  async getSignedDownloadUrl(
    key: string,
    filename?: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(filename
        ? { ResponseContentDisposition: `attachment; filename="${filename}"` }
        : {}),
    });
    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  async getSignedUploadUrl(input: {
    key: string;
    contentType?: string;
    expiresInSeconds?: number;
  }): Promise<SignedUploadDescriptor> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ...(input.contentType ? { ContentType: input.contentType } : {}),
    });
    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: input.expiresInSeconds || 3600,
    });
    return {
      key: input.key,
      url,
    };
  }

  resolvePublicUrl(key: string): string | null {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async getObject(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      if (!response.Body) {
        throw new NotFoundException(`Empty body received for object ${key}`);
      }
      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    } catch (error) {
      this.logger.error(
        `Failed to get object ${key} from S3: ${(error as Error).message}`,
      );
      throw new NotFoundException(`Object not found: ${key}`);
    }
  }

  async checkHealth(): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'S3 HeadBucket probe check failed';
      this.logger.error(
        `S3 health check failed for bucket ${this.bucket}: ${message}`,
      );
      return { ok: false, message };
    }
  }
}
