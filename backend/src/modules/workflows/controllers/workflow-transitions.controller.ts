import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { WorkflowTransitionsService } from '../services/workflow-transitions.service';
import { CreateWorkflowTransitionDto } from '../dto/create-workflow-transition.dto';
import { UpdateWorkflowTransitionDto } from '../dto/update-workflow-transition.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';

@Controller('organizations/:orgId/workflows/:workflowId/transitions')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor)
export class WorkflowTransitionsController {
  constructor(private readonly transitionsService: WorkflowTransitionsService) {}

  @Post()
  createTransition(
    @TenantId() orgId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: CreateWorkflowTransitionDto,
  ) {
    dto.organizationId = orgId;
    dto.workflowId = workflowId;
    return this.transitionsService.create(dto);
  }

  @Get()
  listTransitions(
    @TenantId() orgId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.transitionsService.findAllByWorkflow(workflowId, orgId);
  }

  @Get(':transitionId')
  getTransition(
    @TenantId() orgId: string,
    @Param('transitionId') transitionId: string,
  ) {
    return this.transitionsService.findByIdOrFail(transitionId, orgId);
  }

  @Patch(':transitionId')
  updateTransition(
    @TenantId() orgId: string,
    @Param('transitionId') transitionId: string,
    @Body() dto: UpdateWorkflowTransitionDto,
  ) {
    return this.transitionsService.update(transitionId, orgId, dto);
  }

  @Delete(':transitionId')
  deleteTransition(
    @TenantId() orgId: string,
    @Param('transitionId') transitionId: string,
  ) {
    return this.transitionsService.delete(transitionId, orgId);
  }
}
