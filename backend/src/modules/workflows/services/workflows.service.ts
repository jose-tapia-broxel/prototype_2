import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from '../entities/workflow.entity';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { UpdateWorkflowDto } from '../dto/update-workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowsRepo: Repository<Workflow>,
  ) {}

  create(dto: CreateWorkflowDto): Promise<Workflow> {
    return this.workflowsRepo.save(this.workflowsRepo.create(dto));
  }

  findAllByApplication(applicationId: string, organizationId: string): Promise<Workflow[]> {
    return this.workflowsRepo.find({ 
      where: { applicationId, organizationId } 
    });
  }

  findAllByOrganization(organizationId: string): Promise<Workflow[]> {
    return this.workflowsRepo.find({ where: { organizationId } });
  }

  async findById(id: string, organizationId: string): Promise<Workflow | null> {
    return this.workflowsRepo.findOne({ where: { id, organizationId } });
  }

  findByIdOrFail(id: string, organizationId: string): Promise<Workflow> {
    return this.workflowsRepo.findOneByOrFail({ id, organizationId });
  }

  async update(id: string, organizationId: string, dto: UpdateWorkflowDto): Promise<Workflow> {
    const workflow = await this.workflowsRepo.findOne({ where: { id, organizationId } });
    
    if (!workflow) {
      throw new NotFoundException(`Workflow with id ${id} not found`);
    }

    Object.assign(workflow, dto);
    return this.workflowsRepo.save(workflow);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const result = await this.workflowsRepo.delete({ id, organizationId });
    if (result.affected === 0) {
      throw new NotFoundException(`Workflow with id ${id} not found`);
    }
  }
}
