import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { UIPluginComponent } from '../../core/plugins/models';

@Component({
  selector: 'app-short-text-plugin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="field-container">
      <input 
        type="text" 
        [id]="fieldId()" 
        [formControl]="control"
        class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50/50" 
        [placeholder]="config()?.placeholder || ''"
        [readonly]="readonly()"
      >
      @if (control.invalid && (control.dirty || control.touched)) {
        <div class="text-red-500 text-xs mt-1">
          @if (control.errors?.['required']) {
            This field is required.
          }
        </div>
      }
    </div>
  `
})
export class ShortTextPluginComponent implements UIPluginComponent {
  fieldId = input.required<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value = input<any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config = input<any>();
  readonly = input<boolean>(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valueChange = output<any>();
  statusChange = output<'VALID' | 'INVALID' | 'PENDING'>();

  control = new FormControl('');

  constructor() {
    // Sync internal control with external value
    this.control.valueChanges.subscribe((val: unknown) => {
      this.valueChange.emit(val);
      this.statusChange.emit(this.control.valid ? 'VALID' : 'INVALID');
    });
  }

  // Bind the interface methods to the outputs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onValueChange = (newValue: any) => this.valueChange.emit(newValue);
  onStatusChange = (status: 'VALID' | 'INVALID' | 'PENDING') => this.statusChange.emit(status);

  validate(): string[] | null {
    if (this.control.invalid) {
      return ['Invalid short text field'];
    }
    return null;
  }
}
