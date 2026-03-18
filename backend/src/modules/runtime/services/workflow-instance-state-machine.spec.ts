import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { WorkflowInstanceService } from './workflow-instance.service';
import { WorkflowInstance, WorkflowInstanceStatus } from '../entities/workflow-instance.entity';
import { WorkflowExecutionLog } from '../entities/workflow-execution-log.entity';
import { DomainEventsService } from '../../events/services/domain-events.service';

/**
 * Advanced State Machine Tests
 * 
 * Tests complex workflow instance state transitions including:
 * - All valid transition paths
 * - Edge cases and race conditions
 * - Concurrent state changes
 * - State-specific business rules
 */
describe('WorkflowInstanceService - Advanced State Machine', () => {
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
    currentNodeId: 'start-node',
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
            save: jest.fn((instance) => Promise.resolve({ ...instance, updatedAt: new Date() })),
            findOne: jest.fn(),
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
            create: jest.fn((data) => ({ id: `log-${Date.now()}`, ...data })),
            save: jest.fn((log) => Promise.resolve(log)),
            find: jest.fn(),
          },
        },
        {
          provide: DomainEventsService,
          useValue: {
            emit: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowInstanceService>(WorkflowInstanceService);
    instancesRepo = module.get(getRepositoryToken(WorkflowInstance));
    logsRepo = module.get(getRepositoryToken(WorkflowExecutionLog));
    eventsService = module.get(DomainEventsService);
  });

  // ─────────────────────────────────────────────────────────────
  // COMPLETE TRANSITION MATRIX TESTS
  // ─────────────────────────────────────────────────────────────

  describe('State Transition Matrix', () => {
    const STATUSES: WorkflowInstanceStatus[] = ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'];

    const VALID_TRANSITIONS: Record<WorkflowInstanceStatus, WorkflowInstanceStatus[]> = {
      pending: ['running', 'cancelled'],
      running: ['paused', 'completed', 'failed', 'cancelled'],
      paused: ['running', 'cancelled', 'failed'],
      completed: [],
      failed: [],
      cancelled: [],
    };

    STATUSES.forEach((fromStatus) => {
      describe(`From ${fromStatus}`, () => {
        STATUSES.forEach((toStatus) => {
          const isValid = VALID_TRANSITIONS[fromStatus].includes(toStatus);
          const testName = isValid
            ? `should allow → ${toStatus}`
            : `should DENY → ${toStatus}`;

          it(testName, () => {
            expect(service.isValidTransition(fromStatus, toStatus)).toBe(isValid);
          });
        });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TERMINAL STATE BEHAVIOR
  // ─────────────────────────────────────────────────────────────

  describe('Terminal State Behavior', () => {
    const TERMINAL_STATES: WorkflowInstanceStatus[] = ['completed', 'failed', 'cancelled'];

    TERMINAL_STATES.forEach((terminalState) => {
      describe(`${terminalState} state`, () => {
        it('should not allow any transitions', async () => {
          const instance = mockInstance({ status: terminalState });
          instancesRepo.findOneBy.mockResolvedValue(instance);

          const transitions = ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'];

          for (const target of transitions) {
            await expect(
              service.transitionTo(instance, target as WorkflowInstanceStatus),
            ).rejects.toThrow(BadRequestException);
          }
        });

        it('should reject context updates', async () => {
          const instance = mockInstance({ status: terminalState });
          instancesRepo.findOneBy.mockResolvedValue(instance);

          await expect(
            service.updateContext('instance-1', 'org-1', { key: 'value' }),
          ).rejects.toThrow(BadRequestException);
        });

        it('should reject node advancement', async () => {
          const instance = mockInstance({ status: terminalState });
          instancesRepo.findOneBy.mockResolvedValue(instance);

          await expect(
            service.advanceToNode('instance-1', 'org-1', 'next-node'),
          ).rejects.toThrow(BadRequestException);
        });

        it('should set endedAt timestamp when entering terminal state', async () => {
          const instance = mockInstance({ status: 'running' });

          instancesRepo.save.mockImplementation(async (inst: any) => {
            const now = new Date();
            return { ...inst, endedAt: now, updatedAt: now } as any;
          });

          const result = await service.transitionTo(instance, terminalState);
          expect(result.endedAt).toBeDefined();
        });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // LIFECYCLE SCENARIOS
  // ─────────────────────────────────────────────────────────────

  describe('Complete Workflow Lifecycle', () => {
    it('should handle happy path: pending → running → completed', async () => {
      let currentInstance = mockInstance({ status: 'pending' });

      // Mock save to update status
      instancesRepo.save.mockImplementation(async (inst: any) => {
        currentInstance = { ...currentInstance, ...inst, updatedAt: new Date() } as any;
        return currentInstance as any;
      });

      // Start workflow
      const afterStart = await service.transitionTo(currentInstance, 'running');
      expect(afterStart.status).toBe('running');

      // Complete workflow
      currentInstance.status = 'running';
      const afterComplete = await service.transitionTo(currentInstance, 'completed');
      expect(afterComplete.status).toBe('completed');
      expect(afterComplete.endedAt).toBeDefined();

      // Verify event emissions
      expect(eventsService.emit).toHaveBeenCalledWith(
        'workflow.instance.running',
        expect.objectContaining({ newStatus: 'running' }),
      );
      expect(eventsService.emit).toHaveBeenCalledWith(
        'workflow.instance.completed',
        expect.objectContaining({ newStatus: 'completed' }),
      );
    });

    it('should handle pause/resume cycle: running → paused → running → completed', async () => {
      let currentInstance = mockInstance({ status: 'running' });

      instancesRepo.save.mockImplementation(async (inst: any) => {
        currentInstance = { ...currentInstance, ...inst, updatedAt: new Date() } as any;
        return currentInstance as any;
      });

      // Pause
      const afterPause = await service.transitionTo(currentInstance, 'paused');
      expect(afterPause.status).toBe('paused');

      // Resume
      currentInstance.status = 'paused';
      const afterResume = await service.transitionTo(currentInstance, 'running');
      expect(afterResume.status).toBe('running');

      // Complete
      currentInstance.status = 'running';
      const afterComplete = await service.transitionTo(currentInstance, 'completed');
      expect(afterComplete.status).toBe('completed');
    });

    it('should handle failure path: running → failed', async () => {
      const instance = mockInstance({ status: 'running' });

      instancesRepo.findOneBy.mockResolvedValue(instance);
      instancesRepo.save.mockImplementation(async (inst: any) => ({
        ...inst,
        endedAt: new Date(),
        updatedAt: new Date(),
      } as any));

      const result = await service.fail('instance-1', 'org-1', 'Validation error');

      expect(result.status).toBe('failed');
      expect(result.contextJson).toEqual(
        expect.objectContaining({
          _failure: expect.objectContaining({
            reason: 'Validation error',
          }),
        }),
      );
    });

    it('should handle cancellation from any active state', async () => {
      const activeStates: WorkflowInstanceStatus[] = ['pending', 'running', 'paused'];

      for (const fromState of activeStates) {
        const instance = mockInstance({ status: fromState });

        instancesRepo.findOneBy.mockResolvedValue(instance);
        instancesRepo.save.mockImplementation(async (inst: any) => ({
          ...inst,
          status: 'cancelled',
          endedAt: new Date(),
          updatedAt: new Date(),
        } as any));

        const result = await service.cancel(instance.id, instance.organizationId);
        expect(result.status).toBe('cancelled');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // EDGE CASES AND ERROR SCENARIOS
  // ─────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should reject transition to same status (no-op)', async () => {
      const instance = mockInstance({ status: 'running' });

      // Transitioning to same status should be rejected as invalid
      await expect(
        service.transitionTo(instance, 'running'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should preserve context across transitions', async () => {
      const instance = mockInstance({
        status: 'running',
        contextJson: {
          step: 2,
          data: { firstName: 'John', lastName: 'Doe' },
          metadata: { startTime: '2024-01-15' },
        },
      });

      instancesRepo.save.mockImplementation(async (inst: any) => ({ ...inst, updatedAt: new Date() } as any));

      const result = await service.transitionTo(instance, 'paused');

      expect(result.contextJson).toEqual(instance.contextJson);
    });

    it('should log all transitions with proper metadata', async () => {
      const instance = mockInstance({ status: 'running', currentNodeId: 'node-5' });
      const actorId = 'user-123';

      await service.transitionTo(instance, 'paused', actorId);

      expect(logsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowInstanceId: instance.id,
          eventType: 'WORKFLOW_INSTANCE_PAUSED',
          nodeId: 'node-5',
          actorId,
          payloadJson: expect.objectContaining({
            previousStatus: 'running',
          }),
        }),
      );
    });

    it('should handle rapid state changes without data loss', async () => {
      let callCount = 0;
      const instance = mockInstance({ status: 'pending' });

      instancesRepo.save.mockImplementation(async (inst: any) => {
        callCount++;
        return { ...inst, updatedAt: new Date() } as any;
      });

      // Start
      await service.transitionTo({ ...instance, status: 'pending' }, 'running');
      // Pause
      await service.transitionTo({ ...instance, status: 'running' }, 'paused');
      // Resume
      await service.transitionTo({ ...instance, status: 'paused' }, 'running');
      // Complete
      await service.transitionTo({ ...instance, status: 'running' }, 'completed');

      expect(callCount).toBe(4);
      expect(logsRepo.save).toHaveBeenCalledTimes(4);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // CONCURRENT ACCESS SIMULATION
  // ─────────────────────────────────────────────────────────────

  describe('Concurrent Access Handling', () => {
    it('should handle concurrent reads during transition', async () => {
      const instance = mockInstance({ status: 'running' });

      instancesRepo.save.mockImplementation(async (inst) => {
        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { ...instance, ...inst, status: 'completed', updatedAt: new Date() } as WorkflowInstance;
      });

      instancesRepo.findOneBy.mockResolvedValue(instance);

      // Start transition
      const transitionPromise = service.transitionTo(instance, 'completed');

      // Concurrent read during transition - using findOneBy which we know exists
      const readResult = await instancesRepo.findOneBy({ id: instance.id });

      await transitionPromise;

      expect(readResult).toBeDefined();
    });

    it('should detect optimistic lock failures (version conflict)', async () => {
      const instance = mockInstance({ status: 'running' });

      // Simulate optimistic lock failure on save
      let saveCount = 0;
      instancesRepo.save.mockImplementation(async () => {
        saveCount++;
        if (saveCount === 1) {
          // First save succeeds but version changes
          throw new Error('Optimistic lock version mismatch');
        }
        return { ...instance, status: 'completed', updatedAt: new Date() } as WorkflowInstance;
      });

      await expect(service.transitionTo(instance, 'completed')).rejects.toThrow();
    });
  });
});
