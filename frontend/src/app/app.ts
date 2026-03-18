import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {RouterOutlet, RouterLink, RouterLinkActive, Router} from '@angular/router';
import { UxLevelService, UXLevel } from './ux-level.service';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  router = inject(Router);
  uxLevel = inject(UxLevelService);
  currentYear = new Date().getFullYear();

  setUxLevel(level: string) {
    if (level === 'simple' || level === 'advanced' || level === 'developer') {
      this.uxLevel.setLevel(level as UXLevel);
    }
  }

  openInNewTab() {
    window.open(window.location.href, '_blank');
  }

  isRunningWorkload() {
    return this.router.url.includes('/run/');
  }
}
