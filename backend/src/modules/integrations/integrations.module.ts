import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IntegrationNodeProcessorService } from './services/integration-node-processor.service';
import { EventsModule } from '../events/events.module';
import { CredentialsModule } from '../credentials/credentials.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    EventsModule,
    CredentialsModule,
  ],
  providers: [IntegrationNodeProcessorService],
  exports: [IntegrationNodeProcessorService],
})
export class IntegrationsModule {}
