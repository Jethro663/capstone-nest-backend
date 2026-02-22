import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { and, eq, SQL } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import {
  users,
  roles,
  userRoles,
  studentProfiles,
  enrollments,
  lessonCompletions,
  assessmentAttempts,
  assessmentResponses,
  classes,
  archivedUsers,
} from '../../drizzle/schema';
import { CreateUserDto } from './DTO/create-user.dto';
import { UpdateUserDto } from './DTO/update-user.dto';
import { OtpService } from '../otp/otp.service';
import { MailService } from '../mail/mail.service';
import { PasswordGenerator } from './utils/password-generator';

const VALID_STATUSES = ['ACTIVE', 'PENDING', 'SUSPENDED', 'DELETED'] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private databaseService: DatabaseService,
    private otpService: OtpService,
    private mailService: MailService,
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

  /**
   * Look up a user by email.  Drizzle's auto-join logic was generating a
   * rather complex lateral query that blows up when the profile table
   * doesn't exist (for example if migrations haven't been run yet).  The
   * error shown in the log was coming from that failed query.  To make the
   * lookup more robust we perform three small queries ourselves and merge
   * the results.  A missing `student_profiles` table is treated as an
   * empty profile instead of crashing the entire request.
   */
  async findByEmail(email: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) return null;

    // fetch roles and profile in parallel; ignore errors coming from the
    // profile query in case the table has not been created yet.
    const [userRolesData, profileData] = await Promise.all([
      this.db.query.userRoles
        .findMany({
          where: eq(userRoles.userId, user.id),
          with: { role: true },
        })
        .catch((err) => {
          // if the roles or user_roles table hasn't been created yet the
          // generated lateral query will blow up.  treat it the same way we
          // handle missing profiles above: log a warning and return an
          // empty set so the caller can continue.
          const msg = String(err);
          if (msg.includes('user_roles') || msg.includes('roles')) {
            this.logger.warn(
              'Could not load user roles (missing table?). continuing with no roles.',
            );
            return [];
          }
          throw err;
        }),
      this.db.query.studentProfiles
        .findFirst({ where: eq(studentProfiles.userId, user.id) })
        .catch((err) => {
          // postgres error for missing relation will contain the table name;
          // swallow it and pretend the profile is empty.
          if (String(err).includes('student_profiles')) {
            return null;
          }
          throw err;
        }),
    ]);

    return {
      ...user,
      ...(profileData || {}),
      roles: userRolesData.map((ur) => ur.role),
    };
  }

  async findById(id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) return null;

    const [userRolesData, profileData] = await Promise.all([
      this.db.query.userRoles.findMany({
        where: eq(userRoles.userId, user.id),
        with: { role: true },
      }),
      this.db.query.studentProfiles
        .findFirst({ where: eq(studentProfiles.userId, user.id) })
        .catch((err) => {
          if (String(err).includes('student_profiles')) {
            return null;
          }
          throw err;
        }),
    ]);

    return {
      ...user,
      ...(profileData || {}),
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

    // 4. Generate password if not provided (new students get auto-generated passwords)
    let generatedPassword = password;
    if (!generatedPassword) {
      generatedPassword = PasswordGenerator.generate();
    }

    // 5. Hash the password
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // 6. Create user in transaction
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

    // 7. Send emails asynchronously (don't await - fire and forget)
    // This prevents blocking the API response for slow email services
    Promise.all([
      this.otpService.createAndSendOTP(
        result.id,
        result.email,
        'email_verification',
      ),
      this.mailService.sendPasswordEmail(result.email, generatedPassword),
    ]).catch((err) => {
      // Log email errors but don't fail the request
      console.error('[USERS] Failed to send emails for user:', result.email, err);
    });

    // 8. Return user with generated password (for admin to see in modal)
    return {
      ...result,
      temporaryPassword: generatedPassword,
    };
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

    // New profile fields will be stored in `student_profiles` table as a separate one-to-one record
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
        const existingProfile = await this.db.query.studentProfiles.findFirst({
          where: eq(studentProfiles.userId, id),
        });

        if (existingProfile) {
          await this.db
            .update(studentProfiles)
            .set({ ...profilePayload, updatedAt: new Date() })
            .where(eq(studentProfiles.userId, id));
        } else {
          await this.db.insert(studentProfiles).values({
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

  // ==========================================
  // USER LIFECYCLE MANAGEMENT
  // ==========================================

  /**
   * Suspend a user — first step of the deletion flow.
   * User loses access but ALL data is preserved intact.
   */
  async suspendUser(id: string, adminId: string) {
    if (id === adminId) {
      throw new ForbiddenException('You cannot suspend your own account');
    }

    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (existingUser.status === 'SUSPENDED') {
      throw new BadRequestException('User is already suspended');
    }
    if (existingUser.status === 'DELETED') {
      throw new BadRequestException('Cannot suspend a deleted user');
    }

    // Check if this is a teacher with active classes
    const userRoleNames = existingUser.roles?.map((r: any) => r.name) || [];
    let warnings: { activeClasses: number; enrolledStudents: number; message: string } | null = null;
    if (userRoleNames.includes('teacher')) {
      const activeClasses = await this.db.query.classes.findMany({
        where: and(eq(classes.teacherId, id), eq(classes.isActive, true)),
        with: { enrollments: true },
      });

      if (activeClasses.length > 0) {
        const totalStudents = activeClasses.reduce(
          (sum, c) => sum + (c.enrollments?.length || 0),
          0,
        );
        warnings = {
          activeClasses: activeClasses.length,
          enrolledStudents: totalStudents,
          message: `This teacher had ${activeClasses.length} active class(es) with ${totalStudents} enrolled student(s). Classes will become inaccessible.`,
        };
      }
    }

    await this.db
      .update(users)
      .set({ status: 'SUSPENDED', updatedAt: new Date() })
      .where(eq(users.id, id));

    return {
      message: warnings ? 'User suspended with warnings' : 'User suspended successfully',
      userId: id,
      ...(warnings ? { warnings } : {}),
    };
  }

  /**
   * Reactivate a suspended user — restores full access.
   */
  async reactivateUser(id: string, adminId: string) {
    if (id === adminId) {
      throw new ForbiddenException('You cannot reactivate your own account');
    }

    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (existingUser.status !== 'SUSPENDED') {
      throw new BadRequestException('Only suspended users can be reactivated');
    }

    await this.db
      .update(users)
      .set({ status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(users.id, id));

    return { message: 'User reactivated successfully', userId: id };
  }

  /**
   * Soft-delete a user — archives all data, then sets status to DELETED.
   * Only works on SUSPENDED users.
   */
  async softDeleteUser(id: string, adminId: string) {
    if (id === adminId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (existingUser.status !== 'SUSPENDED') {
      throw new BadRequestException(
        'User must be suspended before deletion. Please suspend the user first.',
      );
    }

    // Collect all related data for archival
    const archiveSnapshot = await this.collectUserData(id);

    // Insert archive record
    const userRoleNames = existingUser.roles?.map((r: any) => r.name) || [];
    await this.db.insert(archivedUsers).values({
      originalUserId: id,
      email: existingUser.email,
      fullName: `${existingUser.firstName} ${existingUser.middleName || ''} ${existingUser.lastName}`.trim(),
      role: userRoleNames.join(', '),
      archivedData: archiveSnapshot,
      archivedBy: adminId,
    });

    // Set status to DELETED
    await this.db
      .update(users)
      .set({ status: 'DELETED', updatedAt: new Date() })
      .where(eq(users.id, id));

    return { message: 'User archived and marked as deleted', userId: id };
  }

  /**
   * Export all user data as a JSON object — for admin download before purge.
   */
  async exportUserData(id: string) {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    return this.collectUserData(id);
  }

  /**
   * Permanently purge a user from the database.
   * Only works on DELETED users. CASCADE will remove all related records.
   */
  async purgeUser(id: string, adminId: string) {
    if (id === adminId) {
      throw new ForbiddenException('You cannot purge your own account');
    }

    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (existingUser.status !== 'DELETED') {
      throw new BadRequestException(
        'User must have DELETED status before permanent removal. Follow the lifecycle: Suspend → Delete → Purge.',
      );
    }

    // Mark the archived record as purged (if exists)
    const archiveRecords = await this.db.query.archivedUsers.findMany({
      where: eq(archivedUsers.originalUserId, id),
    });
    if (archiveRecords.length > 0) {
      await this.db
        .update(archivedUsers)
        .set({ purgedAt: new Date() })
        .where(eq(archivedUsers.originalUserId, id));
    }

    // Hard delete — CASCADE handles related tables
    await this.db.delete(users).where(eq(users.id, id));

    return { message: 'User permanently purged from the system', userId: id };
  }

  /**
   * Collect all data related to a user for archival/export.
   */
  private async collectUserData(id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        userRoles: { with: { role: true } },
        profile: true,
        enrollments: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Collect lesson completions
    const completions = await this.db.query.lessonCompletions.findMany({
      where: eq(lessonCompletions.studentId, id),
    });

    // Collect assessment attempts and responses
    const attempts = await this.db.query.assessmentAttempts.findMany({
      where: eq(assessmentAttempts.studentId, id),
      with: { responses: true },
    });

    // Collect classes taught (if teacher)
    const classesTaught = await this.db.query.classes.findMany({
      where: eq(classes.teacherId, id),
    });

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        studentId: user.studentId,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      roles: user.userRoles.map((ur) => ur.role),
      profile: (user as any).profile || null,
      enrollments: (user as any).enrollments || [],
      lessonCompletions: completions,
      assessmentAttempts: attempts,
      classesTaught,
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
