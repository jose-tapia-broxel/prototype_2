import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Permission } from './models';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);

  private requiredPermissions: Permission | Permission[] = [];
  private hasView = false;

  @Input() set appHasPermission(permissions: Permission | Permission[]) {
    this.requiredPermissions = permissions;
    this.updateView();
  }

  constructor() {
    // This effect runs whenever the user's permissions change
    // It automatically re-evaluates the condition and updates the DOM
    effect(() => {
      // We read the signal to trigger the effect dependency
      this.authService.permissions();
      this.updateView();
    });
  }

  private updateView() {
    // If the user hasn't loaded yet, don't show anything
    if (this.authService.isLoading()) {
      this.clearView();
      return;
    }

    const hasAccess = this.authService.hasPermissions(this.requiredPermissions);

    if (hasAccess && !this.hasView) {
      // User has permission and view is not rendered -> Render it
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasAccess && this.hasView) {
      // User lost permission and view is rendered -> Remove it
      this.clearView();
    }
  }

  private clearView() {
    this.viewContainer.clear();
    this.hasView = false;
  }
}
