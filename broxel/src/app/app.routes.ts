import {Routes} from '@angular/router';
import {DashboardComponent} from './dashboard/dashboard.component';
import {WorkflowBuilderComponent} from './builder/workflow-builder.component';
import {WorkflowRendererComponent} from './renderer/workflow-renderer.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'builder/:id', component: WorkflowBuilderComponent },
  { path: 'run/:id', component: WorkflowRendererComponent },
  { path: '**', redirectTo: '' }
];
