import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { and, eq, count, desc, SQL, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { notifications } from '../../drizzle/schema';
import { QueryNotificationsDto } from './DTO/query-notifications.dto';

export interface CreateNotificationInput {
  userId: string;
  type:
    | 'announcement_posted'
    | 'discussion_thread_posted'
    | 'discussion_comment_posted'
    | 'assessment_assigned'
    | 'grade_updated'
    | 'assessment_due'
    | 'assessment_graded';
  referenceId?: string;
  title: string;
  body: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  // ─── Internal: bulk insert (called by processor) ─────────────────────────

  async createBulk(inputs: CreateNotificationInput[]): Promise<void> {
    if (inputs.length === 0) return;

    // Drizzle handles large inserts efficiently in a single statement
    await this.db
      .insert(notifications)
      .values(
        inputs.map((n) => ({
          userId: n.userId,
          type: n.type,
          referenceId: n.referenceId ?? null,
          title: n.title,
          body: n.body,
          isRead: false,
        })),
      )
      .onConflictDoUpdate({
        target: [
          notifications.userId,
          notifications.type,
          notifications.referenceId,
        ],
        where: sql`${notifications.referenceId} IS NOT NULL`,
        set: {
          title: sql`excluded.title`,
          body: sql`excluded.body`,
          isRead: false,
          readAt: null,
          createdAt: new Date(),
        },
      });
  }

  // ─── REST: paginated inbox ────────────────────────────────────────────────

  async createBulkDeduped(
    inputs: CreateNotificationInput[],
  ): Promise<CreateNotificationInput[]> {
    if (inputs.length === 0) return [];

    const referenceInputs = inputs.filter((input) => input.referenceId);
    if (referenceInputs.length === 0) {
      await this.createBulk(inputs);
      return inputs;
    }

    const insertedRows = await this.db
      .insert(notifications)
      .values(
        inputs.map((n) => ({
          userId: n.userId,
          type: n.type,
          referenceId: n.referenceId ?? null,
          title: n.title,
          body: n.body,
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

    return insertedRows.map((row) => ({
      userId: row.userId,
      type: row.type,
      referenceId: row.referenceId ?? undefined,
      title: row.title,
      body: row.body,
    }));
  }

  async findByUser(userId: string, query: QueryNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const conditions: SQL<unknown>[] = [eq(notifications.userId, userId)];

    if (typeof query.isRead === 'boolean') {
      conditions.push(eq(notifications.isRead, query.isRead));
    }

    const whereClause = and(...conditions);

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
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      );

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
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
      )
      .returning({ id: notifications.id });

    return { updatedCount: result.length };
  }
}
