import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { WorkflowInstanceService } from './workflow-instance.service';
import { WorkflowInstance, WorkflowInstanceStatus } from '../entities/workflow-instance.entity';
import { WorkflowExecutionLog } from '../entities/workflow-execution-log.entity';
import { DomainEventsService } from '../../events/services/domain-events.service';

describe('WorkflowInstanceService', () => {
  let service: WorkflowInstanceService;
  let instancesRepo: jest.Mocked<Repository<WorkflowInstance>>;
  let logsRepo: jest.Mocked<Repository<WorkflowExecutionLog>>;
  let eventsService: jest.Mocked<DomainEventsService>;

  const mockInstance = (overrides: Partial<WorkflowInstance> = {}): WorkflowInstance => ({
    id: 'instance-1',
    organizationId: 'org-1',
    applicationId: 'app-1',
    applicationVersionId: 'version-1',
    workflowId: 'workflow-1',
    status: 'pending' as WorkflowInstanceStatus,
    contextJson: {},
    startedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowInstanceService,
        {
          provide: getRepositoryToken(WorkflowInstance),
          useValue: {
            create: jest.fn((data) => ({ ...data })),
            save: jest.fn((instance) => Promise.resolve(instance)),
            findOneBy: jest.fn(),
            findOneByOrFail: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
        {
          provide: getRepositoryToken(WorkflowExecutionLog),
          useValue: {
            create: jest.fn((data) => ({ id: 'log-1', ...data })),
            save: jest.fn((log) => Promise.resolve(log)),
            find: jest.fn(),
          },
        },
        {
          provide: DomainEventsService,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowInstanceService>(WorkflowInstanceService);
    instancesRepo = module.get(getRepositoryToken(WorkflowInstance));
    logsRepo = module.get(getRepositoryToken(WorkflowExecutionLog));
    eventsService = module.get(DomainEventsService);
  });

  describe('State Machine Transitions', () => {
    describe('isValidTransition', () => {
      it('should allow pending → running', () => {
        expect(service.isValidTransition('pending', 'running')).toBe(true);
      });

      it('should allow pending → cancelled', () => {
        expect(service.isValidTransition('pending', 'cancelled')).toBe(true);
      });

      it('should allow running → paused', () => {
        expect(service.isValidTransition('running', 'paused')).toBe(true);
      });

      it('should allow running → completed', () => {
        expect(service.isValidTransition('running', 'completed')).toBe(true);
      });

      it('should allow running → failed', () => {
        expect(service.isValidTransition('running', 'failed')).toBe(true);
      });

      it('should allow paused → running', () => {
        expect(service.isValidTransition('paused', 'running')).toBe(true);
      });

      it('should NOT allow completed → running', () => {
        expect(service.isValidTransition('completed', 'running')).toBe(false);
      });

      it('should NOT allow failed → running', () => {
        expect(service.isValidTransition('failed', 'running')).toBe(false);
      });

      it('should NOT allow pending → completed', () => {
        expect(service.isValidTransition('pending', 'completed')).toBe(false);
      });
    });

    describe('transitionTo', () => {
      it('should transition from running to completed', async () => {
        const instance = mockInstance({ status: 'running' });
        
        const result = await service.transitionTo(instance, 'completed');
        
        expect(result.status).toBe('completed');
        expect(result.endedAt).toBeDefined();
        expect(eventsService.emit).toHaveBeenCalledWith(
          'workflow.instance.completed',
          expect.objectContaining({ newStatus: 'completed' })
        );
      });

      it('should reject invalid transitions', async () => {
        const instance = mockInstance({ status: 'completed' });
        
        await expect(service.transitionTo(instance, 'running'))
          .rejects
          .toThrow(BadRequestException);
      });

      it('should log the transition event', async () => {
        const instance = mockInstance({ status: 'running' });
        
        await service.transitionTo(instance, 'paused');
        
        expect(logsRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'WORKFLOW_INSTANCE_PAUSED',
            payloadJson: expect.objectContaining({ previousStatus: 'running' }),
          })
        );
      });
    });
  });

  describe('Context Management', () => {
    it('should update context and log changes', async () => {
      const instance = mockInstance({ 
        status: 'running',
        contextJson: { existingKey: 'existingValue' },
      });
      instancesRepo.findOneBy.mockResolvedValue(instance);

      const result = await service.updateContext(
        'instance-1',
        'org-1',
        { newKey: 'newValue' }
      );

      expect(result.contextJson).toEqual(
        expect.objectContaining({
          existingKey: 'existingValue',
          newKey: 'newValue',
        })
      );
      expect(logsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'CONTEXT_UPDATED',
          payloadJson: expect.objectContaining({
            updatedFields: ['newKey'],
          }),
        })
      );
    });

    it('should reject context updates on terminal states', async () => {
      const instance = mockInstance({ status: 'completed' });
      instancesRepo.findOneBy.mockResolvedValue(instance);

      await expect(service.updateContext('instance-1', 'org-1', { key: 'value' }))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('Node Navigation', () => {
    it('should advance to node and update context', async () => {
      const instance = mockInstance({ 
        status: 'running',
        currentNodeId: 'node-1',
        contextJson: {},
      });
      instancesRepo.findOneByOrFail.mockResolvedValue(instance);

      const result = await service.advanceToNode(
        'instance-1',
        'org-1',
        'node-2'
      );

      expect(result.currentNodeId).toBe('node-2');
      expect(result.contextJson).toEqual(
        expect.objectContaining({
          _currentNode: 'node-2',
          _previousNode: 'node-1',
        })
      );
    });

    it('should reject advancing from terminal states', async () => {
      const instance = mockInstance({ status: 'completed' });
      instancesRepo.findOneByOrFail.mockResolvedValue(instance);

      await expect(service.advanceToNode('instance-1', 'org-1', 'node-2'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should track navigation history', async () => {
      const instance = mockInstance({ 
        status: 'running',
        contextJson: {
          _navigationHistory: [{ nodeId: 'node-1', timestamp: '2024-01-01T00:00:00Z' }],
        },
      });
      instancesRepo.findOneByOrFail.mockResolvedValue(instance);

      await service.advanceToNode('instance-1', 'org-1', 'node-2');

      expect(instance.contextJson._navigationHistory).toHaveLength(2);
    });
  });

  describe('Lifecycle Methods', () => {
    it('should start workflow instance', async () => {
      const dto = {
        organizationId: 'org-1',
        applicationId: 'app-1',
        applicationVersionId: 'version-1',
        workflowId: 'workflow-1',
        startedBy: 'user-1',
      };

      instancesRepo.create.mockReturnValue(mockInstance({ status: 'pending' }));
      instancesRepo.save.mockImplementation((instance) => Promise.resolve(instance as WorkflowInstance));

      const result = await service.start(dto);

      expect(result.status).toBe('running'); // Auto-transitioned
      expect(eventsService.emit).toHaveBeenCalled();
    });

    it('should complete workflow instance', async () => {
      const instance = mockInstance({ status: 'running' });
      instancesRepo.findOneBy.mockResolvedValue(instance);

      const result = await service.complete('instance-1', 'org-1');

      expect(result.status).toBe('completed');
      expect(result.endedAt).toBeDefined();
    });

    it('should fail workflow instance with reason', async () => {
      const instance = mockInstance({ status: 'running' });
      instancesRepo.findOneBy.mockResolvedValue(instance);

      const result = await service.fail('instance-1', 'org-1', 'Test failure');

      expect(result.status).toBe('failed');
      expect(result.contextJson._failure).toEqual(
        expect.objectContaining({ reason: 'Test failure' })
      );
    });

    it('should pause and resume workflow', async () => {
      const instance = mockInstance({ status: 'running' });
      instancesRepo.findOneBy.mockResolvedValue(instance);

      // Pause
      let result = await service.pause('instance-1', 'org-1');
      expect(result.status).toBe('paused');

      // Resume
      instance.status = 'paused';
      result = await service.resume('instance-1', 'org-1');
      expect(result.status).toBe('running');
    });
  });
});
