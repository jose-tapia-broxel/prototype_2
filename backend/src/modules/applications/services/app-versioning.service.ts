import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Application } from '../entities/application.entity';
import { ApplicationVersion } from '../entities/application-version.entity';
import { AppValidationService } from './app-validation.service';
import { DomainEventsService } from '../../events/services/domain-events.service';
import { CreateVersionDto } from '../dto/create-version.dto';
import { UpdateVersionDto } from '../dto/update-version.dto';

export interface VersionSummary {
  id: string;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: Date;
  createdBy: string;
}

@Injectable()
export class AppVersioningService {
  constructor(
    @InjectRepository(ApplicationVersion)
    private readonly versionsRepo: Repository<ApplicationVersion>,
    @InjectRepository(Application)
    private readonly applicationsRepo: Repository<Application>,
    private readonly validation: AppValidationService,
    private readonly domainEvents: DomainEventsService,
  ) { }

  /**
   * Lists all versions for an application (without full definition JSON for performance)
   */
  async listVersions(applicationId: string): Promise<VersionSummary[]> {
    const versions = await this.versionsRepo.find({
      where: { applicationId },
      order: { versionNumber: 'DESC' },
      select: ['id', 'versionNumber', 'status', 'publishedAt', 'createdBy'],
    });
    return versions;
  }

  /**
   * Gets a specific version by ID with full definition
   */
  async getVersion(applicationId: string, versionId: string): Promise<ApplicationVersion> {
    const version = await this.versionsRepo.findOne({
      where: { id: versionId, applicationId },
    });
    if (!version) {
      throw new NotFoundException(`Version ${versionId} not found for application ${applicationId}`);
    }
    return version;
  }

  /**
   * Gets the current published version for an application
   */
  async getCurrentPublishedVersion(applicationId: string): Promise<ApplicationVersion | null> {
    return this.versionsRepo.findOne({
      where: { applicationId, status: 'PUBLISHED' },
    });
  }

  /**
   * Gets the latest draft version for an application (if any)
   */
  async getLatestDraftVersion(applicationId: string): Promise<ApplicationVersion | null> {
    return this.versionsRepo.findOne({
      where: { applicationId, status: 'DRAFT' },
      order: { versionNumber: 'DESC' },
    });
  }

  /**
   * Compares two versions and returns the differences in their definitions
   */
  async compareVersions(
    applicationId: string,
    versionIdA: string,
    versionIdB: string,
  ): Promise<{ versionA: ApplicationVersion; versionB: ApplicationVersion; hashMatch: boolean }> {
    const [versionA, versionB] = await Promise.all([
      this.getVersion(applicationId, versionIdA),
      this.getVersion(applicationId, versionIdB),
    ]);
    
    return {
      versionA,
      versionB,
      hashMatch: versionA.definitionHash === versionB.definitionHash,
    };
  }

  async createDraftVersion(app: Application, dto: CreateVersionDto): Promise<ApplicationVersion> {
    const latest = await this.versionsRepo.findOne({
      where: { applicationId: app.id },
      order: { versionNumber: 'DESC' },
    });

    const versionNumber = (latest?.versionNumber ?? 0) + 1;
    const definitionHash = createHash('sha256')
      .update(JSON.stringify(dto.definitionJson))
      .digest('hex');

    const version = this.versionsRepo.create({
      applicationId: app.id,
      organizationId: app.organizationId,
      versionNumber,
      definitionJson: dto.definitionJson,
      definitionHash,
      createdBy: dto.createdBy,
      status: 'DRAFT',
    });

    return this.versionsRepo.save(version);
  }

  async updateDraftVersion(
    app: Application,
    versionId: string,
    dto: UpdateVersionDto,
  ): Promise<ApplicationVersion> {
    const version = await this.versionsRepo.findOneByOrFail({ 
      id: versionId, 
      applicationId: app.id 
    });

    // IMMUTABILITY CHECK: Cannot modify published or archived versions
    if (version.status !== 'DRAFT') {
      throw new ForbiddenException(
        `Cannot modify version with status ${version.status}. Only DRAFT versions can be edited.`
      );
    }

    if (dto.definitionJson) {
      version.definitionJson = dto.definitionJson;
      version.definitionHash = createHash('sha256')
        .update(JSON.stringify(dto.definitionJson))
        .digest('hex');
    }

    return this.versionsRepo.save(version);
  }

  async publishVersion(app: Application, versionId: string, actorId: string): Promise<ApplicationVersion> {
    return this.versionsRepo.manager.transaction(async (trx) => {
      const version = await trx.findOneByOrFail(ApplicationVersion, { id: versionId, applicationId: app.id });
      
      if (version.status !== 'DRAFT') {
        throw new BadRequestException(`Cannot publish version with status ${version.status}`);
      }

      this.validation.validateDefinition(version.definitionJson);

      // Archive all previously published versions
      await trx.update(ApplicationVersion, { applicationId: app.id, status: 'PUBLISHED' }, { status: 'ARCHIVED' });
      
      version.status = 'PUBLISHED';
      version.publishedAt = new Date();
      await trx.save(version);

      await trx.update(Application, { id: app.id }, { currentPublishedVersionId: version.id });

      await this.domainEvents.emit('application.version.published', {
        organizationId: app.organizationId,
        appId: app.id,
        versionId: version.id,
        actorId,
      });

      return version;
    });
  }

  async rollbackToVersion(
    app: Application,
    versionId: string,
    actorId: string,
  ): Promise<ApplicationVersion> {
    return this.versionsRepo.manager.transaction(async (trx) => {
      const version = await trx.findOneByOrFail(ApplicationVersion, { 
        id: versionId, 
        applicationId: app.id 
      });

      // Can only rollback to previously published versions
      if (version.status !== 'PUBLISHED' && version.status !== 'ARCHIVED') {
        throw new BadRequestException(
          'Can only rollback to PUBLISHED or ARCHIVED versions'
        );
      }

      // Archive current published version
      await trx.update(
        ApplicationVersion,
        { applicationId: app.id, status: 'PUBLISHED' },
        { status: 'ARCHIVED' }
      );

      // Promote the target version to PUBLISHED
      version.status = 'PUBLISHED';
      version.publishedAt = new Date();
      await trx.save(version);

      await trx.update(Application, { id: app.id }, { currentPublishedVersionId: version.id });

      await this.domainEvents.emit('application.version.rolledback', {
        organizationId: app.organizationId,
        appId: app.id,
        versionId: version.id,
        actorId,
      });

      return version;
    });
  }
}
