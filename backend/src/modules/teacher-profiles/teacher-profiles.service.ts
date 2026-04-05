import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { teacherProfiles } from '../../drizzle/schema';
import { UpdateTeacherProfileDto } from './DTO/update-teacher-profile.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TeacherProfilesService {
  constructor(
    private databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  private resolveActorRole(actorRoles: string[] = []): 'admin' | 'teacher' | 'system' {
    if (actorRoles.includes('admin')) return 'admin';
    if (actorRoles.includes('teacher')) return 'teacher';
    return 'system';
  }

  async findByUserId(userId: string) {
    return this.db.query.teacherProfiles.findFirst({
      where: eq(teacherProfiles.userId, userId),
    });
  }

  async createProfile(
    userId: string,
    dto: Partial<UpdateTeacherProfileDto>,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const phone = dto.phone ?? dto.contactNumber;
    const dateOfBirth = dto.dateOfBirth ?? dto.dob;
    const [created] = await this.db
      .insert(teacherProfiles)
      .values({
        userId,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: dto.gender,
        address: dto.address,
        department: dto.department,
        specialization: dto.specialization,
        profilePicture: dto.profilePicture,
        contactNumber: phone,
        employeeId: dto.employeeId,
      })
      .returning();

    const changedFields = Object.keys(dto).filter(
      (field) => dto[field as keyof UpdateTeacherProfileDto] !== undefined,
    );
    await this.auditService.log({
      actorId: actorId ?? userId,
      action: 'teacher_profile.created',
      targetType: 'teacher_profile',
      targetId: userId,
      metadata: {
        actorRole: this.resolveActorRole(actorRoles),
        userId,
        changedFields,
      },
    });

    return created;
  }

  async updateProfile(
    userId: string,
    dto: Partial<UpdateTeacherProfileDto>,
    actorId?: string,
    actorRoles: string[] = [],
  ) {
    const existing = await this.findByUserId(userId);
    const phone = dto.phone ?? dto.contactNumber;
    const dateOfBirth = dto.dateOfBirth ?? dto.dob;

    if (!existing) {
      return this.createProfile(userId, dto, actorId, actorRoles);
    }

    const [updated] = await this.db
      .update(teacherProfiles)
      .set({
        dateOfBirth: dateOfBirth
          ? new Date(dateOfBirth)
          : dto.dateOfBirth === null || dto.dob === null
            ? null
            : existing.dateOfBirth,
        gender: dto.gender ?? existing.gender,
        address: dto.address ?? existing.address,
        department: dto.department ?? existing.department,
        specialization: dto.specialization ?? existing.specialization,
        profilePicture: dto.profilePicture ?? existing.profilePicture,
        contactNumber: phone ?? existing.contactNumber,
        employeeId: dto.employeeId ?? existing.employeeId,
        updatedAt: new Date(),
      })
      .where(eq(teacherProfiles.userId, userId))
      .returning();

    const changedFields = Object.keys(dto).filter(
      (field) => dto[field as keyof UpdateTeacherProfileDto] !== undefined,
    );
    await this.auditService.log({
      actorId: actorId ?? userId,
      action: 'teacher_profile.updated',
      targetType: 'teacher_profile',
      targetId: userId,
      metadata: {
        actorRole: this.resolveActorRole(actorRoles),
        userId,
        changedFields,
      },
    });

    return updated;
  }
}
