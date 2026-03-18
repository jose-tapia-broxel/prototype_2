import { Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { WorkflowInstanceService } from '../services/workflow-instance.service';
import { StartWorkflowInstanceDto } from '../dto/start-workflow-instance.dto';
import { WorkflowInstanceStatus } from '../entities/workflow-instance.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

@Controller('organizations/:orgId/runtime/workflow-instances')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor)
export class WorkflowInstancesController {
  constructor(private readonly workflowInstanceService: WorkflowInstanceService) {}

  @Post()
  startInstance(
    @TenantId() orgId: string,
    @Body() dto: StartWorkflowInstanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    dto.organizationId = orgId;
    dto.startedBy = user.userId;
    return this.workflowInstanceService.start(dto);
  }

  @Get()
  listInstances(
    @TenantId() orgId: string,
    @Query('status') status?: WorkflowInstanceStatus,
    @Query('workflowId') workflowId?: string,
  ) {
    return this.workflowInstanceService.findAllByOrganization(orgId, { status, workflowId });
  }

  @Get(':instanceId')
  getInstance(
    @TenantId() orgId: string,
    @Param('instanceId') instanceId: string,
  ) {
    return this.workflowInstanceService.findOneByOrg(instanceId, orgId);
  }

  @Get(':instanceId/logs')
  getExecutionLogs(@Param('instanceId') instanceId: string) {
    return this.workflowInstanceService.getLogs(instanceId);
  }

  @Post(':instanceId/advance')
  advanceInstance(
    @TenantId() orgId: string,
    @Param('instanceId') instanceId: string,
    @Body() dto: { nodeId: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workflowInstanceService.advanceToNode(instanceId, orgId, dto.nodeId, user.userId);
  }

  @Post(':instanceId/complete')
  completeInstance(
    @TenantId() orgId: string,
    @Param('instanceId') instanceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workflowInstanceService.complete(instanceId, orgId, user.userId);
  }

  @Post(':instanceId/fail')
  failInstance(
    @TenantId() orgId: string,
    @Param('instanceId') instanceId: string,
    @Body() dto: { reason: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workflowInstanceService.fail(instanceId, orgId, dto.reason, user.userId);
  }

  @Post(':instanceId/cancel')
  cancelInstance(
    @TenantId() orgId: string,
    @Param('instanceId') instanceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workflowInstanceService.cancel(instanceId, orgId, user.userId);
  }

  @Post(':instanceId/pause')
  pauseInstance(
    @TenantId() orgId: string,
    @Param('instanceId') instanceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workflowInstanceService.pause(instanceId, orgId, user.userId);
  }

  @Post(':instanceId/resume')
  resumeInstance(
    @TenantId() orgId: string,
    @Param('instanceId') instanceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workflowInstanceService.resume(instanceId, orgId, user.userId);
  }
}
