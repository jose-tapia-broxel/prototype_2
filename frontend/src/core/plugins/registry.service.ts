import { Injectable, Type } from '@angular/core';
import { PluginMetadata, PluginRegistration, UIPluginComponent } from './models';

@Injectable({
  providedIn: 'root'
})
export class PluginRegistryService {
  private plugins = new Map<string, PluginRegistration>();

  register(metadata: PluginMetadata, component: Type<UIPluginComponent>): void {
    if (this.plugins.has(metadata.id)) {
      console.warn(`Plugin with ID ${metadata.id} is already registered. Overwriting.`);
    }
    
    this.plugins.set(metadata.id, { metadata, component });
    console.log(`Registered plugin: ${metadata.id} v${metadata.version}`);
  }

  getComponent(id: string): Type<UIPluginComponent> | null {
    const registration = this.plugins.get(id);
    return registration ? registration.component : null;
  }

  getMetadata(id: string): PluginMetadata | null {
    const registration = this.plugins.get(id);
    return registration ? registration.metadata : null;
  }

  getAllPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map(p => p.metadata);
  }
}
