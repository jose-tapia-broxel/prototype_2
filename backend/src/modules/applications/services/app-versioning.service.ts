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

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingVersion?: ApplicationVersion;
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

  /**
   * Computes the SHA-256 hash for a definition JSON
   */
  computeDefinitionHash(definitionJson: Record<string, unknown>): string {
    return createHash('sha256')
      .update(JSON.stringify(definitionJson))
      .digest('hex');
  }

  /**
   * Checks if a definition with the same hash already exists (deduplication)
   */
  async checkForDuplicate(
    applicationId: string,
    definitionJson: Record<string, unknown>,
  ): Promise<DuplicateCheckResult> {
    const hash = this.computeDefinitionHash(definitionJson);
    const existing = await this.versionsRepo.findOne({
      where: { applicationId, definitionHash: hash },
      order: { versionNumber: 'DESC' },
    });

    return {
      isDuplicate: !!existing,
      existingVersion: existing ?? undefined,
    };
  }

  /**
   * Finds a version by its definition hash (for deduplication)
   */
  async findByDefinitionHash(
    applicationId: string,
    hash: string,
  ): Promise<ApplicationVersion | null> {
    return this.versionsRepo.findOne({
      where: { applicationId, definitionHash: hash },
    });
  }

  /**
   * Clones an existing version as a new DRAFT
   */
  async cloneVersionAsDraft(
    app: Application,
    sourceVersionId: string,
    createdBy: string,
  ): Promise<ApplicationVersion> {
    const sourceVersion = await this.getVersion(app.id!, sourceVersionId);

    // Check for existing duplicate
    const { isDuplicate, existingVersion } = await this.checkForDuplicate(
      app.id!,
      sourceVersion.definitionJson,
    );

    if (isDuplicate && existingVersion?.status === 'DRAFT') {
      // Return existing draft instead of creating duplicate
      return existingVersion;
    }

    const latest = await this.versionsRepo.findOne({
      where: { applicationId: app.id },
      order: { versionNumber: 'DESC' },
    });

    const version = this.versionsRepo.create({
      applicationId: app.id,
      organizationId: app.organizationId,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      definitionJson: sourceVersion.definitionJson,
      definitionHash: sourceVersion.definitionHash,
      createdBy,
      status: 'DRAFT',
    });

    return this.versionsRepo.save(version);
  }

  async createDraftVersion(
    app: Application,
    dto: CreateVersionDto,
    options?: { allowDuplicates?: boolean },
  ): Promise<ApplicationVersion & { duplicateWarning?: string }> {
    const definitionHash = this.computeDefinitionHash(dto.definitionJson);

    // SHA-256 deduplication check
    if (!options?.allowDuplicates) {
      const { isDuplicate, existingVersion } = await this.checkForDuplicate(
        app.id!,
        dto.definitionJson,
      );

      if (isDuplicate && existingVersion?.status === 'DRAFT') {
        // Return existing draft with warning
        return Object.assign(existingVersion, {
          duplicateWarning: `Identical definition already exists in DRAFT version ${existingVersion.versionNumber}`,
        });
      }
    }

    const latest = await this.versionsRepo.findOne({
      where: { applicationId: app.id },
      order: { versionNumber: 'DESC' },
    });

    const versionNumber = (latest?.versionNumber ?? 0) + 1;

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
      version.definitionHash = this.computeDefinitionHash(dto.definitionJson);
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
