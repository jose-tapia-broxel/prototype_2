import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UseInterceptors, NotFoundException } from '@nestjs/common';
import { WorkflowsService } from '../services/workflows.service';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { UpdateWorkflowDto } from '../dto/update-workflow.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

@Controller('organizations/:orgId/workflows')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  createWorkflow(
    @TenantId() orgId: string,
    @Body() dto: CreateWorkflowDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    dto.organizationId = orgId;
    dto.createdBy = user.userId;
    return this.workflowsService.create(dto);
  }

  @Get()
  listWorkflows(@TenantId() orgId: string) {
    return this.workflowsService.findAllByOrganization(orgId);
  }

  @Get(':workflowId')
  async getWorkflow(
    @TenantId() orgId: string,
    @Param('workflowId') workflowId: string,
  ) {
    const workflow = await this.workflowsService.findById(workflowId, orgId);
    if (!workflow) {
      throw new NotFoundException(`Workflow with id ${workflowId} not found`);
    }
    return workflow;
  }

  @Patch(':workflowId')
  updateWorkflow(
    @TenantId() orgId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(workflowId, orgId, dto);
  }

  @Delete(':workflowId')
  deleteWorkflow(
    @TenantId() orgId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.workflowsService.delete(workflowId, orgId);
  }
}
