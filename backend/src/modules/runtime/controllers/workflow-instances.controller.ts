import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { WorkflowInstanceService } from '../services/workflow-instance.service';
import { StartWorkflowInstanceDto } from '../dto/start-workflow-instance.dto';

@Controller('runtime/workflow-instances')
export class WorkflowInstancesController {
  constructor(private readonly workflowInstanceService: WorkflowInstanceService) {}

  @Post()
  startInstance(@Body() dto: StartWorkflowInstanceDto) {
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
