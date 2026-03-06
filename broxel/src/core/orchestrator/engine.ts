import { RuleEvaluator } from '../rule-engine/evaluator/evaluator';
import { ExecutionContext } from '../rule-engine/ast/types';
import { IntegrationExecutor } from '../integrations/executor';
import { WorkflowDefinition, WorkflowProject, SequenceFlow, WorkflowNode } from './models/definition';
import {
  WorkflowInstance,
  WorkflowToken,
  HistoryEventType,
  TokenWaitReason,
  InstanceStatus
} from './models/instance';

interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
}

export interface OrchestratorAdapter {
  // Project & Definition Management
  getWorkflowProject(key: string): Promise<WorkflowProject>;
  saveWorkflowProject(project: WorkflowProject): Promise<void>;

  getDefinition(id: string): Promise<WorkflowDefinition>;
  getLatestDefinition(key: string): Promise<WorkflowDefinition>;
  saveDefinition(definition: WorkflowDefinition): Promise<void>;

  // Instance Management
  loadInstance(id: string): Promise<WorkflowInstance>;
  saveInstance(instance: WorkflowInstance): Promise<void>;

  // Event Bus / Messaging
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publishEvent(type: HistoryEventType, payload: any): Promise<void>;

  // Optional scheduler for TIMER and RETRY backoff
  scheduleResume?(instanceId: string, tokenId: string, resumeAt: string): Promise<void>;
}

export class WorkflowOrchestrator {
  private evaluator: RuleEvaluator;

  constructor(
    private adapter: OrchestratorAdapter,
    private integrationExecutor?: IntegrationExecutor,
    private retryPolicy: RetryPolicy = {
      maxAttempts: 3,
      initialDelayMs: 1000,
      backoffFactor: 2,
      maxDelayMs: 30000
    }
  ) {
    this.evaluator = new RuleEvaluator();
  }

  async publishDraft(workflowKey: string, publishedBy: string): Promise<WorkflowDefinition> {
    const project = await this.adapter.getWorkflowProject(workflowKey);

    let nextVersion = 1;
    if (project.activeDefinitionId) {
      const currentDef = await this.adapter.getDefinition(project.activeDefinitionId);
      nextVersion = currentDef.version + 1;

      currentDef.status = 'DEPRECATED';
      await this.adapter.saveDefinition(currentDef);
    }

    const newDefinitionId = `def_${workflowKey}_v${nextVersion}_${Date.now()}`;

    const newDefinition: WorkflowDefinition = {
      id: newDefinitionId,
      workflowKey: project.key,
      version: nextVersion,
      name: project.name,
      description: project.description,
      nodes: draftDefinition.nodes,
      flows: draftDefinition.flows,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      createdBy: publishedBy
    };

    await this.adapter.saveDefinition(newDefinition);

    project.activeDefinitionId = newDefinitionId;
    project.updatedAt = new Date().toISOString();
    await this.adapter.saveWorkflowProject(project);

    return newDefinition;
  }

