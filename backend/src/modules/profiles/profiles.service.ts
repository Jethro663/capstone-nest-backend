import { Injectable } from '@nestjs/common';
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

  private mapProfileDto(dto: Partial<UpdateProfileDto>) {
    const payload: Record<string, unknown> = {};

    if (dto.lrn !== undefined) payload.lrn = dto.lrn;
    if (dto.gradeLevel !== undefined) payload.gradeLevel = dto.gradeLevel;

    const dob = dto.dateOfBirth ?? dto.dob;
    if (dob !== undefined) payload.dateOfBirth = dob ? new Date(dob) : null;

    if (dto.gender !== undefined) payload.gender = dto.gender;
    if (dto.phone !== undefined) payload.phone = dto.phone;
    if (dto.address !== undefined) payload.address = dto.address;
    if (dto.familyName !== undefined) payload.familyName = dto.familyName;
    if (dto.familyRelationship !== undefined) {
      payload.familyRelationship = dto.familyRelationship;
    }
    if (dto.familyContact !== undefined) payload.familyContact = dto.familyContact;
    if (dto.profilePicture !== undefined) payload.profilePicture = dto.profilePicture;

    return payload;
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
    const payload = this.mapProfileDto(dto);
    const [newProfile] = await this.db
      .insert(studentProfiles)
      .values({ userId, ...payload })
      .returning();

    return newProfile;
  }

  // Update (or create if not exists) profile for a user
  async updateProfile(userId: string, dto: Partial<UpdateProfileDto>) {
    const existing = await this.findByUserId(userId);
    const payload = this.mapProfileDto(dto);

    if (!existing) {
      // Insert new profile
      return this.createProfile(userId, dto);
    }

    const [updated] = await this.db
      .update(studentProfiles)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(studentProfiles.userId, userId))
      .returning();

    return updated;
  }
}
