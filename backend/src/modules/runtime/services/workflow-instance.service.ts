import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import { WorkflowExecutionLog } from '../entities/workflow-execution-log.entity';
import { StartWorkflowInstanceDto } from '../dto/start-workflow-instance.dto';
import { DomainEventsService } from '../../events/services/domain-events.service';

@Injectable()
export class WorkflowInstanceService {
  constructor(
    @InjectRepository(WorkflowInstance)
    private readonly instancesRepo: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowExecutionLog)
    private readonly logsRepo: Repository<WorkflowExecutionLog>,
    private readonly events: DomainEventsService,
  ) {}

  async start(dto: StartWorkflowInstanceDto): Promise<WorkflowInstance> {
    const instance = await this.instancesRepo.save(
      this.instancesRepo.create({ ...dto, startedAt: new Date(), status: 'RUNNING' }),
    );

    await this.logsRepo.save(
      this.logsRepo.create({
        workflowInstanceId: instance.id,
        eventType: 'WORKFLOW_INSTANCE_STARTED',
        payloadJson: { applicationVersionId: instance.applicationVersionId },
      }),
    );

    await this.events.emit('workflow.instance.started', {
      organizationId: instance.organizationId,
      instanceId: instance.id,
      workflowId: instance.workflowId,
    });

    return instance;
  }

  findOne(id: string): Promise<WorkflowInstance> {
    return this.instancesRepo.findOneByOrFail({ id });
  }

  getLogs(instanceId: string): Promise<WorkflowExecutionLog[]> {
    return this.logsRepo.find({ where: { workflowInstanceId: instanceId }, order: { createdAt: 'ASC' } });
  }
}