  private buildDraftDefinition(project: WorkflowProject, createdBy: string): WorkflowDefinition {
    return {
      id: 'draft',
      workflowKey: project.key,
      version: 0,
      name: project.name,
      description: project.description,
      nodes: [...project.draftPayload.nodes],
      flows: [...project.draftPayload.flows],
      inputSchema: undefined,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      createdBy
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async startProcess(workflowKey: string, initialContext: Record<string, any>, specificDefinitionId?: string): Promise<WorkflowInstance> {
    const definition = specificDefinitionId
      ? await this.adapter.getDefinition(specificDefinitionId)
      : await this.adapter.getLatestDefinition(workflowKey);

    const startNode = definition.nodes.find(n => n.type === 'START');
    if (!startNode) throw new Error(`Definition ${definition.id} has no START node`);

    const now = new Date().toISOString();
    const instanceId = this.generateId('inst');

    const initialToken: WorkflowToken = {
      id: this.generateId('tok'),
      nodeId: startNode.id,
      status: 'ACTIVE',
      retryCount: 0,
      createdAt: now,
      updatedAt: now
    };

    const instance: WorkflowInstance = {
      id: instanceId,
      definitionId: definition.id,
      definitionKey: definition.workflowKey,
      status: 'RUNNING',
      context: { ...initialContext },
      tokens: [initialToken],
      version: 1,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          id: this.generateId('hist'),
          type: 'INSTANCE_STARTED',
          timestamp: now,
          payload: { initialContext }
        }
      ]
    };

    await this.saveAndPublish(instance, 'INSTANCE_STARTED', { instanceId: instance.id });
    return this.drain(instance);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async completeForm(instanceId: string, nodeId: string, payload: Record<string, any>): Promise<WorkflowInstance> {
    return this.resumeWaitingNode(instanceId, nodeId, payload, 'FORM');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async decideApproval(instanceId: string, nodeId: string, payload: Record<string, any>): Promise<WorkflowInstance> {
    return this.resumeWaitingNode(instanceId, nodeId, payload, 'APPROVAL');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async completeTask(instanceId: string, nodeId: string, payload: Record<string, any>): Promise<WorkflowInstance> {
    return this.resumeWaitingNode(instanceId, nodeId, payload);
  }

  async onTimerTriggered(instanceId: string, tokenId: string): Promise<WorkflowInstance> {
    const instance = await this.adapter.loadInstance(instanceId);
    const token = instance.tokens.find(t => t.id === tokenId && t.status === 'WAITING' && t.waitReason === 'TIMER');
    if (!token) {
      throw new Error(`No waiting TIMER token found for ${tokenId} in instance ${instanceId}`);
    }

    token.status = 'ACTIVE';
    token.waitReason = undefined;
    token.resumeAt = undefined;
    token.updatedAt = new Date().toISOString();

    instance.status = 'RUNNING';
    this.pushHistory(instance, 'NODE_COMPLETED', token.nodeId, token.id, { resumedBy: 'TIMER_FIRED' });

    return this.drain(instance);
  }

  private async drain(instance: WorkflowInstance): Promise<WorkflowInstance> {
    let target = instance;
    // Keep processing until all tokens are blocked/completed/failed.
    // Hard cap avoids accidental infinite loops in malformed definitions.
    for (let i = 0; i < 1000; i++) {
      const activeToken = target.tokens.find(t => t.status === 'ACTIVE');
      if (!activeToken) {
        this.recalculateInstanceStatus(target);
        target.updatedAt = new Date().toISOString();
        await this.adapter.saveInstance(target);
        return target;
      }

      target = await this.advanceToken(target, activeToken.id);
      if (target.status === 'FAILED' || target.status === 'COMPLETED' || target.status === 'CANCELLED') {
        await this.adapter.saveInstance(target);
        return target;
      }
    }

    throw new Error(`Execution safety cap reached for instance ${instance.id}`);
  }

  private async advanceToken(instance: WorkflowInstance, tokenId: string): Promise<WorkflowInstance> {
    const definition = await this.adapter.getDefinition(instance.definitionId);
    const token = instance.tokens.find(t => t.id === tokenId);

    if (!token || token.status !== 'ACTIVE') return instance;

    const currentNode = definition.nodes.find(n => n.id === token.nodeId);
    if (!currentNode) throw new Error(`Node ${token.nodeId} not found in definition`);

    this.pushHistory(instance, 'NODE_ENTERED', currentNode.id, token.id);

    switch (currentNode.type) {
      case 'START':
        return this.routeFromNode(instance, definition, token, currentNode);

      case 'FORM':
        return this.waitOnNode(instance, token, currentNode.id, 'FORM');

      case 'APPROVAL':
        return this.waitOnNode(instance, token, currentNode.id, 'APPROVAL');

      case 'TIMER': {
        const resumeAt = new Date(Date.now() + (currentNode.timerMs ?? 0)).toISOString();
        const waitingInstance = await this.waitOnNode(instance, token, currentNode.id, 'TIMER', resumeAt);
        if (this.adapter.scheduleResume) {
          await this.adapter.scheduleResume(waitingInstance.id, token.id, resumeAt);
        }
        return waitingInstance;
      }

      case 'API_CALL':
        return this.executeApiCall(instance, definition, token, currentNode);

      case 'CONDITION':
        return this.routeFromNode(instance, definition, token, currentNode);

      case 'END': {
        token.status = 'COMPLETED';
        token.updatedAt = new Date().toISOString();
        this.pushHistory(instance, 'NODE_COMPLETED', currentNode.id, token.id);
        this.recalculateInstanceStatus(instance);
        if (instance.status === 'COMPLETED') {
          this.pushHistory(instance, 'INSTANCE_COMPLETED');
        }
        return instance;
      }

      default:
        return this.failToken(instance, token, currentNode.id, 'UNSUPPORTED_NODE_TYPE');
    }
  }

  private async executeApiCall(
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    token: WorkflowToken,
    node: WorkflowNode
  ): Promise<WorkflowInstance> {
    if (!this.integrationExecutor) {
      return this.failToken(instance, token, node.id, 'INTEGRATION_EXECUTOR_NOT_CONFIGURED');
    }

    if (!node.actionPayload || !node.actionPayload['integrationDefinition']) {
      return this.failToken(instance, token, node.id, 'API_CALL_MISSING_INTEGRATION_DEFINITION');
    }

    try {
      const context: ExecutionContext = { data: instance.context };
      const response = await this.integrationExecutor.execute(node.actionPayload['integrationDefinition'], context);
      instance.context = { ...instance.context, ...response };
      this.pushHistory(instance, 'CONTEXT_UPDATED', node.id, token.id, { response });
      this.pushHistory(instance, 'NODE_COMPLETED', node.id, token.id);
      token.retryCount = 0;
      return this.routeFromNode(instance, definition, token, node);
    } catch (error) {
      return this.handleNodeError(instance, token, node, error);
    }
  }

  private handleNodeError(
    instance: WorkflowInstance,
    token: WorkflowToken,
    node: WorkflowNode,
    error: unknown
  ): WorkflowInstance {
    const statusCode = this.extractStatusCode(error);
    const isRetryable = statusCode >= 500 || statusCode === 408 || statusCode === 429 || statusCode === 0;

    token.retryCount = (token.retryCount ?? 0) + 1;
    token.lastErrorCode = statusCode ? `HTTP_${statusCode}` : 'UNKNOWN_ERROR';

    if (isRetryable && token.retryCount < this.retryPolicy.maxAttempts) {
      const resumeAt = new Date(Date.now() + this.calculateBackoffDelayMs(token.retryCount)).toISOString();
      token.status = 'WAITING';
      token.waitReason = 'RETRY_BACKOFF';
      token.resumeAt = resumeAt;
      token.updatedAt = new Date().toISOString();
      instance.status = 'WAITING';

      this.pushHistory(instance, 'RETRY_SCHEDULED', node.id, token.id, {
        retryCount: token.retryCount,
        resumeAt,
        error: this.serializeError(error)
      });

      if (this.adapter.scheduleResume) {
        void this.adapter.scheduleResume(instance.id, token.id, resumeAt);
      }

      return instance;
    }

    return this.failToken(instance, token, node.id, token.lastErrorCode ?? 'NODE_EXECUTION_FAILED', error);
  }

  private routeFromNode(
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    token: WorkflowToken,
    currentNode: WorkflowNode
  ): WorkflowInstance {
    const outgoing = definition.flows
      .filter(flow => flow.sourceRef === currentNode.id)
      .sort((a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER));

    if (outgoing.length === 0) {
      return this.failToken(instance, token, currentNode.id, 'DEAD_END');
    }

    const selected = this.resolveTransitions(currentNode.type, outgoing, instance.context);
    if (selected.length === 0) {
      return this.failToken(instance, token, currentNode.id, 'ROUTING_NO_MATCH');
    }

    const now = new Date().toISOString();
    const [first, ...rest] = selected;

    token.nodeId = first.targetRef;
    token.updatedAt = now;

    this.pushHistory(instance, 'TRANSITION_TAKEN', currentNode.id, token.id, {
      flowId: first.id,
      targetRef: first.targetRef
    });

    for (const flow of rest) {
      const newToken: WorkflowToken = {
        id: this.generateId('tok'),
        nodeId: flow.targetRef,
        status: 'ACTIVE',
        parentId: token.id,
        retryCount: 0,
        createdAt: now,
        updatedAt: now
      };
      instance.tokens.push(newToken);
      this.pushHistory(instance, 'TOKEN_CREATED', flow.targetRef, newToken.id, { parentTokenId: token.id });
      this.pushHistory(instance, 'TRANSITION_TAKEN', currentNode.id, newToken.id, {
        flowId: flow.id,
        targetRef: flow.targetRef
      });
    }

    return instance;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async resumeWaitingNode(instanceId: string, nodeId: string, payload: Record<string, any>, expectedReason?: TokenWaitReason): Promise<WorkflowInstance> {
    const instance = await this.adapter.loadInstance(instanceId);

    const token = instance.tokens.find(t => t.nodeId === nodeId && t.status === 'WAITING');
    if (!token) {
      throw new Error(`No waiting token found for node ${nodeId} in instance ${instanceId}`);
    }

    if (expectedReason && token.waitReason !== expectedReason) {
      throw new Error(`Token ${token.id} is waiting for ${token.waitReason}, expected ${expectedReason}`);
    }

    instance.context = { ...instance.context, ...payload };
    token.status = 'ACTIVE';
    token.waitReason = undefined;
    token.resumeAt = undefined;
    token.updatedAt = new Date().toISOString();
    instance.status = 'RUNNING';

    this.pushHistory(instance, 'CONTEXT_UPDATED', nodeId, token.id, { payload });
    this.pushHistory(instance, 'NODE_COMPLETED', nodeId, token.id, { taskPayload: payload });

    return this.drain(instance);
  }

  private async waitOnNode(
    instance: WorkflowInstance,
    token: WorkflowToken,
    nodeId: string,
    reason: TokenWaitReason,
    resumeAt?: string
  ): Promise<WorkflowInstance> {
    token.status = 'WAITING';
    token.waitReason = reason;
    token.resumeAt = resumeAt;
    token.updatedAt = new Date().toISOString();

    instance.status = 'WAITING';
    instance.updatedAt = new Date().toISOString();

    this.pushHistory(instance, 'NODE_WAITING', nodeId, token.id, { reason, resumeAt });
    await this.adapter.saveInstance(instance);
    return instance;
  }

  private resolveTransitions(nodeType: WorkflowNode['type'], outgoing: SequenceFlow[], contextData: WorkflowInstance['context']): SequenceFlow[] {
    if (nodeType !== 'CONDITION') {
      return outgoing;
    }

    const context: ExecutionContext = { data: contextData };
    for (const flow of outgoing) {
      if (!flow.condition) continue;
      const matches = this.evaluator.evaluate(flow.condition, context) === true;
      if (matches) {
        return [flow];
      }
    }

    const defaultFlow = outgoing.find(f => f.isDefault);
    return defaultFlow ? [defaultFlow] : [];
  }

  private recalculateInstanceStatus(instance: WorkflowInstance): void {
    if (instance.tokens.some(t => t.status === 'FAILED')) {
      instance.status = 'FAILED';
      this.pushHistory(instance, 'INSTANCE_FAILED');
      return;
    }

    if (instance.tokens.every(t => t.status === 'COMPLETED')) {
      instance.status = 'COMPLETED';
      instance.completedAt = new Date().toISOString();
      return;
    }

    if (instance.tokens.some(t => t.status === 'WAITING')) {
      instance.status = 'WAITING';
      return;
    }

    instance.status = 'RUNNING';
  }

  private failToken(
    instance: WorkflowInstance,
    token: WorkflowToken,
    nodeId: string,
    errorCode: string,
    error?: unknown
  ): WorkflowInstance {
    token.status = 'FAILED';
    token.lastErrorCode = errorCode;
    token.updatedAt = new Date().toISOString();

    instance.status = 'FAILED';
    instance.updatedAt = new Date().toISOString();

    this.pushHistory(instance, 'NODE_FAILED', nodeId, token.id, {
      errorCode,
      error: this.serializeError(error)
    });
    this.pushHistory(instance, 'INSTANCE_FAILED', nodeId, token.id, { errorCode });

    return instance;
  }

  private calculateBackoffDelayMs(attempt: number): number {
    const noJitter = Math.min(
      this.retryPolicy.maxDelayMs,
      this.retryPolicy.initialDelayMs * Math.pow(this.retryPolicy.backoffFactor, attempt - 1)
    );

    const jitterFactor = 0.85 + Math.random() * 0.3; // +/-15%
    return Math.floor(noJitter * jitterFactor);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractStatusCode(error: any): number {
    return error?.response?.status ?? error?.statusCode ?? 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serializeError(error: any): Record<string, any> | undefined {
    if (!error) return undefined;
    return {
      message: error?.message,
      statusCode: this.extractStatusCode(error),
      name: error?.name
    };
  }

  private pushHistory(
    instance: WorkflowInstance,
    type: HistoryEventType,
    nodeId?: string,
    tokenId?: string,
    payload?: Record<string, unknown>
  ): void {
    const event = {
      id: this.generateId('hist'),
      type,
      nodeId,
      tokenId,
      timestamp: new Date().toISOString(),
      payload
    };

    instance.history.push(event);
    instance.updatedAt = event.timestamp;
    void this.adapter.publishEvent(type, {
      instanceId: instance.id,
      definitionId: instance.definitionId,
      nodeId,
      tokenId,
      payload
    });
  }

  private async saveAndPublish(instance: WorkflowInstance, type: HistoryEventType, payload: Record<string, unknown>): Promise<void> {
    await this.adapter.saveInstance(instance);
    await this.adapter.publishEvent(type, payload);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
