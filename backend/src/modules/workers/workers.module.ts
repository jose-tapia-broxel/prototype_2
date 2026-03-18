import { Module } from '@nestjs/common';
import { SubmissionsModule } from '../submissions/submissions.module';
import { RulesModule } from '../rules/rules.module';
import { RuntimeModule } from '../runtime/runtime.module';
import { EventsModule } from '../events/events.module';
import { SubmissionsWorkerService } from './services/submissions-worker.service';
import { JobQueueService } from './services/job-queue.service';

@Module({
  imports: [
    SubmissionsModule,
    RulesModule,
    RuntimeModule,
    EventsModule,
  ],
  providers: [
    JobQueueService,
    SubmissionsWorkerService,
  ],
  exports: [
    JobQueueService,
    SubmissionsWorkerService,
  ],
})
export class WorkersModule {}
