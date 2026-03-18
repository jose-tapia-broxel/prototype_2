import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  MockDataProvider,
  MockUser,
} from '../../../infrastructure/mock-data/mock-data.provider';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../interfaces/jwt-payload.interface';

export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}

/**
 * Handles login (credential validation + token generation).
 *
 * Uses MockDataProvider until the real DB is connected.
 * When switching to DB, replace the mock lookup with a TypeORM repository call
 * and use bcrypt.compare() for password verification.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Authenticate by organization slug + email + password.
   *
   * MVP shortcut: any password is accepted for seeded mock users.
   * TODO: Replace with bcrypt.compare(password, user.passwordHash) when DB is ready.
   */
  async login(
    orgSlug: string,
    email: string,
    _password: string,
  ): Promise<LoginResult> {
    const org = MockDataProvider.findOrganizationBySlug(orgSlug);
    if (!org) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user: MockUser | undefined = MockDataProvider.findUserByEmail(
      org.id,
      email,
    );
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // TODO: bcrypt.compare(_password, user.passwordHash)
    // For now we accept any password against mock data.

    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(
      `User ${user.email} logged in to org ${org.slug}`,
    );

    return {
      accessToken,
      user: {
        userId: user.id,
        organizationId: user.organizationId,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Validates a user still exists and is active.
   * Called by guards or interceptors when extra checks are needed.
   */
  validateUserActive(userId: string): boolean {
    const user = MockDataProvider.findUserById(userId);
    return !!user && user.isActive;
  }
}
