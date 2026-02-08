import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { studentProfiles } from '../../drizzle/schema';
import { UpdateProfileDto } from './DTO/update-profile.dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class ProfilesService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  // Find profile by user ID
  async findByUserId(userId: string) {
    const profile = await this.db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.userId, userId),
    });

    return profile;
  }

  // Create profile for a user
  async createProfile(userId: string, dto: Partial<UpdateProfileDto>) {
    const [newProfile] = await this.db
      .insert(studentProfiles)
      .values({ userId, ...dto })
      .returning();

    return newProfile;
  }

  // Update (or create if not exists) profile for a user
  async updateProfile(userId: string, dto: Partial<UpdateProfileDto>) {
    const existing = await this.findByUserId(userId);

    if (!existing) {
      // Insert new profile
      return this.createProfile(userId, dto);
    }

    const [updated] = await this.db
      .update(studentProfiles)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(studentProfiles.userId, userId))
      .returning();

    return updated;
  }
}
