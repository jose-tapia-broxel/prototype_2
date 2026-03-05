import {Routes} from '@angular/router';
import {DashboardComponent} from './dashboard/dashboard.component';
import {WorkflowBuilderComponent} from './builder/workflow-builder.component';
import {WorkflowRendererComponent} from './renderer/workflow-renderer.component';
import {TemplateLibraryComponent} from './template-library/template-library.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'templates', component: TemplateLibraryComponent },
  { path: 'wizard/new', component: WorkflowBuilderComponent },
  { path: 'builder/:id', component: WorkflowBuilderComponent },
  { path: 'run/:id', component: WorkflowRendererComponent },
  { path: '**', redirectTo: '' }
];
