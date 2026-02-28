import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SectionsModule } from './modules/sections/sections.module';
import { ClassesModule } from './modules/classes/classes.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { RolesModule } from './modules/roles/roles.module';
import { OtpModule } from './modules/otp/otp.module';
import { DatabaseModule } from './database/database.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { AdminModule } from './modules/admin/admin.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { HealthModule } from './modules/health/health.module';
import { FileUploadModule } from './modules/file-upload/file-upload.module';
import { RosterImportModule } from './modules/roster-import/roster-import.module';
import { GradebookModule } from './modules/gradebook/gradebook.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('redis.url'),
        },
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,  // 60 seconds
        limit: 30,  // global fallback: 30 req / 60 s per IP
      },
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    DatabaseModule, // Drizzle connection
    AuthModule,
    UsersModule,
    RolesModule,
    OtpModule,
    SectionsModule,
    ClassesModule,
    LessonsModule,
    AssessmentsModule,
    ProfilesModule,
    AdminModule,
    TeacherModule,
    HealthModule,
    FileUploadModule,
    RosterImportModule,
    GradebookModule,
    AnnouncementsModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter, // Sanitise all unhandled errors
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Global auth guard
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Global rate-limit guard
    },
  ],
})
export class AppModule {}
