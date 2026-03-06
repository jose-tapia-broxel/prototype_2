import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../entities/application.entity';
import { CreateApplicationDto } from '../dto/create-application.dto';

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

  findByIdOrFail(id: string): Promise<Application> {
    return this.applicationsRepo.findOneByOrFail({ id });
  }
}
