import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {RouterOutlet, RouterLink, RouterLinkActive, Router} from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  router = inject(Router);
  currentYear = new Date().getFullYear();

  openInNewTab() {
    window.open(window.location.href, '_blank');
  }

  isRunningWorkload() {
    return this.router.url.includes('/run/');
  }
}
