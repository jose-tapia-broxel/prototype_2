import { Injectable, signal } from '@angular/core';
import { LocalizedString } from './models/workflow.model';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  currentLang = signal<'en' | 'es'>('en');

  setLanguage(lang: 'en' | 'es') {
    this.currentLang.set(lang);
  }

  getLocalized(val: LocalizedString | undefined): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[this.currentLang()] || val['en'] || '';
  }
}
