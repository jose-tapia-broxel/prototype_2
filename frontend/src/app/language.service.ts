import { Injectable, signal } from '@angular/core';
import { LocalizedString } from './models/workflow.model';

type AppLocale = 'en' | 'es';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly fallbackLang: AppLocale = 'en';
  private readonly translations: Record<AppLocale, Record<string, string>> = {
    en: {
      'nav.dashboard': 'Dashboard',
      'nav.newProcess': 'New Process',
      'nav.wizard': 'Wizard',
      'nav.insights': 'Business Insights',
      'footer.product': 'Broxel Process Builder.',
      'footer.documentation': 'Documentation',
      'footer.support': 'Support',
      'footer.terms': 'Terms'
    },
    es: {
      'nav.dashboard': 'Panel',
      'nav.newProcess': 'Nuevo Proceso',
      'nav.wizard': 'Asistente',
      'nav.insights': 'Insights de Negocio',
      'footer.product': 'Constructor de Procesos Broxel.',
      'footer.documentation': 'Documentación',
      'footer.support': 'Soporte',
      'footer.terms': 'Términos'
    }
  };
  currentLang = signal<AppLocale>(this.getInitialLang());

  setLanguage(lang: AppLocale) {
    this.currentLang.set(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('app.lang', lang);
    }
  }

  getLocalized(val: LocalizedString | undefined): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[this.currentLang()] || val['en'] || '';
  }

  t(key: string): string {
    const lang = this.currentLang();
    return this.translations[lang]?.[key] ?? this.translations[this.fallbackLang]?.[key] ?? key;
  }

  private getInitialLang(): AppLocale {
    if (typeof window === 'undefined') return this.fallbackLang;
    const saved = window.localStorage.getItem('app.lang');
    return saved === 'es' || saved === 'en' ? saved : this.fallbackLang;
  }
}
