import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import {
  and,
  eq,
  count,
  desc,
  SQL,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { notifications } from '../../drizzle/schema';
import { QueryNotificationsDto } from './DTO/query-notifications.dto';
import { PushNotificationDispatchService } from './push-notification-dispatch.service';

export interface CreateNotificationInput {
  userId: string;
  type:
    | 'announcement_posted'
    | 'discussion_thread_posted'
    | 'discussion_comment_posted'
    | 'assessment_assigned'
    | 'grade_updated'
    | 'assessment_due'
    | 'assessment_graded'
    | 'grade_finalization_requested'
    | 'academic_lifecycle_changed';
  referenceId?: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface CreatedNotification extends CreateNotificationInput {
  id: string;
  createdAt: Date;
}

export interface ArchivedTeacherNotificationContext {
  userIds: string[];
  classIds: string[];
  sectionIds: string[];
}

export function visibleNotificationsWhere(userId: string, isRead?: boolean) {
  const conditions: SQL<unknown>[] = [
    eq(notifications.userId, userId),
    isNull(notifications.hiddenAt),
    isNull(notifications.dismissedAt),
  ];
  if (typeof isRead === 'boolean') {
    conditions.push(eq(notifications.isRead, isRead));
  }
  return and(...conditions);
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    @Optional()
    private readonly pushNotificationDispatch?: PushNotificationDispatchService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  // ─── Internal: bulk insert (called by processor) ─────────────────────────

  async createBulk(
    inputs: CreateNotificationInput[],
  ): Promise<CreatedNotification[]> {
    if (inputs.length === 0) return [];

    // Drizzle handles large inserts efficiently in a single statement
    const persistedRows = await this.db
      .insert(notifications)
      .values(
        inputs.map((n) => ({
          userId: n.userId,
          type: n.type,
          referenceId: n.referenceId ?? null,
          title: n.title,
          body: n.body,
          metadata: n.metadata ?? null,
          isRead: false,
        })),
      )
      .onConflictDoUpdate({
        target: [
          notifications.userId,
          notifications.type,
          notifications.referenceId,
        ],
        targetWhere: sql`${notifications.referenceId} IS NOT NULL`,
        set: {
          title: sql`excluded.title`,
          body: sql`excluded.body`,
          metadata: sql`excluded.metadata`,
          isRead: false,
          hiddenAt: null,
          readAt: null,
          createdAt: new Date(),
        },
      })
      .returning();

    const created = persistedRows
      .filter((row) => row.dismissedAt === null)
      .map((row) => ({
        id: row.id,
        userId: row.userId,
        type: row.type,
        referenceId: row.referenceId ?? undefined,
        title: row.title,
        body: row.body,
        metadata: row.metadata as Record<string, unknown> | undefined,
        createdAt: row.createdAt,
      }));
    await this.dispatchPushWithoutAffectingInbox(created);
    return created;
  }

  // ─── REST: paginated inbox ────────────────────────────────────────────────

  async createBulkDeduped(
    inputs: CreateNotificationInput[],
  ): Promise<CreatedNotification[]> {
    if (inputs.length === 0) return [];

    const insertedRows = await this.db
      .insert(notifications)
      .values(
        inputs.map((n) => ({
          userId: n.userId,
          type: n.type,
          referenceId: n.referenceId ?? null,
          title: n.title,
          body: n.body,
          metadata: n.metadata ?? null,
          isRead: false,
        })),
      )
      .onConflictDoNothing({
        target: [
          notifications.userId,
          notifications.type,
          notifications.referenceId,
        ],
        where: sql`${notifications.referenceId} IS NOT NULL`,
      })
      .returning();

    const created = insertedRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      type: row.type,
      referenceId: row.referenceId ?? undefined,
      title: row.title,
      body: row.body,
      metadata: row.metadata as Record<string, unknown> | undefined,
      createdAt: row.createdAt,
    }));
    await this.dispatchPushWithoutAffectingInbox(created);
    return created;
  }

  private async dispatchPushWithoutAffectingInbox(
    created: CreatedNotification[],
  ): Promise<void> {
    if (!this.pushNotificationDispatch || created.length === 0) return;
    try {
      await this.pushNotificationDispatch.enqueueCreated(created);
    } catch {
      this.logger.warn(
        '[notifications] Push dispatch failed after persistence; inbox rows remain available.',
      );
    }
  }

  async hideArchivedTeacherContext(
    context: ArchivedTeacherNotificationContext,
  ): Promise<void> {
    const userIds = [...new Set(context.userIds)];
    const classIds = [...new Set(context.classIds)];
    const sectionIds = [...new Set(context.sectionIds)];
    if (
      userIds.length === 0 ||
      (classIds.length === 0 && sectionIds.length === 0)
    ) {
      return;
    }

    const contextConditions: SQL<unknown>[] = [];
    if (classIds.length > 0) {
      contextConditions.push(
        inArray(sql<string>`${notifications.metadata}->>'classId'`, classIds),
        and(
          eq(notifications.type, 'academic_lifecycle_changed'),
          eq(sql<string>`${notifications.metadata}->>'targetType'`, 'CLASS'),
          inArray(
            sql<string>`${notifications.metadata}->>'targetId'`,
            classIds,
          ),
        )!,
      );
    }
    if (sectionIds.length > 0) {
      contextConditions.push(
        and(
          eq(notifications.type, 'academic_lifecycle_changed'),
          eq(sql<string>`${notifications.metadata}->>'targetType'`, 'SECTION'),
          inArray(
            sql<string>`${notifications.metadata}->>'targetId'`,
            sectionIds,
          ),
        )!,
      );
    }

    await this.db
      .update(notifications)
      .set({ hiddenAt: new Date() })
      .where(
        and(
          inArray(notifications.userId, userIds),
          isNull(notifications.hiddenAt),
          or(...contextConditions),
        ),
      );
  }

  async findByUser(userId: string, query: QueryNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const whereClause = visibleNotificationsWhere(userId, query.isRead);

    const [rows, totalResult] = await Promise.all([
      this.db.query.notifications.findMany({
        where: whereClause,
        orderBy: [desc(notifications.createdAt)],
        limit,
        offset,
      }),
      this.db.select({ total: count() }).from(notifications).where(whereClause),
    ]);

    const total = Number(totalResult[0]?.total ?? 0);

    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }

  // ─── REST: unread count ───────────────────────────────────────────────────

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(visibleNotificationsWhere(userId, false));

    return result?.value ?? 0;
  }

  // ─── REST: mark single read ───────────────────────────────────────────────

  async markRead(notificationId: string, userId: string) {
    const existing = await this.db.query.notifications.findFirst({
      where: eq(notifications.id, notificationId),
    });

    if (!existing) {
      throw new NotFoundException('Notification not found.');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('This notification does not belong to you.');
    }

    if (existing.isRead) {
      return existing;
    }

    const [updated] = await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, notificationId))
      .returning();

    return updated;
  }

  // ─── REST: mark all read ──────────────────────────────────────────────────

  async markAllRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(visibleNotificationsWhere(userId, false))
      .returning({ id: notifications.id });

    return { updatedCount: result.length };
  }

  async dismissOne(
    notificationId: string,
    userId: string,
  ): Promise<{ dismissedCount: number }> {
    const result = await this.db
      .update(notifications)
      .set({ dismissedAt: new Date() })
      .where(
        and(
          eq(notifications.id, notificationId),
          visibleNotificationsWhere(userId),
        ),
      )
      .returning({ id: notifications.id });

    return { dismissedCount: result.length };
  }

  async dismissAll(userId: string): Promise<{ dismissedCount: number }> {
    const result = await this.db
      .update(notifications)
      .set({ dismissedAt: new Date() })
      .where(visibleNotificationsWhere(userId))
      .returning({ id: notifications.id });

    return { dismissedCount: result.length };
  }
}
