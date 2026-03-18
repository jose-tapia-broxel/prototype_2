import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowInstance, WorkflowInstanceStatus } from '../entities/workflow-instance.entity';
import { WorkflowExecutionLog } from '../entities/workflow-execution-log.entity';
import { StartWorkflowInstanceDto } from '../dto/start-workflow-instance.dto';
import { DomainEventsService } from '../../events/services/domain-events.service';

// ─────────────────────────────────────────────────────────────
// STATE MACHINE DEFINITIONS
// ─────────────────────────────────────────────────────────────

/**
 * Valid state transitions for workflow instances
 * From status → allowed target statuses
 */
const STATE_TRANSITIONS: Record<WorkflowInstanceStatus, WorkflowInstanceStatus[]> = {
  pending: ['running', 'cancelled'],
  running: ['paused', 'completed', 'failed', 'cancelled'],
  paused: ['running', 'cancelled', 'failed'],
  completed: [], // Terminal state
  failed: [],    // Terminal state
  cancelled: [], // Terminal state
};

const TERMINAL_STATES: WorkflowInstanceStatus[] = ['completed', 'failed', 'cancelled'];
const ACTIVE_STATES: WorkflowInstanceStatus[] = ['pending', 'running', 'paused'];

export interface StateTransitionResult {
  previousStatus: WorkflowInstanceStatus;
  newStatus: WorkflowInstanceStatus;
  transitionedAt: Date;
  valid: boolean;
}

@Injectable()
export class WorkflowInstanceService {
  private readonly logger = new Logger(WorkflowInstanceService.name);

  constructor(
    @InjectRepository(WorkflowInstance)
    private readonly instancesRepo: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowExecutionLog)
    private readonly logsRepo: Repository<WorkflowExecutionLog>,
    private readonly events: DomainEventsService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // LIFECYCLE METHODS
  // ─────────────────────────────────────────────────────────────

  async start(dto: StartWorkflowInstanceDto): Promise<WorkflowInstance> {
    const instance = await this.instancesRepo.save(
      this.instancesRepo.create({
        ...dto,
        status: 'pending',
        contextJson: dto.contextJson ?? {},
      }),
    );

    await this.logEvent(instance.id, 'WORKFLOW_INSTANCE_CREATED', {
      applicationVersionId: instance.applicationVersionId,
      initialContext: instance.contextJson,
    }, undefined, dto.startedBy);

    // Auto-transition to running
    return this.transitionTo(instance, 'running', dto.startedBy);
  }

  async complete(
    id: string,
    organizationId: string,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.findOneByOrgOrFail(id, organizationId);
    return this.transitionTo(instance, 'completed', actorId);
  }

  async fail(
    id: string,
    organizationId: string,
    reason: string,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.findOneByOrgOrFail(id, organizationId);
    instance.contextJson = {
      ...instance.contextJson,
      _failure: {
        reason,
        failedAt: new Date().toISOString(),
        actorId,
      },
    };
    return this.transitionTo(instance, 'failed', actorId, { reason });
  }

  async cancel(
    id: string,
    organizationId: string,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.findOneByOrgOrFail(id, organizationId);
    return this.transitionTo(instance, 'cancelled', actorId);
  }

  async pause(
    id: string,
    organizationId: string,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.findOneByOrgOrFail(id, organizationId);
    return this.transitionTo(instance, 'paused', actorId);
  }

  async resume(
    id: string,
    organizationId: string,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.findOneByOrgOrFail(id, organizationId);
    return this.transitionTo(instance, 'running', actorId);
  }

  // ─────────────────────────────────────────────────────────────
  // STATE MACHINE TRANSITIONS
  // ─────────────────────────────────────────────────────────────

