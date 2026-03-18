import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubmissionsService, SubmissionIngestResult } from './submissions.service';
import { Submission, SubmissionStatus } from '../entities/submission.entity';
import { QueuePublisherService } from './queue-publisher.service';
import { SubmissionValidatorService } from './submission-validator.service';
import { DomainEventsService } from '../../events/services/domain-events.service';

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let submissionsRepo: jest.Mocked<Repository<Submission>>;
  let queuePublisher: jest.Mocked<QueuePublisherService>;
  let validator: jest.Mocked<SubmissionValidatorService>;
  let eventsService: jest.Mocked<DomainEventsService>;

  // ─────────────────────────────────────────────────────────────
  // TEST DATA FACTORIES
  // ─────────────────────────────────────────────────────────────

  const mockSubmission = (overrides: Partial<Submission> = {}): Submission => ({
    id: 'submission-1',
    organizationId: 'org-1',
    applicationId: 'app-1',
    workflowInstanceId: 'instance-1',
    formId: 'form-1',
    nodeId: 'node-1',
    submittedBy: 'user-1',
    dataJson: { name: 'John', email: 'john@example.com' },
    status: 'pending' as SubmissionStatus,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    processedAt: undefined,
    ...overrides,
  });

  const mockCreateDto = (overrides: Record<string, unknown> = {}) => ({
    organizationId: 'org-1',
    applicationId: 'app-1',
    workflowInstanceId: 'instance-1',
    formId: 'form-1',
    nodeId: 'node-1',
    submittedBy: 'user-1',
    payload: { name: 'John', email: 'john@example.com' },
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: getRepositoryToken(Submission),
          useValue: {
            create: jest.fn((data) => ({ id: 'new-submission-id', createdAt: new Date(), ...data })),
            save: jest.fn((submission) => Promise.resolve(submission)),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            findOneByOrFail: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
              getMany: jest.fn().mockResolvedValue([]),
              getCount: jest.fn().mockResolvedValue(0),
            })),
          },
        },
        {
          provide: QueuePublisherService,
          useValue: {
            publish: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SubmissionValidatorService,
          useValue: {
            validateAgainstForm: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
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

    service = module.get<SubmissionsService>(SubmissionsService);
    submissionsRepo = module.get(getRepositoryToken(Submission));
    queuePublisher = module.get(QueuePublisherService);
    validator = module.get(SubmissionValidatorService);
    eventsService = module.get(DomainEventsService);
  });

  // ─────────────────────────────────────────────────────────────
  // DB → SERVICE → CONTROLLER FLOW TESTS
  // ─────────────────────────────────────────────────────────────

  describe('Ingestion Pipeline', () => {
    describe('ingest()', () => {
      it('should create submission, publish to queue, and emit event for valid input', async () => {
        const dto = mockCreateDto();
        
        const result = await service.ingest(dto);

        expect(result.status).toBe('pending');
        expect(result.submissionId).toBeDefined();
        expect(result.validationErrors).toBeUndefined();

        // Verify DB save was called
        expect(submissionsRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: dto.organizationId,
            applicationId: dto.applicationId,
            dataJson: dto.payload,
            status: 'pending',
          }),
        );
        expect(submissionsRepo.save).toHaveBeenCalled();

        // Verify queue publication
        expect(queuePublisher.publish).toHaveBeenCalledWith(
          'submissions.process',
          expect.objectContaining({
            submissionId: expect.any(String),
            organizationId: dto.organizationId,
            payload: dto.payload,
          }),
        );

        // Verify domain event emitted
        expect(eventsService.emit).toHaveBeenCalledWith(
          'submission.ingested',
          expect.objectContaining({
            organizationId: dto.organizationId,
          }),
        );
      });

      it('should reject submission when form validation fails', async () => {
        const dto = mockCreateDto();
        const validationErrors = [
          { field: 'email', message: 'Invalid email format', code: 'INVALID_FORMAT' },
        ];

        validator.validateAgainstForm.mockResolvedValueOnce({
          valid: false,
          errors: validationErrors,
        });

        const result = await service.ingest(dto);

        expect(result.status).toBe('rejected');
        expect(result.validationErrors).toEqual(validationErrors);

        // Verify rejection event emitted
        expect(eventsService.emit).toHaveBeenCalledWith(
          'submission.rejected',
          expect.objectContaining({
            reason: 'validation_failed',
            errors: validationErrors,
          }),
        );

        // Should NOT publish to processing queue
        expect(queuePublisher.publish).not.toHaveBeenCalled();
      });

      it('should skip validation when no formId is provided', async () => {
        const dto = mockCreateDto({ formId: undefined });

        await service.ingest(dto);

        expect(validator.validateAgainstForm).not.toHaveBeenCalled();
        expect(queuePublisher.publish).toHaveBeenCalled();
      });

      it('should handle concurrent submissions for same workflow instance', async () => {
        const dtos = [
          mockCreateDto({ payload: { step: 1 } }),
          mockCreateDto({ payload: { step: 2 } }),
          mockCreateDto({ payload: { step: 3 } }),
        ];

        let submissionCount = 0;
        submissionsRepo.create.mockImplementation((data: any) => ({
          id: `submission-${++submissionCount}`,
          createdAt: new Date(),
          ...data,
        } as any));

        const results = await Promise.all(dtos.map((dto) => service.ingest(dto)));

        expect(results).toHaveLength(3);
        results.forEach((result) => {
          expect(result.status).toBe('pending');
          expect(result.submissionId).toBeDefined();
        });

        expect(queuePublisher.publish).toHaveBeenCalledTimes(3);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // STATUS TRANSITIONS
  // ─────────────────────────────────────────────────────────────

  describe('Status Transitions', () => {
    describe('markProcessing()', () => {
      it('should transition from pending to processing', async () => {
        const submission = mockSubmission({ status: 'pending' });
        submissionsRepo.findOneBy = jest.fn().mockResolvedValue(submission);
        submissionsRepo.save.mockImplementation((s: any) => Promise.resolve({ ...s, status: 'processing' } as any));

        const result = await service.markProcessing(submission.id);

        expect(result.status).toBe('processing');
        expect(eventsService.emit).toHaveBeenCalledWith(
          'submission.processing',
          expect.objectContaining({ submissionId: submission.id }),
        );
      });

      it('should throw when transitioning from invalid status', async () => {
        const submission = mockSubmission({ status: 'completed' });
        submissionsRepo.findOneBy = jest.fn().mockResolvedValue(submission);

        await expect(service.markProcessing(submission.id)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('markCompleted()', () => {
      it('should transition from processing to completed', async () => {
        const submission = mockSubmission({ status: 'processing' });
        submissionsRepo.findOneBy = jest.fn().mockResolvedValue(submission);
        submissionsRepo.save.mockImplementation((s: any) => Promise.resolve({ 
          ...s, 
          status: 'completed',
          processedAt: new Date(),
        } as any));

        const result = await service.markCompleted(submission.id, { outcome: 'approved' });

        expect(result.status).toBe('completed');
        expect(result.processedAt).toBeDefined();
        expect(eventsService.emit).toHaveBeenCalledWith(
          'submission.completed',
          expect.objectContaining({ submissionId: submission.id }),
        );
      });
    });

    describe('markFailed()', () => {
      it('should transition from processing to failed with reason', async () => {
        const submission = mockSubmission({ status: 'processing' });
        const errorReason = 'Rule evaluation error';
        submissionsRepo.findOneBy = jest.fn().mockResolvedValue(submission);
        submissionsRepo.save.mockImplementation((s: any) => Promise.resolve({ 
          ...s, 
          status: 'failed',
          processedAt: new Date(),
        } as any));

        const result = await service.markFailed(submission.id, errorReason);

        expect(result.status).toBe('failed');
        expect(eventsService.emit).toHaveBeenCalledWith(
          'submission.failed',
          expect.objectContaining({ 
            submissionId: submission.id,
            error: errorReason,
          }),
        );
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // QUERY OPERATIONS
  // ─────────────────────────────────────────────────────────────

  describe('Query Operations', () => {
    describe('findAllByOrganization()', () => {
      it('should return submissions filtered by organization', async () => {
        const submissions = [
          mockSubmission({ id: 'sub-1' }),
          mockSubmission({ id: 'sub-2' }),
        ];
        const queryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(submissions),
        };
        submissionsRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

        const result = await service.findAllByOrganization('org-1', {});

        expect(result).toEqual(submissions);
        expect(queryBuilder.where).toHaveBeenCalledWith(
          'submission.organization_id = :organizationId',
          { organizationId: 'org-1' },
        );
      });

      it('should filter by status when provided', async () => {
        const queryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };
        submissionsRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

        await service.findAllByOrganization('org-1', { status: 'completed' });

        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'submission.status = :status',
          { status: 'completed' },
        );
      });

      it('should filter by workflowInstanceId when provided', async () => {
        const queryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };
        submissionsRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

        await service.findAllByOrganization('org-1', { workflowInstanceId: 'instance-1' });

        expect(queryBuilder.andWhere).toHaveBeenCalledWith(
          'submission.workflow_instance_id = :instanceId',
          { instanceId: 'instance-1' },
        );
      });
    });

    describe('findByWorkflowInstance()', () => {
      it('should return all submissions for a workflow instance', async () => {
        const submissions = [
          mockSubmission({ id: 'sub-1', nodeId: 'node-1' }),
          mockSubmission({ id: 'sub-2', nodeId: 'node-2' }),
        ];
        submissionsRepo.find.mockResolvedValue(submissions);

        const result = await service.findByWorkflowInstance('instance-1');

        expect(result).toEqual(submissions);
      });
    });

    describe('getStats()', () => {
      it('should return aggregated submission statistics', async () => {
        const mockStats = [
          { status: 'pending', count: '5' },
          { status: 'completed', count: '10' },
          { status: 'failed', count: '2' },
        ];

        const queryBuilder = {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue(mockStats),
        };
        submissionsRepo.createQueryBuilder.mockReturnValue(queryBuilder as any);

        const stats = await service.getStats('org-1');

        expect(stats).toEqual({
          total: 17,
          pending: 5,
          processing: 0,
          completed: 10,
          failed: 2,
          rejected: 0,
        });
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // ERROR HANDLING
  // ─────────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('should throw NotFoundException for non-existent submission', async () => {
      submissionsRepo.findOneBy = jest.fn().mockResolvedValue(null);

      await expect(service.findByIdOrFail('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle database errors gracefully', async () => {
      submissionsRepo.save.mockRejectedValueOnce(new Error('Database connection error'));

      const dto = mockCreateDto();
      await expect(service.ingest(dto)).rejects.toThrow('Database connection error');
    });

    it('should handle queue publishing failures', async () => {
      queuePublisher.publish.mockRejectedValueOnce(new Error('Queue unavailable'));

      const dto = mockCreateDto();
      await expect(service.ingest(dto)).rejects.toThrow('Queue unavailable');
    });
  });
});
