import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IntegrationConfigPanelComponent,
  IntegrationConfigField,
  IntegrationConfig,
} from './integration-config-panel.component';

export interface ApiCallConfig extends IntegrationConfig {
  integrationType: 'api_call';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: Record<string, unknown> | string;
  authType?: 'none' | 'bearer' | 'api_key' | 'basic' | 'oauth2';
}

/**
 * API Call Configuration Panel
 * 
 * Form-based UI for configuring API Call integration nodes.
 * Supports HTTP method selection, URL templates, headers, query params,
 * body payload, and authentication.
 */
@Component({
  selector: 'app-api-call-config',
  standalone: true,
  imports: [CommonModule, FormsModule, IntegrationConfigPanelComponent],
  template: `
    <div class="api-call-config">
      <!-- HTTP Method & URL -->
      <div class="method-url-section">
        <div class="method-selector">
          <label class="form-label">Method</label>
          <select [(ngModel)]="config().method" (ngModelChange)="onConfigChange()" class="form-control">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
        </div>

        <div class="url-input">
          <label class="form-label">
            URL <span class="required">*</span>
          </label>
          <input
            type="text"
            [(ngModel)]="config().url"
            (ngModelChange)="onConfigChange()"
            placeholder="https://api.example.com/endpoint"
            class="form-control url-field">
          <small class="hint">Use \{\{variable\}\} for dynamic values</small>
        </div>
      </div>

      <!-- Auth Type Selector -->
      <div class="form-group">
        <label class="form-label">Authentication</label>
        <select [(ngModel)]="config().authType" (ngModelChange)="onAuthTypeChange()" class="form-control">
          <option value="none">None</option>
          <option value="api_key">API Key</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="oauth2">OAuth 2.0</option>
        </select>
      </div>

      <!-- Credential Selector (if auth required) -->
      <div *ngIf="config().authType !== 'none'" class="form-group">
        <label class="form-label">
          Credentials <span class="required">*</span>
        </label>
        <div class="credential-selector">
          <select [(ngModel)]="config().credentialId" (ngModelChange)="onConfigChange()" class="form-control">
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

      <!-- Headers Section -->
      <div class="section">
        <button type="button" class="btn-link" (click)="showHeaders.set(!showHeaders())">
          {{ showHeaders() ? '▼' : '▶' }} Headers ({{ Object.keys(config().headers || {}).length }})
        </button>
        <div *ngIf="showHeaders()" class="key-value-list">
          <div *ngFor="let header of headers(); let i = index" class="key-value-item">
            <input
              type="text"
              [(ngModel)]="header.key"
              (ngModelChange)="updateHeaders()"
              placeholder="Header name"
              class="form-control key-input">
            <input
              type="text"
              [(ngModel)]="header.value"
              (ngModelChange)="updateHeaders()"
              placeholder="Value"
              class="form-control value-input">
            <button type="button" class="btn-icon" (click)="removeHeader(i)">
              ✕
            </button>
          </div>
          <button type="button" class="btn-secondary" (click)="addHeader()">
            + Add Header
          </button>
        </div>
      </div>

      <!-- Query Parameters Section -->
      <div class="section">
        <button type="button" class="btn-link" (click)="showQueryParams.set(!showQueryParams())">
          {{ showQueryParams() ? '▼' : '▶' }} Query Parameters ({{ Object.keys(config().queryParams || {}).length }})
        </button>
        <div *ngIf="showQueryParams()" class="key-value-list">
          <div *ngFor="let param of queryParams(); let i = index" class="key-value-item">
            <input
              type="text"
              [(ngModel)]="param.key"
              (ngModelChange)="updateQueryParams()"
              placeholder="Parameter name"
              class="form-control key-input">
            <input
              type="text"
              [(ngModel)]="param.value"
              (ngModelChange)="updateQueryParams()"
              placeholder="Value"
              class="form-control value-input">
            <button type="button" class="btn-icon" (click)="removeQueryParam(i)">
              ✕
            </button>
          </div>
          <button type="button" class="btn-secondary" (click)="addQueryParam()">
            + Add Parameter
          </button>
        </div>
      </div>

      <!-- Request Body (for POST/PUT/PATCH) -->
      <div *ngIf="hasBody()" class="section">
        <label class="form-label">Request Body</label>
        <div class="body-editor">
          <div class="body-format-selector">
            <label>
              <input type="radio" [(ngModel)]="bodyFormat" (ngModelChange)="onBodyFormatChange()" value="json" name="bodyFormat">
              JSON
            </label>
            <label>
              <input type="radio" [(ngModel)]="bodyFormat" (ngModelChange)="onBodyFormatChange()" value="raw" name="bodyFormat">
              Raw
            </label>
          </div>
          <textarea
            [(ngModel)]="bodyText"
            (ngModelChange)="onBodyChange()"
            placeholder='{ "key": "value" }'
            rows="8"
            class="form-control code-input"
            spellcheck="false"></textarea>
        </div>
      </div>

      <!-- Use Base Component for advanced settings -->
      <app-integration-config-panel
        [title]="''"
        [description]="''"
        [fields]="[]"
        [initialConfig]="config()"
        (configChange)="onBaseConfigChange($event)"
        (save)="onSave()"
        (cancel)="onCancel()"
        (test)="onTest()">
      </app-integration-config-panel>
    </div>
  `,
  styles: [`
    .api-call-config {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .method-url-section {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 12px;
      align-items: start;
    }

    .url-field {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
    }

    .hint {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #666;
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

    .form-control {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
    }

    .form-control:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
    }

    .credential-selector {
      display: flex;
      gap: 8px;
    }

    .credential-selector select {
      flex: 1;
    }

    .section {
      padding: 16px 0;
     border-top: 1px solid #e0e0e0;
    }

    .btn-link {
      background: none;
      border: none;
      color: #1976d2;
      font-size: 14px;
      cursor: pointer;
      padding: 0;
      text-align: left;
      font-weight: 500;
    }

    .btn-link:hover {
      text-decoration: underline;
    }

    .key-value-list {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .key-value-item {
      display: grid;
      grid-template-columns: 1fr 2fr auto;
      gap: 8px;
      align-items: center;
    }

    .key-input, .value-input {
      font-size: 13px;
    }

    .btn-icon {
      width: 32px;
      height: 32px;
      padding: 0;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
    }

    .btn-icon:hover {
      background: #f5f5f5;
      color: #d32f2f;
    }

    .btn-secondary {
      padding: 6px 12px;
      background: #f5f5f5;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      align-self: flex-start;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .body-editor {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .body-format-selector {
      display: flex;
      gap: 16px;
      font-size: 14px;
    }

    .body-format-selector label {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }

    .code-input {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
    }
  `]
})
export class ApiCallConfigComponent implements OnInit {
  @Input() initialConfig?: Partial<ApiCallConfig>;
  
