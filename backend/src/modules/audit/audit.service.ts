import { Injectable } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { auditLogs } from '../../drizzle/schema';

type AuditMetadata = Record<string, unknown>;

@Injectable()
export class AuditService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async log(params: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: AuditMetadata;
  }) {
    const [created] = await this.db
      .insert(auditLogs)
      .values({
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata ?? null,
      })
      .returning();

    return created;
  }

  async list(params: {
    page?: number;
    limit?: number;
    action?: string;
    actorId?: string;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const whereClause = and(
      params.action ? eq(auditLogs.action, params.action) : undefined,
      params.actorId ? eq(auditLogs.actorId, params.actorId) : undefined,
    );

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(auditLogs)
      .where(whereClause);

    const data = await this.db.query.auditLogs.findMany({
      where: whereClause,
      with: {
        actor: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [desc(auditLogs.createdAt)],
      limit,
      offset,
    });

    const total = Number(totalRow?.total ?? 0);

    return {
      data,
      page,
      limit,
      total,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    };
  }
}
