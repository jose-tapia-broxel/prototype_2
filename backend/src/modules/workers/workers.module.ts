import { Module } from '@nestjs/common';
import { SubmissionsModule } from '../submissions/submissions.module';
import { SubmissionsWorkerService } from './services/submissions-worker.service';

@Module({
  imports: [SubmissionsModule],
  providers: [SubmissionsWorkerService],
  exports: [SubmissionsWorkerService],
})
export class WorkersModule {}
