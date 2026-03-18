import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission, SubmissionStatus } from '../entities/submission.entity';
import { CreateSubmissionDto } from '../dto/create-submission.dto';
import { QueuePublisherService } from './queue-publisher.service';
import { SubmissionValidatorService } from './submission-validator.service';
import { DomainEventsService } from '../../events/services/domain-events.service';

export interface SubmissionIngestResult {
  submissionId: string;
  status: SubmissionStatus;
  validationErrors?: Array<{ field: string; message: string; code: string }>;
}

export interface SubmissionQueryFilters {
  status?: SubmissionStatus;
  workflowInstanceId?: string;
  formId?: string;
  fromDate?: Date;
  toDate?: Date;
}

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionsRepo: Repository<Submission>,
    private readonly queuePublisher: QueuePublisherService,
    private readonly validator: SubmissionValidatorService,
    private readonly events: DomainEventsService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // INGESTION PIPELINE
  // ─────────────────────────────────────────────────────────────

  /**
   * Ingest a new submission - validates and queues for processing
   * Status: pending → (queue) → processing
   */
  async ingest(dto: CreateSubmissionDto): Promise<SubmissionIngestResult> {
    // Step 1: Validate against form schema if formId is provided
    if (dto.formId) {
      const validation = await this.validator.validateAgainstForm(
        dto.formId,
        dto.organizationId,
        dto.payload,
      );

      if (!validation.valid) {
        // Create submission with failed status
        const submission = await this.submissionsRepo.save(
          this.submissionsRepo.create({
            organizationId: dto.organizationId,
            applicationId: dto.applicationId,
            workflowInstanceId: dto.workflowInstanceId,
            formId: dto.formId,
            nodeId: dto.nodeId,
            submittedBy: dto.submittedBy,
            dataJson: dto.payload,
            status: 'rejected',
            processedAt: new Date(),
          }),
        );

        await this.events.emit('submission.rejected', {
          organizationId: dto.organizationId,
          submissionId: submission.id,
          workflowInstanceId: dto.workflowInstanceId,
          reason: 'validation_failed',
          errors: validation.errors,
          timestamp: new Date().toISOString(),
        });

        return {
          submissionId: submission.id,
          status: 'rejected',
          validationErrors: validation.errors,
        };
      }
    }

    // Step 2: Create submission record with pending status
    const submission = await this.submissionsRepo.save(
      this.submissionsRepo.create({
        organizationId: dto.organizationId,
        applicationId: dto.applicationId,
        workflowInstanceId: dto.workflowInstanceId,
        formId: dto.formId,
        nodeId: dto.nodeId,
        submittedBy: dto.submittedBy,
        dataJson: dto.payload,
        status: 'pending',
      }),
    );

    // Step 3: Publish to processing queue
    await this.queuePublisher.publish('submissions.process', {
      submissionId: submission.id,
      organizationId: dto.organizationId,
      applicationId: dto.applicationId,
      workflowInstanceId: dto.workflowInstanceId,
      formId: dto.formId,
      nodeId: dto.nodeId,
      payload: dto.payload,
      receivedAt: submission.createdAt.toISOString(),
    });

    await this.events.emit('submission.ingested', {
      organizationId: dto.organizationId,
      submissionId: submission.id,
      workflowInstanceId: dto.workflowInstanceId,
      timestamp: new Date().toISOString(),
    });

    return {
      submissionId: submission.id,
      status: 'pending',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // STATUS TRANSITIONS
  // ─────────────────────────────────────────────────────────────

  /**
   * Transition submission to processing status
   */
  async markProcessing(submissionId: string): Promise<Submission> {
    const submission = await this.findByIdOrFail(submissionId);

    if (submission.status !== 'pending') {
      throw new BadRequestException(
        `Cannot transition from ${submission.status} to processing`,
      );
    }

    submission.status = 'processing';
    await this.submissionsRepo.save(submission);

    await this.events.emit('submission.processing', {
      organizationId: submission.organizationId,
      submissionId: submission.id,
      workflowInstanceId: submission.workflowInstanceId,
      timestamp: new Date().toISOString(),
    });

    return submission;
  }

  /**
   * Transition submission to completed status
   */
  async markCompleted(
    submissionId: string,
    result?: Record<string, unknown>,
  ): Promise<Submission> {
    const submission = await this.findByIdOrFail(submissionId);

    if (submission.status !== 'processing') {
      throw new BadRequestException(
        `Cannot transition from ${submission.status} to completed`,
      );
    }

    submission.status = 'completed';
    submission.processedAt = new Date();

    if (result) {
      submission.dataJson = {
        ...submission.dataJson,
        _processingResult: result,
      };
    }

    await this.submissionsRepo.save(submission);

    await this.events.emit('submission.completed', {
      organizationId: submission.organizationId,
      submissionId: submission.id,
      workflowInstanceId: submission.workflowInstanceId,
      timestamp: new Date().toISOString(),
    });

    return submission;
  }

  /**
   * Transition submission to failed status
   */
  async markFailed(submissionId: string, error: string): Promise<Submission> {
    const submission = await this.findByIdOrFail(submissionId);

    if (submission.status !== 'processing' && submission.status !== 'pending') {
      throw new BadRequestException(
        `Cannot transition from ${submission.status} to failed`,
      );
    }

    submission.status = 'failed';
    submission.processedAt = new Date();
    submission.dataJson = {
      ...submission.dataJson,
      _error: error,
    };

    await this.submissionsRepo.save(submission);

    await this.events.emit('submission.failed', {
      organizationId: submission.organizationId,
      submissionId: submission.id,
      workflowInstanceId: submission.workflowInstanceId,
      error,
      timestamp: new Date().toISOString(),
    });

    return submission;
  }

  /**
   * Transition submission to rejected status
   */
  async markRejected(submissionId: string, reason: string): Promise<Submission> {
    const submission = await this.findByIdOrFail(submissionId);

    if (submission.status !== 'processing') {
      throw new BadRequestException(
        `Cannot transition from ${submission.status} to rejected`,
      );
    }

    submission.status = 'rejected';
    submission.processedAt = new Date();
    submission.dataJson = {
      ...submission.dataJson,
      _rejectionReason: reason,
    };

    await this.submissionsRepo.save(submission);

    await this.events.emit('submission.rejected', {
      organizationId: submission.organizationId,
      submissionId: submission.id,
      workflowInstanceId: submission.workflowInstanceId,
      reason,
      timestamp: new Date().toISOString(),
    });

    return submission;
  }

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async findById(id: string): Promise<Submission | null> {
    return this.submissionsRepo.findOneBy({ id });
  }

  async findByIdOrFail(id: string): Promise<Submission> {
    const submission = await this.submissionsRepo.findOneBy({ id });
    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }
    return submission;
  }

  async findByIdAndOrg(id: string, organizationId: string): Promise<Submission | null> {
    return this.submissionsRepo.findOneBy({ id, organizationId });
  }

  async findByIdAndOrgOrFail(id: string, organizationId: string): Promise<Submission> {
    const submission = await this.submissionsRepo.findOneBy({ id, organizationId });
    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }
    return submission;
  }

  async findAllByOrganization(
    organizationId: string,
    filters?: SubmissionQueryFilters,
  ): Promise<Submission[]> {
    const queryBuilder = this.submissionsRepo
      .createQueryBuilder('submission')
      .where('submission.organization_id = :organizationId', { organizationId });

    if (filters?.status) {
      queryBuilder.andWhere('submission.status = :status', { status: filters.status });
    }

    if (filters?.workflowInstanceId) {
      queryBuilder.andWhere('submission.workflow_instance_id = :instanceId', {
        instanceId: filters.workflowInstanceId,
      });
    }

    if (filters?.formId) {
      queryBuilder.andWhere('submission.form_id = :formId', { formId: filters.formId });
    }

    if (filters?.fromDate) {
      queryBuilder.andWhere('submission.created_at >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters?.toDate) {
      queryBuilder.andWhere('submission.created_at <= :toDate', { toDate: filters.toDate });
    }

    return queryBuilder.orderBy('submission.created_at', 'DESC').getMany();
  }

  async findByWorkflowInstance(workflowInstanceId: string): Promise<Submission[]> {
    return this.submissionsRepo.find({
      where: { workflowInstanceId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingSubmissions(limit = 100): Promise<Submission[]> {
    return this.submissionsRepo.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // STATISTICS
  // ─────────────────────────────────────────────────────────────

  async getStats(organizationId: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    rejected: number;
  }> {
    const result = await this.submissionsRepo
      .createQueryBuilder('submission')
      .select('submission.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('submission.organization_id = :organizationId', { organizationId })
      .groupBy('submission.status')
      .getRawMany();

    const stats = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      rejected: 0,
    };

    for (const row of result) {
      const count = parseInt(row.count, 10);
      stats[row.status as SubmissionStatus] = count;
      stats.total += count;
    }

    return stats;
  }
}
