import {Routes} from '@angular/router';
import {DashboardComponent} from './dashboard/dashboard.component';
import {WorkflowBuilderComponent} from './builder/workflow-builder.component';
import {WorkflowRendererComponent} from './renderer/workflow-renderer.component';
import {BusinessInsightsComponent} from './business-insights/business-insights.component';
import {WorkflowWizardComponent} from './builder/workflow-wizard.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'wizard/new', component: WorkflowWizardComponent },
  { path: 'builder/:id', component: WorkflowBuilderComponent },
  { path: 'run/:id', component: WorkflowRendererComponent },
  { path: 'insights', component: BusinessInsightsComponent },
  { path: '**', redirectTo: '' }
];
