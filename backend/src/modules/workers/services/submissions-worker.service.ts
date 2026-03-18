import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SubmissionsService } from '../../submissions/services/submissions.service';
import { ResponseStoreService } from '../../submissions/services/response-store.service';
import { RulesEngineService } from '../../rules/services/rules-engine.service';
import { WorkflowInstanceService } from '../../runtime/services/workflow-instance.service';
import { DomainEventsService } from '../../events/services/domain-events.service';
import { JobQueueService, Job } from './job-queue.service';
import { RuleEvaluationContext } from '../../rules/interfaces/rule-types';

interface SubmissionJobPayload {
  submissionId: string;
  organizationId: string;
  applicationId: string;
  workflowInstanceId?: string;
  formId?: string;
  nodeId?: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

interface ProcessingResult {
  success: boolean;
  contextUpdates?: Record<string, unknown>;
  routingDecision?: string;
  rejected?: { reason: string; errorCode?: string };
  error?: string;
}

@Injectable()
export class SubmissionsWorkerService implements OnModuleInit {
  private readonly logger = new Logger(SubmissionsWorkerService.name);

  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly responseStore: ResponseStoreService,
    private readonly rulesEngine: RulesEngineService,
    private readonly workflowInstanceService: WorkflowInstanceService,
    private readonly events: DomainEventsService,
    private readonly jobQueue: JobQueueService,
  ) {}

  onModuleInit() {
    // Register job handler for submission processing
    this.jobQueue.registerHandler<SubmissionJobPayload>('submissions.process', (job) =>
      this.processJob(job),
    );

    // Subscribe to job events for monitoring
    this.jobQueue.on('job:completed', (job) => {
      if (job.topic === 'submissions.process') {
        this.logger.debug(`Submission job ${job.id} completed`);
      }
    });

    this.jobQueue.on('job:failed', (job) => {
      if (job.topic === 'submissions.process') {
        this.logger.error(`Submission job ${job.id} failed: ${job.error}`);
      }
    });
  }

  /**
   * Process a single submission job from the queue
   */
  async processJob(job: Job<SubmissionJobPayload>): Promise<ProcessingResult> {
    const { submissionId, organizationId, applicationId, workflowInstanceId, nodeId, payload } =
      job.payload;

    this.logger.log(`Processing submission ${submissionId}`);

    // Step 1: Mark submission as processing
    await this.submissionsService.markProcessing(submissionId);

    try {
      // Step 2: Get workflow instance context if linked
      let workflowContext: Record<string, unknown> = {};
      let currentNodeId: string | undefined = nodeId;

      if (workflowInstanceId) {
        const instance = await this.workflowInstanceService.findOne(workflowInstanceId);
        workflowContext = instance.contextJson;
        currentNodeId = currentNodeId || instance.currentNodeId;
      }

      // Step 3: Build evaluation context
      const evaluationContext: RuleEvaluationContext = {
        submission: payload,
        workflowContext,
        system: {
          currentDate: new Date().toISOString().split('T')[0],
          currentTimestamp: Date.now(),
          workflowInstanceId,
          currentNodeId,
          applicationId,
        },
        variables: {},
      };

      // Step 4: Evaluate rules
      const ruleResult = await this.rulesEngine.evaluateApplicationRules(
        applicationId,
        organizationId,
        evaluationContext,
      );

      // Step 5: Handle rejection
      if (ruleResult.rejected) {
        await this.submissionsService.markRejected(
          submissionId,
          ruleResult.rejected.reason,
        );

        if (workflowInstanceId) {
          await this.workflowInstanceService.fail(
            workflowInstanceId,
            organizationId,
            `Submission rejected: ${ruleResult.rejected.reason}`,
          );
        }

        return {
          success: false,
          rejected: ruleResult.rejected,
        };
      }

      // Step 6: Update workflow instance context and advance
      if (workflowInstanceId) {
        // Merge submission data and rule context updates into workflow context
        const updatedContext = {
          ...workflowContext,
          ...ruleResult.contextUpdates,
          _lastSubmission: {
            id: submissionId,
            data: payload,
            processedAt: new Date().toISOString(),
          },
        };

        await this.workflowInstanceService.updateContext(
          workflowInstanceId,
          organizationId,
          updatedContext,
        );

        // Handle routing decision
        if (ruleResult.routingDecision) {
          await this.workflowInstanceService.advanceToNode(
            workflowInstanceId,
            organizationId,
            ruleResult.routingDecision,
          );
        }
      }

      // Step 7: Persist to data store
      await this.responseStore.persistSubmission({
        submissionId,
        organizationId,
        applicationId,
        workflowInstanceId,
        payload,
        ruleEvaluation: {
          matchedRules: ruleResult.ruleEvaluation.matchedRules,
          actionsExecuted: ruleResult.actionResults.length,
        },
        processedAt: new Date().toISOString(),
      });

      // Step 8: Mark submission as completed
      await this.submissionsService.markCompleted(submissionId, {
        matchedRules: ruleResult.ruleEvaluation.matchedRules,
        contextUpdates: ruleResult.contextUpdates,
        routingDecision: ruleResult.routingDecision,
      });

      this.logger.log(`Submission ${submissionId} processed successfully`);

      return {
        success: true,
        contextUpdates: ruleResult.contextUpdates,
        routingDecision: ruleResult.routingDecision,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process submission ${submissionId}: ${errorMessage}`);

      await this.submissionsService.markFailed(submissionId, errorMessage);

      throw error; // Re-throw to trigger job retry
    }
  }

  /**
   * Process a submission directly (for testing or synchronous processing)
   */
  async process(message: Record<string, unknown>): Promise<ProcessingResult> {
    const payload = message as unknown as SubmissionJobPayload;
    return this.processJob({
      id: `direct_${Date.now()}`,
      topic: 'submissions.process',
      payload,
      status: 'processing',
      attempts: 1,
      maxAttempts: 1,
      createdAt: new Date(),
      priority: 0,
    });
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): ReturnType<JobQueueService['getStats']> {
    return this.jobQueue.getStats();
  }
}
