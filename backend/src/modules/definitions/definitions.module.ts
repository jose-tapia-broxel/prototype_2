import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from './entities/form.entity';
import { Screen } from './entities/screen.entity';
import { Component } from './entities/component.entity';
import { FormsController } from './controllers/forms.controller';
import { ScreensController } from './controllers/screens.controller';
import { ComponentsController } from './controllers/components.controller';
import { FormsService } from './services/forms.service';
import { ScreensService } from './services/screens.service';
import { ComponentsService } from './services/components.service';
import { FormSchemaValidationService } from './services/form-schema-validation.service';
import { ScreenLayoutService } from './services/screen-layout.service';

@Module({
  imports: [TypeOrmModule.forFeature([Form, Screen, Component])],
  controllers: [FormsController, ScreensController, ComponentsController],
  providers: [
    FormsService,
    ScreensService,
    ComponentsService,
    FormSchemaValidationService,
    ScreenLayoutService,
  ],
  exports: [
    FormsService,
    ScreensService,
    ComponentsService,
    FormSchemaValidationService,
    ScreenLayoutService,
  ],
})
export class DefinitionsModule {}
