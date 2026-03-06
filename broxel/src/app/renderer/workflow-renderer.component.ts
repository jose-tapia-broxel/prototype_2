import { Component, inject, OnInit, signal, computed, ElementRef, ViewChild, effect, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorkflowService } from '../workflow.service';
import { WorkflowDefinition, LocalizedString, FormField } from '../models/workflow.model';
import { LanguageService } from '../language.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import confetti from 'canvas-confetti';
import { PluginRegistryService } from '../../core/plugins/registry.service';
import { SandboxIframeComponent } from '../../core/security/sandbox-iframe.component';
import { AuthService } from '../../core/auth/auth.service';
import { TelemetryService } from '../../core/telemetry/telemetry.service';
import { Permission } from '../../core/auth/models';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { ExplainabilityService } from '../../core/explainability/explainability.service';
import { ExplainabilityResult } from '../../core/explainability/models';

@Component({
  selector: 'app-workflow-renderer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SandboxIframeComponent, HasPermissionDirective],
  templateUrl: './workflow-renderer.component.html',
  styleUrl: './workflow-renderer.component.css',
  host: { class: 'flex-1 flex flex-col' }
})
export class WorkflowRendererComponent implements OnInit {
  private fb = inject(FormBuilder);
  private workflowService = inject(WorkflowService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private platformId = inject(PLATFORM_ID);
  lang = inject(LanguageService);
  registry = inject(PluginRegistryService);
  authService = inject(AuthService);
  telemetry = inject(TelemetryService);
  explainability = inject(ExplainabilityService);

  @ViewChild('customFieldEl') set customFieldEls(elements: ElementRef[]) {
    if (elements) {
      // Logic to run JS for custom fields could go here
    }
  }

  workflow = signal<WorkflowDefinition | null>(null);
  currentStepIndex = signal(0);
  
  currentStep = computed(() => {
    const wf = this.workflow();
    if (!wf || !wf.steps || wf.steps.length === 0) return null;
    return wf.steps[this.currentStepIndex()];
  });

  isLastStep = computed(() => {
    const wf = this.workflow();
    if (!wf) return false;
    return this.currentStepIndex() === wf.steps.length - 1;
  });

  progressPercentage = computed(() => {
    const wf = this.workflow();
    if (!wf || wf.steps.length === 0) return 0;
    return ((this.currentStepIndex() + 1) / wf.steps.length) * 100;
  });

  stepForm: FormGroup = this.fb.group({});
  formData: Record<string, unknown> = {};

  explainabilityTarget = signal<string>('');
  explainabilityResult = signal<ExplainabilityResult | null>(null);

  availableExplainabilityTargets = computed(() => {
    const step = this.currentStep();
    if (!step) return [];
    const fields = step.layout || step.fields || [];
    return fields.map((field) => ({ id: field.id, label: this.getLocalized(field.label) || field.id }));
  });

  selectedDevice = signal<string>('iphone-15');
  isLandscape = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);
  viewportWidth = signal<number>(isPlatformBrowser(this.platformId) ? window.innerWidth : 1024);
  viewportHeight = signal<number>(isPlatformBrowser(this.platformId) ? window.innerHeight : 768);

  devices = [
    { id: 'iphone-15', name: 'iPhone 15 Pro', width: '393px', height: '852px', platform: 'apple', icon: this.sanitizer.bypassSecurityTrustHtml('<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>') },
    { id: 'iphone-15-max', name: 'iPhone 15 Pro Max', width: '430px', height: '932px', platform: 'apple', icon: this.sanitizer.bypassSecurityTrustHtml('<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>') },
    { id: 'iphone-se', name: 'iPhone SE', width: '375px', height: '667px', platform: 'apple', icon: this.sanitizer.bypassSecurityTrustHtml('<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>') },
    { id: 'pixel-8', name: 'Pixel 8', width: '412px', height: '915px', platform: 'android', icon: this.sanitizer.bypassSecurityTrustHtml('<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>') },
    { id: 's23-ultra', name: 'S23 Ultra', width: '390px', height: '844px', platform: 'android', icon: this.sanitizer.bypassSecurityTrustHtml('<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>') },
    { id: 'pixel-fold', name: 'Pixel Fold', width: '840px', height: '1080px', platform: 'android', icon: this.sanitizer.bypassSecurityTrustHtml('<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>') },
    { id: 'ipad', name: 'iPad Air', width: '820px', height: '1180px', platform: 'apple', icon: this.sanitizer.bypassSecurityTrustHtml('<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>') },
    { id: 'desktop', name: 'Desktop', width: '100%', height: '100%', platform: 'web', icon: this.sanitizer.bypassSecurityTrustHtml('<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>') }
  ];

