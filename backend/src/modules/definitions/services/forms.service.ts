import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from '../entities/form.entity';
import { CreateFormDto } from '../dto/create-form.dto';
import { UpdateFormDto } from '../dto/update-form.dto';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(Form)
    private readonly formsRepo: Repository<Form>,
  ) {}

  create(dto: CreateFormDto): Promise<Form> {
    return this.formsRepo.save(this.formsRepo.create(dto));
  }

  findAllByApplication(applicationId: string, organizationId: string): Promise<Form[]> {
    return this.formsRepo.find({ where: { applicationId, organizationId } });
  }

  findAllByOrganization(organizationId: string): Promise<Form[]> {
    return this.formsRepo.find({ where: { organizationId } });
  }

  async findById(id: string, organizationId: string): Promise<Form | null> {
    return this.formsRepo.findOne({ where: { id, organizationId } });
  }

  findByIdOrFail(id: string, organizationId: string): Promise<Form> {
    return this.formsRepo.findOneByOrFail({ id, organizationId });
  }

  async update(id: string, organizationId: string, dto: UpdateFormDto): Promise<Form> {
    const form = await this.formsRepo.findOne({ where: { id, organizationId } });
    if (!form) {
      throw new NotFoundException(`Form with id ${id} not found`);
    }
    Object.assign(form, dto);
    return this.formsRepo.save(form);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const result = await this.formsRepo.delete({ id, organizationId });
    if (result.affected === 0) {
      throw new NotFoundException(`Form with id ${id} not found`);
    }
  }
}
