import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { SectionsModule } from './modules/sections/sections.module';
import { ClassesModule } from './modules/classes/classes.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { RolesModule } from './modules/roles/roles.module';
import { OtpModule } from './modules/otp/otp.module';
import { DatabaseModule } from './database/database.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ProfilesModule } from './modules/profiles/profiles.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),
    DatabaseModule, // Drizzle connection
    AuthModule,
    UsersModule,
    RolesModule,
    OtpModule,
    SubjectsModule,
    SectionsModule,
    ClassesModule,
    LessonsModule,
    // Profiles module (user profile records)
    ProfilesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Global auth guard
    },
  ],
})
export class AppModule {}
