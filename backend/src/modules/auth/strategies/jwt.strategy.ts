import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../interfaces/jwt-payload.interface';

/**
 * Passport JWT strategy.
 * Validates the Bearer token and maps the decoded payload to AuthenticatedUser.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-secret-change-me'),
    });
  }

  /**
   * Called automatically by Passport after the token is verified.
   * The returned object is set on `request.user`.
   */
  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      organizationId: payload.organizationId,
      email: payload.email,
      role: payload.role,
    };
  }
}
