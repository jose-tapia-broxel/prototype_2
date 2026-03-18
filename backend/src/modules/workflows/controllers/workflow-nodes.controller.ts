import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { WorkflowNodesService } from '../services/workflow-nodes.service';
import { CreateWorkflowNodeDto } from '../dto/create-workflow-node.dto';
import { UpdateWorkflowNodeDto } from '../dto/update-workflow-node.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';

@Controller('organizations/:orgId/workflows/:workflowId/nodes')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor)
export class WorkflowNodesController {
  constructor(private readonly nodesService: WorkflowNodesService) {}

  @Post()
  createNode(
    @TenantId() orgId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: CreateWorkflowNodeDto,
  ) {
    dto.organizationId = orgId;
    dto.workflowId = workflowId;
    return this.nodesService.create(dto);
  }

  @Get()
  listNodes(
    @TenantId() orgId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.nodesService.findAllByWorkflow(workflowId, orgId);
  }

  @Get(':nodeId')
  getNode(
    @TenantId() orgId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.nodesService.findByIdOrFail(nodeId, orgId);
  }

  @Patch(':nodeId')
  updateNode(
    @TenantId() orgId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateWorkflowNodeDto,
  ) {
    return this.nodesService.update(nodeId, orgId, dto);
  }

  @Patch(':nodeId/position')
  updateNodePosition(
    @TenantId() orgId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: { positionX: number; positionY: number },
  ) {
    return this.nodesService.updatePosition(nodeId, orgId, dto.positionX, dto.positionY);
  }

  @Delete(':nodeId')
  deleteNode(
    @TenantId() orgId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.nodesService.delete(nodeId, orgId);
  }
}
