import { Module } from '@nestjs/common';
import { TelemetryController } from './controllers/telemetry.controller';

@Module({
  controllers: [TelemetryController],
})
export class TelemetryModule {}
