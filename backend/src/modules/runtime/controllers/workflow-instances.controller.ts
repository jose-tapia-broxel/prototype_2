import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { WorkflowInstanceService } from '../services/workflow-instance.service';
import { StartWorkflowInstanceDto } from '../dto/start-workflow-instance.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';

@Controller('runtime/workflow-instances')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor)
export class WorkflowInstancesController {
  constructor(private readonly workflowInstanceService: WorkflowInstanceService) {}

  @Post()
  startInstance(
    @TenantId() orgId: string,
    @Body() dto: StartWorkflowInstanceDto,
  ) {
    dto.organizationId = orgId;
    return this.workflowInstanceService.start(dto);
  }

  @Get(':instanceId')
  getInstance(@Param('instanceId') instanceId: string) {
    return this.workflowInstanceService.findOne(instanceId);
  }

  @Get(':instanceId/logs')
  getExecutionLogs(@Param('instanceId') instanceId: string) {
    return this.workflowInstanceService.getLogs(instanceId);
  }
}
