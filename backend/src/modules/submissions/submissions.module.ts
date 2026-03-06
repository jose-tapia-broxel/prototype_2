import { Module } from '@nestjs/common';
import { SubmissionsController } from './controllers/submissions.controller';
import { SubmissionsService } from './services/submissions.service';
import { QueuePublisherService } from './services/queue-publisher.service';
import { ResponseStoreService } from './services/response-store.service';

@Module({
  controllers: [SubmissionsController],
  providers: [SubmissionsService, QueuePublisherService, ResponseStoreService],
  exports: [QueuePublisherService, ResponseStoreService],
})
export class SubmissionsModule {}
