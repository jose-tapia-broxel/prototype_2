import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateSubmissionDto } from '../dto/create-submission.dto';
import { SubmissionsService } from '../services/submissions.service';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(@Body() dto: CreateSubmissionDto) {
    return this.submissionsService.ingest(dto);
  }
}
