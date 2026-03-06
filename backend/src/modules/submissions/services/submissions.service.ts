import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateSubmissionDto } from '../dto/create-submission.dto';
import { QueuePublisherService } from './queue-publisher.service';

@Injectable()
export class SubmissionsService {
  constructor(private readonly queuePublisher: QueuePublisherService) {}

  async ingest(dto: CreateSubmissionDto): Promise<{ submissionId: string; status: 'ACCEPTED' }> {
    const submissionId = randomUUID();

    await this.queuePublisher.publish('submissions.ingest', {
      submissionId,
      organizationId: dto.organizationId,
      applicationId: dto.applicationId,
      applicationVersionId: dto.applicationVersionId,
      workflowKey: dto.workflowKey,
      payload: dto.payload,
      receivedAt: new Date().toISOString(),
    });

    return { submissionId, status: 'ACCEPTED' };
  }
}
