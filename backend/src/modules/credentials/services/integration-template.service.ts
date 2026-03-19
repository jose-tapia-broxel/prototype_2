import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationTemplate, TemplateCategory } from '../entities/integration-template.entity';

export interface CreateTemplateDto {
  name: string;
  description: string;
  category: TemplateCategory;
  provider?: string;
  icon?: string;
  configTemplate: Record<string, unknown>;
  requiredCredentialType?: string;
  configFields: Array<{
    name: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'code';
    label: string;
    description?: string;
    required?: boolean;
    defaultValue?: unknown;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
  }>;
  tags?: string[];
  isPublic?: boolean;
  documentation?: string;
  organizationId?: string;
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {
  isActive?: boolean;
}

@Injectable()
export class IntegrationTemplateService {
  constructor(
    @InjectRepository(IntegrationTemplate)
    private readonly templateRepository: Repository<IntegrationTemplate>,
  ) {}

  /**
   * Create a new integration template
   */
  async create(dto: CreateTemplateDto): Promise<IntegrationTemplate> {
    const template = this.templateRepository.create({
      ...dto,
      isActive: true,
      useCount: 0,
    });

    return await this.templateRepository.save(template);
  }

  /**
   * Find all templates with filters
   */
  async findAll(options?: {
    category?: TemplateCategory;
    isPublic?: boolean;
    organizationId?: string;
    search?: string;
    tags?: string[];
  }): Promise<IntegrationTemplate[]> {
    const query = this.templateRepository.createQueryBuilder('template')
      .where('template.isActive = :isActive', { isActive: true });

    if (options?.category) {
      query.andWhere('template.category = :category', { category: options.category });
    }

    if (options?.isPublic !== undefined) {
      query.andWhere('template.isPublic = :isPublic', { isPublic: options.isPublic });
    }

    // Show public templates OR organization-specific templates
    if (options?.organizationId) {
      query.andWhere(
        '(template.isPublic = :isPublic OR template.organizationId = :organizationId)',
        { isPublic: true, organizationId: options.organizationId }
      );
    } else if (options?.isPublic === undefined) {
      query.andWhere('template.isPublic = :isPublic', { isPublic: true });
    }

    if (options?.search) {
      query.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search OR template.provider ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    if (options?.tags && options.tags.length > 0) {
      query.andWhere('template.tags && :tags', { tags: options.tags });
    }

    return await query.orderBy('template.useCount', 'DESC').getMany();
  }

  /**
   * Find one template by ID
   */
  async findOne(id: string, organizationId?: string): Promise<IntegrationTemplate> {
    const query = this.templateRepository.createQueryBuilder('template')
      .where('template.id = :id', { id })
      .andWhere('template.isActive = :isActive', { isActive: true });

    if (organizationId) {
      query.andWhere(
        '(template.isPublic = :isPublic OR template.organizationId = :organizationId)',
        { isPublic: true, organizationId }
      );
    } else {
      query.andWhere('template.isPublic = :isPublic', { isPublic: true });
    }

    const template = await query.getOne();

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Update a template
   */
  async update(id: string, dto: UpdateTemplateDto): Promise<IntegrationTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    await this.templateRepository.update(id, dto as any);
    return await this.templateRepository.findOne({ where: { id } }) as IntegrationTemplate;
  }

  /**
   * Increment use count when template is used
   */
  async incrementUseCount(id: string): Promise<void> {
    await this.templateRepository.increment({ id }, 'useCount', 1);
  }

  /**
   * Get popular templates
   */
  async getPopular(limit: number = 10, category?: TemplateCategory): Promise<IntegrationTemplate[]> {
    const query = this.templateRepository.createQueryBuilder('template')
      .where('template.isActive = :isActive', { isActive: true })
      .andWhere('template.isPublic = :isPublic', { isPublic: true });

    if (category) {
      query.andWhere('template.category = :category', { category });
    }

    return await query
      .orderBy('template.useCount', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Get templates by category
   */
  async getByCategory(category: TemplateCategory, organizationId?: string): Promise<IntegrationTemplate[]> {
    return await this.findAll({ category, organizationId });
  }

  /**
   * Search templates
   */
  async search(searchTerm: string, organizationId?: string): Promise<IntegrationTemplate[]> {
    return await this.findAll({ search: searchTerm, organizationId });
  }

  /**
   * Seed default templates (call during app initialization)
   */
  async seedDefaultTemplates(): Promise<void> {
    const existingCount = await this.templateRepository.count();
    if (existingCount > 0) {
      return; // Already seeded
    }

    const defaultTemplates: CreateTemplateDto[] = [
      {
        name: 'Stripe Payment',
        description: 'Accept payments using Stripe API',
        category: 'payment',
        provider: 'Stripe',
        icon: 'https://cdn.example.com/icons/stripe.svg',
        requiredCredentialType: 'api_key',
        configTemplate: {
          method: 'POST',
          endpoint: 'https://api.stripe.com/v1/payment_intents',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
        configFields: [
          {
            name: 'amount',
            type: 'number',
            label: 'Amount',
            description: 'Payment amount in cents',
            required: true,
            placeholder: '1000',
          },
          {
            name: 'currency',
            type: 'select',
            label: 'Currency',
            required: true,
            defaultValue: 'usd',
            options: [
              { value: 'usd', label: 'USD' },
              { value: 'eur', label: 'EUR' },
              { value: 'gbp', label: 'GBP' },
            ],
          },
        ],
        tags: ['payment', 'stripe', 'ecommerce'],
        isPublic: true,
        documentation: '# Stripe Payment\n\nCreate a payment intent to accept credit card payments.',
      },
      {
        name: 'SendGrid Email',
        description: 'Send transactional emails via SendGrid',
        category: 'messaging',
        provider: 'SendGrid',
        icon: 'https://cdn.example.com/icons/sendgrid.svg',
        requiredCredentialType: 'api_key',
        configTemplate: {
          method: 'POST',
          endpoint: 'https://api.sendgrid.com/v3/mail/send',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        configFields: [
          {
            name: 'from',
            type: 'text',
            label: 'From Email',
            required: true,
            placeholder: 'noreply@example.com',
          },
          {
            name: 'to',
            type: 'text',
            label: 'To Email',
            required: true,
            placeholder: 'user@example.com',
          },
          {
            name: 'subject',
            type: 'text',
            label: 'Subject',
            required: true,
          },
          {
            name: 'content',
            type: 'textarea',
            label: 'Email Content',
            required: true,
          },
        ],
        tags: ['email', 'sendgrid', 'messaging'],
        isPublic: true,
      },
      {
        name: 'Salesforce Create Lead',
        description: 'Create a new lead in Salesforce CRM',
        category: 'crm',
        provider: 'Salesforce',
        icon: 'https://cdn.example.com/icons/salesforce.svg',
        requiredCredentialType: 'oauth2',
        configTemplate: {
          method: 'POST',
          endpoint: '{{instance_url}}/services/data/v55.0/sobjects/Lead',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        configFields: [
          {
            name: 'firstName',
            type: 'text',
            label: 'First Name',
            required: true,
          },
          {
            name: 'lastName',
            type: 'text',
            label: 'Last Name',
            required: true,
          },
          {
            name: 'email',
            type: 'text',
            label: 'Email',
            required: true,
          },
          {
            name: 'company',
            type: 'text',
            label: 'Company',
            required: true,
          },
        ],
        tags: ['crm', 'salesforce', 'leads'],
        isPublic: true,
      },
      {
        name: 'Slack Message',
        description: 'Send a message to a Slack channel',
        category: 'messaging',
        provider: 'Slack',
        icon: 'https://cdn.example.com/icons/slack.svg',
        requiredCredentialType: 'oauth2',
        configTemplate: {
          method: 'POST',
          endpoint: 'https://slack.com/api/chat.postMessage',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        configFields: [
          {
            name: 'channel',
            type: 'text',
            label: 'Channel',
            description: 'Channel ID or name',
            required: true,
            placeholder: '#general',
          },
          {
            name: 'text',
            type: 'textarea',
            label: 'Message',
            required: true,
          },
        ],
        tags: ['messaging', 'slack', 'notifications'],
        isPublic: true,
      },
    ];

    for (const templateDto of defaultTemplates) {
      await this.create(templateDto);
    }
  }
}
