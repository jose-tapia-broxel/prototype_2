import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CredentialVaultService, CreateCredentialDto, UpdateCredentialDto } from '../services/credential-vault.service';
import { OAuthService, OAuthAuthorizationRequest, OAuthCallbackData } from '../services/oauth.service';
import { IntegrationTemplateService } from '../services/integration-template.service';
import { CredentialType } from '../entities/credential.entity';
import { TemplateCategory } from '../entities/integration-template.entity';

// TODO: Replace with your actual auth guards
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
  };
}

@Controller('api/credentials')
// @UseGuards(JwtAuthGuard) // TODO: Enable auth guard
export class CredentialsController {
  constructor(
    private readonly credentialVaultService: CredentialVaultService,
    private readonly oauthService: OAuthService,
    private readonly templateService: IntegrationTemplateService,
  ) {}

  @Post()
  async createCredential(@Request() req: AuthenticatedRequest, @Body() dto: CreateCredentialDto) {
    // Override organizationId from authenticated user
    dto.organizationId = req.user?.organizationId || dto.organizationId;
    dto.userId = req.user?.userId;

    return await this.credentialVaultService.create(dto);
  }

  @Get()
  async listCredentials(
    @Request() req: AuthenticatedRequest,
    @Query('type') credentialType?: CredentialType,
    @Query('active') isActive?: string,
  ) {
    const organizationId = req.user?.organizationId || 'default-org'; // TODO: Get from auth

    return await this.credentialVaultService.findAll(organizationId, {
      credentialType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  async getCredential(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const organizationId = req.user?.organizationId || 'default-org'; // TODO: Get from auth
    return await this.credentialVaultService.findOne(id, organizationId);
  }

  @Get(':id/decrypted')
  async getDecryptedCredential(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const organizationId = req.user?.organizationId || 'default-org'; // TODO: Get from auth
    return await this.credentialVaultService.getDecrypted(id, organizationId);
  }

  @Put(':id')
  async updateCredential(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCredentialDto,
  ) {
    const organizationId = req.user?.organizationId || 'default-org'; // TODO: Get from auth
    return await this.credentialVaultService.update(id, organizationId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCredential(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const organizationId = req.user?.organizationId || 'default-org'; // TODO: Get from auth
    await this.credentialVaultService.delete(id, organizationId);
  }

  @Post(':id/test')
  async testCredential(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const organizationId = req.user?.organizationId || 'default-org'; // TODO: Get from auth
    return await this.credentialVaultService.testCredential(id, organizationId);
  }

  @Post(':id/refresh')
  async refreshToken(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const organizationId = req.user?.organizationId || 'default-org'; // TODO: Get from auth
    await this.oauthService.refreshAccessToken(id, organizationId);
    return { message: 'Token refreshed successfully' };
  }
}

@Controller('api/oauth')
// @UseGuards(JwtAuthGuard) // TODO: Enable auth guard
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Get('providers')
  async getProviders() {
    return this.oauthService.getAvailableProviders();
  }

  @Post('authorize')
  async initiateOAuth(@Request() req: AuthenticatedRequest, @Body() authRequest: OAuthAuthorizationRequest) {
    authRequest.organizationId = req.user?.organizationId || authRequest.organizationId || 'default-org';
    authRequest.userId = req.user?.userId;

    const authorizationUrl = this.oauthService.generateAuthorizationUrl(authRequest);
    return { authorizationUrl };
  }

  @Get('callback/:provider')
  async handleCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const callbackData: OAuthCallbackData = {
        code,
        state,
        provider: provider as any,
        organizationId: '', // Will be extracted from state
      };

      const credentialId = await this.oauthService.handleCallback(callbackData);

      // Redirect to frontend with success
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      res.redirect(`${frontendUrl}/integrations/oauth/success?credentialId=${credentialId}`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      res.redirect(`${frontendUrl}/integrations/oauth/error?message=${encodeURIComponent((error as Error).message)}`);
    }
  }
}

@Controller('api/integration-templates')
// @UseGuards(JwtAuthGuard) // TODO: Enable auth guard
export class IntegrationTemplatesController {
  constructor(private readonly templateService: IntegrationTemplateService) {}

  @Get()
  async listTemplates(
    @Request() req: AuthenticatedRequest,
    @Query('category') category?: TemplateCategory,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
  ) {
    const organizationId = req.user?.organizationId;

    return await this.templateService.findAll({
      category,
      search,
      tags: tags ? tags.split(',') : undefined,
      organizationId,
    });
  }

  @Get('popular')
  async getPopularTemplates(@Query('category') category?: TemplateCategory, @Query('limit') limit?: string) {
    return await this.templateService.getPopular(
      limit ? parseInt(limit, 10) : 10,
      category
    );
  }

  @Get(':id')
  async getTemplate(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const organizationId = req.user?.organizationId;
    return await this.templateService.findOne(id, organizationId);
  }

  @Post(':id/use')
  @HttpCode(HttpStatus.OK)
  async markTemplateUsed(@Param('id') id: string) {
    await this.templateService.incrementUseCount(id);
    return { message: 'Template use count incremented' };
  }
}
