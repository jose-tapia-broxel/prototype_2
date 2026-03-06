import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ResponseStoreService {
  private readonly logger = new Logger(ResponseStoreService.name);

  async persistSubmission(document: Record<string, unknown>): Promise<void> {
    // Placeholder for DynamoDB/MongoDB/BigQuery sink.
    this.logger.log(`persisting submission document=${JSON.stringify(document)}`);
  }
}