  @Output() save = new EventEmitter<ApiCallConfig>();
  @Output() cancel = new EventEmitter<void>();
  @Output() test = new EventEmitter<ApiCallConfig>();
  @Output() createCredential = new EventEmitter<string>();

  config = signal<ApiCallConfig>({
    integrationType: 'api_call',
    method: 'GET',
    url: '',
    headers: {},
    queryParams: {},
    authType: 'none',
    timeout: 30000,
  });

  availableCredentials = signal<Array<{ id: string; name: string }>>([]);
  
  showHeaders = signal(false);
  showQueryParams = signal(false);

  headers = signal<Array<{ key: string; value: string }>>([]);
  queryParams = signal<Array<{ key: string; value: string }>>([]);

  bodyFormat: 'json' | 'raw' = 'json';
  bodyText = '';

  Object = Object; // Make Object available in template

  ngOnInit() {
    if (this.initialConfig) {
      this.config.set({ ...this.config(), ...this.initialConfig });

      // Convert headers object to array
      if (this.initialConfig.headers) {
        this.headers.set(
          Object.entries(this.initialConfig.headers).map(([key, value]) => ({ key, value }))
        );
      }

      // Convert query params object to array
      if (this.initialConfig.queryParams) {
        this.queryParams.set(
          Object.entries(this.initialConfig.queryParams).map(([key, value]) => ({ key, value }))
        );
      }

      // Set body text
      if (this.initialConfig.body) {
        this.bodyText = typeof this.initialConfig.body === 'string'
          ? this.initialConfig.body
          : JSON.stringify(this.initialConfig.body, null, 2);
        this.bodyFormat = typeof this.initialConfig.body === 'string' ? 'raw' : 'json';
      }
    }

    // TODO: Load available credentials
    // this.loadCredentials();
  }

  onConfigChange() {
    // Config updated - could emit change event if needed
  }

  onAuthTypeChange() {
    if (this.config().authType === 'none') {
      const updated = { ...this.config() };
      delete updated.credentialId;
      this.config.set(updated);
    }
    this.onConfigChange();
  }

  onBaseConfigChange(baseConfig: IntegrationConfig) {
    // Merge base config changes (excluding integrationType to maintain type)
    const { integrationType, ...baseChanges } = baseConfig;
    this.config.set({ ...this.config(), ...baseChanges } as ApiCallConfig);
  }

  addHeader() {
    this.headers.update(h => [...h, { key: '', value: '' }]);
  }

  removeHeader(index: number) {
    this.headers.update(h => h.filter((_, i) => i !== index));
    this.updateHeaders();
  }

  updateHeaders() {
    const headersObj: Record<string, string> = {};
    this.headers()
      .filter(h => h.key.trim() !== '')
      .forEach(h => {
        headersObj[h.key] = h.value;
      });
    this.config().headers = headersObj;
    this.onConfigChange();
  }

  addQueryParam() {
    this.queryParams.update(q => [...q, { key: '', value: '' }]);
  }

  removeQueryParam(index: number) {
    this.queryParams.update(q => q.filter((_, i) => i !== index));
    this.updateQueryParams();
  }

  updateQueryParams() {
    const paramsObj: Record<string, string> = {};
    this.queryParams()
      .filter(p => p.key.trim() !== '')
      .forEach(p => {
        paramsObj[p.key] = p.value;
      });
    this.config().queryParams = paramsObj;
    this.onConfigChange();
  }

  onBodyFormatChange() {
    // Format changed - keep current text but may need conversion
    this.onBodyChange();
  }

  onBodyChange() {
    if (this.bodyFormat === 'json') {
      try {
        this.config().body = JSON.parse(this.bodyText || '{}');
      } catch (e) {
        // Invalid JSON - keep as string for now
        this.config().body = this.bodyText;
      }
    } else {
      this.config().body = this.bodyText;
    }
    this.onConfigChange();
  }

  hasBody(): boolean {
    return ['POST', 'PUT', 'PATCH'].includes(this.config().method);
  }

  onSave() {
    this.save.emit(this.config());
  }

  onCancel() {
    this.cancel.emit();
  }

  onTest() {
    this.test.emit(this.config());
  }

  onCreateCredential() {
    const credType = this.config().authType === 'oauth2' ? 'oauth2' : 'api_key';
    this.createCredential.emit(credType);
  }
}
