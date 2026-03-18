import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rule } from './entities/rule.entity';
import { RulesEngineService } from './services/rules-engine.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Rule]), EventsModule],
  providers: [RulesEngineService],
  exports: [RulesEngineService],
})
export class RulesModule {}
