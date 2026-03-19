import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntegrationConfigPanelComponent, IntegrationConfig } from './integration-config-panel.component';

export interface CacheOperationConfig extends IntegrationConfig {
  integrationType: 'cache_operation';
  operation: 'read' | 'write' | 'invalidate' | 'exists';
  key: string;
  ttl?: number;
  value?: unknown;
}

/**
 * Cache Operation Configuration Panel
 * 
 * Simple form for configuring cache operations (read, write, invalidate).
 */
@Component({
  selector: 'app-cache-config',
  standalone: true,
  imports: [CommonModule, FormsModule, IntegrationConfigPanelComponent],
  template: `
    <div class="cache-config">
      <h3>Cache Operation</h3>
      <p class="description">Manage cached data to improve performance</p>

      <div class="form-group">
        <label class="form-label">
          Operation <span class="required">*</span>
        </label>
        <select [(ngModel)]="config().operation" (ngModelChange)="onOperationChange()" class="form-control">
          <option value="read">Read from cache</option>
          <option value="write">Write to cache</option>
          <option value="invalidate">Invalidate (delete)</option>
          <option value="exists">Check if exists</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">
          Cache Key <span class="required">*</span>
        </label>
        <input
          type="text"
          [(ngModel)]="config().key"
          placeholder="e.g., user_profile_{{userId}}"
          class="form-control"
        />
        <small class="hint">Use \{\{variable\}\} for dynamic keys</small>
      </div>

      <div *ngIf="config().operation === 'write'" class="form-group">
        <label class="form-label">
          TTL (Time to Live) <span class="optional">optional</span>
        </label>
        <input
          type="number"
          [(ngModel)]="config().ttl"
          placeholder="3600"
          class="form-control"
        />
        <small class="hint">Time in seconds before cache expires (default: never)</small>
      </div>

      <div *ngIf="config().operation === 'write'" class="form-group">
        <label class="form-label">
          Value <span class="required">*</span>
        </label>
        <textarea
          [(ngModel)]="valueText"
          (ngModelChange)="onValueChange()"
          placeholder='{ "data": "value" } or use {{context.variable}}'
          rows="6"
          class="form-control code-input"
          spellcheck="false"></textarea>
        <small class="hint">JSON object or template variable reference</small>
      </div>

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
    .cache-config {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px;
    }

    h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .description {
      margin: 0;
      color: #666;
      font-size: 14px;
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

    .optional {
      color: #999;
      font-weight: normal;
      font-size: 12px;
    }

    .form-control {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
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

    .hint {
      display: block;
      font-size: 12px;
      color: #666;
    }
  `]
})
export class CacheConfigComponent implements OnInit {
  @Input() initialConfig?: Partial<CacheOperationConfig>;
  
  @Output() save = new EventEmitter<CacheOperationConfig>();
  @Output() cancel = new EventEmitter<void>();
  @Output() test = new EventEmitter<CacheOperationConfig>();

  config = signal<CacheOperationConfig>({
    integrationType: 'cache_operation',
    operation: 'read',
    key: '',
    timeout: 5000,
  });

  valueText = '';

  ngOnInit() {
    if (this.initialConfig) {
      this.config.set({ ...this.config(), ...this.initialConfig });
      
      if (this.initialConfig.value) {
        this.valueText = typeof this.initialConfig.value === 'string'
          ? this.initialConfig.value
          : JSON.stringify(this.initialConfig.value, null, 2);
      }
    }
  }

  onOperationChange() {
    // Reset value when operation changes
    if (this.config().operation !== 'write') {
      const updated = { ...this.config() };
      delete updated.value;
      delete updated.ttl;
      this.config.set(updated);
      this.valueText = '';
    }
  }

  onValueChange() {
    try {
      this.config().value = JSON.parse(this.valueText);
    } catch (e) {
      // Keep as string if not valid JSON (might be template variable)
      this.config().value = this.valueText;
    }
  }

  onBaseConfigChange(baseConfig: IntegrationConfig) {
    const { integrationType, ...baseChanges } = baseConfig;
    this.config.set({ ...this.config(), ...baseChanges } as CacheOperationConfig);
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
}
