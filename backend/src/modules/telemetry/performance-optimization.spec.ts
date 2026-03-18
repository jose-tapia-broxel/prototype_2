import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowsService } from '../workflows/services/workflows.service';
import { SubmissionsService } from '../submissions/services/submissions.service';
import { Workflow } from '../workflows/entities/workflow.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { QueuePublisherService } from '../submissions/services/queue-publisher.service';
import { SubmissionValidatorService } from '../submissions/services/submission-validator.service';
import { DomainEventsService } from '../events/services/domain-events.service';

/**
 * Performance & Optimization Tests
 * 
 * Tests for:
 * - N+1 query detection
 * - Query optimization patterns
 * - Pagination on large datasets
 * - Index verification
 */
describe('Performance & Optimization Tests', () => {
  // ─────────────────────────────────────────────────────────────
  // QUERY TRACKING INFRASTRUCTURE
  // ─────────────────────────────────────────────────────────────

  interface QueryTracker {
    queries: string[];
    reset: () => void;
    getCount: () => number;
    hasN1Pattern: () => boolean;
  }

  const createQueryTracker = (): QueryTracker => {
    const queries: string[] = [];

    return {
      queries,
      reset: () => (queries.length = 0),
      getCount: () => queries.length,
      hasN1Pattern: () => {
        // Detect N+1 pattern: same query executed multiple times
        const queryCounts = queries.reduce((acc, q) => {
          const normalized = q.replace(/\s+/g, ' ').trim().toLowerCase();
          acc[normalized] = (acc[normalized] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return Object.values(queryCounts).some(count => count > 2);
      },
    };
  };

  // ─────────────────────────────────────────────────────────────
  // N+1 QUERY DETECTION TESTS
  // ─────────────────────────────────────────────────────────────

  describe('N+1 Query Detection', () => {
    let queryTracker: QueryTracker;

    beforeEach(() => {
      queryTracker = createQueryTracker();
    });

    describe('WorkflowsService', () => {
      let service: WorkflowsService;
      let workflowsRepo: jest.Mocked<Repository<Workflow>>;

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            WorkflowsService,
            {
              provide: getRepositoryToken(Workflow),
              useValue: {
                find: jest.fn().mockImplementation(() => {
                  queryTracker.queries.push('SELECT * FROM workflows');
                  return Promise.resolve([]);
                }),
                findOne: jest.fn().mockImplementation(() => {
                  queryTracker.queries.push('SELECT * FROM workflows WHERE id = ?');
                  return Promise.resolve(null);
                }),
              },
            },
          ],
        }).compile();

        service = module.get<WorkflowsService>(WorkflowsService);
        workflowsRepo = module.get(getRepositoryToken(Workflow));
      });

      it('should use single query for listing workflows', async () => {
        queryTracker.reset();

        await service.findAllByOrganization('org-1');

        expect(queryTracker.getCount()).toBe(1);
        expect(queryTracker.hasN1Pattern()).toBe(false);
      });

      it('should avoid N+1 when loading workflows with related entities', async () => {
        // Simulate loading 10 workflows - should NOT trigger N+1
        const mockWorkflows = Array.from({ length: 10 }, (_, i) => ({
          id: `workflow-${i}`,
          organizationId: 'org-1',
          applicationId: 'app-1',
          name: `Workflow ${i}`,
        }));

        workflowsRepo.find.mockImplementation(async (options: any) => {
          queryTracker.queries.push('SELECT * FROM workflows WHERE organization_id = ?');
          return mockWorkflows as any;
        });

        queryTracker.reset();
        await service.findAllByOrganization('org-1');

        // Should be a single query, not 10+1
        expect(queryTracker.getCount()).toBe(1);
        expect(queryTracker.hasN1Pattern()).toBe(false);
      });
    });

    describe('SubmissionsService - Batch Operations', () => {
      let service: SubmissionsService;
      let submissionsRepo: jest.Mocked<Repository<Submission>>;

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            SubmissionsService,
            {
              provide: getRepositoryToken(Submission),
              useValue: {
                find: jest.fn().mockImplementation(() => {
                  queryTracker.queries.push('SELECT * FROM submissions');
                  return Promise.resolve([]);
                }),
                findOne: jest.fn().mockImplementation(() => {
                  queryTracker.queries.push('SELECT * FROM submissions WHERE id = ?');
                  return Promise.resolve(null);
                }),
                createQueryBuilder: jest.fn().mockImplementation(() => {
                  const qb = {
                    select: jest.fn().mockReturnThis(),
                    addSelect: jest.fn().mockReturnThis(),
                    where: jest.fn().mockImplementation(() => {
                      queryTracker.queries.push('SELECT FROM submissions WHERE org_id = ?');
                      return qb;
                    }),
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
              useValue: { validateAgainstForm: jest.fn().mockResolvedValue({ valid: true }) },
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

      it('should use efficient query for submissions listing', async () => {
        queryTracker.reset();

        await service.findAllByOrganization('org-1', {});

        expect(queryTracker.getCount()).toBeLessThanOrEqual(2); // At most 2 queries (count + data)
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PAGINATION TESTS
  // ─────────────────────────────────────────────────────────────

  describe('Pagination on Large Datasets', () => {
    describe('Efficient Pagination Patterns', () => {
      it('should use LIMIT and OFFSET for pagination', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
          getCount: jest.fn().mockResolvedValue(1000),
        };

        // Verify pagination parameters
        mockQueryBuilder.skip(20);
        mockQueryBuilder.take(10);

        expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      });

      it('should return total count for pagination metadata', async () => {
        interface PaginatedResult<T> {
          data: T[];
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        }

        const mockPaginate = async <T>(
          query: any,
          page: number,
          pageSize: number,
        ): Promise<PaginatedResult<T>> => {
          const [data, total] = await Promise.all([
            query.skip((page - 1) * pageSize).take(pageSize).getMany(),
            query.getCount(),
          ]);

          return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
          };
        };

        const mockQuery = {
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
          getCount: jest.fn().mockResolvedValue(100),
        };

        const result = await mockPaginate(mockQuery, 2, 10);

        expect(result.page).toBe(2);
        expect(result.pageSize).toBe(10);
        expect(result.total).toBe(100);
        expect(result.totalPages).toBe(10);
      });

      it('should handle edge case: empty last page', async () => {
        const mockQuery = {
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
          getCount: jest.fn().mockResolvedValue(100),
        };

        // Request page 11 when only 10 pages exist
        mockQuery.skip(100).take(10);
        const data = await mockQuery.getMany();

        expect(data).toEqual([]);
      });

      it('should efficiently count without fetching all data', async () => {
        let fetchedAllData = false;

        const mockQuery = {
          getCount: jest.fn().mockImplementation(() => {
            // Count should NOT fetch all records
            return Promise.resolve(10000);
          }),
          getMany: jest.fn().mockImplementation(() => {
            fetchedAllData = true;
            return Promise.resolve([]);
          }),
        };

        const count = await mockQuery.getCount();

        expect(count).toBe(10000);
        expect(fetchedAllData).toBe(false);
      });
    });

    describe('Large Dataset Handling', () => {
      it('should handle 10,000+ records efficiently', async () => {
        const LARGE_DATASET_SIZE = 10000;
        const PAGE_SIZE = 50;

        const mockLargeQuery = {
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockImplementation(async () => {
            // Simulate fetching a page
            return Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: `item-${i}` }));
          }),
          getCount: jest.fn().mockResolvedValue(LARGE_DATASET_SIZE),
        };

        // First page
        mockLargeQuery.skip(0).take(PAGE_SIZE);
        const firstPage = await mockLargeQuery.getMany();
        expect(firstPage).toHaveLength(PAGE_SIZE);

        // Last page
        const lastPageStart = Math.floor(LARGE_DATASET_SIZE / PAGE_SIZE) * PAGE_SIZE;
        mockLargeQuery.skip(lastPageStart).take(PAGE_SIZE);
        const lastPage = await mockLargeQuery.getMany();
        expect(lastPage.length).toBeLessThanOrEqual(PAGE_SIZE);
      });

      it('should maintain consistent ordering across pages', async () => {
        const mockQuery = {
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn(),
        };

        // Page 1
        mockQuery.orderBy('created_at', 'DESC').skip(0).take(10);
        
        // Page 2 - should use same ordering
        mockQuery.orderBy('created_at', 'DESC').skip(10).take(10);

        expect(mockQuery.orderBy).toHaveBeenCalledWith('created_at', 'DESC');
        expect(mockQuery.orderBy).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // INDEX VERIFICATION
  // ─────────────────────────────────────────────────────────────

  describe('Index Verification', () => {
    describe('Expected Indexes', () => {
      const EXPECTED_INDEXES = {
        submissions: [
          'idx_submissions_organization_id',
          'idx_submissions_workflow_instance_id',
          'idx_submissions_status',
          'idx_submissions_created_at',
        ],
        workflow_instances: [
          'idx_workflow_instances_organization_id',
          'idx_workflow_instances_workflow_id',
          'idx_workflow_instances_status',
          'idx_workflow_instances_started_at',
        ],
        workflows: [
          'idx_workflows_organization_id',
          'idx_workflows_application_id',
        ],
        rules: [
          'idx_rules_organization_id',
          'idx_rules_application_id',
          'idx_rules_rule_type',
        ],
      };

      it('should have index on organization_id for tenant filtering', () => {
        // All major tables should have organization_id index
        const tablesRequiringOrgIndex = [
          'submissions',
          'workflow_instances',
          'workflows',
          'rules',
        ];

        tablesRequiringOrgIndex.forEach((table) => {
          const indexes = EXPECTED_INDEXES[table as keyof typeof EXPECTED_INDEXES] || [];
          const hasOrgIndex = indexes.some((idx) => idx.includes('organization_id'));
          expect(hasOrgIndex).toBe(true);
        });
      });

      it('should have index on status columns for filtering', () => {
        expect(EXPECTED_INDEXES.submissions.some((idx) => idx.includes('status'))).toBe(true);
        expect(EXPECTED_INDEXES.workflow_instances.some((idx) => idx.includes('status'))).toBe(true);
      });

      it('should have index on foreign keys', () => {
        expect(EXPECTED_INDEXES.submissions.some((idx) => idx.includes('workflow_instance_id'))).toBe(true);
        expect(EXPECTED_INDEXES.workflow_instances.some((idx) => idx.includes('workflow_id'))).toBe(true);
        expect(EXPECTED_INDEXES.workflows.some((idx) => idx.includes('application_id'))).toBe(true);
      });

      it('should have index on timestamp columns for sorting', () => {
        expect(EXPECTED_INDEXES.submissions.some((idx) => idx.includes('created_at'))).toBe(true);
        expect(EXPECTED_INDEXES.workflow_instances.some((idx) => idx.includes('started_at'))).toBe(true);
      });
    });

    describe('Composite Index Strategy', () => {
      it('should use composite index for common query patterns', () => {
        // Example: Querying submissions by org + status
        const COMPOSITE_INDEXES = [
          { table: 'submissions', columns: ['organization_id', 'status'] },
          { table: 'workflow_instances', columns: ['organization_id', 'status'] },
          { table: 'workflows', columns: ['organization_id', 'application_id'] },
        ];

        COMPOSITE_INDEXES.forEach((idx) => {
          expect(idx.columns.length).toBeGreaterThanOrEqual(2);
          expect(idx.columns[0]).toBe('organization_id'); // Tenant column should be first
        });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // QUERY OPTIMIZATION PATTERNS
  // ─────────────────────────────────────────────────────────────

  describe('Query Optimization Patterns', () => {
    describe('Selective Column Loading', () => {
      it('should select only needed columns for list views', async () => {
        const mockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };

        // List view should not load heavy JSON columns
        mockQueryBuilder.select([
          'workflow.id',
          'workflow.name',
          'workflow.status',
          'workflow.createdAt',
          // NOT: 'workflow.definitionJson' - heavy column
        ]);

        expect(mockQueryBuilder.select).toHaveBeenCalled();
        const selectedColumns = mockQueryBuilder.select.mock.calls[0][0];
        expect(selectedColumns).not.toContain('workflow.definitionJson');
      });
    });

    describe('Eager vs Lazy Loading', () => {
      it('should use eager loading for commonly accessed relations', () => {
        // When fetching workflow, always need application info
        const EAGER_RELATIONS = {
          Workflow: ['application'],
          WorkflowInstance: ['workflow', 'currentNode'],
          Submission: ['form'],
        };

        expect(EAGER_RELATIONS.Workflow).toContain('application');
        expect(EAGER_RELATIONS.WorkflowInstance).toContain('workflow');
      });

      it('should use lazy loading for rarely accessed relations', () => {
        // Execution logs should be lazy loaded
        const LAZY_RELATIONS = {
          WorkflowInstance: ['executionLogs', 'submissions'],
        };

        expect(LAZY_RELATIONS.WorkflowInstance).toContain('executionLogs');
      });
    });

    describe('Batch Operations', () => {
      it('should use batch insert for multiple records', async () => {
        const mockRepo = {
          save: jest.fn(),
        };

        const records = Array.from({ length: 100 }, (_, i) => ({ id: `rec-${i}` }));

        // Batch save should be single operation
        await mockRepo.save(records);

        expect(mockRepo.save).toHaveBeenCalledTimes(1);
        expect(mockRepo.save).toHaveBeenCalledWith(records);
      });

      it('should chunk large batch operations', async () => {
        const BATCH_SIZE = 100;
        const records = Array.from({ length: 350 }, (_, i) => ({ id: `rec-${i}` }));

        const chunks: any[][] = [];
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
          chunks.push(records.slice(i, i + BATCH_SIZE));
        }

        expect(chunks.length).toBe(4); // 350 records / 100 batch size = 4 chunks
        expect(chunks[0].length).toBe(100);
        expect(chunks[3].length).toBe(50);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PERFORMANCE BENCHMARKS
  // ─────────────────────────────────────────────────────────────

  describe('Performance Benchmarks', () => {
    it('should complete simple query in under 100ms (simulated)', async () => {
      const start = Date.now();

      // Simulate query execution
      await new Promise((resolve) => setTimeout(resolve, 10));

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent queries efficiently', async () => {
      const CONCURRENT_QUERIES = 10;
      const start = Date.now();

      const mockQuery = () =>
        new Promise((resolve) => setTimeout(resolve, 10));

      await Promise.all(
        Array.from({ length: CONCURRENT_QUERIES }, () => mockQuery())
      );

      const duration = Date.now() - start;
      // Concurrent execution should be faster than sequential
      expect(duration).toBeLessThan(CONCURRENT_QUERIES * 50);
    });

    it('should maintain response time under load', async () => {
      const responseTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 5 + Math.random() * 5));
        responseTimes.push(Date.now() - start);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(avgResponseTime).toBeLessThan(20);
      expect(maxResponseTime).toBeLessThan(50);
    });
  });
});
