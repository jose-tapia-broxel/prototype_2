import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Component } from '../entities/component.entity';
import { CreateComponentDto } from '../dto/create-component.dto';
import { UpdateComponentDto } from '../dto/update-component.dto';

@Injectable()
export class ComponentsService {
  constructor(
    @InjectRepository(Component)
    private readonly componentsRepo: Repository<Component>,
  ) {}

  create(dto: CreateComponentDto): Promise<Component> {
    // Enforce XOR constraint: component belongs to exactly one parent
    if (dto.screenId && dto.formId) {
      throw new BadRequestException('A component must belong to either a screen or a form, not both');
    }
    if (!dto.screenId && !dto.formId) {
      throw new BadRequestException('A component must belong to either a screen or a form');
    }
    return this.componentsRepo.save(this.componentsRepo.create(dto));
  }

  findAllByScreen(screenId: string, organizationId: string): Promise<Component[]> {
    return this.componentsRepo.find({
      where: { screenId, organizationId },
      order: { sortOrder: 'ASC' },
    });
  }

  findAllByForm(formId: string, organizationId: string): Promise<Component[]> {
    return this.componentsRepo.find({
      where: { formId, organizationId },
      order: { sortOrder: 'ASC' },
    });
  }

  async findById(id: string, organizationId: string): Promise<Component | null> {
    return this.componentsRepo.findOne({ where: { id, organizationId } });
  }

  findByIdOrFail(id: string, organizationId: string): Promise<Component> {
    return this.componentsRepo.findOneByOrFail({ id, organizationId });
  }

  async update(id: string, organizationId: string, dto: UpdateComponentDto): Promise<Component> {
    const component = await this.componentsRepo.findOne({ where: { id, organizationId } });
    if (!component) {
      throw new NotFoundException(`Component with id ${id} not found`);
    }
    Object.assign(component, dto);
    return this.componentsRepo.save(component);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const result = await this.componentsRepo.delete({ id, organizationId });
    if (result.affected === 0) {
      throw new NotFoundException(`Component with id ${id} not found`);
    }
  }

  async reorder(
    parentId: string,
    parentType: 'screen' | 'form',
    organizationId: string,
    orderedIds: string[],
  ): Promise<Component[]> {
    const whereClause = parentType === 'screen'
      ? { screenId: parentId, organizationId }
      : { formId: parentId, organizationId };

    const components = await this.componentsRepo.find({ where: whereClause });

    const idSet = new Set(orderedIds);
    for (const comp of components) {
      if (!idSet.has(comp.id)) {
        throw new BadRequestException(`Component ${comp.id} not found in ordered list`);
      }
    }

    const updates = orderedIds.map((id, index) =>
      this.componentsRepo.update({ id, organizationId }, { sortOrder: index }),
    );
    await Promise.all(updates);

    return this.componentsRepo.find({ where: whereClause, order: { sortOrder: 'ASC' } });
  }
}
