import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Screen } from '../entities/screen.entity';
import { CreateScreenDto } from '../dto/create-screen.dto';
import { UpdateScreenDto } from '../dto/update-screen.dto';
import { ScreenLayoutService, LayoutConfig, LayoutType } from './screen-layout.service';

@Injectable()
export class ScreensService {
  constructor(
    @InjectRepository(Screen)
    private readonly screensRepo: Repository<Screen>,
    private readonly layoutService: ScreenLayoutService,
  ) {}

  create(dto: CreateScreenDto): Promise<Screen> {
    // Validate layout if provided, otherwise set default
    if (dto.layoutJson && Object.keys(dto.layoutJson).length > 0) {
      this.layoutService.validateLayout(dto.layoutJson);
    } else {
      dto.layoutJson = this.layoutService.createDefaultLayout('stack') as unknown as Record<string, unknown>;
    }
    return this.screensRepo.save(this.screensRepo.create(dto));
  }

  /**
   * Validates layout configuration without saving
   */
  validateLayout(layoutJson: Record<string, unknown>): LayoutConfig {
    return this.layoutService.validateLayout(layoutJson);
  }

  /**
   * Creates a screen with a specific layout type
   */
  async createWithLayoutType(
    dto: CreateScreenDto,
    layoutType: LayoutType,
  ): Promise<Screen> {
    dto.layoutJson = this.layoutService.createDefaultLayout(layoutType) as unknown as Record<string, unknown>;
    return this.create(dto);
  }

  /**
   * Updates screen layout, merging with component placements
   */
  async updateLayout(
    id: string,
    organizationId: string,
    layoutJson: Record<string, unknown>,
  ): Promise<Screen> {
    const screen = await this.findByIdOrFail(id, organizationId);
    this.layoutService.validateLayout(layoutJson);
    screen.layoutJson = layoutJson;
    return this.screensRepo.save(screen);
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
    // Validate layout if being updated
    if (dto.layoutJson) {
      this.layoutService.validateLayout(dto.layoutJson);
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
