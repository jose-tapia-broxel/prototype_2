import { Injectable } from '@nestjs/common';
import { ResponseStoreService } from '../../submissions/services/response-store.service';

@Injectable()
export class SubmissionsWorkerService {
  constructor(private readonly responseStore: ResponseStoreService) {}

  async process(message: Record<string, unknown>): Promise<void> {
    await this.responseStore.persistSubmission({
      ...message,
      processedAt: new Date().toISOString(),
    });
  }
}
