import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module';
import { AppVersionController } from './app-version.controller';
import { AppVersionService } from './app-version.service';
import { AppVersionGuard } from './app-version.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [AppVersionController],
  providers: [
    AppVersionService,
    { provide: APP_GUARD, useClass: AppVersionGuard },
  ],
  exports: [AppVersionService],
})
export class AppVersionModule {}
