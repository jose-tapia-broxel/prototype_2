import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);

  async emit(eventType: string, payload: Record<string, unknown>): Promise<void> {
    this.logger.log(`event=${eventType} payload=${JSON.stringify(payload)}`);
  }
}
