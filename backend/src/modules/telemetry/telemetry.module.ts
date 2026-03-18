import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryController } from './controllers/telemetry.controller';
import { TelemetryEvent } from './entities/telemetry-event.entity';
import { TelemetryService } from './services/telemetry.service';
import { TelemetryEventSubscriber } from './services/telemetry-event-subscriber.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelemetryEvent]),
    forwardRef(() => EventsModule),
  ],
  controllers: [TelemetryController],
  providers: [TelemetryService, TelemetryEventSubscriber],
  exports: [TelemetryService],
})
export class TelemetryModule {}
