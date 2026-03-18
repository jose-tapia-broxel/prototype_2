import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantInterceptor } from '../../../common/interceptors/tenant.interceptor';
import { TenantId } from '../../../common/decorators/tenant-id.decorator';

@Controller('telemetry')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor)
export class TelemetryController {
  @Get('usage')
  getUsage(
    @TenantId() orgId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
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
