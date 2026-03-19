import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { Credential, CredentialType, AuthProvider } from '../entities/credential.entity';

const scryptAsync = promisify(scrypt);

export interface CreateCredentialDto {
  name: string;
  description?: string;
  credentialType: CredentialType;
  authProvider?: AuthProvider;
  credentials: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  organizationId: string;
  userId?: string;
  expiresAt?: Date;
  rotationPolicyDays?: number;
}

export interface UpdateCredentialDto {
  name?: string;
  description?: string;
  credentials?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
  expiresAt?: Date;
  rotationPolicyDays?: number;
}

export interface DecryptedCredential extends Omit<Credential, 'encryptedData'> {
  credentials: Record<string, unknown>;
}

@Injectable()
export class CredentialVaultService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(Credential)
    private readonly credentialRepository: Repository<Credential>,
  ) {
    // In production, this should come from environment variables or a key management service
    this.encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-key-change-in-production-must-be-32-chars!!';
    
    if (this.encryptionKey.length !== 32 && this.encryptionKey.length !== 44) {
      throw new Error('CREDENTIAL_ENCRYPTION_KEY must be 32 characters (for direct key) or 44 characters (base64 encoded)');
    }
  }

  /**
   * Encrypt sensitive credential data
   */
  private async encrypt(data: Record<string, unknown>): Promise<string> {
    const jsonData = JSON.stringify(data);
    const iv = randomBytes(16);
    const salt = randomBytes(16);
    
    // Derive key from password
    const key = await scryptAsync(this.encryptionKey, salt, 32) as Buffer;
    
    const cipher = createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return: salt:iv:authTag:encrypted
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive credential data
   */
  private async decrypt(encryptedData: string): Promise<Record<string, unknown>> {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
      }

      const [saltHex, ivHex, authTagHex, encrypted] = parts;
      
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      // Derive key from password
      const key = await scryptAsync(this.encryptionKey, salt, 32) as Buffer;
      
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Failed to decrypt credentials: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new credential
   */
  async create(dto: CreateCredentialDto): Promise<Credential> {
    const encryptedData = await this.encrypt(dto.credentials);

    const credential = this.credentialRepository.create({
      name: dto.name,
      description: dto.description,
      credentialType: dto.credentialType,
      authProvider: dto.authProvider,
      encryptedData,
      metadata: dto.metadata || {},
      organizationId: dto.organizationId,
      userId: dto.userId,
      expiresAt: dto.expiresAt,
      rotationPolicyDays: dto.rotationPolicyDays,
      isActive: true,
    });

    return await this.credentialRepository.save(credential);
  }

  /**
   * Find all credentials for an organization (without decrypted data)
   */
  async findAll(organizationId: string, options?: { credentialType?: CredentialType; isActive?: boolean }): Promise<Credential[]> {
    const query = this.credentialRepository.createQueryBuilder('credential')
      .where('credential.organizationId = :organizationId', { organizationId })
      .andWhere('credential.deletedAt IS NULL');

    if (options?.credentialType) {
      query.andWhere('credential.credentialType = :credentialType', { credentialType: options.credentialType });
    }

    if (options?.isActive !== undefined) {
      query.andWhere('credential.isActive = :isActive', { isActive: options.isActive });
    }

    return await query.orderBy('credential.createdAt', 'DESC').getMany();
  }

  /**
   * Find one credential by ID (without decrypted data)
   */
  async findOne(id: string, organizationId: string): Promise<Credential> {
    const credential = await this.credentialRepository.findOne({
      where: { id, organizationId, deletedAt: null as any },
    });

    if (!credential) {
      throw new NotFoundException(`Credential with ID ${id} not found`);
    }

    return credential;
  }

  /**
   * Get credential with decrypted data (use carefully!)
   */
  async getDecrypted(id: string, organizationId: string): Promise<DecryptedCredential> {
    const credential = await this.findOne(id, organizationId);
    const decryptedCredentials = await this.decrypt(credential.encryptedData);

    // Update last used timestamp
    await this.credentialRepository.update(id, { lastUsedAt: new Date() });

    const { encryptedData, ...rest } = credential;
    return {
      ...rest,
      credentials: decryptedCredentials,
    };
  }

  /**
   * Update a credential
   */
  async update(id: string, organizationId: string, dto: UpdateCredentialDto): Promise<Credential> {
    const credential = await this.findOne(id, organizationId);

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.expiresAt !== undefined) updateData.expiresAt = dto.expiresAt;
    if (dto.rotationPolicyDays !== undefined) updateData.rotationPolicyDays = dto.rotationPolicyDays;

    // If credentials are being updated, re-encrypt
    if (dto.credentials) {
      updateData.encryptedData = await this.encrypt(dto.credentials);
      updateData.rotationReminderSent = false; // Reset rotation reminder
    }

    await this.credentialRepository.update(id, updateData);
    return await this.findOne(id, organizationId);
  }

  /**
   * Soft delete a credential
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const credential = await this.findOne(id, organizationId);
    await this.credentialRepository.update(id, { deletedAt: new Date(), isActive: false });
  }

  /**
   * Test if a credential is valid (for OAuth tokens, check expiration)
   */
  async testCredential(id: string, organizationId: string): Promise<{ valid: boolean; message?: string }> {
    try {
      const credential = await this.getDecrypted(id, organizationId);

      if (!credential.isActive) {
        return { valid: false, message: 'Credential is inactive' };
      }

      if (credential.expiresAt && new Date() > credential.expiresAt) {
        return { valid: false, message: 'Credential has expired' };
      }

      // For OAuth2, check if access token is expired
      if (credential.credentialType === 'oauth2') {
        const creds = credential.credentials as { expiresAt?: string };
        if (creds.expiresAt && new Date() > new Date(creds.expiresAt)) {
          return { valid: false, message: 'OAuth token has expired' };
        }
      }

      return { valid: true, message: 'Credential is valid' };
    } catch (error) {
      return { valid: false, message: `Failed to validate: ${(error as Error).message}` };
    }
  }

  /**
   * Check for credentials that need rotation and mark them
   */
  async checkRotationNeeded(): Promise<Credential[]> {
    const query = this.credentialRepository.createQueryBuilder('credential')
      .where('credential.rotationPolicyDays IS NOT NULL')
      .andWhere('credential.isActive = :isActive', { isActive: true })
      .andWhere('credential.rotationReminderSent = :sent', { sent: false })
      .andWhere('credential.deletedAt IS NULL')
      .andWhere(
        `credential.updatedAt < NOW() - INTERVAL '1 day' * credential.rotationPolicyDays`
      );

    const credentials = await query.getMany();

    // Mark as reminder sent
    const ids = credentials.map(c => c.id);
    if (ids.length > 0) {
      await this.credentialRepository.update(ids, { rotationReminderSent: true });
    }

    return credentials;
  }
}
