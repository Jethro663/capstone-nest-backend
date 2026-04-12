import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, SQL } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  classTemplateAnnouncements,
  classTemplateAssessments,
  classTemplateModuleItems,
  classTemplateModuleSections,
  classTemplateModules,
  classTemplates,
} from '../../drizzle/schema';
import { AuditService } from '../audit/audit.service';
import { RoleName } from '../auth/decorators/roles.decorator';
import { areSubjectCodesEquivalent, normalizeSubjectCode } from '../../common/utils/subject-code.util';
import {
  ClassTemplateStatus,
  CreateClassTemplateDto,
  PublishClassTemplateDto,
  UpdateClassTemplateContentDto,
  UpdateClassTemplateDto,
} from './dto/class-template.dto';

@Injectable()
export class ClassTemplatesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private assertAdmin(roles: string[]) {
    if (!roles.includes(RoleName.Admin)) {
      throw new ForbiddenException('Only admins can manage class templates');
    }
  }

  async findAll(query?: { subjectCode?: string; subjectGradeLevel?: string }) {
    const filters: SQL[] = [];
    if (query?.subjectCode) {
      filters.push(eq(classTemplates.subjectCode, query.subjectCode.toUpperCase()));
    }
    if (query?.subjectGradeLevel) {
      filters.push(eq(classTemplates.subjectGradeLevel, query.subjectGradeLevel));
    }

    const rows = await this.db.query.classTemplates.findMany({
      where: filters.length ? and(...filters) : undefined,
      orderBy: [asc(classTemplates.subjectCode), asc(classTemplates.name)],
    });

    return rows;
  }

  async create(dto: CreateClassTemplateDto, actorId: string, actorRoles: string[]) {
    this.assertAdmin(actorRoles);
    const payload = {
      name: dto.name.trim(),
      subjectCode: normalizeSubjectCode(dto.subjectCode),
      subjectGradeLevel: dto.subjectGradeLevel,
      createdBy: actorId,
    };

    const [created] = await this.db.insert(classTemplates).values(payload).returning();

    await this.auditService.log({
      actorId,
      action: 'class_template.created',
      targetType: 'class_template',
      targetId: created.id,
      metadata: {
        subjectCode: created.subjectCode,
        subjectGradeLevel: created.subjectGradeLevel,
      },
    });

    return created;
  }

  async findOne(id: string) {
    const row = await this.db.query.classTemplates.findFirst({
      where: eq(classTemplates.id, id),
    });
    if (!row) {
      throw new NotFoundException('Class template not found');
    }
    return row;
  }

  async update(
    id: string,
    dto: UpdateClassTemplateDto,
    actorId: string,
    actorRoles: string[],
  ) {
    this.assertAdmin(actorRoles);
    const existing = await this.findOne(id);
    const [updated] = await this.db
      .update(classTemplates)
      .set({
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(classTemplates.id, id))
      .returning();

    await this.auditService.log({
      actorId,
      action: 'class_template.updated',
      targetType: 'class_template',
      targetId: id,
      metadata: {
        previousName: existing.name,
        nextName: updated.name,
      },
    });

    return updated;
  }

  async remove(id: string, actorId: string, actorRoles: string[]) {
    this.assertAdmin(actorRoles);
    const existing = await this.findOne(id);
    await this.db.delete(classTemplates).where(eq(classTemplates.id, id));

    await this.auditService.log({
      actorId,
      action: 'class_template.deleted',
      targetType: 'class_template',
      targetId: id,
      metadata: {
        name: existing.name,
        subjectCode: existing.subjectCode,
      },
    });

    return { success: true };
  }

  async publish(
    id: string,
    dto: PublishClassTemplateDto,
    actorId: string,
    actorRoles: string[],
  ) {
    this.assertAdmin(actorRoles);
    await this.findOne(id);
    const status = dto.status ?? ClassTemplateStatus.Published;
    const [updated] = await this.db
      .update(classTemplates)
      .set({
        status,
        publishedAt: status === ClassTemplateStatus.Published ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(classTemplates.id, id))
      .returning();

    await this.auditService.log({
      actorId,
      action: 'class_template.published',
      targetType: 'class_template',
      targetId: id,
      metadata: { status: updated.status },
    });

    return updated;
  }

  async getContent(id: string) {
    await this.findOne(id);
    const [modules, assessments, announcements] = await Promise.all([
      this.db.query.classTemplateModules.findMany({
        where: eq(classTemplateModules.templateId, id),
        orderBy: [asc(classTemplateModules.order)],
      }),
      this.db.query.classTemplateAssessments.findMany({
        where: eq(classTemplateAssessments.templateId, id),
        orderBy: [asc(classTemplateAssessments.order)],
      }),
      this.db.query.classTemplateAnnouncements.findMany({
        where: eq(classTemplateAnnouncements.templateId, id),
        orderBy: [asc(classTemplateAnnouncements.order)],
      }),
    ]);

    const moduleIds = modules.map((m) => m.id);
    const sections = moduleIds.length
      ? await this.db.query.classTemplateModuleSections.findMany({
          where: inArray(classTemplateModuleSections.templateModuleId, moduleIds),
          orderBy: [asc(classTemplateModuleSections.order)],
        })
      : [];

    const filteredSections = sections.filter((section) =>
      moduleIds.includes(section.templateModuleId),
    );
    const sectionIds = filteredSections.map((section) => section.id);
    const items = sectionIds.length
      ? await this.db.query.classTemplateModuleItems.findMany({
          where: inArray(classTemplateModuleItems.templateSectionId, sectionIds),
          orderBy: [asc(classTemplateModuleItems.order)],
        })
      : [];
    const filteredItems = items.filter((item) => sectionIds.includes(item.templateSectionId));

    const sectionByModule = new Map<string, any[]>();
    for (const section of filteredSections) {
      if (!sectionByModule.has(section.templateModuleId)) {
        sectionByModule.set(section.templateModuleId, []);
      }
      sectionByModule.get(section.templateModuleId)!.push({
        ...section,
        items: filteredItems.filter((item) => item.templateSectionId === section.id),
      });
    }

    return {
      modules: modules.map((module) => ({
        ...module,
        sections: sectionByModule.get(module.id) ?? [],
      })),
      assessments,
      announcements,
    };
  }

  async updateContent(
    id: string,
    dto: UpdateClassTemplateContentDto,
    actorId: string,
    actorRoles: string[],
  ) {
    this.assertAdmin(actorRoles);
    await this.findOne(id);

    await this.db.transaction(async (tx) => {
      if (dto.assessments) {
        await tx
          .delete(classTemplateAssessments)
          .where(eq(classTemplateAssessments.templateId, id));
        if (dto.assessments.length > 0) {
          await tx.insert(classTemplateAssessments).values(
            dto.assessments.map((assessment, index) => ({
              ...(assessment.id ? { id: assessment.id } : {}),
              templateId: id,
              title: assessment.title,
              description: assessment.description ?? null,
              type: assessment.type ?? 'quiz',
              dueDateOffsetDays: assessment.settings?.dueDateOffsetDays ?? null,
              settings: assessment.settings ?? {},
              questions: assessment.questions ?? [],
              totalPoints: assessment.totalPoints ?? 0,
              order: assessment.order ?? index + 1,
            })),
          );
        }
      }

      if (dto.modules) {
        await tx.delete(classTemplateModules).where(eq(classTemplateModules.templateId, id));
        if (dto.modules.length > 0) {
          const insertedModules = await tx
            .insert(classTemplateModules)
            .values(
              dto.modules.map((module, index) => ({
                ...(module.id ? { id: module.id } : {}),
                templateId: id,
                title: module.title,
                description: module.description ?? null,
                order: module.order ?? index + 1,
                themeKind: module.themeKind ?? 'gradient',
                gradientId: module.gradientId ?? 'oceanic-blue',
                coverImageUrl: module.coverImageUrl ?? null,
                imagePositionX: module.imagePositionX ?? 50,
                imagePositionY: module.imagePositionY ?? 50,
                imageScale: module.imageScale ?? 120,
              })),
            )
            .returning();

          for (let moduleIndex = 0; moduleIndex < dto.modules.length; moduleIndex += 1) {
            const moduleInput = dto.modules[moduleIndex];
            const moduleRow = insertedModules[moduleIndex];
            const sectionInputs = moduleInput.sections ?? [];
            if (sectionInputs.length === 0) continue;

            const insertedSections = await tx
              .insert(classTemplateModuleSections)
              .values(
                sectionInputs.map((section, sectionIndex) => ({
                  ...(section.id ? { id: section.id } : {}),
                  templateModuleId: moduleRow.id,
                  title: section.title,
                  description: section.description ?? null,
                  order: section.order ?? sectionIndex + 1,
                })),
              )
              .returning();

            for (
              let sectionIndex = 0;
              sectionIndex < sectionInputs.length;
              sectionIndex += 1
            ) {
              const sectionInput = sectionInputs[sectionIndex];
              const sectionRow = insertedSections[sectionIndex];
              const itemInputs = sectionInput.items ?? [];
              if (itemInputs.length === 0) continue;

              await tx.insert(classTemplateModuleItems).values(
                itemInputs.map((item, itemIndex) => ({
                  ...(item.id ? { id: item.id } : {}),
                  templateSectionId: sectionRow.id,
                  itemType: item.itemType,
                  templateAssessmentId: item.templateAssessmentId ?? null,
                  order: item.order ?? itemIndex + 1,
                  isRequired: item.isRequired ?? false,
                  metadata: item.metadata ?? {},
                  points: item.points ?? null,
                })),
              );
            }
          }
        }
      }

      if (dto.announcements) {
        await tx
          .delete(classTemplateAnnouncements)
          .where(eq(classTemplateAnnouncements.templateId, id));
        if (dto.announcements.length > 0) {
          await tx.insert(classTemplateAnnouncements).values(
            dto.announcements.map((announcement, index) => ({
              templateId: id,
              title: announcement.title,
              content: announcement.content,
              isPinned: announcement.isPinned ?? false,
              order: announcement.order ?? index + 1,
            })),
          );
        }
      }

      await tx
        .update(classTemplates)
        .set({ updatedAt: new Date(), status: ClassTemplateStatus.Draft })
        .where(eq(classTemplates.id, id));
    });

    await this.auditService.log({
      actorId,
      action: 'class_template.content.updated',
      targetType: 'class_template',
      targetId: id,
      metadata: {
        modules: dto.modules?.length ?? 0,
        assessments: dto.assessments?.length ?? 0,
        announcements: dto.announcements?.length ?? 0,
      },
    });

    return this.getContent(id);
  }

  async getPublishedByCompatibility(subjectCode: string, subjectGradeLevel: string) {
    if (!subjectCode || !subjectGradeLevel) {
      throw new BadRequestException(
        'subjectCode and subjectGradeLevel are required to filter templates',
      );
    }

    const rows = await this.db.query.classTemplates.findMany({
      where: and(
        eq(classTemplates.subjectGradeLevel, subjectGradeLevel),
        eq(classTemplates.status, ClassTemplateStatus.Published),
      ),
      orderBy: [asc(classTemplates.name)],
    });

    return rows.filter((row) =>
      areSubjectCodesEquivalent(row.subjectCode, subjectCode),
    );
  }
}
