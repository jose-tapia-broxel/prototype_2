import { Controller, Get, Query } from '@nestjs/common';

@Controller('telemetry')
export class TelemetryController {
  @Get('usage')
  getUsage(@Query('orgId') orgId: string, @Query('from') from: string, @Query('to') to: string) {
    return {
      orgId,
      from,
      to,
      summary: {
        workflowExecutions: 0,
        failedExecutions: 0,
        p95LatencyMs: 0,
      },
    };
  }
}
