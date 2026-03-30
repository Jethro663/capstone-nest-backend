import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, gte, isNull, lte } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { schoolEvents } from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { CreateSchoolEventDto } from './DTO/create-school-event.dto';
import { QuerySchoolEventsDto } from './DTO/query-school-events.dto';
import { UpdateSchoolEventDto } from './DTO/update-school-event.dto';

@Injectable()
export class SchoolEventsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private parseDate(value: string, fieldName: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(
        `${fieldName} must be a valid ISO-8601 date`,
      );
    }
    return parsed;
  }

  private assertDateRange(startsAt: Date, endsAt: Date) {
    if (endsAt.getTime() < startsAt.getTime()) {
      throw new BadRequestException(
        'endsAt must be equal to or later than startsAt',
      );
    }
  }

  async findAll(query: QuerySchoolEventsDto) {
    const fromDate = query.from ? this.parseDate(query.from, 'from') : null;
    const toDate = query.to ? this.parseDate(query.to, 'to') : null;

    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      throw new BadRequestException('from must be equal to or earlier than to');
    }

    return this.db.query.schoolEvents.findMany({
      where: and(
        isNull(schoolEvents.archivedAt),
        query.schoolYear
          ? eq(schoolEvents.schoolYear, query.schoolYear)
          : undefined,
        fromDate ? gte(schoolEvents.endsAt, fromDate) : undefined,
        toDate ? lte(schoolEvents.startsAt, toDate) : undefined,
      ),
      orderBy: [asc(schoolEvents.startsAt), asc(schoolEvents.title)],
    });
  }

  async create(dto: CreateSchoolEventDto, actorId: string) {
    const startsAt = this.parseDate(dto.startsAt, 'startsAt');
    const endsAt = this.parseDate(dto.endsAt, 'endsAt');
    this.assertDateRange(startsAt, endsAt);

    const [created] = await this.db
      .insert(schoolEvents)
      .values({
        eventType: dto.eventType,
        schoolYear: dto.schoolYear,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        location: dto.location?.trim() || null,
        startsAt,
        endsAt,
        allDay: dto.allDay ?? true,
      })
      .returning();

    await this.auditService.log({
      actorId,
      action: 'school_event.created',
      targetType: 'school_event',
      targetId: created.id,
      metadata: {
        schoolYear: created.schoolYear,
        eventType: created.eventType,
        startsAt: created.startsAt,
        endsAt: created.endsAt,
      },
    });

    return created;
  }

  async update(id: string, dto: UpdateSchoolEventDto, actorId: string) {
    const existing = await this.db.query.schoolEvents.findFirst({
      where: and(eq(schoolEvents.id, id), isNull(schoolEvents.archivedAt)),
    });

    if (!existing) {
      throw new NotFoundException('School event not found');
    }

    const startsAt = dto.startsAt
      ? this.parseDate(dto.startsAt, 'startsAt')
      : existing.startsAt;
    const endsAt = dto.endsAt
      ? this.parseDate(dto.endsAt, 'endsAt')
      : existing.endsAt;
    this.assertDateRange(startsAt, endsAt);

    const updates: Partial<typeof schoolEvents.$inferInsert> = {
      updatedAt: new Date(),
      startsAt,
      endsAt,
    };

    if (dto.eventType !== undefined) updates.eventType = dto.eventType;
    if (dto.schoolYear !== undefined) updates.schoolYear = dto.schoolYear;
    if (dto.title !== undefined) updates.title = dto.title.trim();
    if (dto.description !== undefined)
      updates.description = dto.description.trim() || null;
    if (dto.location !== undefined)
      updates.location = dto.location.trim() || null;
    if (dto.allDay !== undefined) updates.allDay = dto.allDay;

    const [updated] = await this.db
      .update(schoolEvents)
      .set(updates)
      .where(eq(schoolEvents.id, id))
      .returning();

    await this.auditService.log({
      actorId,
      action: 'school_event.updated',
      targetType: 'school_event',
      targetId: updated.id,
      metadata: {
        schoolYear: updated.schoolYear,
        eventType: updated.eventType,
        startsAt: updated.startsAt,
        endsAt: updated.endsAt,
      },
    });

    return updated;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.db.query.schoolEvents.findFirst({
      where: and(eq(schoolEvents.id, id), isNull(schoolEvents.archivedAt)),
    });

    if (!existing) {
      throw new NotFoundException('School event not found');
    }

    await this.db
      .update(schoolEvents)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schoolEvents.id, id));

    await this.auditService.log({
      actorId,
      action: 'school_event.deleted',
      targetType: 'school_event',
      targetId: existing.id,
      metadata: {
        title: existing.title,
        schoolYear: existing.schoolYear,
        eventType: existing.eventType,
      },
    });

    return {
      message: 'School event archived successfully.',
    };
  }
}
