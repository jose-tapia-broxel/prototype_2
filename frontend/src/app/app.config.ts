import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  APP_INITIALIZER
} from '@angular/core';
import {provideRouter} from '@angular/router';
import {provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';

import {routes} from './app.routes';
import {mockBackendInterceptor} from './mock-backend.interceptor';
import {orgIdInterceptor} from './core/interceptors/org-id.interceptor';
import {errorHandlingInterceptor} from './core/interceptors/error-handling.interceptor';
import { PluginRegistryService } from '../core/plugins/registry.service';
import { ShortTextPluginComponent } from './plugins/short-text.plugin';

export function initializePlugins(registry: PluginRegistryService) {
  return () => {
    registry.register({
      id: 'shortText', // Keep backward compatibility with existing JSON
      version: '1.0.0',
      name: 'Short Text',
      icon: 'short_text',
      category: 'Inputs',
      configurationSchema: {
        placeholder: { type: 'string' }
      }
    }, ShortTextPluginComponent);
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withFetch(), 
      withInterceptors([
        orgIdInterceptor,
        errorHandlingInterceptor,
        mockBackendInterceptor
      ])
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializePlugins,
      deps: [PluginRegistryService],
      multi: true
    }
  ],
};
