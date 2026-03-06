import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowExecutionLog } from './entities/workflow-execution-log.entity';
import { WorkflowInstancesController } from './controllers/workflow-instances.controller';
import { WorkflowInstanceService } from './services/workflow-instance.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowInstance, WorkflowExecutionLog]), EventsModule],
  controllers: [WorkflowInstancesController],
  providers: [WorkflowInstanceService],
})
export class RuntimeModule {}
