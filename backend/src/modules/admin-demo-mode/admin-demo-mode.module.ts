import { Module } from '@nestjs/common';
import { AdminDemoModeController } from './admin-demo-mode.controller';

@Module({
  controllers: [AdminDemoModeController],
})
export class AdminDemoModeModule {}
