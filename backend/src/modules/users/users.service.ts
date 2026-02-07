import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, SQL } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import { users, roles, userRoles, userProfiles } from '../../drizzle/schema';
import { CreateUserDto } from './DTO/create-user.dto';
import { UpdateUserDto } from './DTO/update-user.dto';
import { OtpService } from '../otp/otp.service';

const VALID_STATUSES = ['ACTIVE', 'PENDING', 'SUSPENDED', 'DELETED'] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

@Injectable()
export class UsersService {
  constructor(
    private databaseService: DatabaseService,
    private otpService: OtpService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }
  // Search Users

  async findAll(filters?: {
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    if (filters?.status && !VALID_STATUSES.includes(filters.status as any)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      );
    }
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100); // Cap max limit
    const offset = (page - 1) * limit;

    const whereConditions: SQL<unknown>[] = [];
    if (filters?.status) {
      whereConditions.push(eq(users.status, filters.status as any));
    }



    // Build the query step by step
    const usersList = await this.db.query.users.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        userRoles: {
          with: { role: true },
        },
      },
      limit,
      offset,
    });

    // Filter by role in memory if specified
    let filteredUsers = usersList;
    if (filters?.role) {
      filteredUsers = usersList.filter((user) =>
        user.userRoles.some((ur) => ur.role.name === filters.role),
      );
    }

    return filteredUsers.map((user) => {
      const { userRoles: userRolesData, ...userData } = user;
      return {
        ...userData,
        roles: userRolesData.map((ur) => ur.role),
      };
    });
  }

  async findByEmail(email: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        userRoles: {
          with: {
            role: true,
          },
        },
      },
    });

    if (!user) return null;

    // Transform to include roles array and flatten profile into the user object
    const profile = (user as any).profile || {};
    const { userRoles: userRolesData, profile: _p, ...userData } = user as any;

    return {
      ...userData,
      ...profile,
      roles: userRolesData.map((ur) => ur.role),
    };
  }

  async findById(id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        userRoles: {
          with: {
            role: true,
          },
        },
        profile: true,
      },
    });

    if (!user) return null;

    const profile = (user as any).profile || {};
    const { userRoles: userRolesData, profile: _p, ...userData } = user as any;

    return {
      ...userData,
      ...profile,
      roles: userRolesData.map((ur) => ur.role),
    };
  }
  //CRUD Operations

  async createUser(createUserDto: CreateUserDto) {
    const {
      email,
      password,
      firstName,
      middleName,
      lastName,
      role,
      studentId,
    } = createUserDto;

    // 1. Check if email already exists
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // 2. NEW: Validate student ID if role is student
    if (role === 'student') {
      if (!studentId) {
        throw new ConflictException(
          'Student ID is required for student accounts',
        );
      }

      const existingStudent = await this.db.query.users.findFirst({
        where: eq(users.studentId, studentId),
      });

      if (existingStudent) {
        throw new ConflictException(
          `Student ID ${studentId} is already registered`,
        );
      }
    }

    // 3. Find the role in database
    const roleEntity = await this.db.query.roles.findFirst({
      where: eq(roles.name, role),
    });

    if (!roleEntity) {
      throw new NotFoundException(`Role '${role}' not found`);
    }

    // 4. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Create user in transaction
    const result = await this.db.transaction(async (tx) => {
      // Insert user
      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          firstName,
          middleName,
          lastName,
          studentId: role === 'student' ? studentId : null,
          status: 'PENDING',
          isEmailVerified: false,
        })
        .returning();

      // Assign role
      await tx.insert(userRoles).values({
        userId: newUser.id,
        roleId: roleEntity.id,
        assignedBy: 'ADMIN',
      });



      return newUser;
    });

    // 6. Send OTP for email verification
    await this.otpService.createAndSendOTP(
      result.id,
      result.email,
      'email_verification',
    );

    return result;
  }

  // !!Subject to change based on requirements
  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    console.log('[USERS] updateUser called for id:', id, 'payload:', updateUserDto);

    const existingUser = await this.findById(id);

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updateData: Partial<typeof users.$inferInsert> = {};

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.findByEmail(updateUserDto.email);
      if (emailExists) {
        throw new BadRequestException('Email already in use');
      }
      updateData.email = updateUserDto.email;
      updateData.isEmailVerified = false;

      // Send new verification email
      const [updatedUser] = await this.db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      await this.otpService.createAndSendOTP(
        updatedUser.id,
        updatedUser.email,
        'email_verification',
      );
    }

    if (updateUserDto.password) {
      updateData.password = await (
        bcrypt.hash as (s: string, r: number) => Promise<string>
      )(updateUserDto.password, 10);
    }

    if (updateUserDto.firstName) updateData.firstName = updateUserDto.firstName;
    if (updateUserDto.middleName !== undefined)
      updateData.middleName = updateUserDto.middleName;
    if (updateUserDto.lastName) updateData.lastName = updateUserDto.lastName;
    if (updateUserDto.status) updateData.status = updateUserDto.status as any;
    if (updateUserDto.studentId !== undefined)
      updateData.studentId = updateUserDto.studentId;

    // New profile fields will be stored in `user_profiles` table as a separate one-to-one record
    const profilePayload: any = {};
    if (updateUserDto.dob) profilePayload.dateOfBirth = new Date(updateUserDto.dob);
    if (updateUserDto.gender !== undefined) profilePayload.gender = updateUserDto.gender;
    if (updateUserDto.phone !== undefined) profilePayload.phone = updateUserDto.phone;
    if (updateUserDto.address !== undefined) profilePayload.address = updateUserDto.address;
    if (updateUserDto.familyName !== undefined)
      profilePayload.familyName = updateUserDto.familyName;
    if (updateUserDto.familyRelationship !== undefined)
      profilePayload.familyRelationship = updateUserDto.familyRelationship;
    if (updateUserDto.familyContact !== undefined)
      profilePayload.familyContact = updateUserDto.familyContact;

    let updatedUser;
    try {
      [updatedUser] = await this.db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
    } catch (err) {
      console.error('[USERS] Failed to update users row for user:', id, err);
      throw err;
    }

    // Upsert profile record if payload exists
    if (Object.keys(profilePayload).length > 0) {
      console.log('[USERS] profilePayload to upsert for user:', id, profilePayload);
      try {
        const existingProfile = await this.db.query.userProfiles.findFirst({
          where: eq(userProfiles.userId, id),
        });

        if (existingProfile) {
          await this.db
            .update(userProfiles)
            .set({ ...profilePayload, updatedAt: new Date() })
            .where(eq(userProfiles.userId, id));
        } else {
          await this.db.insert(userProfiles).values({
            userId: id,
            ...profilePayload,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (err) {
        console.error('[USERS] Failed to upsert profile for user:', id, err);
        throw err;
      }
    }

    if (updateUserDto.role) {
      await this.db.delete(userRoles).where(eq(userRoles.userId, id));

      const roleRecord = await this.db.query.roles.findFirst({
        where: eq(roles.name, updateUserDto.role),
      });

      if (roleRecord) {
        await this.db.insert(userRoles).values({
          userId: id,
          roleId: roleRecord.id,
          assignedBy: 'ADMIN',
        });
      }
    }

    return this.findById(id);
  }

  async updatePassword(id: string, newPassword: string) {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return {
      message: 'Password successfully updated',
      userId: id,
    };
  }

  async deleteUser(id: string) {
    const existingUser = await this.findById(id);

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (existingUser.status === 'DELETED') {
      throw new BadRequestException('User is already deleted');
    }

    await this.db
      .update(users)
      .set({
        status: 'DELETED',
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return {
      message: 'User successfully deleted',
      userId: id,
    };
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        isEmailVerified: true,
        status: 'ACTIVE',
      })
      .where(eq(users.id, userId));
  }
}
