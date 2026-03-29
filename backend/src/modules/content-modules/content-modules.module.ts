import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { ContentModulesController } from './content-modules.controller';
import { ContentModulesService } from './content-modules.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [ContentModulesController],
  providers: [ContentModulesService],
  exports: [ContentModulesService],
})
export class ContentModulesModule {}
