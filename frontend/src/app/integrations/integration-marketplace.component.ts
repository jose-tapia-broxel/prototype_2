import { Component, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface IntegrationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'api' | 'database' | 'messaging' | 'storage' | 'analytics' | 'payment' | 'crm' | 'productivity' | 'custom';
  provider: string;
  icon?: string;
  requiredCredentialType?: string;
  configTemplate: Record<string, unknown>;
  useCount: number;
  rating?: number;
}

/**
 * Integration Template Marketplace Component
 * 
 * Browse and select pre-built integration templates.
 * Shows popular integrations, categories, and search.
 */
@Component({
  selector: 'app-integration-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="marketplace">
      <div class="marketplace-header">
        <h2>Integration Marketplace</h2>
        <p>Choose from popular integrations or build your own</p>
      </div>

      <!-- Search & Filter -->
      <div class="search-section">
        <div class="search-bar">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
            placeholder="Search integrations..."
            class="search-input">
        </div>

        <div class="category-filters">
          <button
            *ngFor="let cat of categories"
            [class.active]="selectedCategory() === cat.value"
            (click)="selectCategory(cat.value)"
            class="category-btn">
            {{ cat.label }}
          </button>
        </div>
      </div>

      <!-- Popular Templates -->
      <div *ngIf="!searchQuery && !selectedCategory()" class="popular-section">
        <h3>Popular Integrations</h3>
        <div class="template-grid">
          <div
            *ngFor="let template of popularTemplates()"
            class="template-card"
            (click)="selectTemplate(template)">
            <div class="template-icon">
              <img *ngIf="template.icon" [src]="template.icon" [alt]="template.name">
              <div *ngIf="!template.icon" class="icon-placeholder">
                {{ template.name.charAt(0) }}
              </div>
            </div>
            <div class="template-info">
              <h4>{{ template.name }}</h4>
              <p class="template-description">{{ template.description }}</p>
              <div class="template-meta">
                <span class="provider">{{ template.provider }}</span>
                <span class="use-count">{{ template.useCount }} uses</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- All Templates / Search Results -->
      <div class="templates-section">
        <h3>
          {{ searchQuery ? 'Search Results' : (selectedCategory() ? categoryLabel() : 'All Integrations') }}
        </h3>
        
        <div *ngIf="filteredTemplates().length === 0" class="no-results">
          <p>No integrations found</p>
        </div>

        <div class="template-grid">
          <div
            *ngFor="let template of filteredTemplates()"
            class="template-card"
            (click)="selectTemplate(template)">
            <div class="template-icon">
              <img *ngIf="template.icon" [src]="template.icon" [alt]="template.name">
              <div *ngIf="!template.icon" class="icon-placeholder">
                {{ template.name.charAt(0) }}
              </div>
            </div>
            <div class="template-info">
              <h4>{{ template.name }}</h4>
              <p class="template-description">{{ template.description }}</p>
              <div class="template-meta">
                <span class="category-badge">{{ template.category }}</span>
                <span class="provider">{{ template.provider }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Integration Option -->
      <div class="custom-section">
        <button class="custom-btn" (click)="createCustom()">
          <span class="plus-icon">+</span>
          Create Custom Integration
        </button>
      </div>
    </div>
  `,
  styles: [`
    .marketplace {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .marketplace-header {
      margin-bottom: 32px;
    }

    .marketplace-header h2 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 600;
      color: #333;
    }

    .marketplace-header p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .search-section {
      margin-bottom: 32px;
    }

    .search-bar {
      margin-bottom: 16px;
    }

    .search-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-size: 15px;
    }

    .search-input:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
    }

    .category-filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .category-btn {
      padding: 8px 16px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 20px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .category-btn:hover {
      background: #f5f5f5;
      border-color: #ccc;
    }

    .category-btn.active {
      background: #1976d2;
      color: white;
      border-color: #1976d2;
    }

    .popular-section,
    .templates-section {
      margin-bottom: 32px;
    }

    h3 {
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .template-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .template-card {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .template-card:hover {
      border-color: #1976d2;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .template-icon {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .template-icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .icon-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 600;
      color: #666;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .template-info {
      flex: 1;
      min-width: 0;
    }

    .template-info h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .template-description {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #666;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .template-meta {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }

    .category-badge {
      padding: 2px 8px;
      background: #e3f2fd;
      color: #1976d2;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .provider {
      font-size: 12px;
      color: #999;
    }

    .use-count {
      font-size: 12px;
      color: #999;
    }

    .no-results {
      padding: 48px;
      text-align: center;
      color: #999;
    }

    .custom-section {
      padding: 24px 0;
      border-top: 2px solid #e0e0e0;
    }

    .custom-btn {
      width: 100%;
      padding: 16px;
      background: white;
      border: 2px dashed #ccc;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      color: #1976d2;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .custom-btn:hover {
      background: #f5f9ff;
      border-color: #1976d2;
    }

    .plus-icon {
      font-size: 24px;
      font-weight: 300;
    }
  `]
})
export class IntegrationMarketplaceComponent implements OnInit {
  @Output() templateSelected = new EventEmitter<IntegrationTemplate>();
  @Output() customSelected = new EventEmitter<void>();

  searchQuery = '';
  selectedCategory = signal<string | null>(null);

  categories = [
    { value: null, label: 'All' },
    { value: 'api', label: 'API' },
    { value: 'messaging', label: 'Messaging' },
    { value: 'payment', label: 'Payment' },
    { value: 'crm', label: 'CRM' },
    { value: 'storage', label: 'Storage' },
    { value: 'database', label: 'Database' },
  ];

  // Mock templates - in production, load from backend
  allTemplates = signal<IntegrationTemplate[]>([
    {
      id: '1',
      name: 'Stripe Payment',
      description: 'Accept payments using Stripe API',
      category: 'payment',
      provider: 'Stripe',
      requiredCredentialType: 'api_key',
      configTemplate: {},
      useCount: 1543,
      rating: 4.8,
    },
    {
      id: '2',
      name: 'SendGrid Email',
      description: 'Send transactional emails via SendGrid',
      category: 'messaging',
      provider: 'SendGrid',
      requiredCredentialType: 'api_key',
      configTemplate: {},
      useCount: 987,
      rating: 4.6,
    },
    {
      id: '3',
      name: 'Salesforce Lead',
      description: 'Create leads in Salesforce CRM',
      category: 'crm',
      provider: 'Salesforce',
      requiredCredentialType: 'oauth2',
      configTemplate: {},
      useCount: 756,
      rating: 4.7,
    },
    {
      id: '4',
      name: 'Slack Message',
      description: 'Send messages to Slack channels',
      category: 'messaging',
      provider: 'Slack',
      requiredCredentialType: 'oauth2',
      configTemplate: {},
      useCount: 2103,
      rating: 4.9,
    },
  ]);

  popularTemplates = signal<IntegrationTemplate[]>([]);
  filteredTemplates = signal<IntegrationTemplate[]>([]);

  ngOnInit() {
    // Set popular templates (top 4 by use count)
    const sorted = [...this.allTemplates()].sort((a, b) => b.useCount - a.useCount);
    this.popularTemplates.set(sorted.slice(0, 4));

    // Initially show all templates
    this.filteredTemplates.set(this.allTemplates());

    // TODO: Load templates from backend
    // this.loadTemplates();
  }

  selectCategory(category: string | null) {
    this.selectedCategory.set(category);
    this.filterTemplates();
  }

  onSearch() {
    this.filterTemplates();
  }

  filterTemplates() {
    let filtered = [...this.allTemplates()];

    // Filter by category
    if (this.selectedCategory()) {
      filtered = filtered.filter(t => t.category === this.selectedCategory());
    }

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.provider.toLowerCase().includes(query)
      );
    }

    this.filteredTemplates.set(filtered);
  }

  selectTemplate(template: IntegrationTemplate) {
    this.templateSelected.emit(template);
  }

  createCustom() {
    this.customSelected.emit();
  }

  categoryLabel(): string {
    const cat = this.categories.find(c => c.value === this.selectedCategory());
    return cat?.label || 'All Integrations';
  }

  // TODO: Load templates from backend API
  private loadTemplates() {
    // Example:
    // this.http.get<IntegrationTemplate[]>('/api/integration-templates').subscribe(templates => {
    //   this.allTemplates.set(templates);
    //   this.filterTemplates();
    // });
  }
}
