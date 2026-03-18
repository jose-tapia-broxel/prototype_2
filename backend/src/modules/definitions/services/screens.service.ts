import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Screen } from '../entities/screen.entity';
import { CreateScreenDto } from '../dto/create-screen.dto';
import { UpdateScreenDto } from '../dto/update-screen.dto';

@Injectable()
export class ScreensService {
  constructor(
    @InjectRepository(Screen)
    private readonly screensRepo: Repository<Screen>,
  ) {}

  create(dto: CreateScreenDto): Promise<Screen> {
    return this.screensRepo.save(this.screensRepo.create(dto));
  }

  findAllByApplication(applicationId: string, organizationId: string): Promise<Screen[]> {
    return this.screensRepo.find({ where: { applicationId, organizationId } });
  }

  findAllByOrganization(organizationId: string): Promise<Screen[]> {
    return this.screensRepo.find({ where: { organizationId } });
  }

  async findById(id: string, organizationId: string): Promise<Screen | null> {
    return this.screensRepo.findOne({ where: { id, organizationId } });
  }

  findByIdOrFail(id: string, organizationId: string): Promise<Screen> {
    return this.screensRepo.findOneByOrFail({ id, organizationId });
  }

  async update(id: string, organizationId: string, dto: UpdateScreenDto): Promise<Screen> {
    const screen = await this.screensRepo.findOne({ where: { id, organizationId } });
    if (!screen) {
      throw new NotFoundException(`Screen with id ${id} not found`);
    }
    Object.assign(screen, dto);
    return this.screensRepo.save(screen);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const result = await this.screensRepo.delete({ id, organizationId });
    if (result.affected === 0) {
      throw new NotFoundException(`Screen with id ${id} not found`);
    }
  }
}
