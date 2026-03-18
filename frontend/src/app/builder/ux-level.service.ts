import { Injectable, signal } from '@angular/core';

export type UxLevel = 'simple' | 'advanced' | 'developer';

const ACCESS_RANK: Record<UxLevel, number> = {
  simple: 1,
  advanced: 2,
  developer: 3
};

@Injectable({
  providedIn: 'root'
})
export class UxLevelService {
  private readonly levelSignal = signal<UxLevel>('simple');

  level() {
    return this.levelSignal();
  }

  setLevel(value: string | UxLevel) {
    if (value === 'simple' || value === 'advanced' || value === 'developer') {
      this.levelSignal.set(value);
      return;
    }
    this.levelSignal.set('simple');
  }

  canAccess(required: UxLevel) {
    return ACCESS_RANK[this.levelSignal()] >= ACCESS_RANK[required];
  }

  isSimple() {
    return this.levelSignal() === 'simple';
  }
}
