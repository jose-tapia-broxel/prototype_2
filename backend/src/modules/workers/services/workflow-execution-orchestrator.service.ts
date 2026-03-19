import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainEventsService } from '../../events/services/domain-events.service';
import { WorkflowNode } from '../../workflows/entities/workflow-node.entity';
import { WorkflowInstanceService } from '../../runtime/services/workflow-instance.service';
import { IntegrationNodeProcessorService } from '../../integrations/services/integration-node-processor.service';
import { IntegrationExecutionContext } from '../../integrations/interfaces/integration-types';

/**
 * Workflow Execution Orchestrator
 * 
 * Listens to workflow.node.entered events and processes nodes
 * including integration nodes, decision nodes, etc.
 */
@Injectable()
export class WorkflowExecutionOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowExecutionOrchestratorService.name);

  constructor(
    @InjectRepository(WorkflowNode)
    private readonly nodesRepo: Repository<WorkflowNode>,
    private readonly events: DomainEventsService,
    private readonly workflowInstanceService: WorkflowInstanceService,
    private readonly integrationProcessor: IntegrationNodeProcessorService,
  ) {}

  onModuleInit() {
    // Subscribe to node entered events
    this.events.on('workflow.node.entered', async (event: any) => {
      await this.processNodeEntry(event);
    });
  }

  /**
   * Process a node when workflow enters it
   */
  private async processNodeEntry(event: any): Promise<void> {
    const { instanceId, currentNodeId, organizationId } = event;

    try {
      // Get node details
      const node = await this.nodesRepo.findOne({
        where: { id: currentNodeId, organizationId },
      });

      if (!node) {
        this.logger.warn(`Node ${currentNodeId} not found for workflow instance ${instanceId}`);
        return;
      }

      this.logger.log(
        `Processing node ${currentNodeId} (${node.nodeType}) for instance ${instanceId}`,
      );

      // Route to appropriate processor based on node type
      switch (node.nodeType) {
        case 'api_call':
        case 'cache_operation':
        case 'transformation':
        case 'webhook_listener':
        case 'cdn_upload':
        case 'firebase_action':
        case 'browser_action':
        case 'sdk_function':
          await this.processIntegrationNode(node, instanceId, organizationId);
          break;

        case 'decision':
          // TODO: Process decision node
          this.logger.debug(`Decision node processing not yet implemented for ${currentNodeId}`);
          break;

        case 'form':
        case 'screen':
          // User interaction nodes - wait for submission
          this.logger.debug(`User interaction node ${currentNodeId} - waiting for submission`);
          break;

        case 'wait':
          // TODO: Process wait node (timers, webhooks)
          this.logger.debug(`Wait node processing not yet implemented for ${currentNodeId}`);
          break;

        case 'end':
          // Complete workflow instance
          await this.workflowInstanceService.complete(instanceId, organizationId);
          break;

        default:
          this.logger.debug(`No processor for node type ${node.nodeType}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        `Error processing node entry for instance ${instanceId}: ${errorMessage}`,
        errorStack,
      );

      // Fail the workflow instance
      await this.workflowInstanceService.fail(
        instanceId,
        organizationId,
        `Node processing error: ${errorMessage}`,
      );
    }
  }

  /**
   * Process integration node
   */
  private async processIntegrationNode(
    node: WorkflowNode,
    instanceId: string,
    organizationId: string,
  ): Promise<void> {
    // Get workflow instance to retrieve context
    const instance = await this.workflowInstanceService.findOne(instanceId);

    // Build execution context
    const executionContext: IntegrationExecutionContext = {
      organizationId,
      workflowInstanceId: instanceId,
      nodeId: node.id,
      workflowContext: instance.contextJson,
      config: node.configJson as any, // Cast to integration config
      credentials: undefined, // TODO: Fetch from credential vault when implemented
    };

    // Execute integration
    const result = await this.integrationProcessor.execute(executionContext);

    if (result.success) {
      // Merge integration result into workflow context
      const updatedContext = {
        ...instance.contextJson,
        [node.label || `node_${node.id}`]: result.data,
        _lastIntegrationResult: {
          nodeId: node.id,
          nodeLabel: node.label,
          integrationType: node.configJson.integrationType,
          data: result.data,
          executedAt: result.metadata?.completedAt,
          durationMs: result.metadata?.durationMs,
        },
      };

      await this.workflowInstanceService.updateContext(instanceId, organizationId, updatedContext);

      // TODO: Advance to next node based on transitions
      // For now, log that integration completed
      this.logger.log(
        `Integration node ${node.id} completed successfully for instance ${instanceId}`,
      );
    } else {
      // Handle integration failure
      const errorHandling = node.configJson.errorHandling as any;

      if (errorHandling?.strategy === 'fail' || !errorHandling) {
        // Fail the workflow
        await this.workflowInstanceService.fail(
          instanceId,
          organizationId,
          `Integration node ${node.label} failed: ${result.error?.message}`,
        );
      } else if (errorHandling?.strategy === 'ignore') {
        // Continue workflow with null result
        const updatedContext = {
          ...instance.contextJson,
          [node.label || `node_${node.id}`]: null,
          _lastIntegrationError: {
            nodeId: node.id,
            error: result.error,
          },
        };

        await this.workflowInstanceService.updateContext(
          instanceId,
          organizationId,
          updatedContext,
        );
      }

      this.logger.error(
        `Integration node ${node.id} failed: ${result.error?.message}`,
      );
    }
  }
}
