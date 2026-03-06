import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QueuePublisherService {
  private readonly logger = new Logger(QueuePublisherService.name);

  async publish(topic: string, message: Record<string, unknown>): Promise<void> {
    // Placeholder: replace by SQS/Kafka/PubSub publisher.
    this.logger.log(`topic=${topic} accepted message=${JSON.stringify(message)}`);
  }
}
