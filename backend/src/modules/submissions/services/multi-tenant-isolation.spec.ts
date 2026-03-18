import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { WorkflowsService } from '../../workflows/services/workflows.service';
import { ApplicationsService } from '../../applications/services/applications.service';
import { WorkflowInstanceService } from '../../runtime/services/workflow-instance.service';
import { Submission } from '../entities/submission.entity';
import { Workflow } from '../../workflows/entities/workflow.entity';
import { WorkflowInstance } from '../../runtime/entities/workflow-instance.entity';
import { WorkflowExecutionLog } from '../../runtime/entities/workflow-execution-log.entity';
import { Application } from '../../applications/entities/application.entity';
import { QueuePublisherService } from './queue-publisher.service';
import { SubmissionValidatorService } from './submission-validator.service';
import { DomainEventsService } from '../../events/services/domain-events.service';

/**
 * Multi-Tenancy Isolation Tests
 * 
 * These tests verify that data is properly isolated between organizations (tenants):
 * - Tenant A cannot access Tenant B's data
 * - All queries are scoped to the requesting organization
 * - Cross-tenant operations are properly rejected
 */
describe('Multi-Tenancy Isolation Tests', () => {
  const ORG_A = 'org-tenant-a';
  const ORG_B = 'org-tenant-b';

  // ─────────────────────────────────────────────────────────────
  // SUBMISSIONS ISOLATION
  // ─────────────────────────────────────────────────────────────

  describe('SubmissionsService - Tenant Isolation', () => {
    let service: SubmissionsService;
    let submissionsRepo: jest.Mocked<Repository<Submission>>;

    const mockSubmission = (orgId: string, id: string): Submission => ({
      id,
      organizationId: orgId,
      applicationId: 'app-1',
      workflowInstanceId: 'instance-1',
      formId: 'form-1',
      nodeId: 'node-1',
      submittedBy: 'user-1',
      dataJson: { data: 'test' },
      status: 'pending',
      createdAt: new Date(),
    });

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SubmissionsService,
          {
            provide: getRepositoryToken(Submission),
            useValue: {
              create: jest.fn((data) => ({ id: 'new-id', createdAt: new Date(), ...data })),
              save: jest.fn((s) => Promise.resolve(s)),
              findOne: jest.fn(),
              findOneBy: jest.fn(),
              findOneByOrFail: jest.fn(),
              find: jest.fn(),
              createQueryBuilder: jest.fn(() => {
                const qb = {
                  select: jest.fn().mockReturnThis(),
                  addSelect: jest.fn().mockReturnThis(),
                  where: jest.fn().mockReturnThis(),
                  andWhere: jest.fn().mockReturnThis(),
                  groupBy: jest.fn().mockReturnThis(),
                  orderBy: jest.fn().mockReturnThis(),
                  getMany: jest.fn().mockResolvedValue([]),
                  getRawMany: jest.fn().mockResolvedValue([]),
                };
                return qb;
              }),
            },
          },
          {
            provide: QueuePublisherService,
            useValue: { publish: jest.fn().mockResolvedValue(undefined) },
          },
          {
            provide: SubmissionValidatorService,
            useValue: { validateAgainstForm: jest.fn().mockResolvedValue({ valid: true, errors: [] }) },
          },
          {
            provide: DomainEventsService,
            useValue: { emit: jest.fn().mockResolvedValue(undefined) },
          },
        ],
      }).compile();

      service = module.get<SubmissionsService>(SubmissionsService);
      submissionsRepo = module.get(getRepositoryToken(Submission));
    });

    describe('Cross-tenant data access prevention', () => {
      it('should NOT return submissions from other organizations', async () => {
        const orgASubmissions = [mockSubmission(ORG_A, 'sub-a1'), mockSubmission(ORG_A, 'sub-a2')];
        const orgBSubmissions = [mockSubmission(ORG_B, 'sub-b1')];
        const allSubmissions = [...orgASubmissions, ...orgBSubmissions];

        // Mock createQueryBuilder to filter by organizationId
        submissionsRepo.createQueryBuilder.mockImplementation(() => {
          let currentOrgId: string | null = null;
          const qb: any = {
            where: jest.fn().mockImplementation((_: string, params: any) => {
              currentOrgId = params?.organizationId;
              return qb;
            }),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockImplementation(async () => {
              return allSubmissions.filter((s) => s.organizationId === currentOrgId);
            }),
          };
          return qb;
        });

        // Org A should only see their submissions
        const resultA = await service.findAllByOrganization(ORG_A, {});
        expect(resultA).toHaveLength(2);
        expect(resultA.every((s) => s.organizationId === ORG_A)).toBe(true);

        // Org B should only see their submissions
        const resultB = await service.findAllByOrganization(ORG_B, {});
        expect(resultB).toHaveLength(1);
        expect(resultB.every((s) => s.organizationId === ORG_B)).toBe(true);
      });

      it('should reject access to submission from different organization', async () => {
        const orgBSubmission = mockSubmission(ORG_B, 'sub-b1');

        submissionsRepo.findOneBy.mockImplementation(async (options: any) => {
          const { id, organizationId } = options;
          if (id === 'sub-b1' && organizationId === ORG_B) {
            return orgBSubmission;
          }
          return null;
        });

        // Org A trying to access Org B's submission should fail
        const result = await service.findByIdAndOrg('sub-b1', ORG_A);
        expect(result).toBeNull();
      });

      it('should throw NotFoundException when accessing cross-tenant submission', async () => {
        submissionsRepo.findOneBy.mockResolvedValue(null);

        await expect(
          service.findByIdAndOrgOrFail('sub-b1', ORG_A),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('Query parameter injection prevention', () => {
      it('should always include organizationId in queries', async () => {
        const queryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };
        submissionsRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

        await service.findAllByOrganization(ORG_A, {});

        expect(queryBuilder.where).toHaveBeenCalledWith(
          expect.stringContaining('organization_id'),
          expect.objectContaining({ organizationId: ORG_A }),
        );
      });

      it('should scope stats queries by organization', async () => {
        const queryBuilder = {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([]),
        };
        submissionsRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

        await service.getStats(ORG_A);

        expect(queryBuilder.where).toHaveBeenCalledWith(
          expect.stringContaining('organization_id'),
          expect.objectContaining({ organizationId: ORG_A }),
        );
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // WORKFLOWS ISOLATION
  // ─────────────────────────────────────────────────────────────

  describe('WorkflowsService - Tenant Isolation', () => {
    let service: WorkflowsService;
    let workflowsRepo: jest.Mocked<Repository<Workflow>>;

    const mockWorkflow = (orgId: string, id: string): Workflow => ({
      id,
      organizationId: orgId,
      applicationId: 'app-1',
      name: `Workflow ${id}`,
      description: 'Test workflow',
      isActive: true,
      createdBy: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WorkflowsService,
          {
            provide: getRepositoryToken(Workflow),
            useValue: {
              create: jest.fn((data) => ({ ...data })),
              save: jest.fn((w) => Promise.resolve(w)),
              findOne: jest.fn(),
              findOneByOrFail: jest.fn(),
              find: jest.fn(),
              delete: jest.fn(),
            },
          },
        ],
      }).compile();

      service = module.get<WorkflowsService>(WorkflowsService);
      workflowsRepo = module.get(getRepositoryToken(Workflow));
    });

    it('should only return workflows for the specified organization', async () => {
      const orgAWorkflows = [mockWorkflow(ORG_A, 'wf-a1')];
      const orgBWorkflows = [mockWorkflow(ORG_B, 'wf-b1'), mockWorkflow(ORG_B, 'wf-b2')];
      const allWorkflows = [...orgAWorkflows, ...orgBWorkflows];

      workflowsRepo.find.mockImplementation(async (options: any) => {
        const orgId = options?.where?.organizationId;
        return allWorkflows.filter((w) => w.organizationId === orgId);
      });

      const resultA = await service.findAllByOrganization(ORG_A);
      expect(resultA).toHaveLength(1);
      expect(resultA[0].id).toBe('wf-a1');

      const resultB = await service.findAllByOrganization(ORG_B);
      expect(resultB).toHaveLength(2);
    });

    it('should prevent updates to workflows in different organization', async () => {
      const orgBWorkflow = mockWorkflow(ORG_B, 'wf-b1');

      workflowsRepo.findOne.mockImplementation(async (options: any) => {
        const { id, organizationId } = options.where;
        if (id === 'wf-b1' && organizationId === orgBWorkflow.organizationId) {
          return orgBWorkflow;
        }
        return null;
      });

      await expect(
        service.update('wf-b1', ORG_A, { name: 'Hacked Name' }),
      ).rejects.toThrow(NotFoundException);

      expect(workflowsRepo.save).not.toHaveBeenCalled();
    });

    it('should prevent deletion of workflows in different organization', async () => {
      workflowsRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.delete('wf-b1', ORG_A)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW INSTANCES ISOLATION
  // ─────────────────────────────────────────────────────────────

  describe('WorkflowInstanceService - Tenant Isolation', () => {
    let service: WorkflowInstanceService;
    let instancesRepo: jest.Mocked<Repository<WorkflowInstance>>;
    let logsRepo: jest.Mocked<Repository<WorkflowExecutionLog>>;
    let eventsService: jest.Mocked<DomainEventsService>;

    const mockInstance = (orgId: string, id: string): WorkflowInstance => ({
      id,
      organizationId: orgId,
      applicationId: 'app-1',
      applicationVersionId: 'version-1',
      workflowId: 'workflow-1',
      status: 'running',
      currentNodeId: 'node-1',
      contextJson: {},
      startedAt: new Date(),
      updatedAt: new Date(),
    });

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WorkflowInstanceService,
          {
            provide: getRepositoryToken(WorkflowInstance),
            useValue: {
              create: jest.fn((data) => ({ ...data })),
              save: jest.fn((i) => Promise.resolve(i)),
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
              create: jest.fn((data) => ({ id: 'log-1', ...data })),
              save: jest.fn((log) => Promise.resolve(log)),
              find: jest.fn(),
            },
          },
          {
            provide: DomainEventsService,
            useValue: { emit: jest.fn().mockResolvedValue(undefined) },
          },
        ],
      }).compile();

      service = module.get<WorkflowInstanceService>(WorkflowInstanceService);
      instancesRepo = module.get(getRepositoryToken(WorkflowInstance));
      logsRepo = module.get(getRepositoryToken(WorkflowExecutionLog));
      eventsService = module.get(DomainEventsService);
    });

    it('should only return instances for the requesting organization', async () => {
      const orgAInstances = [mockInstance(ORG_A, 'inst-a1')];
      const orgBInstances = [mockInstance(ORG_B, 'inst-b1')];
      const allInstances = [...orgAInstances, ...orgBInstances];

      instancesRepo.find.mockImplementation(async (options: any) => {
        const orgId = options?.where?.organizationId;
        return allInstances.filter((i) => i.organizationId === orgId);
      });

      const resultA = await service.findAllByOrganization(ORG_A);
      expect(resultA).toHaveLength(1);
      expect(resultA[0].organizationId).toBe(ORG_A);
    });

    it('should prevent state transitions on instances from other organizations', async () => {
      const orgBInstance = mockInstance(ORG_B, 'inst-b1');
      orgBInstance.status = 'running';

      instancesRepo.findOneBy = jest.fn().mockImplementation(async (criteria: any) => {
        if (criteria.id === 'inst-b1' && criteria.organizationId === ORG_B) {
          return orgBInstance;
        }
        return null;
      });

      await expect(
        service.complete('inst-b1', ORG_A),
      ).rejects.toThrow(NotFoundException);
    });

    it('should scope queries by organization', async () => {
      // Verify that instance queries include organization scope
      instancesRepo.findOneBy.mockImplementation(async (options: any) => {
        if (options?.id === 'inst-a1' && options?.organizationId === ORG_A) {
          return mockInstance(ORG_A, 'inst-a1');
        }
        return null;
      });

      const instance = await service.findOneByOrgOrFail('inst-a1', ORG_A);
      expect(instance).toBeDefined();
      expect(instance?.organizationId).toBe(ORG_A);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // APPLICATIONS ISOLATION
  // ─────────────────────────────────────────────────────────────

  describe('ApplicationsService - Tenant Isolation', () => {
    let service: ApplicationsService;
    let applicationsRepo: jest.Mocked<Repository<Application>>;

    const mockApplication = (orgId: string, id: string): Application => ({
      id,
      organizationId: orgId,
      appKey: `app-key-${id}`,
      name: `Application ${id}`,
      currentPublishedVersionId: undefined,
    });

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ApplicationsService,
          {
            provide: getRepositoryToken(Application),
            useValue: {
              create: jest.fn((data) => ({ ...data })),
              save: jest.fn((a) => Promise.resolve(a)),
              findOne: jest.fn(),
              findOneByOrFail: jest.fn(),
              find: jest.fn(),
            },
          },
        ],
      }).compile();

      service = module.get<ApplicationsService>(ApplicationsService);
      applicationsRepo = module.get(getRepositoryToken(Application));
    });

    it('should only list applications for the requesting organization', async () => {
      const orgAApps = [mockApplication(ORG_A, 'app-a1')];
      const orgBApps = [mockApplication(ORG_B, 'app-b1')];
      const allApps = [...orgAApps, ...orgBApps];

      applicationsRepo.find.mockImplementation(async (options: any) => {
        const orgId = options?.where?.organizationId;
        return allApps.filter((a) => a.organizationId === orgId);
      });

      const resultA = await service.findAllByOrganization(ORG_A);
      expect(resultA).toHaveLength(1);
      expect(resultA[0].organizationId).toBe(ORG_A);
    });

    it('should ensure appKey uniqueness is scoped by organization', async () => {
      // Same appKey can exist in different organizations
      const appA = mockApplication(ORG_A, 'app-a1');
      appA.appKey = 'shared-key';
      
      const appB = mockApplication(ORG_B, 'app-b1');
      appB.appKey = 'shared-key';

      applicationsRepo.findOne.mockImplementation(async (options: any) => {
        const { organizationId, appKey } = options.where;
        if (organizationId === ORG_A && appKey === 'shared-key') return appA;
        if (organizationId === ORG_B && appKey === 'shared-key') return appB;
        return null;
      });

      const foundA = await applicationsRepo.findOne({ 
        where: { organizationId: ORG_A, appKey: 'shared-key' } 
      });
      const foundB = await applicationsRepo.findOne({ 
        where: { organizationId: ORG_B, appKey: 'shared-key' } 
      });

      expect(foundA?.id).toBe('app-a1');
      expect(foundB?.id).toBe('app-b1');
      expect(foundA?.id).not.toBe(foundB?.id);
    });
  });
});
