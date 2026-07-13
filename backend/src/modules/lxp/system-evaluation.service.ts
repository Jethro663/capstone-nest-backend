import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SQL, and, desc, eq, inArray, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  classes,
  enrollments,
  roles,
  systemEvaluationAssignments,
  systemEvaluationCampaigns,
  userRoles,
  users,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import {
  CreateSystemEvaluationCampaignDto,
  ListSystemEvaluationCampaignsQueryDto,
  UpdateSystemEvaluationCampaignStatusDto,
} from './dto/lxp.dto';

type UserContext = { userId: string; roles: string[] };
type AudienceRole = 'student' | 'teacher';

@Injectable()
export class SystemEvaluationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private isAdmin(rolesList: string[]) {
    return rolesList.includes('admin');
  }

  private isTeacher(rolesList: string[]) {
    return rolesList.includes('teacher');
  }

  private getDefinition(formType: 'system' | 'ja_hub') {
    return formType === 'system'
      ? {
          targetModule: 'overall' as const,
          audienceRoles: ['student', 'teacher'] as AudienceRole[],
        }
      : {
          targetModule: 'ai_mentor' as const,
          audienceRoles: ['student'] as AudienceRole[],
        };
  }

  private normalizeDateRange(startsAt: string, endsAt: string) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Campaign dates must be valid ISO dates.');
    }
    if (start >= end) {
      throw new BadRequestException(
        'Campaign end date must be after start date.',
      );
    }
    return { start, end };
  }

  private async assertTeacherClassAccess(classId: string, user: UserContext) {
    const cls = await this.db.query.classes.findFirst({
      where: eq(classes.id, classId),
      columns: { id: true, teacherId: true, isActive: true },
      with: { section: { columns: { id: true, isActive: true } } },
    });
    if (!cls || cls.isActive === false || cls.section?.isActive === false) {
      throw new NotFoundException(`Class "${classId}" not found`);
    }
    if (!this.isAdmin(user.roles) && cls.teacherId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async resolveRespondents(input: {
    audienceRole: AudienceRole;
    classId?: string | null;
  }) {
    if (input.classId) {
      if (input.audienceRole === 'teacher') {
        const cls = await this.db.query.classes.findFirst({
          where: eq(classes.id, input.classId),
          columns: { teacherId: true },
        });
        return cls?.teacherId ? [cls.teacherId] : [];
      }
      const rows = await this.db.query.enrollments.findMany({
        where: and(
          eq(enrollments.classId, input.classId),
          eq(enrollments.status, 'enrolled'),
        ),
        columns: { studentId: true },
      });
      return rows.map((row) => row.studentId);
    }

    const rows = await this.db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(eq(roles.name, input.audienceRole), eq(users.status, 'ACTIVE')),
      );
    return rows.map((row) => row.userId);
  }

  private async createAssignments(campaign: {
    id: string;
    audienceRole: AudienceRole;
    classId?: string | null;
  }) {
    const respondentIds = [
      ...new Set(
        await this.resolveRespondents({
          audienceRole: campaign.audienceRole,
          classId: campaign.classId,
        }),
      ),
    ];
    if (respondentIds.length === 0) return 0;
    await this.db
      .insert(systemEvaluationAssignments)
      .values(
        respondentIds.map((respondentId) => ({
          campaignId: campaign.id,
          respondentId,
          respondentRole: campaign.audienceRole,
          status: 'pending' as const,
          updatedAt: new Date(),
        })),
      )
      .onConflictDoNothing();
    return respondentIds.length;
  }

  private async assertCampaignAccess(
    campaign: { createdBy: string; classId?: string | null },
    user: UserContext,
  ): Promise<void> {
    if (this.isAdmin(user.roles)) return;
    if (!this.isTeacher(user.roles)) {
      throw new ForbiddenException(
        'Only teachers and admins can manage evaluation campaigns.',
      );
    }
    if (campaign.createdBy === user.userId) return;
    if (!campaign.classId) {
      throw new ForbiddenException('You can only manage your own campaigns.');
    }
    await this.assertTeacherClassAccess(campaign.classId, user);
  }

  async createCampaign(
    user: UserContext,
    dto: CreateSystemEvaluationCampaignDto,
  ) {
    if (!this.isAdmin(user.roles) && !this.isTeacher(user.roles)) {
      throw new ForbiddenException(
        'Only teachers and admins can create evaluation campaigns.',
      );
    }
    const definition = this.getDefinition(dto.formType);
    if (!definition.audienceRoles.includes(dto.audienceRole)) {
      throw new BadRequestException(
        `${dto.formType} evaluations cannot target ${dto.audienceRole} respondents.`,
      );
    }
    const { start, end } = this.normalizeDateRange(dto.startsAt, dto.endsAt);
    const status = dto.status ?? 'draft';
    if (!this.isAdmin(user.roles)) {
      if (dto.audienceRole !== 'student' || !dto.classId) {
        throw new ForbiddenException(
          'Teachers can only launch class-scoped student campaigns.',
        );
      }
      await this.assertTeacherClassAccess(dto.classId, user);
    }

    const [created] = await this.db
      .insert(systemEvaluationCampaigns)
      .values({
        createdBy: user.userId,
        formType: dto.formType,
        targetModule: definition.targetModule,
        audienceRole: dto.audienceRole,
        classId: dto.classId ?? null,
        title: dto.title.trim(),
        startsAt: start,
        endsAt: end,
        status,
        updatedAt: new Date(),
      })
      .returning();
    const assignmentCount =
      status === 'active' ? await this.createAssignments(created) : 0;
    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.system_evaluation_campaign.created',
      targetType: 'system_evaluation_campaign',
      targetId: created.id,
      metadata: {
        formType: created.formType,
        audienceRole: created.audienceRole,
        classId: created.classId,
        status: created.status,
        assignmentCount,
      },
    });
    return { ...created, assignmentCount };
  }

  async listCampaigns(
    user: UserContext,
    query: ListSystemEvaluationCampaignsQueryDto = {},
  ) {
    if (!this.isAdmin(user.roles) && !this.isTeacher(user.roles)) {
      throw new ForbiddenException(
        'Only teachers and admins can view evaluation campaigns.',
      );
    }
    const conditions: SQL[] = [];
    if (query.formType)
      conditions.push(eq(systemEvaluationCampaigns.formType, query.formType));
    if (query.audienceRole)
      conditions.push(
        eq(systemEvaluationCampaigns.audienceRole, query.audienceRole),
      );
    if (query.status)
      conditions.push(eq(systemEvaluationCampaigns.status, query.status));
    if (query.classId)
      conditions.push(eq(systemEvaluationCampaigns.classId, query.classId));
    if (!this.isAdmin(user.roles)) {
      const teacherClasses = await this.db.query.classes.findMany({
        where: eq(classes.teacherId, user.userId),
        columns: { id: true },
      });
      const ids = teacherClasses.map((cls) => cls.id);
      conditions.push(
        ids.length > 0
          ? or(
              eq(systemEvaluationCampaigns.createdBy, user.userId),
              inArray(systemEvaluationCampaigns.classId, ids),
            )!
          : eq(systemEvaluationCampaigns.createdBy, user.userId),
      );
    }
    const campaigns = await this.db.query.systemEvaluationCampaigns.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        class: {
          columns: { id: true, subjectName: true, subjectCode: true },
          with: {
            section: { columns: { id: true, name: true, gradeLevel: true } },
          },
        },
        assignments: { columns: { id: true, status: true } },
      },
      orderBy: [desc(systemEvaluationCampaigns.createdAt)],
    });
    const mapped = campaigns.map((campaign) => ({
      id: campaign.id,
      formType: campaign.formType,
      targetModule: campaign.targetModule,
      audienceRole: campaign.audienceRole,
      classId: campaign.classId,
      class: campaign.class ?? null,
      title: campaign.title,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      status: campaign.status,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      assignmentCount: campaign.assignments?.length ?? 0,
      submittedCount:
        campaign.assignments?.filter((item) => item.status === 'submitted')
          .length ?? 0,
    }));
    return { campaigns: mapped, count: mapped.length };
  }

  async updateCampaignStatus(
    campaignId: string,
    user: UserContext,
    dto: UpdateSystemEvaluationCampaignStatusDto,
  ) {
    const campaign = await this.db.query.systemEvaluationCampaigns.findFirst({
      where: eq(systemEvaluationCampaigns.id, campaignId),
      columns: {
        id: true,
        createdBy: true,
        classId: true,
        audienceRole: true,
        status: true,
      },
    });
    if (!campaign) {
      throw new NotFoundException('System evaluation campaign not found.');
    }
    await this.assertCampaignAccess(campaign, user);
    const [updated] = await this.db
      .update(systemEvaluationCampaigns)
      .set({ status: dto.status, updatedAt: new Date() })
      .where(eq(systemEvaluationCampaigns.id, campaignId))
      .returning();
    const assignmentCount =
      dto.status === 'active' ? await this.createAssignments(updated) : 0;
    await this.auditService.log({
      actorId: user.userId,
      action: 'lxp.system_evaluation_campaign.status_updated',
      targetType: 'system_evaluation_campaign',
      targetId: campaignId,
      metadata: { status: dto.status, assignmentCount },
    });
    return { ...updated, assignmentCount };
  }
}
