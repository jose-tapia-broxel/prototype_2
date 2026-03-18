import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './infrastructure/database/typeorm.config';
import { AuthModule } from './modules/auth/auth.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { RuntimeModule } from './modules/runtime/runtime.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { EventsModule } from './modules/events/events.module';
import { DefinitionsModule } from './modules/definitions/definitions.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { RulesModule } from './modules/rules/rules.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { WorkersModule } from './modules/workers/workers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(typeOrmConfig),
    AuthModule,
    EventsModule,
    ApplicationsModule,
    DefinitionsModule,
    WorkflowsModule,
    RulesModule,
    SubmissionsModule,
    WorkersModule,
    RuntimeModule,
    TelemetryModule,
  ],
})
export class AppModule {}
