import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';

/**
 * Queue publisher service that can work with either:
 * 1. In-memory JobQueueService (for development/testing)
 * 2. External message brokers like SQS, Kafka, RabbitMQ (for production)
 */
@Injectable()
export class QueuePublisherService {
  private readonly logger = new Logger(QueuePublisherService.name);

  // Internal queue for when running without external broker
  private readonly internalQueue = new Map<string, Array<Record<string, unknown>>>();
  private readonly listeners = new Map<string, Array<(message: Record<string, unknown>) => Promise<void>>>();

  /**
   * Publish a message to a topic
   */
  async publish(topic: string, message: Record<string, unknown>): Promise<void> {
    this.logger.log(`Publishing to topic=${topic} message=${JSON.stringify(message).slice(0, 200)}...`);

    // Store in internal queue
    if (!this.internalQueue.has(topic)) {
      this.internalQueue.set(topic, []);
    }
    this.internalQueue.get(topic)!.push(message);

    // Notify listeners
    const topicListeners = this.listeners.get(topic) || [];
    for (const listener of topicListeners) {
      try {
        await listener(message);
      } catch (err) {
        this.logger.error(`Listener error for topic ${topic}: ${err}`);
      }
    }

    // TODO: In production, replace with actual broker publish:
    // await this.sqs.sendMessage({ QueueUrl: topic, MessageBody: JSON.stringify(message) });
    // await this.kafka.send({ topic, messages: [{ value: JSON.stringify(message) }] });
  }

  /**
   * Subscribe to a topic (for in-memory processing)
   */
  subscribe(topic: string, handler: (message: Record<string, unknown>) => Promise<void>): void {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, []);
    }
    this.listeners.get(topic)!.push(handler);
    this.logger.log(`Subscribed to topic=${topic}`);
  }

  /**
   * Get pending messages for a topic (for in-memory queue)
   */
  getPendingMessages(topic: string): Array<Record<string, unknown>> {
    return this.internalQueue.get(topic) || [];
  }

  /**
   * Clear processed messages (for in-memory queue)
   */
  clearMessages(topic: string): void {
    this.internalQueue.set(topic, []);
  }

  /**
   * Get queue statistics
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [topic, messages] of this.internalQueue.entries()) {
      stats[topic] = messages.length;
    }
    return stats;
  }
}
