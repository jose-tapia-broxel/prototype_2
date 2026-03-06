import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workflow } from './entities/workflow.entity';
import { WorkflowNode } from './entities/workflow-node.entity';
import { WorkflowTransition } from './entities/workflow-transition.entity';
import { ApplicationVersion } from '../applications/entities/application-version.entity';
import { WorkflowsPublicController } from './controllers/workflows-public.controller';
import { WorkflowDefinitionService } from './services/workflow-definition.service';

@Module({
  imports: [TypeOrmModule.forFeature([Workflow, WorkflowNode, WorkflowTransition, ApplicationVersion])],
  controllers: [WorkflowsPublicController],
  providers: [WorkflowDefinitionService],
  exports: [WorkflowDefinitionService],
})
export class WorkflowsModule {}
