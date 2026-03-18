import { Injectable, computed, signal } from '@angular/core';

export type UXLevel = 'simple' | 'advanced' | 'developer';

@Injectable({ providedIn: 'root' })
export class UxLevelService {
  private readonly storageKey = 'broxel.uxLevel';
  private readonly levelSignal = signal<UXLevel>(this.readStoredLevel());

  readonly level = this.levelSignal.asReadonly();
  readonly isSimple = computed(() => this.level() === 'simple');
  readonly isAdvanced = computed(() => this.level() === 'advanced');
  readonly isDeveloper = computed(() => this.level() === 'developer');

  setLevel(level: UXLevel) {
    this.levelSignal.set(level);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.storageKey, level);
    }
  }

  canAccess(level: 'advanced' | 'developer') {
    const rank = { simple: 0, advanced: 1, developer: 2 };
    return rank[this.level()] >= rank[level];
  }

  private readStoredLevel(): UXLevel {
    if (typeof window === 'undefined') return 'simple';
    const raw = window.localStorage.getItem(this.storageKey);
    if (raw === 'advanced' || raw === 'developer' || raw === 'simple') return raw;
    return 'simple';
  }
}
