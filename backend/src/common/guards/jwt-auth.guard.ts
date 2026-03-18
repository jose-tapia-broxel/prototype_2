import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that requires a valid JWT Bearer token.
 * Apply to controllers/routes that need authentication.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard)
 *   @Controller('my-protected-route')
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
