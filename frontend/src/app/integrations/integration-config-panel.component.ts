import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface IntegrationConfigField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'code' | 'credential';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  credentialType?: string; // For credential fields
}

export interface IntegrationConfig {
  integrationType: string;
  credentialId?: string;
  timeout?: number;
  errorHandling?: {
    strategy: 'retry' | 'fail' | 'fallback' | 'ignore';
    maxRetries?: number;
    retryDelayMs?: number;
    fallbackValue?: unknown;
  };
  [key: string]: unknown;
}

/**
 * Base Integration Config Panel Component
 * 
 * Provides a form-based UI for configuring integration nodes.
 * Dynamically renders form fields based on the field definitions.
 */
@Component({
  selector: 'app-integration-config-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="integration-config-panel">
      <div class="config-header">
        <h3>{{ title }}</h3>
        <p *ngIf="description" class="description">{{ description }}</p>
      </div>

      <div class="config-form">
        <!-- Credential Selector (if credentialType specified) -->
        <div *ngIf="requiredCredentialType" class="form-group credential-group">
          <label class="form-label">
            Credentials
            <span class="required">*</span>
          </label>
          <div class="credential-selector">
            <select 
              [(ngModel)]="config().credentialId"
              (ngModelChange)="onConfigChange()"
              class="form-control">
              <option value="">Select credential...</option>
              <option *ngFor="let cred of availableCredentials()" [value]="cred.id">
                {{ cred.name }}
              </option>
            </select>
            <button type="button" class="btn-secondary" (click)="onCreateCredential()">
              + New
            </button>
          </div>
        </div>

        <!-- Dynamic Fields -->
        <div *ngFor="let field of fields" class="form-group">
          <label [for]="field.name" class="form-label">
            {{ field.label }}
            <span *ngIf="field.required" class="required">*</span>
          </label>
          <p *ngIf="field.description" class="field-description">{{ field.description }}</p>

          <!-- Text Input -->
          <input
            *ngIf="field.type === 'text'"
            [id]="field.name"
            type="text"
            [(ngModel)]="config()[field.name]"
            (ngModelChange)="onConfigChange()"
            [placeholder]="field.placeholder || ''"
            [required]="!!field.required"
            class="form-control">

          <!-- Number Input -->
          <input
            *ngIf="field.type === 'number'"
            [id]="field.name"
            type="number"
            [(ngModel)]="config()[field.name]"
            (ngModelChange)="onConfigChange()"
            [placeholder]="field.placeholder || ''"
            [required]="!!field.required"
            class="form-control">

          <!-- Textarea -->
          <textarea
            *ngIf="field.type === 'textarea'"
            [id]="field.name"
            [(ngModel)]="config()[field.name]"
            (ngModelChange)="onConfigChange()"
            [placeholder]="field.placeholder || ''"
            [required]="!!field.required"
            rows="4"
            class="form-control"></textarea>

          <!-- Select Dropdown -->
          <select
            *ngIf="field.type === 'select'"
            [id]="field.name"
            [(ngModel)]="config()[field.name]"
            (ngModelChange)="onConfigChange()"
            [required]="!!field.required"
            class="form-control">
            <option value="">Select {{ field.label }}...</option>
            <option *ngFor="let opt of field.options" [value]="opt.value">
              {{ opt.label }}
            </option>
          </select>

          <!-- Boolean Checkbox -->
          <label *ngIf="field.type === 'boolean'" class="checkbox-label">
            <input
              [id]="field.name"
              type="checkbox"
              [(ngModel)]="config()[field.name]"
              (ngModelChange)="onConfigChange()">
            Enable {{ field.label }}
          </label>

          <!-- Code Editor (Monaco) -->
          <div *ngIf="field.type === 'code'" class="code-editor-wrapper">
            <textarea
              [id]="field.name"
              [(ngModel)]="config()[field.name]"
              (ngModelChange)="onConfigChange()"
              [placeholder]="field.placeholder || ''"
              rows="6"
              class="form-control code-input"
              spellcheck="false"></textarea>
          </div>
        </div>

        <!-- Advanced Settings (Collapsible) -->
        <div class="advanced-settings">
          <button
            type="button"
            class="btn-link"
            (click)="showAdvanced.set(!showAdvanced())">
            {{ showAdvanced() ? '▼' : '▶' }} Advanced Settings
          </button>

          <div *ngIf="showAdvanced()" class="advanced-settings-content">
            <!-- Timeout -->
            <div class="form-group">
              <label class="form-label">Timeout (ms)</label>
              <input
                type="number"
                [(ngModel)]="config().timeout"
                (ngModelChange)="onConfigChange()"
                placeholder="30000"
                class="form-control">
            </div>

            <!-- Error Handling Strategy -->
            <div class="form-group">
              <label class="form-label">Error Handling</label>
              <select
                [(ngModel)]="errorStrategy"
                (ngModelChange)="onErrorStrategyChange($event)"
                class="form-control">
                <option value="fail">Fail workflow on error</option>
                <option value="retry">Retry on error</option>
                <option value="fallback">Use fallback value</option>
                <option value="ignore">Ignore and continue</option>
              </select>
            </div>

            <!-- Retry Settings (if strategy is retry) -->
            <div *ngIf="errorStrategy === 'retry'" class="form-group">
              <label class="form-label">Max Retries</label>
              <input
                type="number"
                [(ngModel)]="maxRetries"
                (ngModelChange)="updateErrorHandling()"
                placeholder="3"
                class="form-control">
            </div>

            <div *ngIf="errorStrategy === 'retry'" class="form-group">
              <label class="form-label">Retry Delay (ms)</label>
              <input
                type="number"
                [(ngModel)]="retryDelayMs"
                (ngModelChange)="updateErrorHandling()"
                placeholder="1000"
                class="form-control">
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="config-actions">
        <button type="button" class="btn-secondary" (click)="onCancel()">
          Cancel
        </button>
        <button type="button" class="btn-primary" (click)="onTest()" [disabled]="!isValid()">
          Test Connection
        </button>
        <button type="button" class="btn-primary" (click)="onSave()" [disabled]="!isValid()">
          Save
        </button>
      </div>
    </div>
  `,
  styles: [`
    .integration-config-panel {
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .config-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .config-header h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .description {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .config-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 14px;
      font-weight: 500;
      color: #333;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .required {
      color: #d32f2f;
    }

    .field-description {
      font-size: 12px;
      color: #666;
      margin: -4px 0 4px 0;
    }

    .form-control {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
    }

    .code-input {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
    }

    .credential-selector {
      display: flex;
      gap: 8px;
    }

    .credential-selector select {
      flex: 1;
    }

    .btn-secondary {
      padding: 8px 16px;
      background: #f5f5f5;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .btn-primary {
      padding: 8px 16px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1565c0;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-link {
      background: none;
      border: none;
      color: #1976d2;
      font-size: 14px;
      cursor: pointer;
      padding: 8px 0;
      text-align: left;
    }

    .btn-link:hover {
      text-decoration: underline;
    }

    .advanced-settings {
      margin-top: 8px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .advanced-settings-content {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .config-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: normal;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
  `]
})
export class IntegrationConfigPanelComponent implements OnInit {
  @Input() title = 'Configure Integration';
  @Input() description = '';
  @Input() fields: IntegrationConfigField[] = [];
  @Input() requiredCredentialType?: string;
  @Input() initialConfig?: Partial<IntegrationConfig>;

  @Output() configChange = new EventEmitter<IntegrationConfig>();
  @Output() save = new EventEmitter<IntegrationConfig>();
  @Output() cancel = new EventEmitter<void>();
  @Output() test = new EventEmitter<IntegrationConfig>();
  @Output() createCredential = new EventEmitter<string>(); // credential type

  config = signal<IntegrationConfig>({
    integrationType: '',
    timeout: 30000,
    errorHandling: {
      strategy: 'fail',
    },
  });

  availableCredentials = signal<Array<{ id: string; name: string }>>([]);
  showAdvanced = signal(false);

  errorStrategy = 'fail';
  maxRetries = 3;
  retryDelayMs = 1000;

  ngOnInit() {
    // Initialize config with defaults and initial values
    if (this.initialConfig) {
      this.config.set({ ...this.config(), ...this.initialConfig });

      // Extract error handling settings
      if (this.initialConfig.errorHandling) {
        this.errorStrategy = this.initialConfig.errorHandling.strategy || 'fail';
        this.maxRetries = this.initialConfig.errorHandling.maxRetries || 3;
        this.retryDelayMs = this.initialConfig.errorHandling.retryDelayMs || 1000;
      }
    }

    // Set default values for fields
    this.fields.forEach(field => {
      if (field.defaultValue !== undefined && this.config()[field.name] === undefined) {
        this.config()[field.name] = field.defaultValue;
      }
    });

    // TODO: Load available credentials from backend
    // this.loadCredentials();
  }

  onConfigChange() {
    this.configChange.emit(this.config());
  }

  onErrorStrategyChange(strategy: string) {
    this.errorStrategy = strategy;
    this.updateErrorHandling();
  }

  updateErrorHandling() {
    const updatedConfig = { ...this.config() };
    updatedConfig.errorHandling = {
      strategy: this.errorStrategy as any,
      ...(this.errorStrategy === 'retry' && {
        maxRetries: this.maxRetries,
        retryDelayMs: this.retryDelayMs,
      }),
    };
    this.config.set(updatedConfig);
    this.onConfigChange();
  }

  onSave() {
    if (this.isValid()) {
      this.save.emit(this.config());
    }
  }

  onCancel() {
    this.cancel.emit();
  }

  onTest() {
    if (this.isValid()) {
      this.test.emit(this.config());
    }
  }

  onCreateCredential() {
    this.createCredential.emit(this.requiredCredentialType || 'api_key');
  }

  isValid(): boolean {
    // Check if required credential is selected
    if (this.requiredCredentialType && !this.config().credentialId) {
      return false;
    }

    // Check if all required fields are filled
    return this.fields
      .filter(f => f.required)
      .every(f => {
        const value = this.config()[f.name];
        return value !== undefined && value !== null && value !== '';
      });
  }

  // TODO: Load credentials from backend API
  private loadCredentials() {
    // Example implementation:
    // this.http.get<Credential[]>('/api/credentials').subscribe(credentials => {
    //   this.availableCredentials.set(credentials);
    // });
  }
}
