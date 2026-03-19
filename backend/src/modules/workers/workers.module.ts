import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionsModule } from '../submissions/submissions.module';
import { RulesModule } from '../rules/rules.module';
import { RuntimeModule } from '../runtime/runtime.module';
import { EventsModule } from '../events/events.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { WorkflowNode } from '../workflows/entities/workflow-node.entity';
import { SubmissionsWorkerService } from './services/submissions-worker.service';
import { JobQueueService } from './services/job-queue.service';
import { WorkflowExecutionOrchestratorService } from './services/workflow-execution-orchestrator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowNode]),
    SubmissionsModule,
    RulesModule,
    RuntimeModule,
    EventsModule,
    IntegrationsModule,
  ],
  providers: [
    JobQueueService,
    SubmissionsWorkerService,
    WorkflowExecutionOrchestratorService,
  ],
  exports: [
    JobQueueService,
    SubmissionsWorkerService,
    WorkflowExecutionOrchestratorService,
  ],
})
export class WorkersModule {}
