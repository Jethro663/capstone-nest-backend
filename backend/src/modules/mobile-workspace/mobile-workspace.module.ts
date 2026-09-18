import { Module } from '@nestjs/common';
import { MobileWorkspaceController } from './mobile-workspace.controller';
import { MobileWorkspaceService } from './mobile-workspace.service';

@Module({
  controllers: [MobileWorkspaceController],
  providers: [MobileWorkspaceService],
})
export class MobileWorkspaceModule {}
