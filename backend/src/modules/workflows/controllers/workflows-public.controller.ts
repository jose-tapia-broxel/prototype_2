import { Controller, Get, Header, Param } from '@nestjs/common';
import { IMMUTABLE_EDGE_CACHE_HEADER } from '../../../common/constants/cache.constants';
import { WorkflowDefinitionService } from '../services/workflow-definition.service';

@Controller('public/workflows')
export class WorkflowsPublicController {
  constructor(private readonly workflowDefinitionService: WorkflowDefinitionService) {}

  @Get('versions/:versionId')
  @Header('Cache-Control', IMMUTABLE_EDGE_CACHE_HEADER)
  getPublishedDefinition(@Param('versionId') versionId: string) {
    return this.workflowDefinitionService.getImmutableDefinition(versionId);
  }
}
