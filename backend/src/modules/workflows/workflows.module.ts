import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workflow } from './entities/workflow.entity';
import { WorkflowNode } from './entities/workflow-node.entity';
import { WorkflowTransition } from './entities/workflow-transition.entity';
import { ApplicationVersion } from '../applications/entities/application-version.entity';
import { WorkflowsPublicController } from './controllers/workflows-public.controller';
import { WorkflowsController } from './controllers/workflows.controller';
import { WorkflowNodesController } from './controllers/workflow-nodes.controller';
import { WorkflowTransitionsController } from './controllers/workflow-transitions.controller';
import { WorkflowDefinitionService } from './services/workflow-definition.service';
import { WorkflowsService } from './services/workflows.service';
import { WorkflowNodesService } from './services/workflow-nodes.service';
import { WorkflowTransitionsService } from './services/workflow-transitions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workflow,
      WorkflowNode,
      WorkflowTransition,
      ApplicationVersion,
    ]),
  ],
  controllers: [
    WorkflowsPublicController,
    WorkflowsController,
    WorkflowNodesController,
    WorkflowTransitionsController,
  ],
  providers: [
    WorkflowDefinitionService,
    WorkflowsService,
    WorkflowNodesService,
    WorkflowTransitionsService,
  ],
  exports: [
    WorkflowDefinitionService,
    WorkflowsService,
    WorkflowNodesService,
    WorkflowTransitionsService,
  ],
})
export class WorkflowsModule {}
