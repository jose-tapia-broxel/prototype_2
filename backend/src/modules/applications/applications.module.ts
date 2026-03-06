import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './entities/application.entity';
import { ApplicationVersion } from './entities/application-version.entity';
import { ApplicationsController } from './controllers/applications.controller';
import { ApplicationsService } from './services/applications.service';
import { AppVersioningService } from './services/app-versioning.service';
import { AppValidationService } from './services/app-validation.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Application, ApplicationVersion]), EventsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, AppVersioningService, AppValidationService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
