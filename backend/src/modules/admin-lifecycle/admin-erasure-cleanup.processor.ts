import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  adminErasureItems,
  adminErasureOperations,
} from '../../drizzle/schema';
import { StorageService } from '../file-upload/storage/storage.service';

interface AdminErasureCleanupJob {
  operationId: string;
}

@Injectable()
@Processor('admin-erasure-cleanup', { concurrency: 1 })
export class AdminErasureCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(AdminErasureCleanupProcessor.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<AdminErasureCleanupJob>) {
    if (job.name !== 'cleanup-operation') {
      throw new UnrecoverableError(
        `Unsupported admin erasure cleanup job: ${job.name}`,
      );
    }
    const operation =
      await this.databaseService.db.query.adminErasureOperations.findFirst({
        where: eq(adminErasureOperations.id, job.data.operationId),
        with: { items: true },
      });
    if (!operation) {
      throw new UnrecoverableError('Admin erasure operation not found');
    }
    if (operation.status === 'completed') {
      return {
        operationId: operation.id,
        deletedObjectCount: 0,
        failedObjectCount: 0,
        status: 'completed' as const,
      };
    }

    let deletedObjectCount = 0;
    let failedObjectCount = 0;
    const failures: Array<{ key: string; message: string }> = [];
    for (const item of operation.items) {
      let itemFailed = false;
      for (const object of item.storageObjects) {
        try {
          await this.storageService.deleteObject(object.key);
          deletedObjectCount += 1;
        } catch (error: unknown) {
          itemFailed = true;
          failedObjectCount += 1;
          failures.push({
            key: object.key,
            message:
              error instanceof Error
                ? error.message.slice(0, 500)
                : 'Unknown cleanup failure',
          });
        }
      }
      await this.databaseService.db
        .update(adminErasureItems)
        .set({
          status: itemFailed ? 'cleanup_failed' : 'completed',
          failureCode: itemFailed ? 'STORAGE_CLEANUP_FAILED' : null,
          failureMessage: itemFailed
            ? 'One or more captured storage objects could not be removed.'
            : null,
          updatedAt: new Date(),
        })
        .where(eq(adminErasureItems.id, item.id));
    }

    const status = failedObjectCount
      ? ('completed_with_cleanup_errors' as const)
      : ('completed' as const);
    const summary = {
      objectCount: deletedObjectCount + failedObjectCount,
      deletedObjectCount,
      failedObjectCount,
      failures,
    };
    await this.databaseService.db
      .update(adminErasureOperations)
      .set({
        status,
        cleanupSummary: summary,
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      .where(eq(adminErasureOperations.id, operation.id));

    this.logger.log({
      event: 'admin_erasure_cleanup_completed',
      operationId: operation.id,
      deletedObjectCount,
      failedObjectCount,
    });
    if (failedObjectCount > 0) {
      throw new Error(
        `Admin erasure cleanup has ${failedObjectCount} retryable failure(s)`,
      );
    }
    return {
      operationId: operation.id,
      deletedObjectCount,
      failedObjectCount,
      status,
    };
  }
}
