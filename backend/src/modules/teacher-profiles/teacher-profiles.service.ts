import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { teacherProfiles } from '../../drizzle/schema';
import { UpdateTeacherProfileDto } from './DTO/update-teacher-profile.dto';

@Injectable()
export class TeacherProfilesService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async findByUserId(userId: string) {
    return this.db.query.teacherProfiles.findFirst({
      where: eq(teacherProfiles.userId, userId),
    });
  }

  async createProfile(userId: string, dto: Partial<UpdateTeacherProfileDto>) {
    const [created] = await this.db
      .insert(teacherProfiles)
      .values({
        userId,
        department: dto.department,
        specialization: dto.specialization,
        profilePicture: dto.profilePicture,
        contactNumber: dto.contactNumber,
      })
      .returning();

    return created;
  }

  async updateProfile(userId: string, dto: Partial<UpdateTeacherProfileDto>) {
    const existing = await this.findByUserId(userId);

    if (!existing) {
      return this.createProfile(userId, dto);
    }

    const [updated] = await this.db
      .update(teacherProfiles)
      .set({
        department: dto.department ?? existing.department,
        specialization: dto.specialization ?? existing.specialization,
        profilePicture: dto.profilePicture ?? existing.profilePicture,
        contactNumber: dto.contactNumber ?? existing.contactNumber,
        updatedAt: new Date(),
      })
      .where(eq(teacherProfiles.userId, userId))
      .returning();

    return updated;
  }
}