  /**
   * Check if a state transition is valid
   */
  isValidTransition(from: WorkflowInstanceStatus, to: WorkflowInstanceStatus): boolean {
    return STATE_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Transition instance to a new status with validation
   */
  async transitionTo(
    instance: WorkflowInstance,
    targetStatus: WorkflowInstanceStatus,
    actorId?: string,
    payload: Record<string, unknown> = {},
  ): Promise<WorkflowInstance> {
    const previousStatus = instance.status;

    // Validate transition
    if (!this.isValidTransition(previousStatus, targetStatus)) {
      throw new BadRequestException(
        `Invalid state transition: ${previousStatus} → ${targetStatus}. ` +
        `Allowed transitions from "${previousStatus}": ${STATE_TRANSITIONS[previousStatus].join(', ') || 'none'}`,
      );
    }

    // Update instance
    instance.status = targetStatus;
    instance.updatedAt = new Date();

    // Set endedAt for terminal states
    if (TERMINAL_STATES.includes(targetStatus)) {
      instance.endedAt = new Date();
    }

    await this.instancesRepo.save(instance);

    // Log the transition
    const eventType = this.getTransitionEventType(targetStatus);
    await this.logEvent(
      instance.id,
      eventType,
      {
        previousStatus,
        ...payload,
      },
      instance.currentNodeId,
      actorId,
    );

    // Emit domain event
    await this.emitStatusEvent(instance, previousStatus, targetStatus, payload);

    this.logger.debug(`Instance ${instance.id}: ${previousStatus} → ${targetStatus}`);

    return instance;
  }

  private getTransitionEventType(status: WorkflowInstanceStatus): string {
    const eventTypes: Record<WorkflowInstanceStatus, string> = {
      pending: 'WORKFLOW_INSTANCE_PENDING',
      running: 'WORKFLOW_INSTANCE_STARTED',
      paused: 'WORKFLOW_INSTANCE_PAUSED',
      completed: 'WORKFLOW_INSTANCE_COMPLETED',
      failed: 'WORKFLOW_INSTANCE_FAILED',
      cancelled: 'WORKFLOW_INSTANCE_CANCELLED',
    };
    return eventTypes[status] || `WORKFLOW_INSTANCE_${status.toUpperCase()}`;
  }

  private async emitStatusEvent(
    instance: WorkflowInstance,
    previousStatus: WorkflowInstanceStatus,
    newStatus: WorkflowInstanceStatus,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const eventName = `workflow.instance.${newStatus}`;
    await this.events.emit(eventName, {
      organizationId: instance.organizationId,
      instanceId: instance.id,
      workflowId: instance.workflowId,
      previousStatus,
      newStatus,
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // NODE NAVIGATION
  // ─────────────────────────────────────────────────────────────

  async advanceToNode(
    id: string,
    organizationId: string,
    nodeId: string,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.findOneByOrgOrFail(id, organizationId);

    // Can only advance running or paused instances
    if (instance.status !== 'running' && instance.status !== 'paused') {
      throw new BadRequestException(
        `Cannot advance instance with status "${instance.status}". Instance must be running or paused.`,
      );
    }

    const previousNodeId = instance.currentNodeId;
    instance.currentNodeId = nodeId;
    instance.status = 'running'; // Resume if paused
    instance.updatedAt = new Date();

    // Update context with navigation history
    const navigationHistory = (instance.contextJson._navigationHistory as Array<{
      nodeId: string;
      timestamp: string;
    }>) || [];

    navigationHistory.push({
      nodeId,
      timestamp: new Date().toISOString(),
    });

    instance.contextJson = {
      ...instance.contextJson,
      _navigationHistory: navigationHistory,
      _currentNode: nodeId,
      _previousNode: previousNodeId,
    };

    await this.instancesRepo.save(instance);

    await this.logEvent(
      instance.id,
      'NODE_ENTERED',
      {
        previousNodeId,
        currentNodeId: nodeId,
      },
      nodeId,
      actorId,
    );

    await this.events.emit('workflow.node.entered', {
      organizationId: instance.organizationId,
      instanceId: instance.id,
      workflowId: instance.workflowId,
      previousNodeId,
      currentNodeId: nodeId,
      timestamp: new Date().toISOString(),
    });

    return instance;
  }

  // ─────────────────────────────────────────────────────────────
  // CONTEXT MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  /**
   * Update the workflow instance context
   */
  async updateContext(
    id: string,
    organizationId: string,
    contextUpdates: Record<string, unknown>,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    const instance = await this.findOneByOrgOrFail(id, organizationId);

    this.assertActive(instance);

    const previousContext = { ...instance.contextJson };

    // Merge updates into existing context
    instance.contextJson = {
      ...instance.contextJson,
      ...contextUpdates,
      _lastUpdated: new Date().toISOString(),
    };

    instance.updatedAt = new Date();
    await this.instancesRepo.save(instance);

    // Log context update
    await this.logEvent(
      instance.id,
      'CONTEXT_UPDATED',
      {
        updatedFields: Object.keys(contextUpdates),
        previousValues: this.extractChangedValues(previousContext, contextUpdates),
        newValues: contextUpdates,
      },
      instance.currentNodeId,
      actorId,
    );

    return instance;
  }

  /**
   * Set a specific context variable
   */
  async setContextVariable(
    id: string,
    organizationId: string,
    key: string,
    value: unknown,
    actorId?: string,
  ): Promise<WorkflowInstance> {
    return this.updateContext(id, organizationId, { [key]: value }, actorId);
  }

  /**
   * Get the current context
   */
  async getContext(id: string, organizationId: string): Promise<Record<string, unknown>> {
    const instance = await this.findOneByOrgOrFail(id, organizationId);
    return instance.contextJson;
  }

  private extractChangedValues(
    previousContext: Record<string, unknown>,
    updates: Record<string, unknown>,
  ): Record<string, unknown> {
    const changed: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if (previousContext[key] !== undefined) {
        changed[key] = previousContext[key];
      }
    }
    return changed;
  }

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  findOne(id: string): Promise<WorkflowInstance> {
    return this.instancesRepo.findOneByOrFail({ id });
  }

  async findOneOrNull(id: string): Promise<WorkflowInstance | null> {
    return this.instancesRepo.findOneBy({ id });
  }

  findOneByOrg(id: string, organizationId: string): Promise<WorkflowInstance | null> {
    return this.instancesRepo.findOneBy({ id, organizationId });
  }

  async findOneByOrgOrFail(id: string, organizationId: string): Promise<WorkflowInstance> {
    const instance = await this.instancesRepo.findOneBy({ id, organizationId });
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${id} not found`);
    }
    return instance;
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

  async findActiveInstances(organizationId: string): Promise<WorkflowInstance[]> {
    return this.instancesRepo.find({
      where: ACTIVE_STATES.map((status) => ({ organizationId, status })),
      order: { startedAt: 'DESC' },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // AUDIT LOG
  // ─────────────────────────────────────────────────────────────

  getLogs(instanceId: string): Promise<WorkflowExecutionLog[]> {
    return this.logsRepo.find({
      where: { workflowInstanceId: instanceId },
      order: { createdAt: 'ASC' },
    });
  }

  async getLogsByEventType(
    instanceId: string,
    eventType: string,
  ): Promise<WorkflowExecutionLog[]> {
    return this.logsRepo.find({
      where: { workflowInstanceId: instanceId, eventType },
      order: { createdAt: 'ASC' },
    });
  }

  async getLogsByNode(instanceId: string, nodeId: string): Promise<WorkflowExecutionLog[]> {
    return this.logsRepo.find({
      where: { workflowInstanceId: instanceId, nodeId },
      order: { createdAt: 'ASC' },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // STATISTICS
  // ─────────────────────────────────────────────────────────────

  async getInstanceStats(organizationId: string): Promise<{
    total: number;
    byStatus: Record<WorkflowInstanceStatus, number>;
    activeCount: number;
  }> {
    const result = await this.instancesRepo
      .createQueryBuilder('instance')
      .select('instance.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('instance.organization_id = :organizationId', { organizationId })
      .groupBy('instance.status')
      .getRawMany();

    const byStatus = {
      pending: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    } as Record<WorkflowInstanceStatus, number>;

    let total = 0;
    let activeCount = 0;

    for (const row of result) {
      const count = parseInt(row.count, 10);
      byStatus[row.status as WorkflowInstanceStatus] = count;
      total += count;
      if (ACTIVE_STATES.includes(row.status as WorkflowInstanceStatus)) {
        activeCount += count;
      }
    }

    return { total, byStatus, activeCount };
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  private assertActive(instance: WorkflowInstance): void {
    if (!ACTIVE_STATES.includes(instance.status)) {
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
  ): Promise<WorkflowExecutionLog> {
    const log = await this.logsRepo.save(
      this.logsRepo.create({
        workflowInstanceId: instanceId,
        eventType,
        nodeId,
        actorId,
        payloadJson: payload,
      }),
    );

    this.logger.debug(`Logged event ${eventType} for instance ${instanceId}`);
    return log;
  }
}
