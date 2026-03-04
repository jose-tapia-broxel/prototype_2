import { WorkflowOrchestrator, OrchestratorAdapter } from './engine';
import { WorkflowDefinition, WorkflowProject } from './models/definition';
import { WorkflowInstance } from './models/instance';

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
        { id: 'task1', type: 'FORM_TASK', name: 'Task 1' },
        { id: 'end', type: 'END', name: 'End' }
      ],
      flows: [
        { id: 'f1', sourceRef: 'start', targetRef: 'task1' },
        { id: 'f2', sourceRef: 'task1', targetRef: 'end' }
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
      publishEvent: jest.fn().mockResolvedValue(undefined)
    };

    orchestrator = new WorkflowOrchestrator(mockAdapter);
  });

  it('should publish a draft and create a new version', async () => {
    const newDef = await orchestrator.publishDraft('test_process', 'admin');
    expect(newDef.version).toBe(2);
    expect(newDef.status).toBe('ACTIVE');
    expect(mockAdapter.saveDefinition).toHaveBeenCalledTimes(2); // Deprecate old, save new
    expect(mockAdapter.saveWorkflowProject).toHaveBeenCalled();
  });

  it('should start a process and pause at the first FORM_TASK', async () => {
    const instance = await orchestrator.startProcess('test_process', { initialVar: 'value' });

    expect(instance.status).toBe('WAITING_FOR_ACTION');
    expect(instance.tokens).toHaveLength(1);
    expect(instance.tokens[0].nodeId).toBe('task1');
    expect(instance.tokens[0].status).toBe('WAITING');
    expect(instance.context).toEqual({ initialVar: 'value' });
    
    expect(mockAdapter.saveInstance).toHaveBeenCalled();
  });

  it('should complete a task and advance to END', async () => {
    // Simulate an instance already paused at task1
    const existingInstance: WorkflowInstance = {
      id: 'inst_1',
      definitionId: 'def_1',
      definitionKey: 'test_process',
      status: 'WAITING_FOR_ACTION',
      context: { initialVar: 'value' },
      tokens: [{
        id: 'tok_1',
        nodeId: 'task1',
        status: 'WAITING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: []
    };

    mockAdapter.loadInstance.mockResolvedValue(existingInstance);

    const updatedInstance = await orchestrator.completeTask('inst_1', 'task1', { taskVar: 'done' });

    expect(updatedInstance.status).toBe('COMPLETED');
    expect(updatedInstance.tokens[0].nodeId).toBe('end');
    expect(updatedInstance.tokens[0].status).toBe('COMPLETED');
    expect(updatedInstance.context).toEqual({ initialVar: 'value', taskVar: 'done' });
  });
});