  currentDevice = computed(() => {
    return this.devices.find(d => d.id === this.selectedDevice()) || this.devices[0];
  });

  previewScale = computed(() => {
    const device = this.currentDevice();
    if (device.id === 'desktop') return 1;
    
    const dw = parseInt(this.isLandscape() ? device.height : device.width) + 24; // + border
    const dh = parseInt(this.isLandscape() ? device.width : device.height) + 24;
    
    const availableW = this.viewportWidth() - 64;
    const availableH = this.viewportHeight() - 250;
    
    return Math.min(1, availableW / dw, availableH / dh);
  });

  getPluginComponent(type: string) {
    return this.registry.getComponent(type);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPluginValueChange(fieldId: string, value: any) {
    this.stepForm.get(fieldId)?.setValue(value);
  }

  onPluginStatusChange() {
    // Handle status change if needed
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSandboxValueChange(fieldId: string, value: any) {
    this.stepForm.get(fieldId)?.setValue(value);
  }

  onSandboxStatusChange() {
    // Handle status change if needed
  }

  hasPermission(permission: Permission): boolean {
    return this.authService.hasPermissions(permission);
  }

  private lastStepId: string | null = null;

  constructor() {
    effect(() => {
      const step = this.currentStep();
      if (step && step.id !== this.lastStepId) {
        // Run onDestroy for previous step if it exists
        if (this.lastStepId) {
          const prevStep = this.workflow()?.steps.find(s => s.id === this.lastStepId);
          if (prevStep?.onDestroyCode) {
            this.executeCode(prevStep.onDestroyCode);
          }
        }

        // Run onLoadingCode (equivalent to 'loading' state)
        this.executeCode(step.onLoadingCode);
        
        // Run onInteractiveCode (equivalent to 'interactive' state)
        setTimeout(() => {
          this.executeCode(step.onInteractiveCode);
        }, 50);

        // Run onCompleteCode (equivalent to 'complete' state)
        setTimeout(() => {
          this.executeCode(step.onCompleteCode);
        }, 150);

        this.lastStepId = step.id;
      }
    });
  }

  getLocalized(val: LocalizedString | undefined): string {
    return this.lang.getLocalized(val);
  }

  isCustomField(type: string): boolean {
    return !!this.workflow()?.customToolbox?.find(f => f.id === type);
  }

  getCustomFieldHtml(field: FormField): SafeHtml {
    const customDef = this.workflow()?.customToolbox?.find(f => f.id === field.type);
    if (!customDef) return this.sanitizer.bypassSecurityTrustHtml('');
    
    // Simple template replacement
    let html = customDef.html;
    html = html.replace(/\{\{label\}\}/g, this.getLocalized(field.label));
    html = html.replace(/\{\{placeholder\}\}/g, this.getLocalized(field.placeholder));
    
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  getCustomFieldCss(type: string): SafeHtml {
    const customDef = this.workflow()?.customToolbox?.find(f => f.id === type);
    return customDef ? this.sanitizer.bypassSecurityTrustHtml(customDef.css) : this.sanitizer.bypassSecurityTrustHtml('');
  }

  getSanitizedHtml(html: string | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || '');
  }

  getSanitizedCss(css: string | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(css || '');
  }

  executeCode(code: string | undefined) {
    if (!code) return;
    try {
      // Create a function from the code and call it
      const fn = new Function('context', code);
      fn({
        form: this.stepForm,
        formData: this.formData,
        workflow: this.workflow(),
        step: this.currentStep(),
        router: this.router,
        confetti: confetti
      });
    } catch (e) {
      console.error('Error executing custom code:', e);
    }
  }

  getOptions(options: string[] | Record<string, string[]> | undefined): string[] {
    if (!options) return [];
    if (Array.isArray(options)) return options;
    return options[this.lang.currentLang()] || options['en'] || [];
  }

  getStepHeight(): number {
    const step = this.currentStep();
    if (!step || !step.fields || step.fields.length === 0) return 600;
    const maxY = Math.max(...step.fields.map(f => (f.position?.y || 0) + (f.dimensions?.height || 90)));
    return Math.max(600, maxY + 250); // Header + Footer + Padding
  }

  isFieldVisible(fieldId: string): boolean {
    const step = this.currentStep();
    if (!step?.bindings) return true;

    const expression = step.bindings[`visible.${fieldId}`];
    if (!expression) return true;

    return this.explainability.explain(
      { type: 'missing_field', targetId: fieldId },
      step,
      { ...this.formData, ...this.stepForm?.value },
      this.telemetry.getRecentEvents(100)
    ).dependencyChain.some((node) => node.nodeType === 'rule' && node.evaluation === 'true');
  }

  openExplainability(targetId: string) {
    const step = this.currentStep();
    if (!step) return;

    const snapshot = { ...this.formData, ...this.stepForm?.value };
    const result = this.explainability.explain(
      { type: 'missing_field', targetId },
      step,
      snapshot,
      this.telemetry.getRecentEvents(150)
    );

    this.explainabilityTarget.set(targetId);
    this.explainabilityResult.set(result);

    this.telemetry.trackEvent('FIELD_INTERACTED', { explainabilityOpened: true, targetId }, step.id, targetId);
  }

  clearExplainability() {
    this.explainabilityTarget.set('');
    this.explainabilityResult.set(null);
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.isFullscreen.set(params.get('fullscreen') === 'true');
      if (this.isFullscreen()) {
        this.selectedDevice.set('desktop');
      }
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadWorkflow(id);
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('resize', () => {
        this.viewportWidth.set(window.innerWidth);
        this.viewportHeight.set(window.innerHeight);
      });
    }
  }

  loadWorkflow(id: string) {
    this.workflowService.getWorkflow(id).subscribe(data => {
      this.workflow.set(data);
      this.buildFormForCurrentStep();
      
      // Initialize telemetry session
      this.telemetry.startSession(id, 'tenant_123', 'user_456');
      this.telemetry.trackEvent('STEP_VIEWED', {}, this.currentStep()?.id);
    });
  }

  buildFormForCurrentStep() {
    const step = this.currentStep();
    if (!step) return;

    const group: Record<string, FormControl> = {};
    const fieldsToProcess = step.layout || step.fields || [];
    
    fieldsToProcess.forEach(field => {
      const isInteractive = ['message', 'container', 'ssoLogin', 'button', 'effect'].includes(field.type) || 
                           (field.type === 'text' && field.label === 'Static Text');
      
      if (!isInteractive) {
        const validators = field.required ? [Validators.required] : [];
        // Initialize with existing data if we went back
        const initialValue = this.formData[field.id] !== undefined ? this.formData[field.id] : (field.type === 'checkbox' ? false : '');
        group[field.id] = new FormControl(initialValue, validators);
      }
    });

    this.stepForm = this.fb.group(group);
    this.clearExplainability();
  }

  saveCurrentStepData() {
    if (this.stepForm.valid) {
      this.formData = { ...this.formData, ...this.stepForm.value };
    }
  }

  nextStep() {
    if (this.stepForm.valid) {
      this.saveCurrentStepData();
      if (!this.isLastStep()) {
        this.currentStepIndex.update(i => i + 1);
        this.buildFormForCurrentStep();
        
        // Track step transition
        this.telemetry.trackEvent('STEP_VIEWED', {}, this.currentStep()?.id);
      } else {
        console.log('Workflow complete!', this.formData);
        this.telemetry.trackEvent('WORKFLOW_COMPLETED', { finalDataSize: JSON.stringify(this.formData).length });
      }
    } else {
      // Track validation failure
      const invalidFields = Object.keys(this.stepForm.controls).filter(key => this.stepForm.controls[key].invalid);
      this.telemetry.trackEvent('VALIDATION_FAILED', { invalidFields }, this.currentStep()?.id);
      
      this.stepForm.markAllAsTouched();
    }
  }

  previousStep() {
    if (this.currentStepIndex() > 0) {
      this.saveCurrentStepData();
      this.currentStepIndex.update(i => i - 1);
      this.buildFormForCurrentStep();
    }
  }

  onFileSelected(event: Event, fieldId: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.formData[fieldId + '_preview'] = e.target?.result;
        this.formData[fieldId] = input.files![0].name;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  triggerEffect() {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  }

  submitWorkflow() {
    if (this.stepForm.valid) {
      this.saveCurrentStepData();
      const wfId = this.workflow()?.id;
      if (wfId) {
        this.workflowService.submitWorkflow(wfId, this.formData).subscribe(() => {
          alert('Workflow submitted successfully!');
          this.router.navigate(['/']);
        });
      }
    } else {
      this.stepForm.markAllAsTouched();
    }
  }
}
