import { Type } from '@angular/core';

export interface PluginMetadata {
  id: string;               // e.g., 'core.shortText', 'com.broxel.signature'
  version: string;          // e.g., '1.0.0'
  name: string;             // Human readable name
  icon?: string;            // Material icon name
  category: string;         // 'Inputs', 'Advanced', 'Layout'
  
  // JSON Schema defining the configuration options available in the Builder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configurationSchema?: Record<string, any>; 
}

export interface UIPluginComponent {
  // Inputs injected by the Core Renderer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fieldId: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly: any;
  
  // Outputs / Events
  // In Angular 16+, these would typically be EventEmitters or output() signals
  // For the interface, we define the expected method signatures that the Core will bind to
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onValueChange: (newValue: any) => void;
  onStatusChange: (status: 'VALID' | 'INVALID' | 'PENDING') => void;
  
  // Mandatory methods
  validate(): string[] | null; // Returns array of error messages or null if valid
}

export interface PluginRegistration {
  metadata: PluginMetadata;
  component: Type<UIPluginComponent>;
}
