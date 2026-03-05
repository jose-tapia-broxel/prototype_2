import { WorkflowDefinition, WorkflowProject } from './models/definition';
import { WorkflowInstance, WorkflowToken, HistoryEventType } from './models/instance';
import { RuleEngine } from '../rule-engine/engine';
import { ExecutionContext } from '../rule-engine/ast/types';
import { FlowValidator, ValidationDiagnostic, WorkflowDraftValidationError } from './validation/flow-validator';

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
}

export class WorkflowOrchestrator {
  private ruleEngine: RuleEngine;
  private flowValidator: FlowValidator;

  constructor(private adapter: OrchestratorAdapter) {
    this.ruleEngine = new RuleEngine();
    this.flowValidator = new FlowValidator();
  }

  async validateDraft(workflowKey: string): Promise<ValidationDiagnostic[]> {
    const project = await this.adapter.getWorkflowProject(workflowKey);
    const draftDefinition = this.buildDraftDefinition(project, 'system-validator');
    return this.flowValidator.validate(draftDefinition);
  }

  async publishDraft(workflowKey: string, publishedBy: string): Promise<WorkflowDefinition> {
    const project = await this.adapter.getWorkflowProject(workflowKey);
    const draftDefinition = this.buildDraftDefinition(project, publishedBy);

    const diagnostics = this.flowValidator.validate(draftDefinition);
    const blockingErrors = diagnostics.filter(diagnostic => diagnostic.severity === 'error');
    if (blockingErrors.length > 0) {
      throw new WorkflowDraftValidationError(blockingErrors);
    }
    
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
    let definition: WorkflowDefinition;
    
    if (specificDefinitionId) {
      definition = await this.adapter.getDefinition(specificDefinitionId);
    } else {
      definition = await this.adapter.getLatestDefinition(workflowKey);
    }
    
    const startNode = definition.nodes.find(n => n.type === 'START');
    if (!startNode) throw new Error(`Definition ${definition.id} has no START node`);

    const instanceId = `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const initialToken: WorkflowToken = {
      id: `tok_${Date.now()}`,
      nodeId: startNode.id,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const instance: WorkflowInstance = {
      id: instanceId,
      definitionId: definition.id,
      definitionKey: definition.workflowKey,
      status: 'CREATED',
      context: { ...initialContext },
      tokens: [initialToken],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{
        id: `hist_${Date.now()}`,
        type: 'INSTANCE_STARTED',
        timestamp: new Date().toISOString(),
        payload: { initialContext }
      }]
    };

    await this.adapter.saveInstance(instance);
    
    // Immediately try to advance the token from the START node
    return this.advanceToken(instance, initialToken.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async completeTask(instanceId: string, nodeId: string, payload: Record<string, any>): Promise<WorkflowInstance> {
    const instance = await this.adapter.loadInstance(instanceId);
    
    // Find the token sitting on this node
    const token = instance.tokens.find(t => t.nodeId === nodeId && t.status === 'WAITING');
    if (!token) {
      throw new Error(`No waiting token found for node ${nodeId} in instance ${instanceId}`);
    }

    // Update context with the task payload
    instance.context = { ...instance.context, ...payload };
    
    // Mark token as active again so the engine can move it forward
    token.status = 'ACTIVE';
    token.updatedAt = new Date().toISOString();
    
    instance.history.push({
      id: `hist_${Date.now()}`,
      type: 'NODE_COMPLETED',
      nodeId,
      tokenId: token.id,
      timestamp: new Date().toISOString(),
      payload: { taskPayload: payload }
    });

    // Advance the token to the next node
    return this.advanceToken(instance, token.id);
  }

  private async advanceToken(instance: WorkflowInstance, tokenId: string): Promise<WorkflowInstance> {
    const definition = await this.adapter.getDefinition(instance.definitionId);
    const token = instance.tokens.find(t => t.id === tokenId);
    
    if (!token || token.status !== 'ACTIVE') return instance;

    const currentNode = definition.nodes.find(n => n.id === token.nodeId);
    if (!currentNode) throw new Error(`Node ${token.nodeId} not found in definition`);

    // 1. Execute Node Logic (if any)
    // In a real engine, this would call external APIs for SERVICE_TASK, etc.
    
    // 2. Check if we need to wait
    if (currentNode.type === 'FORM_TASK' || currentNode.type === 'HUMAN_TASK') {
      // The engine pauses here. It waits for the UI/User to call `completeTask`
      token.status = 'WAITING';
      instance.status = 'WAITING_FOR_ACTION';
      instance.updatedAt = new Date().toISOString();
      await this.adapter.saveInstance(instance);
      return instance;
    }

    if (currentNode.type === 'END') {
      token.status = 'COMPLETED';
      // Check if ALL tokens are completed
      const allDone = instance.tokens.every(t => t.status === 'COMPLETED');
      if (allDone) {
        instance.status = 'COMPLETED';
        instance.completedAt = new Date().toISOString();
      }
      instance.updatedAt = new Date().toISOString();
      await this.adapter.saveInstance(instance);
      return instance;
    }

    // 3. Find outgoing flows
    const outgoingFlows = definition.flows.filter(f => f.sourceRef === currentNode.id);
    
    if (outgoingFlows.length === 0) {
      // Dead end. Should be caught by validation before publishing.
      token.status = 'FAILED';
      instance.status = 'FAILED';
      await this.adapter.saveInstance(instance);
      throw new Error(`Dead end reached at node ${currentNode.id}`);
    }

    // 4. Evaluate routing (Gateways)
    let nextFlows = outgoingFlows;

    if (currentNode.type === 'EXCLUSIVE_GATEWAY') {
      // Evaluate conditions using the Rule Engine
      const context: ExecutionContext = { data: instance.context };
      
      const matchingFlow = outgoingFlows.find(flow => {
        if (!flow.condition) return false;
        // We temporarily wrap the condition in a dummy rule to use the engine
        // In a real implementation, the evaluator would be exposed directly
        const result = this.ruleEngine['evaluator'].evaluate(flow.condition, context);
        return result === true;
      });

      if (matchingFlow) {
        nextFlows = [matchingFlow];
      } else {
        const defaultFlow = outgoingFlows.find(f => f.isDefault);
        if (defaultFlow) {
          nextFlows = [defaultFlow];
        } else {
          throw new Error(`No matching condition and no default flow for exclusive gateway ${currentNode.id}`);
        }
      }
    }

    // 5. Move the token(s)
    if (nextFlows.length === 1) {
      // Simple move
      token.nodeId = nextFlows[0].targetRef;
      token.updatedAt = new Date().toISOString();
      
      instance.history.push({
        id: `hist_${Date.now()}`,
        type: 'NODE_ENTERED',
        nodeId: token.nodeId,
        tokenId: token.id,
        timestamp: new Date().toISOString()
      });
      
      // Recursively advance (the next node might be automatic too)
      return this.advanceToken(instance, token.id);
      
    } else if (nextFlows.length > 1) {
      // Parallel split (Fork)
      token.status = 'COMPLETED'; // Consume the original token
      
      const newTokens = nextFlows.map(flow => ({
        id: `tok_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        nodeId: flow.targetRef,
        status: 'ACTIVE' as const,
        parentId: token.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      instance.tokens.push(...newTokens);
      
      // Advance all new tokens concurrently
      for (const newToken of newTokens) {
        await this.advanceToken(instance, newToken.id);
      }
    }

    return instance;
  }
}
