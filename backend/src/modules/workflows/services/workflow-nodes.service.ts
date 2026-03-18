import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowNode } from '../entities/workflow-node.entity';
import { CreateWorkflowNodeDto } from '../dto/create-workflow-node.dto';
import { UpdateWorkflowNodeDto } from '../dto/update-workflow-node.dto';

@Injectable()
export class WorkflowNodesService {
  constructor(
    @InjectRepository(WorkflowNode)
    private readonly nodesRepo: Repository<WorkflowNode>,
  ) {}

  create(dto: CreateWorkflowNodeDto): Promise<WorkflowNode> {
    return this.nodesRepo.save(this.nodesRepo.create(dto));
  }

  findAllByWorkflow(workflowId: string, organizationId: string): Promise<WorkflowNode[]> {
    return this.nodesRepo.find({ 
      where: { workflowId, organizationId } 
    });
  }

  async findById(id: string, organizationId: string): Promise<WorkflowNode | null> {
    return this.nodesRepo.findOne({ where: { id, organizationId } });
  }

  findByIdOrFail(id: string, organizationId: string): Promise<WorkflowNode> {
    return this.nodesRepo.findOneByOrFail({ id, organizationId });
  }

  async update(id: string, organizationId: string, dto: UpdateWorkflowNodeDto): Promise<WorkflowNode> {
    const node = await this.nodesRepo.findOne({ where: { id, organizationId } });
    
    if (!node) {
      throw new NotFoundException(`Workflow node with id ${id} not found`);
    }

    Object.assign(node, dto);
    return this.nodesRepo.save(node);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const result = await this.nodesRepo.delete({ id, organizationId });
    if (result.affected === 0) {
      throw new NotFoundException(`Workflow node with id ${id} not found`);
    }
  }

  async updatePosition(
    id: string,
    organizationId: string,
    positionX: number,
    positionY: number,
  ): Promise<WorkflowNode> {
    const node = await this.findByIdOrFail(id, organizationId);
    node.positionX = positionX;
    node.positionY = positionY;
    return this.nodesRepo.save(node);
  }
}
