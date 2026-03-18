import { Module, Global } from '@nestjs/common';
import { DomainEventsService } from './services/domain-events.service';

/**
 * Global events module providing domain event bus functionality.
 * Marked as @Global so all modules can access DomainEventsService
 * without explicit imports.
 */
@Global()
@Module({
  providers: [DomainEventsService],
  exports: [DomainEventsService],
})
export class EventsModule {}
