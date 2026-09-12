import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../file-upload/storage/storage.module';
import { SystemResetAssets } from './system-reset.assets';
import {
  SystemMaintenanceController,
  SystemResetController,
} from './system-reset.controller';
import {
  SystemResetGuard,
  SystemResetInterceptor,
} from './system-reset.interceptor';
import { SystemResetParticipant } from './system-reset.participant';
import { SystemResetQueues } from './system-reset.queues';
import { SystemResetService } from './system-reset.service';

@Global()
@Module({
  imports: [AuthModule, StorageModule],
  controllers: [SystemResetController, SystemMaintenanceController],
  providers: [
    SystemResetService,
    SystemResetQueues,
    SystemResetAssets,
    SystemResetParticipant,
    SystemResetGuard,
    SystemResetInterceptor,
  ],
  exports: [SystemResetParticipant, SystemResetGuard, SystemResetInterceptor],
})
export class SystemResetModule {}
