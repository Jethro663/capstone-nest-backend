import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, count, desc, eq, inArray, SQL } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from '../../database/database.service';
import {
  users,
  roles,
  userRoles,
  studentProfiles,
  teacherProfiles,
  lessonCompletions,
  assessmentAttempts,
  classes,
  archivedUsers,
} from '../../drizzle/schema';
import { CreateUserDto } from './DTO/create-user.dto';
import { UpdateUserDto } from './DTO/update-user.dto';
import { UserCreatedEvent } from '../../common/events';
import { PasswordGenerator } from './utils/password-generator';

const VALID_STATUSES = ['ACTIVE', 'PENDING', 'SUSPENDED', 'DELETED'] as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly passwordHashRounds: number;

  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    const configuredRounds = Number(
      this.configService.get<string>('AUTH_PASSWORD_HASH_ROUNDS') ?? '10',
    );
    this.passwordHashRounds =
      Number.isInteger(configuredRounds) && configuredRounds >= 8
        ? configuredRounds
        : 10;
  }

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
    const page = Math.max(1, Number(filters?.page ?? 1) || 1);
    const limit = Math.max(
      1,
      Math.min(Number(filters?.limit ?? 20) || 20, 100),
    );
    const offset = (page - 1) * limit;

    const whereConditions: SQL<unknown>[] = [];
    if (filters?.status) {
      whereConditions.push(eq(users.status, filters.status as any));
    }
    if (filters?.role) {
      const roleSubquery = this.db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(roles.name, filters.role));
      whereConditions.push(inArray(users.id, roleSubquery));
    }

    // Build the query step by step
    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(users)
      .where(whereClause);

    const usersList = await this.db.query.users.findMany({
      where: whereClause,
      with: {
        userRoles: {
          with: { role: true },
        },
      },
      orderBy: [desc(users.createdAt)],
      limit,
      offset,
    });

    const data = usersList.map((user) => {
      const { userRoles: userRolesData, ...userData } = user;
      return this.toPublicUser({
        ...userData,
        roles: userRolesData.map((ur) => ur.role),
      });
    });

    const total = Number(totalRow?.total ?? 0);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
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

    const teacherProfileData = await this.db.query.teacherProfiles
      .findFirst({ where: eq(teacherProfiles.userId, user.id) })
      .catch((err) => {
        if (String(err).includes('teacher_profiles')) {
          return null;
        }
        throw err;
      });

    return {
      ...user,
      ...(profileData || {}),
      teacherProfile: teacherProfileData || null,
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

    const teacherProfileData = await this.db.query.teacherProfiles
      .findFirst({ where: eq(teacherProfiles.userId, user.id) })
      .catch((err) => {
        if (String(err).includes('teacher_profiles')) {
          return null;
        }
        throw err;
      });

    return {
      ...user,
      ...(profileData || {}),
      teacherProfile: teacherProfileData || null,
      roles: userRolesData.map((ur) => ur.role),
    };
  }
  //CRUD Operations

  async createUser(createUserDto: CreateUserDto) {
    const { email, password, firstName, middleName, lastName, role, lrn } =
      createUserDto;

    // 1. Check if email already exists
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // 2. Validate LRN if role is student
    if (role === 'student') {
      if (!lrn) {
        throw new ConflictException('LRN is required for student accounts');
      }

      const existingProfile = await this.db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.lrn, lrn),
      });

      if (existingProfile) {
        throw new ConflictException(`LRN ${lrn} is already registered`);
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
    const hashedPassword = await bcrypt.hash(
      generatedPassword,
      this.passwordHashRounds,
    );

    // 6. Create user in transaction
    let result: typeof users.$inferSelect;
    try {
      result = await this.db.transaction(async (tx) => {
        // Insert user
        const [newUser] = await tx
          .insert(users)
          .values({
            email,
            password: hashedPassword,
            firstName,
            middleName,
            lastName,
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

        // Create student profile with LRN for student accounts
        if (role === 'student' && lrn) {
          await tx.insert(studentProfiles).values({
            userId: newUser.id,
            lrn,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        if (role === 'teacher') {
          const existingTeacherProfile = tx.query?.teacherProfiles
            ? await tx.query.teacherProfiles.findFirst({
                where: eq(teacherProfiles.userId, newUser.id),
              })
            : null;

          if (!existingTeacherProfile) {
            await tx.insert(teacherProfiles).values({
              userId: newUser.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        return newUser;
      });
    } catch (err) {
      this.handleUniqueConstraintError(err);
      throw err;
    }

    // 7. Emit user.created event — listeners handle OTP + password emails
    this.eventEmitter.emit(
      UserCreatedEvent.eventName,
      new UserCreatedEvent({
        userId: result.id,
        email: result.email,
        generatedPassword: generatedPassword,
        requiresOTP: true,
      }),
    );

    // 8. Return sanitized user only
    return this.toPublicUser(result);
  }

  // !!Subject to change based on requirements
  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const existingUser = await this.findById(id);

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }
    if ((updateUserDto as Record<string, unknown>).status !== undefined) {
      throw new BadRequestException(
        'Direct status updates are not allowed. Use lifecycle endpoints.',
      );
    }

    const updateData: Partial<typeof users.$inferInsert> = {};
    let shouldSendEmailVerification = false;

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.findByEmail(updateUserDto.email);
      if (emailExists) {
        throw new BadRequestException('Email already in use');
      }
      updateData.email = updateUserDto.email;
      updateData.isEmailVerified = false;
      shouldSendEmailVerification = true;
    }

    if (updateUserDto.password) {
      updateData.password = await (
        bcrypt.hash as (s: string, r: number) => Promise<string>
      )(updateUserDto.password, this.passwordHashRounds);
    }

    if (updateUserDto.firstName) updateData.firstName = updateUserDto.firstName;
    if (updateUserDto.middleName !== undefined)
      updateData.middleName = updateUserDto.middleName;
    if (updateUserDto.lastName) updateData.lastName = updateUserDto.lastName;

    // New profile fields will be stored in `student_profiles` table as a separate one-to-one record
    const profilePayload: any = {};
    if (updateUserDto.lrn !== undefined) profilePayload.lrn = updateUserDto.lrn;
    if (updateUserDto.gradeLevel !== undefined)
      profilePayload.gradeLevel = updateUserDto.gradeLevel;
    const dob = updateUserDto.dateOfBirth ?? updateUserDto.dob;
    if (dob !== undefined)
      profilePayload.dateOfBirth = dob ? new Date(dob) : null;
    if (updateUserDto.gender !== undefined)
      profilePayload.gender = updateUserDto.gender;
    if (updateUserDto.phone !== undefined)
      profilePayload.phone = updateUserDto.phone;
    if (updateUserDto.address !== undefined)
      profilePayload.address = updateUserDto.address;
    if (updateUserDto.familyName !== undefined)
      profilePayload.familyName = updateUserDto.familyName;
    if (updateUserDto.familyRelationship !== undefined)
      profilePayload.familyRelationship = updateUserDto.familyRelationship;
    if (updateUserDto.familyContact !== undefined)
      profilePayload.familyContact = updateUserDto.familyContact;
    if (updateUserDto.profilePicture !== undefined)
      profilePayload.profilePicture = updateUserDto.profilePicture;

    if (updateUserDto.lrn !== undefined) {
      const lrnConflict = await this.db.query.studentProfiles.findFirst({
        where: and(
          eq(studentProfiles.lrn, updateUserDto.lrn),
          eq(studentProfiles.userId, id),
        ),
      });
      if (!lrnConflict) {
        const existingLrn = await this.db.query.studentProfiles.findFirst({
          where: eq(studentProfiles.lrn, updateUserDto.lrn),
        });
        if (existingLrn && existingLrn.userId !== id) {
          throw new ConflictException('LRN is already in use');
        }
      }
    }

    try {
      await this.db.transaction(async (tx) => {
        if (Object.keys(updateData).length > 0) {
          await tx
            .update(users)
            .set({ ...updateData, updatedAt: new Date() })
            .where(eq(users.id, id));
        }

        if (Object.keys(profilePayload).length > 0) {
          const existingProfile = await tx.query.studentProfiles.findFirst({
            where: eq(studentProfiles.userId, id),
          });

          if (existingProfile) {
            await tx
              .update(studentProfiles)
              .set({ ...profilePayload, updatedAt: new Date() })
              .where(eq(studentProfiles.userId, id));
          } else {
            await tx.insert(studentProfiles).values({
              userId: id,
              ...profilePayload,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        if (updateUserDto.role) {
          const roleRecord = await tx.query.roles.findFirst({
            where: eq(roles.name, updateUserDto.role),
          });
          if (!roleRecord) {
            throw new NotFoundException(
              `Role '${updateUserDto.role}' not found`,
            );
          }

          await tx.delete(userRoles).where(eq(userRoles.userId, id));
          await tx.insert(userRoles).values({
            userId: id,
            roleId: roleRecord.id,
            assignedBy: 'ADMIN',
          });

          if (updateUserDto.role === 'teacher') {
            const existingTeacherProfile = tx.query?.teacherProfiles
              ? await tx.query.teacherProfiles.findFirst({
                  where: eq(teacherProfiles.userId, id),
                })
              : null;

            if (!existingTeacherProfile) {
              await tx.insert(teacherProfiles).values({
                userId: id,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
          }
        }
      });
    } catch (err) {
      this.handleUniqueConstraintError(err);
      throw err;
    }

    if (shouldSendEmailVerification) {
      this.eventEmitter.emit(
        UserCreatedEvent.eventName,
        new UserCreatedEvent({
          userId: id,
          email: updateData.email!,
          requiresOTP: true,
        }),
      );
    }

    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new NotFoundException('User not found after update');
    }
    return this.toPublicUser(updatedUser);
  }

  async updatePassword(id: string, newPassword: string) {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }
    const hashedPassword = await bcrypt.hash(
      newPassword,
      this.passwordHashRounds,
    );

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
    let warnings: {
      activeClasses: number;
      enrolledStudents: number;
      message: string;
    } | null = null;
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
      message: warnings
        ? 'User suspended with warnings'
        : 'User suspended successfully',
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

    // Insert archive record and set status atomically
    const userRoleNames = existingUser.roles?.map((r: any) => r.name) || [];
    await this.db.transaction(async (tx) => {
      await tx.insert(archivedUsers).values({
        originalUserId: id,
        email: existingUser.email,
        fullName:
          `${existingUser.firstName} ${existingUser.middleName || ''} ${existingUser.lastName}`.trim(),
        role: userRoleNames.join(', '),
        archivedData: archiveSnapshot,
        archivedBy: adminId,
      });

      await tx
        .update(users)
        .set({ status: 'DELETED', updatedAt: new Date() })
        .where(eq(users.id, id));
    });

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

    await this.db.transaction(async (tx) => {
      // Mark the archived record as purged (if exists)
      const archiveRecords = await tx.query.archivedUsers.findMany({
        where: eq(archivedUsers.originalUserId, id),
      });
      if (archiveRecords.length > 0) {
        await tx
          .update(archivedUsers)
          .set({ purgedAt: new Date() })
          .where(eq(archivedUsers.originalUserId, id));
      }

      // Hard delete — CASCADE handles related tables
      await tx.delete(users).where(eq(users.id, id));
    });

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
        teacherProfile: true,
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
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      roles: user.userRoles.map((ur) => ur.role),
      profile: user.profile || null,
      teacherProfile: user.teacherProfile || null,
      enrollments: user.enrollments || [],
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

  async findPublicById(id: string) {
    const user = await this.findById(id);
    if (!user) return null;
    return this.toPublicUser(user);
  }

  private handleUniqueConstraintError(err: unknown) {
    const pgError = err as { code?: string; constraint?: string };
    if (pgError?.code !== '23505') {
      return;
    }

    if (
      pgError.constraint?.includes('users_email') ||
      pgError.constraint?.includes('users_email_unique')
    ) {
      throw new ConflictException('Email already registered');
    }
    if (pgError.constraint?.includes('student_profiles_lrn')) {
      throw new ConflictException('LRN is already in use');
    }

    throw new ConflictException('Duplicate record violates unique constraint');
  }

  private toPublicUser<T extends Record<string, any>>(user: T) {
    const { password, ...safeUser } = user;
    return safeUser;
  }
}
