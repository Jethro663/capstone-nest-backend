import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleName, Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WorkflowDiagnosticsService } from './workflow-diagnostics.service';

@Controller('health/workflows')
@UseGuards(RolesGuard)
@Roles(RoleName.Admin)
export class WorkflowDiagnosticsController {
  constructor(
    private readonly workflowDiagnostics: WorkflowDiagnosticsService,
  ) {}

  @Get()
  async getWorkflows() {
    return {
      success: true,
      message: 'Workflow diagnostics retrieved',
      data: await this.workflowDiagnostics.getSnapshot(),
    };
  }
}
