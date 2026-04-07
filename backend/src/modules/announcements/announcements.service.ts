import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { and, eq, isNull, desc, sql } from 'drizzle-orm';
import type { IOptions as SanitizeOptions } from 'sanitize-html';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sanitizeHtml = require('sanitize-html') as (
  dirty: string,
  options?: SanitizeOptions,
) => string;
import { DatabaseService } from '../../database/database.service';
import { announcements, classes } from '../../drizzle/schema';
import { CreateAnnouncementDto } from './DTO/create-announcement.dto';
import { UpdateAnnouncementDto } from './DTO/update-announcement.dto';
import { QueryAnnouncementsDto } from './DTO/query-announcements.dto';
import { AuditService } from '../audit/audit.service';

const ALLOWED_TAGS: SanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
  allowedAttributes: {
    a: ['href', 'target'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectQueue('announcements') private readonly announcementsQueue: Queue,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async verifyClassAnnouncementAccess(
    classId: string,
    actorId: string,
    isAdmin = false,
  ): Promise<void> {
    const cls = await this.db.query.classes.findFirst({
      where: isAdmin
        ? eq(classes.id, classId)
        : and(eq(classes.id, classId), eq(classes.teacherId, actorId)),
    });
    if (!cls) {
      throw new ForbiddenException(
        isAdmin
          ? 'Class does not exist.'
          : 'You are not the teacher of this class or the class does not exist.',
      );
    }
  }

  private sanitize(html: string): string {
    return sanitizeHtml(html, ALLOWED_TAGS);
  }

  private ensureMutableAnnouncement(
    announcement: { isCoreTemplateAsset?: boolean | null },
    action: string,
  ) {
    if (announcement.isCoreTemplateAsset) {
      throw new ForbiddenException(
        `Core template announcements are immutable; use release control to ${action}`,
      );
    }
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async create(
    classId: string,
    actorId: string,
    dto: CreateAnnouncementDto,
    isAdmin = false,
  ) {
    await this.verifyClassAnnouncementAccess(classId, actorId, isAdmin);

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const now = new Date();
    const isFuture = scheduledAt && scheduledAt > now;

    // publishedAt is set immediately if not scheduled for the future
    const publishedAt = isFuture ? null : now;

    const [announcement] = await this.db
      .insert(announcements)
      .values({
        classId,
        authorId: actorId,
        title: dto.title.trim(),
        content: this.sanitize(dto.content),
        isPinned: dto.isPinned ?? false,
        scheduledAt,
        publishedAt,
      })
      .returning();

    // Enqueue fan-out immediately unless scheduled for future
    if (!isFuture) {
      await this.announcementsQueue.add(
        'fan-out',
        {
          announcementId: announcement.id,
          classId,
          title: announcement.title,
          content: announcement.content,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    await this.auditService.log({
      actorId,
      action: 'announcement.created',
      targetType: 'announcement',
      targetId: announcement.id,
      metadata: {
        classId,
        isPinned: announcement.isPinned,
        publishedAt: announcement.publishedAt,
      },
    });

    return announcement;
  }

  async findAllByClass(
    classId: string,
    viewerId: string,
    viewerIsTeacher: boolean,
    query: QueryAnnouncementsDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const rows = await this.db.query.announcements.findMany({
      where: and(
        eq(announcements.classId, classId),
        isNull(announcements.archivedAt),
        // Students only see published; teacher sees all (including pending)
        viewerIsTeacher
          ? undefined
          : and(
              sql`${announcements.publishedAt} IS NOT NULL`,
              eq(announcements.isVisible, true),
            ),
      ),
      orderBy: [desc(announcements.isPinned), desc(announcements.createdAt)],
      limit,
      offset,
      with: {
        author: {
          columns: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return rows;
  }

  async findOne(
    classId: string,
    announcementId: string,
    viewerIsTeacher: boolean,
  ) {
    const row = await this.db.query.announcements.findFirst({
      where: and(
        eq(announcements.id, announcementId),
        eq(announcements.classId, classId),
        isNull(announcements.archivedAt),
        viewerIsTeacher
          ? undefined
          : and(
              sql`${announcements.publishedAt} IS NOT NULL`,
              eq(announcements.isVisible, true),
            ),
      ),
      with: {
        author: {
          columns: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Announcement not found.');
    }

    return row;
  }

  async update(
    classId: string,
    announcementId: string,
    actorId: string,
    dto: UpdateAnnouncementDto,
    isAdmin = false,
  ) {
    await this.verifyClassAnnouncementAccess(classId, actorId, isAdmin);

    const existing = await this.db.query.announcements.findFirst({
      where: and(
        eq(announcements.id, announcementId),
        eq(announcements.classId, classId),
        isNull(announcements.archivedAt),
      ),
    });

    if (!existing) {
      throw new NotFoundException('Announcement not found.');
    }

    if (!isAdmin && existing.authorId !== actorId) {
      throw new ForbiddenException('You can only edit your own announcements.');
    }
    this.ensureMutableAnnouncement(existing, 'update');

    const updates: Partial<typeof announcements.$inferInsert> = {
      updatedAt: new Date(),
    };
    const changedFields: string[] = [];

    if (dto.title !== undefined) {
      updates.title = dto.title.trim();
      changedFields.push('title');
    }
    if (dto.content !== undefined) {
      updates.content = this.sanitize(dto.content);
      changedFields.push('content');
    }
    if (dto.isPinned !== undefined) {
      updates.isPinned = dto.isPinned;
      changedFields.push('isPinned');
    }
    if (dto.scheduledAt !== undefined) {
      updates.scheduledAt = new Date(dto.scheduledAt);
      changedFields.push('scheduledAt');
    }

    const [updated] = await this.db
      .update(announcements)
      .set(updates)
      .where(eq(announcements.id, announcementId))
      .returning();

    await this.auditService.log({
      actorId,
      action: 'announcement.updated',
      targetType: 'announcement',
      targetId: announcementId,
      metadata: {
        classId,
        changedFields,
        isPinned: updated.isPinned,
        scheduledAt: updated.scheduledAt,
      },
    });

    return updated;
  }

  async remove(
    classId: string,
    announcementId: string,
    actorId: string,
    isAdmin = false,
  ) {
    await this.verifyClassAnnouncementAccess(classId, actorId, isAdmin);

    const existing = await this.db.query.announcements.findFirst({
      where: and(
        eq(announcements.id, announcementId),
        eq(announcements.classId, classId),
        isNull(announcements.archivedAt),
      ),
    });

    if (!existing) {
      throw new NotFoundException('Announcement not found.');
    }

    if (!isAdmin && existing.authorId !== actorId) {
      throw new ForbiddenException(
        'You can only delete your own announcements.',
      );
    }
    this.ensureMutableAnnouncement(existing, 'delete');

    await this.db
      .update(announcements)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(announcements.id, announcementId));

    await this.auditService.log({
      actorId,
      action: 'announcement.deleted',
      targetType: 'announcement',
      targetId: announcementId,
      metadata: {
        classId,
        title: existing.title,
      },
    });

    return { message: 'Announcement archived successfully.' };
  }

  // ─── Called by the scheduler ─────────────────────────────────────────────

  /**
   * Finds all announcements whose scheduledAt has passed but haven't been
   * published yet, publishes them, and enqueues their fan-out jobs.
   * Called by AnnouncementsScheduler every minute.
   */
  async publishDueAnnouncements(): Promise<void> {
    const now = new Date();

    const due = await this.db.query.announcements.findMany({
      where: and(
        isNull(announcements.publishedAt),
        isNull(announcements.archivedAt),
        sql`${announcements.scheduledAt} <= ${now.toISOString()}`,
      ),
    });

    for (const ann of due) {
      await this.db
        .update(announcements)
        .set({ publishedAt: now, updatedAt: now })
        .where(eq(announcements.id, ann.id));

      await this.announcementsQueue.add(
        'fan-out',
        {
          announcementId: ann.id,
          classId: ann.classId,
          title: ann.title,
          content: ann.content,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      await this.auditService.log({
        actorId: ann.authorId,
        action: 'announcement.published_scheduled',
        targetType: 'announcement',
        targetId: ann.id,
        metadata: {
          classId: ann.classId,
          trigger: 'scheduler',
          publishedAt: now,
        },
      });
    }
  }

  async releaseCoreAnnouncement(
    classId: string,
    announcementId: string,
    actorId: string,
    isAdmin: boolean,
    dto: { isVisible?: boolean; isPublished?: boolean },
  ) {
    await this.verifyClassAnnouncementAccess(classId, actorId, isAdmin);

    const existing = await this.db.query.announcements.findFirst({
      where: and(
        eq(announcements.id, announcementId),
        eq(announcements.classId, classId),
        isNull(announcements.archivedAt),
      ),
    });

    if (!existing) {
      throw new NotFoundException('Announcement not found.');
    }
    if (!existing.isCoreTemplateAsset) {
      throw new BadRequestException(
        'Only core template announcements can be released here',
      );
    }

    const [updated] = await this.db
      .update(announcements)
      .set({
        ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
        ...(dto.isPublished !== undefined
          ? { publishedAt: dto.isPublished ? new Date() : null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, announcementId))
      .returning();

    await this.auditService.log({
      actorId,
      action: 'announcement.core_release_updated',
      targetType: 'announcement',
      targetId: announcementId,
      metadata: {
        classId,
        isVisible: updated.isVisible,
        isPublished: Boolean(updated.publishedAt),
      },
    });

    return updated;
  }
}
