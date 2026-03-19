import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Credential } from './entities/credential.entity';
import { IntegrationTemplate } from './entities/integration-template.entity';
import { CredentialVaultService } from './services/credential-vault.service';
import { OAuthService } from './services/oauth.service';
import { IntegrationTemplateService } from './services/integration-template.service';
import {
  CredentialsController,
  OAuthController,
  IntegrationTemplatesController,
} from './controllers/credentials.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Credential, IntegrationTemplate]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [
    CredentialsController,
    OAuthController,
    IntegrationTemplatesController,
  ],
  providers: [
    CredentialVaultService,
    OAuthService,
    IntegrationTemplateService,
  ],
  exports: [
    CredentialVaultService,
    OAuthService,
    IntegrationTemplateService,
  ],
})
export class CredentialsModule {}
