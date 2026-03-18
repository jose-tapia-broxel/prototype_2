import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Submission } from './entities/submission.entity';
import { Form } from '../definitions/entities/form.entity';
import { SubmissionsController } from './controllers/submissions.controller';
import { SubmissionsService } from './services/submissions.service';
import { SubmissionValidatorService } from './services/submission-validator.service';
import { QueuePublisherService } from './services/queue-publisher.service';
import { ResponseStoreService } from './services/response-store.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Form]),
    EventsModule,
  ],
  controllers: [SubmissionsController],
  providers: [
    SubmissionsService,
    SubmissionValidatorService,
    QueuePublisherService,
    ResponseStoreService,
  ],
  exports: [
    SubmissionsService,
    SubmissionValidatorService,
    QueuePublisherService,
    ResponseStoreService,
  ],
})
export class SubmissionsModule {}
