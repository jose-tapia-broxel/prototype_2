import { IntegrationExecutor } from '../integrations/executor';
import { WorkflowOrchestrator, OrchestratorAdapter } from './engine';
import { WorkflowDefinition, WorkflowProject } from './models/definition';
import { WorkflowInstance } from './models/instance';
import { ASTNode } from '../rule-engine/ast/types';

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;
  let mockAdapter: jest.Mocked<OrchestratorAdapter>;
  let mockDefinition: WorkflowDefinition;
  let mockProject: WorkflowProject;

  beforeEach(() => {
    mockDefinition = {
      id: 'def_1',
      workflowKey: 'test_process',
      version: 1,
      name: 'Test Process',
      status: 'ACTIVE',
      nodes: [
        { id: 'start', type: 'START', name: 'Start' },
        { id: 'form', type: 'FORM', name: 'Capture Data' },
        { id: 'decision', type: 'CONDITION', name: 'Evaluate Amount' },
        { id: 'approval', type: 'APPROVAL', name: 'Manual Approval' },
        { id: 'end', type: 'END', name: 'End' }
      ],
      flows: [
        { id: 'f1', sourceRef: 'start', targetRef: 'form' },
        { id: 'f2', sourceRef: 'form', targetRef: 'decision' },
        {
          id: 'f3',
          sourceRef: 'decision',
          targetRef: 'approval',
          condition: {
            type: 'BinaryExpression',
            operator: '>',
            left: { type: 'Identifier', name: 'amount' },
            right: { type: 'Literal', value: 1000 }
          } as ASTNode
        },
        { id: 'f4', sourceRef: 'decision', targetRef: 'end', isDefault: true }
      ],
      createdAt: new Date().toISOString(),
      createdBy: 'test'
    };

    mockProject = {
      key: 'test_process',
      name: 'Test Process',
      activeDefinitionId: 'def_1',
      draftPayload: {
        nodes: mockDefinition.nodes,
        flows: mockDefinition.flows
      },
      updatedAt: new Date().toISOString()
    };

    mockAdapter = {
      getWorkflowProject: jest.fn().mockResolvedValue(mockProject),
      saveWorkflowProject: jest.fn().mockResolvedValue(undefined),
      getDefinition: jest.fn().mockResolvedValue(mockDefinition),
      getLatestDefinition: jest.fn().mockResolvedValue(mockDefinition),
      saveDefinition: jest.fn().mockResolvedValue(undefined),
      loadInstance: jest.fn(),
      saveInstance: jest.fn().mockResolvedValue(undefined),
      publishEvent: jest.fn().mockResolvedValue(undefined),
      scheduleResume: jest.fn().mockResolvedValue(undefined)
    };

    orchestrator = new WorkflowOrchestrator(mockAdapter);
  });

  it('should publish a draft and create a new version', async () => {
    const newDef = await orchestrator.publishDraft('test_process', 'admin');
    expect(newDef.version).toBe(2);
    expect(newDef.status).toBe('ACTIVE');
    expect(mockAdapter.saveDefinition).toHaveBeenCalledTimes(2);
    expect(mockAdapter.saveWorkflowProject).toHaveBeenCalled();
  });

  it('should start a process and pause at FORM node', async () => {
    const instance = await orchestrator.startProcess('test_process', { initialVar: 'value' });

    expect(instance.status).toBe('WAITING');
    expect(instance.tokens).toHaveLength(1);
    expect(instance.tokens[0].nodeId).toBe('form');
    expect(instance.tokens[0].status).toBe('WAITING');
    expect(instance.tokens[0].waitReason).toBe('FORM');
    expect(instance.context).toEqual({ initialVar: 'value' });
    expect(mockAdapter.saveInstance).toHaveBeenCalled();
  });

  it('should route through default path and complete when condition is false', async () => {
    const existingInstance: WorkflowInstance = {
      id: 'inst_1',
      definitionId: 'def_1',
      definitionKey: 'test_process',
      status: 'WAITING',
      context: { initialVar: 'value' },
      tokens: [
        {
          id: 'tok_1',
          nodeId: 'form',
          status: 'WAITING',
          waitReason: 'FORM',
          retryCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: []
    };

    mockAdapter.loadInstance.mockResolvedValue(existingInstance);

    const updated = await orchestrator.completeForm('inst_1', 'form', { amount: 100 });

    expect(updated.status).toBe('COMPLETED');
    expect(updated.tokens[0].nodeId).toBe('end');
    expect(updated.tokens[0].status).toBe('COMPLETED');
    expect(updated.context.amount).toBe(100);
  });

  it('should route to approval when condition is true', async () => {
    const existingInstance: WorkflowInstance = {
      id: 'inst_2',
      definitionId: 'def_1',
      definitionKey: 'test_process',
      status: 'WAITING',
      context: {},
      tokens: [
        {
          id: 'tok_2',
          nodeId: 'form',
          status: 'WAITING',
          waitReason: 'FORM',
          retryCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: []
    };

    mockAdapter.loadInstance.mockResolvedValue(existingInstance);

    const updated = await orchestrator.completeForm('inst_2', 'form', { amount: 5000 });

    expect(updated.status).toBe('WAITING');
    expect(updated.tokens[0].nodeId).toBe('approval');
    expect(updated.tokens[0].status).toBe('WAITING');
    expect(updated.tokens[0].waitReason).toBe('APPROVAL');
  });

  it('should schedule retry when API_CALL fails with retryable error', async () => {
    const apiDefinition: WorkflowDefinition = {
      ...mockDefinition,
      nodes: [
        { id: 'start', type: 'START', name: 'Start' },
        {
          id: 'api',
          type: 'API_CALL',
          name: 'Call API',
          actionPayload: { integrationDefinition: { id: 'i1' } }
        },
        { id: 'end', type: 'END', name: 'End' }
      ],
      flows: [
        { id: 'a1', sourceRef: 'start', targetRef: 'api' },
        { id: 'a2', sourceRef: 'api', targetRef: 'end' }
      ]
    };

    mockAdapter.getLatestDefinition.mockResolvedValue(apiDefinition);
    mockAdapter.getDefinition.mockResolvedValue(apiDefinition);

    const executor = {
      execute: jest.fn().mockRejectedValue({ response: { status: 503 }, message: 'temporary down' })
    } as unknown as IntegrationExecutor;

    orchestrator = new WorkflowOrchestrator(mockAdapter, executor, {
      maxAttempts: 3,
      initialDelayMs: 1,
      backoffFactor: 2,
      maxDelayMs: 10
    });

    const instance = await orchestrator.startProcess('test_process', {});

    expect(instance.status).toBe('WAITING');
    expect(instance.tokens[0].nodeId).toBe('api');
    expect(instance.tokens[0].status).toBe('WAITING');
    expect(instance.tokens[0].waitReason).toBe('RETRY_BACKOFF');
    expect(mockAdapter.scheduleResume).toHaveBeenCalled();
  });
});
