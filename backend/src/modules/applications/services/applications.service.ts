import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../entities/application.entity';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { UpdateApplicationDto } from '../dto/update-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationsRepo: Repository<Application>,
  ) {}

  create(dto: CreateApplicationDto): Promise<Application> {
    return this.applicationsRepo.save(this.applicationsRepo.create(dto));
  }

  findAllByOrganization(organizationId: string): Promise<Application[]> {
    return this.applicationsRepo.find({ where: { organizationId } });
  }

  async findById(id: string, organizationId: string): Promise<Application | null> {
    return this.applicationsRepo.findOne({ where: { id, organizationId } });
  }

  findByIdOrFail(id: string): Promise<Application> {
    return this.applicationsRepo.findOneByOrFail({ id });
  }

  async update(id: string, organizationId: string, dto: UpdateApplicationDto): Promise<Application> {
    const app = await this.applicationsRepo.findOne({ where: { id, organizationId } });
    
    if (!app) {
      throw new NotFoundException(`Application with id ${id} not found`);
    }

    // Update only provided fields
    if (dto.name !== undefined) {
      app.name = dto.name;
    }
    if (dto.appKey !== undefined) {
      app.appKey = dto.appKey;
    }

    return this.applicationsRepo.save(app);
  }
}
