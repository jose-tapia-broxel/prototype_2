import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowInstance, WorkflowInstanceStatus } from '../entities/workflow-instance.entity';
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
      this.instancesRepo.create({
        ...dto,
        status: 'running',
      }),
    );

    await this.logEvent(instance.id, 'WORKFLOW_INSTANCE_STARTED', {
      applicationVersionId: instance.applicationVersionId,
    }, undefined, dto.startedBy);

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

  findOneByOrg(id: string, organizationId: string): Promise<WorkflowInstance> {
    return this.instancesRepo.findOneByOrFail({ id, organizationId });
  }

  findAllByOrganization(
    organizationId: string,
    filters?: { status?: WorkflowInstanceStatus; workflowId?: string },
  ): Promise<WorkflowInstance[]> {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.workflowId) {
      where.workflowId = filters.workflowId;
    }
    return this.instancesRepo.find({
      where,
      order: { startedAt: 'DESC' },
    });
  }

  async advanceToNode(
    id: string,
    organizationId: string,
    nodeId: string,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.instancesRepo.findOneByOrFail({ id, organizationId });

    if (instance.status !== 'running' && instance.status !== 'paused') {
      throw new BadRequestException(
        `Cannot advance instance with status "${instance.status}"`,
      );
    }

    const previousNodeId = instance.currentNodeId;
    instance.currentNodeId = nodeId;
    instance.status = 'running';
    await this.instancesRepo.save(instance);

    await this.logEvent(instance.id, 'NODE_ENTERED', {
      previousNodeId,
      currentNodeId: nodeId,
    }, nodeId, actorId);

    return instance;
  }

  async complete(
    id: string,
    organizationId: string,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.instancesRepo.findOneByOrFail({ id, organizationId });
    this.assertActive(instance);

    instance.status = 'completed';
    instance.endedAt = new Date();
    await this.instancesRepo.save(instance);

    await this.logEvent(instance.id, 'WORKFLOW_INSTANCE_COMPLETED', {}, instance.currentNodeId, actorId);

    await this.events.emit('workflow.instance.completed', {
      organizationId: instance.organizationId,
      instanceId: instance.id,
      workflowId: instance.workflowId,
    });

    return instance;
  }

  async fail(
    id: string,
    organizationId: string,
    reason: string,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.instancesRepo.findOneByOrFail({ id, organizationId });
    this.assertActive(instance);

    instance.status = 'failed';
    instance.endedAt = new Date();
    await this.instancesRepo.save(instance);

    await this.logEvent(instance.id, 'WORKFLOW_INSTANCE_FAILED', { reason }, instance.currentNodeId, actorId);

    await this.events.emit('workflow.instance.failed', {
      organizationId: instance.organizationId,
      instanceId: instance.id,
      reason,
    });

    return instance;
  }

  async cancel(
    id: string,
    organizationId: string,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.instancesRepo.findOneByOrFail({ id, organizationId });
    this.assertActive(instance);

    instance.status = 'cancelled';
    instance.endedAt = new Date();
    await this.instancesRepo.save(instance);

    await this.logEvent(instance.id, 'WORKFLOW_INSTANCE_CANCELLED', {}, instance.currentNodeId, actorId);

    await this.events.emit('workflow.instance.cancelled', {
      organizationId: instance.organizationId,
      instanceId: instance.id,
    });

    return instance;
  }

  async pause(
    id: string,
    organizationId: string,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.instancesRepo.findOneByOrFail({ id, organizationId });

    if (instance.status !== 'running') {
      throw new BadRequestException('Can only pause a running instance');
    }

    instance.status = 'paused';
    await this.instancesRepo.save(instance);

    await this.logEvent(instance.id, 'WORKFLOW_INSTANCE_PAUSED', {}, instance.currentNodeId, actorId);

    return instance;
  }

  async resume(
    id: string,
    organizationId: string,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.instancesRepo.findOneByOrFail({ id, organizationId });

    if (instance.status !== 'paused') {
      throw new BadRequestException('Can only resume a paused instance');
    }

    instance.status = 'running';
    await this.instancesRepo.save(instance);

    await this.logEvent(instance.id, 'WORKFLOW_INSTANCE_RESUMED', {}, instance.currentNodeId, actorId);

    return instance;
  }

  getLogs(instanceId: string): Promise<WorkflowExecutionLog[]> {
    return this.logsRepo.find({
      where: { workflowInstanceId: instanceId },
      order: { createdAt: 'ASC' },
    });
  }

  private assertActive(instance: WorkflowInstance): void {
    const activeStatuses: WorkflowInstanceStatus[] = ['pending', 'running', 'paused'];
    if (!activeStatuses.includes(instance.status)) {
      throw new BadRequestException(
        `Cannot modify instance with terminal status "${instance.status}"`,
      );
    }
  }

  private async logEvent(
    instanceId: string,
    eventType: string,
    payload: Record<string, unknown>,
    nodeId?: string,
    actorId?: string,
  ): Promise<void> {
    await this.logsRepo.save(
      this.logsRepo.create({
        workflowInstanceId: instanceId,
        eventType,
        nodeId,
        actorId,
        payloadJson: payload,
      }),
    );
  }
}
