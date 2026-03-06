import { Module } from '@nestjs/common';
import { DomainEventsService } from './services/domain-events.service';

@Module({
  providers: [DomainEventsService],
  exports: [DomainEventsService],
})
export class EventsModule {}
