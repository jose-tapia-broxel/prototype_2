import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FieldMapping {
  source: string;
  target: string;
  transform?: string;
}

export interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  label?: string;
  path: string;
}

/**
 * Field Mapping UI Component
 * 
 * Visual interface for mapping source fields to target fields.
 * Supports JSONPath expressions and simple transformations.
 */
@Component({
  selector: 'app-field-mapping',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="field-mapping">
      <div class="mapping-header">
        <h3>Field Mapping</h3>
        <p>Map source fields to target fields</p>
      </div>

      <div class="mapping-container">
        <!-- Source Fields (Left) -->
        <div class="fields-panel source-panel">
          <h4>Source Fields</h4>
          <div class="field-list">
            <div
              *ngFor="let field of sourceFields"
              class="field-item"
              [class.mapped]="isSourceMapped(field.path)"
              (click)="selectSourceField(field)">
              <span class="field-name">{{ field.label || field.name }}</span>
              <span class="field-type">{{ field.type }}</span>
            </div>
          </div>

          <div class="add-custom-field">
            <input
              type="text"
              [(ngModel)]="customSourcePath"
              placeholder="Custom JSONPath (e.g., $.user.email)"
              class="form-control">
            <button
              type="button"
              (click)="addCustomSource()"
              [disabled]="!customSourcePath"
              class="btn-secondary">
              Add
            </button>
          </div>
        </div>

        <!-- Mapping Lines (Visual connections) -->
        <div class="mapping-lines">
          <!-- TODO: SVG lines connecting source to target -->
          <div class="mapping-arrow">→</div>
        </div>

        <!-- Mappings (Center) -->
        <div class="mappings-panel">
          <h4>Mappings</h4>
          
          <div *ngIf="mappings().length === 0" class="no-mappings">
            <p>No mappings yet. Click source and target fields to create mappings.</p>
          </div>

          <div class="mapping-list">
            <div *ngFor="let mapping of mappings(); let i = index" class="mapping-item">
              <div class="mapping-row">
                <div class="mapping-source">
                  <input
                    type="text"
                    [(ngModel)]="mapping.source"
                    placeholder="Source path"
                    class="form-control path-input">
                </div>

                <div class="mapping-arrow">→</div>

                <div class="mapping-target">
                  <input
                    type="text"
                    [(ngModel)]="mapping.target"
                    placeholder="Target field"
                    class="form-control path-input">
                </div>

                <button
                  type="button"
                  class="btn-icon"
                  (click)="removeMapping(i)">
                  ✕
                </button>
              </div>

              <div *ngIf="showTransforms()" class="mapping-transform">
                <input
                  type="text"
                  [(ngModel)]="mapping.transform"
                  placeholder="Optional: Transform expression (e.g., toUpperCase())"
                  class="form-control transform-input">
              </div>
            </div>
          </div>

          <button type="button" class="btn-secondary" (click)="addMapping()">
            + Add Mapping
          </button>
        </div>

        <!-- Target Fields (Right) -->
        <div class="fields-panel target-panel">
          <h4>Target Fields</h4>
          <div class="field-list">
            <div
              *ngFor="let field of targetFields"
              class="field-item"
              [class.mapped]="isTargetMapped(field.path)"
              (click)="selectTargetField(field)">
              <span class="field-name">{{ field.label || field.name }}</span>
              <span class="field-type">{{ field.type }}</span>
            </div>
          </div>

          <div class="add-custom-field">
            <input
              type="text"
              [(ngModel)]="customTargetPath"
              placeholder="Custom target field"
              class="form-control">
            <button
              type="button"
              (click)="addCustomTarget()"
              [disabled]="!customTargetPath"
              class="btn-secondary">
              Add
            </button>
          </div>
        </div>
      </div>

      <!-- Options -->
      <div class="mapping-options">
        <label class="checkbox-label">
          <input
            type="checkbox"
            [(ngModel)]="showTransformsFlag"
            (ngModelChange)="onShowTransformsChange()">
          Enable field transformations
        </label>
      </div>

      <!-- Preview -->
      <div *ngIf="previewEnabled" class="mapping-preview">
        <h4>Preview</h4>
        <div class="preview-panels">
          <div class="preview-panel">
            <h5>Sample Input</h5>
            <textarea
              [(ngModel)]="sampleInput"
              (ngModelChange)="updatePreview()"
              rows="8"
              class="form-control code-input"
              spellcheck="false"></textarea>
          </div>
          <div class="preview-panel">
            <h5>Output</h5>
            <pre class="preview-output">{{ previewOutput }}</pre>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="mapping-actions">
        <button type="button" class="btn-link" (click)="togglePreview()">
          {{ previewEnabled ? 'Hide' : 'Show' }} Preview
        </button>
        <button type="button" class="btn-secondary" (click)="onCancel()">
          Cancel
        </button>
        <button type="button" class="btn-primary" (click)="onSave()">
          Save Mappings
        </button>
      </div>
    </div>
  `,
  styles: [`
    .field-mapping {
      padding: 20px;
      background: white;
      border-radius: 8px;
    }

    .mapping-header {
      margin-bottom: 24px;
    }

    .mapping-header h3 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .mapping-header p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .mapping-container {
      display: grid;
      grid-template-columns: 1fr 60px 2fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
      min-height: 400px;
    }

    .fields-panel {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      background: #fafafa;
    }

    .fields-panel h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
    }

    .field-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }

    .field-item {
      padding: 8px 12px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s;
    }

    .field-item:hover {
      border-color: #1976d2;
      background: #f5f9ff;
    }

    .field-item.mapped {
      border-color: #4caf50;
      background: #f1f8f4;
    }

    .field-name {
      font-size: 14px;
      font-weight: 500;
      color: #333;
    }

    .field-type {
      font-size: 12px;
      color: #999;
      font-family: 'Consolas', monospace;
    }

    .add-custom-field {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e0e0e0;
    }

    .add-custom-field input {
      flex: 1;
    }

    .mapping-lines {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ccc;
    }

    .mapping-arrow {
      font-size: 24px;
      color: #ccc;
    }

    .mappings-panel {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
    }

    .mappings-panel h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
    }

    .no-mappings {
      padding: 24px;
      text-align: center;
      color: #999;
      font-size: 14px;
    }

    .mapping-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 12px;
    }

    .mapping-item {
      padding: 12px;
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .mapping-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto;
      gap: 8px;
      align-items: center;
    }

    .mapping-transform {
      margin-top: 8px;
    }

    .path-input,
    .transform-input {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
    }

    .form-control {
      padding: 6px 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      width: 100%;
    }

    .form-control:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
    }

    .btn-icon {
      width: 28px;
      height: 28px;
      padding: 0;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      color: #666;
      flex-shrink: 0;
    }

    .btn-icon:hover {
      background: #ffebee;
      color: #d32f2f;
      border-color: #d32f2f;
    }

    .btn-secondary {
      padding: 6px 12px;
      background: #f5f5f5;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #e0e0e0;
    }

    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .mapping-options {
      padding: 12px 0;
      border-top: 1px solid #e0e0e0;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .mapping-preview {
      margin-top: 24px;
      padding: 16px;
      background: #fafafa;
      border:1px solid #e0e0e0;
      border-radius: 8px;
    }

    .mapping-preview h4 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .preview-panels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .preview-panel h5 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 500;
      color: #666;
    }

    .code-input {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
    }

    .preview-output {
      padding: 8px 12px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      min-height: 200px;
      overflow: auto;
    }

    .mapping-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .btn-link {
      background: none;
      border: none;
      color: #1976d2;
      font-size: 14px;
      cursor: pointer;
      padding: 0;
    }

    .btn-link:hover {
      text-decoration: underline;
    }

    .btn-primary {
      padding: 8px 16px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    }

    .btn-primary:hover {
      background: #1565c0;
    }
  `]
})
export class FieldMappingComponent implements OnInit {
  @Input() sourceFields: FieldDefinition[] = [];
  @Input() targetFields: FieldDefinition[] = [];
  @Input() initialMappings?: FieldMapping[];

  @Output() save = new EventEmitter<FieldMapping[]>();
  @Output() cancel = new EventEmitter<void>();

  mappings = signal<FieldMapping[]>([]);
  
  selectedSource: FieldDefinition | null = null;
  selectedTarget: FieldDefinition | null = null;

  customSourcePath = '';
  customTargetPath = '';

  showTransformsFlag = false;
  previewEnabled = false;
  sampleInput = '{}';
  previewOutput = '{}';

  ngOnInit() {
    if (this.initialMappings) {
      this.mappings.set([...this.initialMappings]);
    }
  }

  addMapping() {
    this.mappings.update(m => [...m, { source: '', target: '', transform: '' }]);
  }

  removeMapping(index: number) {
    this.mappings.update(m => m.filter((_, i) => i !== index));
  }

  selectSourceField(field: FieldDefinition) {
    this.selectedSource = field;
    this.tryAutoMap();
  }

  selectTargetField(field: FieldDefinition) {
    this.selectedTarget = field;
    this.tryAutoMap();
  }

  tryAutoMap() {
    if (this.selectedSource && this.selectedTarget) {
      // Add mapping from selected source to target
      this.mappings.update(m => [
        ...m,
        {
          source: this.selectedSource!.path,
          target: this.selectedTarget!.path,
        }
      ]);
      this.selectedSource = null;
      this.selectedTarget = null;
    }
  }

  addCustomSource() {
    if (this.customSourcePath) {
      this.sourceFields.push({
        name: this.customSourcePath,
        type: 'string',
        path: this.customSourcePath,
      });
      this.customSourcePath = '';
    }
  }

  addCustomTarget() {
    if (this.customTargetPath) {
      this.targetFields.push({
        name: this.customTargetPath,
        type: 'string',
        path: this.customTargetPath,
      });
      this.customTargetPath = '';
    }
  }

  isSourceMapped(path: string): boolean {
    return this.mappings().some(m => m.source === path);
  }

  isTargetMapped(path: string): boolean {
    return this.mappings().some(m => m.target === path);
  }

  showTransforms(): boolean {
    return this.showTransformsFlag;
  }

  onShowTransformsChange() {
    // Transform flag changed
  }

  togglePreview() {
    this.previewEnabled = !this.previewEnabled;
    if (this.previewEnabled) {
      this.updatePreview();
    }
  }

  updatePreview() {
    try {
      const input = JSON.parse(this.sampleInput);
      const output: any = {};

      // Apply mappings to create output
      this.mappings().forEach(mapping => {
        if (mapping.source && mapping.target) {
          // Simple path extraction (real implementation would use JSONPath library)
          const value = this.getValueByPath(input, mapping.source);
          this.setValueByPath(output, mapping.target, value);
        }
      });

      this.previewOutput = JSON.stringify(output, null, 2);
    } catch (e) {
      this.previewOutput = 'Invalid input JSON';
    }
  }

  private getValueByPath(obj: any, path: string): any {
    // Simple path extraction ($.field.subfield → field.subfield)
    const cleanPath = path.replace(/^\$\./, '');
    return cleanPath.split('.').reduce((o, k) => o?.[k], obj);
  }

  private setValueByPath(obj: any, path: string, value: any): void {
    const cleanPath = path.replace(/^\$\./, '');
    const keys = cleanPath.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((o, k) => {
      if (!o[k]) o[k] = {};
      return o[k];
    }, obj);
    if (lastKey) target[lastKey] = value;
  }

  onSave() {
    // Filter out empty mappings
    const validMappings = this.mappings().filter(m => m.source && m.target);
    this.save.emit(validMappings);
  }

  onCancel() {
    this.cancel.emit();
  }
}
