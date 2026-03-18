import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowTransition } from '../entities/workflow-transition.entity';
import { CreateWorkflowTransitionDto } from '../dto/create-workflow-transition.dto';
import { UpdateWorkflowTransitionDto } from '../dto/update-workflow-transition.dto';

@Injectable()
export class WorkflowTransitionsService {
  constructor(
    @InjectRepository(WorkflowTransition)
    private readonly transitionsRepo: Repository<WorkflowTransition>,
  ) {}

  create(dto: CreateWorkflowTransitionDto): Promise<WorkflowTransition> {
    return this.transitionsRepo.save(this.transitionsRepo.create(dto));
  }

  findAllByWorkflow(workflowId: string, organizationId: string): Promise<WorkflowTransition[]> {
    return this.transitionsRepo.find({ 
      where: { workflowId, organizationId },
      order: { priority: 'DESC' }
    });
  }

  async findById(id: string, organizationId: string): Promise<WorkflowTransition | null> {
    return this.transitionsRepo.findOne({ where: { id, organizationId } });
  }

  findByIdOrFail(id: string, organizationId: string): Promise<WorkflowTransition> {
    return this.transitionsRepo.findOneByOrFail({ id, organizationId });
  }

  async update(id: string, organizationId: string, dto: UpdateWorkflowTransitionDto): Promise<WorkflowTransition> {
    const transition = await this.transitionsRepo.findOne({ where: { id, organizationId } });
    
    if (!transition) {
      throw new NotFoundException(`Workflow transition with id ${id} not found`);
    }

    Object.assign(transition, dto);
    return this.transitionsRepo.save(transition);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const result = await this.transitionsRepo.delete({ id, organizationId });
    if (result.affected === 0) {
      throw new NotFoundException(`Workflow transition with id ${id} not found`);
    }
  }
}
