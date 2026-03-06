import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rule } from './entities/rule.entity';
import { RulesEngineService } from './services/rules-engine.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rule])],
  providers: [RulesEngineService],
  exports: [RulesEngineService],
})
export class RulesModule {}
