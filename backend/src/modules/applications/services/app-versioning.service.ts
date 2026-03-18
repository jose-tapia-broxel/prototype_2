import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Application } from '../entities/application.entity';
import { ApplicationVersion } from '../entities/application-version.entity';
import { AppValidationService } from './app-validation.service';
import { DomainEventsService } from '../../events/services/domain-events.service';
import { CreateVersionDto } from '../dto/create-version.dto';

@Injectable()
export class AppVersioningService {
  constructor(
    @InjectRepository(ApplicationVersion)
    private readonly versionsRepo: Repository<ApplicationVersion>,
    private readonly validation: AppValidationService,
    private readonly domainEvents: DomainEventsService,
  ) { }

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

  async publishVersion(app: Application, versionId: string, actorId: string): Promise<ApplicationVersion> {
    return this.versionsRepo.manager.transaction(async (trx) => {
      const version = await trx.findOneByOrFail(ApplicationVersion, { id: versionId, applicationId: app.id });
      this.validation.validateDefinition(version.definitionJson);

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
}
