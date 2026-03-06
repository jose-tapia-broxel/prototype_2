import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationVersion } from '../../applications/entities/application-version.entity';

@Injectable()
export class WorkflowDefinitionService {
  constructor(
    @InjectRepository(ApplicationVersion)
    private readonly versionsRepo: Repository<ApplicationVersion>,
  ) {}

  async getImmutableDefinition(versionId: string): Promise<Record<string, unknown>> {
    const version = await this.versionsRepo.findOne({ where: { id: versionId, status: 'PUBLISHED' } });
    if (!version) {
      throw new NotFoundException('Published version not found');
    }

    return {
      applicationVersionId: version.id,
      definitionHash: version.definitionHash,
      definition: version.definitionJson,
    };
  }
}
