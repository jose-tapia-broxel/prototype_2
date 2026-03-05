import { Component, inject, OnInit, signal, computed, effect, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { WorkflowService } from '../workflow.service';
import { WorkflowDefinition, FieldType, FormField, WorkflowNavigation, WorkflowStep, LocalizedString, CustomFieldDefinition } from '../models/workflow.model';
import { LanguageService } from '../language.service';
import { NaturalLanguageWorkflowService } from '../nl-workflow.service';

interface DraggableField {
  type: FieldType;
  label: string;
  icon: SafeHtml;
  isCustom?: boolean;
}

@Component({
  selector: 'app-workflow-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, DragDropModule],
  templateUrl: './workflow-builder.component.html',
  styleUrl: './workflow-builder.component.css',
  host: { class: 'flex-1 flex flex-col' }
})
export class WorkflowBuilderComponent implements OnInit {
  private fb = inject(FormBuilder);
  private workflowService = inject(WorkflowService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private nlWorkflowService = inject(NaturalLanguageWorkflowService);
  lang = inject(LanguageService);

  private sanitizer = inject(DomSanitizer);

  workflowId = signal<string | null>(null);
  isNew = computed(() => this.workflowId() === 'new');

  nameControl = this.fb.control('', Validators.required);
  descriptionControl = this.fb.control('');
  categoryControl = this.fb.control('');

  Math = Math;
  steps: { 
    id: string; 
    title: LocalizedString; 
    fields: FormField[]; 
    navigation?: WorkflowNavigation; 
    position?: {x: number, y: number}; 
    dimensions?: {width: number, height: number}; 
    stateCode?: string; 
    onLoadingCode?: string;
    onInteractiveCode?: string;
    onCompleteCode?: string;
    onDestroyCode?: string;
    htmlCode?: string; 
    cssCode?: string 
  }[] = [];
  selectedField = signal<FormField | null>(null);

  zoom = signal(1);
  pan = signal({ x: 0, y: 0 });
  isPanning = signal(false);
  lastMousePos = { x: 0, y: 0 };

  draggingStep = signal<string | null>(null);
  resizingStep = signal<string | null>(null);
  editingCodeForStep = signal<string | null>(null);
  activeCodeTab = signal<'html' | 'css' | 'loading' | 'interactive' | 'complete' | 'onDestroy'>('loading');

  customFields = signal<CustomFieldDefinition[]>([]);
  editingCustomField = signal<CustomFieldDefinition | null>(null);
  activeCustomFieldTab = signal<'html' | 'css' | 'js'>('html');

  draggingField = signal<{ field: FormField, step: WorkflowStep } | null>(null);
  resizingField = signal<{ field: FormField, step: WorkflowStep } | null>(null);

  isConnecting = signal(false);
  connectingFrom = signal<string | null>(null);
  hoveredTargetStep = signal<string | null>(null);
  currentMousePos = signal({ x: 0, y: 0 });

  computedConnections = computed(() => {
    const conns = [];
    for (const step of this.steps) {
      if (step.navigation?.nextStep) {
        const target = this.steps.find(s => s.id === step.navigation!.nextStep);
        if (target) {
          const startX = (step.position?.x || 0) + (step.dimensions?.width || 360);
          const startY = (step.position?.y || 0) + ((step.dimensions?.height || 650) / 2);
          const endX = (target.position?.x || 0);
          const endY = (target.position?.y || 0) + ((target.dimensions?.height || 650) / 2);
          
          const cp1x = startX + Math.max(100, (endX - startX) / 2);
          const cp2x = endX - Math.max(100, (endX - startX) / 2);
          
          conns.push({
            id: `${step.id}-${target.id}`,
            path: `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`
          });
        }
      }
    }
    return conns;
  });

  private platformId = inject(PLATFORM_ID);

  tempConnectionPath = computed(() => {
    if (!this.isConnecting() || !this.connectingFrom()) return '';
    const source = this.steps.find(s => s.id === this.connectingFrom());
    if (!source) return '';
    
    const startX = (source.position?.x || 0) + (source.dimensions?.width || 360);
    const startY = (source.position?.y || 0) + ((source.dimensions?.height || 650) / 2);
    
    if (!isPlatformBrowser(this.platformId)) return '';
    
    const container = document.getElementById('canvas-container');
    if (!container) return '';
    const rect = container.getBoundingClientRect();
    const endX = (this.currentMousePos().x - rect.left - this.pan().x) / this.zoom();
    const endY = (this.currentMousePos().y - rect.top - this.pan().y) / this.zoom();

    const cp1x = startX + Math.max(100, (endX - startX) / 2);
    const cp2x = endX - Math.max(100, (endX - startX) / 2);
    
    return `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
  });

  availableFields: DraggableField[] = [];
  
  allFields = computed(() => {
    const standard = this.availableFields;
    const custom = this.customFields().map(f => ({
      type: f.id as FieldType,
      label: f.name,
      icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>'),
      isCustom: true
    }));
    return [...standard, ...custom];
  });

  workflowMetadata: { name: LocalizedString, description: LocalizedString } = { name: { en: '', es: '' }, description: { en: '', es: '' } };
  naturalPrompt = '';
  generationWarnings = signal<string[]>([]);

  constructor() {
    effect(() => {
      this.lang.currentLang();
      this.nameControl.setValue(this.getLocalized(this.workflowMetadata.name), { emitEvent: false });
      this.descriptionControl.setValue(this.getLocalized(this.workflowMetadata.description), { emitEvent: false });
    });
  }

  ngOnInit() {
    this.availableFields = [
      { type: 'shortText', label: 'Short Text', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>') },
      { type: 'longText', label: 'Long Text', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>') },
      { type: 'number', label: 'Number', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm7.5-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zM7.5 15h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 005.25 3.75v9a2.25 2.25 0 002.25 2.25z" /></svg>') },
      { type: 'email', label: 'Email', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>') },
      { type: 'dropdown', label: 'Dropdown', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>') },
      { type: 'checkbox', label: 'Checkbox', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>') },
      { type: 'password', label: 'Password', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>') },
      { type: 'ssoLogin', label: 'SSO Login', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>') },
      { type: 'message', label: 'Message', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>') },
      { type: 'container', label: 'Container', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 4.5h13.5c.414 0 .75.336.75.75v13.5c0 .414-.336.75-.75.75H5.25a.75.75 0 01-.75-.75V5.25c0-.414.336-.75.75-.75zM6 6v12h12V6H6z" /></svg>') },
      { type: 'text', label: 'Static Text', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>') },
      { type: 'select', label: 'Radio Group', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 12a3 3 0 106 0 3 3 0 00-6 0z" /></svg>') },
      { type: 'carousel', label: 'Carousel', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>') },
      { type: 'button', label: 'Button', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 12h13.5m-13.5 0a2.25 2.25 0 012.25-2.25h9a2.25 2.25 0 012.25 2.25m-13.5 0a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25" /></svg>') },
      { type: 'effect', label: 'Effect', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.456-2.454L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>') },
      { type: 'imageDropzone', label: 'Image Dropzone', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>') },
      { type: 'drawing', label: 'Drawing', icon: this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122l9.37-9.37a2.121 2.121 0 113 3l-9.37 9.37a4.5 4.5 0 01-1.897 1.13L7 21l.379-3.263a4.5 4.5 0 011.13-1.897l9.37-9.37zm0 0L19.5 7.122m-10 9l-2.25 2.25" /></svg>') }
    ];

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.workflowId.set(id);
      
      if (id && id !== 'new') {
        this.loadWorkflow(id);
      } else if (id === 'new') {
        this.addStep(); // Add an initial step for new workflows
      }
    });
  }

  onCanvasMouseDown(e: MouseEvent) {
    // Only allow left click (0) or middle click (1) for panning
    if (e.button !== 0 && e.button !== 1) return;

    const target = e.target as HTMLElement;
    // Start panning if we click the container background, the transform layer background, or through a pointer-events-none element
    if (target.id === 'canvas-container' || target.id === 'canvas-transform' || target.closest('.pointer-events-none')) {
      this.isPanning.set(true);
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      
      // Prevent default middle-click behavior (autoscroll)
      if (e.button === 1) {
        e.preventDefault();
      }
    }
  }

  onCanvasMouseMove(e: MouseEvent) {
    this.currentMousePos.set({ x: e.clientX, y: e.clientY });

    if (this.isPanning()) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      this.pan.update(p => ({ x: p.x + dx, y: p.y + dy }));
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    } else if (this.draggingStep()) {
      const dx = (e.clientX - this.lastMousePos.x) / this.zoom();
      const dy = (e.clientY - this.lastMousePos.y) / this.zoom();
      
      const step = this.steps.find(s => s.id === this.draggingStep());
      if (step) {
        if (!step.position) step.position = { x: 0, y: 0 };
        step.position.x += dx;
        step.position.y += dy;
      }
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    } else if (this.resizingStep()) {
      const dx = (e.clientX - this.lastMousePos.x) / this.zoom();
      const dy = (e.clientY - this.lastMousePos.y) / this.zoom();
      
      const step = this.steps.find(s => s.id === this.resizingStep());
      if (step) {
        if (!step.dimensions) step.dimensions = { width: 360, height: 650 };
        step.dimensions.width = Math.max(250, step.dimensions.width + dx);
        step.dimensions.height = Math.max(300, step.dimensions.height + dy);
      }
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    } else if (this.draggingField()) {
      const dx = (e.clientX - this.lastMousePos.x) / this.zoom();
      const dy = (e.clientY - this.lastMousePos.y) / this.zoom();
      const { field, step } = this.draggingField()!;
      
      const availableWidth = (step.dimensions?.width || 360) - 48;
      const dxPercent = (dx / availableWidth) * 100;
      
      if (!field.position) field.position = { x: 0, y: 0 };
      if (!field.dimensions) field.dimensions = { width: 100, height: 90 };
      
      field.position.x = Math.max(0, Math.min(100 - field.dimensions.width, field.position.x + dxPercent));
      field.position.y = Math.max(0, field.position.y + dy);
      
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    } else if (this.resizingField()) {
      const dx = (e.clientX - this.lastMousePos.x) / this.zoom();
      const dy = (e.clientY - this.lastMousePos.y) / this.zoom();
      const { field, step } = this.resizingField()!;
      
      const availableWidth = (step.dimensions?.width || 360) - 48;
      const dxPercent = (dx / availableWidth) * 100;

      if (!field.dimensions) field.dimensions = { width: 100, height: 90 };
      if (!field.position) field.position = { x: 0, y: 0 };

      field.dimensions.width = Math.max(10, Math.min(100 - field.position.x, field.dimensions.width + dxPercent));
      field.dimensions.height = Math.max(30, field.dimensions.height + dy);
      
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    }
  }

  onCanvasMouseUp() {
    this.isPanning.set(false);
    this.draggingStep.set(null);
    this.resizingStep.set(null);
    this.draggingField.set(null);
    this.resizingField.set(null);
    if (this.isConnecting()) {
      if (this.hoveredTargetStep() && this.connectingFrom() !== this.hoveredTargetStep()) {
        const sourceStep = this.steps.find(s => s.id === this.connectingFrom());
        if (sourceStep) {
          if (!sourceStep.navigation) sourceStep.navigation = {};
          sourceStep.navigation.nextStep = this.hoveredTargetStep() || undefined;
        }
      }
      this.isConnecting.set(false);
      this.connectingFrom.set(null);
    }
  }

  onResizeMouseDown(e: MouseEvent, stepId: string) {
    e.stopPropagation();
    this.resizingStep.set(stepId);
    this.lastMousePos = { x: e.clientX, y: e.clientY };
  }

  onFieldDragMouseDown(e: MouseEvent, field: FormField, step: WorkflowStep) {
    e.stopPropagation();
    this.draggingField.set({ field, step });
    this.lastMousePos = { x: e.clientX, y: e.clientY };
  }

  onFieldResizeMouseDown(e: MouseEvent, field: FormField, step: WorkflowStep) {
    e.stopPropagation();
    this.resizingField.set({ field, step });
    this.lastMousePos = { x: e.clientX, y: e.clientY };
  }

  onCanvasWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.002;
      const newZoom = Math.min(Math.max(0.1, this.zoom() + delta), 3);
      
      const container = document.getElementById('canvas-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomRatio = newZoom / this.zoom();
        const newPanX = mouseX - (mouseX - this.pan().x) * zoomRatio;
        const newPanY = mouseY - (mouseY - this.pan().y) * zoomRatio;
        
        this.pan.set({ x: newPanX, y: newPanY });
      }
      
      this.zoom.set(newZoom);
    } else {
      // Don't pan if we're scrolling over a scrollable element (like a step's field list)
      const target = e.target as HTMLElement;
      if (target.closest('.overflow-y-auto')) return;
      
      this.pan.update(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }

  onStepMouseDown(e: MouseEvent, step: WorkflowStep) {
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input' || (e.target as HTMLElement).tagName.toLowerCase() === 'button') return;
    e.stopPropagation();
    this.draggingStep.set(step.id);
    this.lastMousePos = { x: e.clientX, y: e.clientY };
  }

  onConnectorMouseDown(e: MouseEvent, stepId: string) {
    e.stopPropagation();
    this.isConnecting.set(true);
    this.connectingFrom.set(stepId);
    this.currentMousePos.set({ x: e.clientX, y: e.clientY });
  }

  getStepTitle(stepId: string | null | undefined): string {
    if (!stepId) return 'Unknown Step';
    const step = this.steps.find(s => s.id === stepId);
    return step ? this.getLocalized(step.title) : 'Unknown Step';
  }

  getLocalized(val: LocalizedString | undefined): string {
    return this.lang.getLocalized(val);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setLocalized(obj: any, key: string, value: string) {
    const target = obj as Record<string, string | Record<string, string> | undefined>;
    const currentVal = target[key];
    if (!currentVal || typeof currentVal === 'string') {
      const oldVal = (currentVal as string) || '';
      target[key] = { en: oldVal, es: oldVal };
    }
    const localizedObj = target[key] as Record<string, string>;
    localizedObj[this.lang.currentLang()] = value;
  }

  getOptionsString(options: string[] | Record<string, string[]> | undefined): string {
    if (!options) return '';
    if (Array.isArray(options)) return options.join(', ');
    return (options[this.lang.currentLang()] || options['en'] || []).join(', ');
  }

  removeConnection(step: { navigation?: WorkflowNavigation }) {
    if (step.navigation) {
      step.navigation.nextStep = undefined;
    }
  }

  zoomIn() { this.zoom.update(z => Math.min(3, z + 0.2)); }
  zoomOut() { this.zoom.update(z => Math.max(0.1, z - 0.2)); }
  resetView() { this.zoom.set(1); this.pan.set({x: 0, y: 0}); }

  getNewStepPosition() {
    if (this.steps.length === 0) return { x: 50, y: 50 };
    const lastStep = this.steps[this.steps.length - 1];
    return { 
      x: (lastStep.position?.x || 0) + 450, 
      y: lastStep.position?.y || 0 
    };
  }

  loadWorkflow(id: string) {
    this.workflowService.getWorkflow(id).subscribe(workflow => {
      this.workflowMetadata.name = workflow.name || { en: '', es: '' };
      this.workflowMetadata.description = workflow.description || { en: '', es: '' };
      
      this.nameControl.setValue(this.getLocalized(this.workflowMetadata.name));
      this.descriptionControl.setValue(this.getLocalized(this.workflowMetadata.description));
      this.categoryControl.setValue(workflow.category || '');
      
      this.customFields.set(workflow.customToolbox || []);
      
      this.steps = workflow.steps.map((s, i) => ({
        id: s.id,
        title: s.title,
        fields: [...(s.layout || s.fields || [])].map(f => {
          // Migration: Convert pixel positions to percentages if they look like pixels
          let x = f.position?.x || 0;
          let width = f.dimensions?.width || 100;
          
          if (x > 100) x = (x / 312) * 100;
          if (width > 100) width = (width / 312) * 100;
          
          return {
            ...f,
            position: { x, y: f.position?.y || 0 },
            dimensions: { width, height: f.dimensions?.height || 90 }
          };
        }),
        navigation: s.navigation || {},
        position: s.position || { x: 50 + (i * 450), y: 50 },
        dimensions: s.dimensions || { width: 360, height: 650 },
        stateCode: s.stateCode || '',
        onLoadingCode: s.onLoadingCode || '',
        onInteractiveCode: s.onInteractiveCode || '',
        onCompleteCode: s.onCompleteCode || '',
        onDestroyCode: s.onDestroyCode || '',
        htmlCode: s.htmlCode || '',
        cssCode: s.cssCode || ''
      }));
    });
  }

  getStepIds(): string[] {
    return this.steps.map(s => s.id);
  }

  addStep() {
    const pos = this.getNewStepPosition();
    this.steps.push({
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `Step ${this.steps.length + 1}`,
      fields: [],
      position: pos,
      stateCode: '',
      onLoadingCode: '',
      onInteractiveCode: '',
      onCompleteCode: '',
      onDestroyCode: '',
      htmlCode: '',
      cssCode: ''
    });
  }

  createCustomField() {
    const newField: CustomFieldDefinition = {
      id: `custom_${Date.now()}`,
      name: 'New Custom Component',
      html: '<div class="custom-component">\n  <h3>Custom Component</h3>\n  <p>Edit me!</p>\n</div>',
      css: '.custom-component {\n  padding: 20px;\n  background: #f8fafc;\n  border-radius: 12px;\n  border: 1px solid #e2e8f0;\n}',
      js: '// Use "el" to access the component element\nconsole.log("Custom component initialized", el);'
    };
    this.customFields.update(fields => [...fields, newField]);
    this.editingCustomField.set(newField);
  }

  editCustomField(field: CustomFieldDefinition) {
    this.editingCustomField.set({ ...field });
  }

  saveCustomField() {
    const edited = this.editingCustomField();
    if (edited) {
      this.customFields.update(fields => 
        fields.map(f => f.id === edited.id ? edited : f)
      );
      this.editingCustomField.set(null);
    }
  }

  deleteCustomField(id: string) {
    this.customFields.update(fields => fields.filter(f => f.id !== id));
  }

  removeStep(index: number) {
    const step = this.steps[index];
    if (this.selectedField() && step.fields.some(f => f.id === this.selectedField()?.id)) {
      this.deselectField();
    }
    this.steps.splice(index, 1);
  }

  removeField(stepIndex: number, fieldIndex: number) {
    const field = this.steps[stepIndex].fields[fieldIndex];
    if (this.selectedField()?.id === field.id) {
      this.deselectField();
    }
    this.steps[stepIndex].fields.splice(fieldIndex, 1);
  }

  selectField(field: FormField) {
    this.selectedField.set(field);
  }

  deselectField() {
    this.selectedField.set(null);
  }

  updateOptions(field: FormField, optionsStr: string) {
    field.options = optionsStr.split(',').map(o => o.trim()).filter(o => o);
  }

  getTotalFields(): number {
    return this.steps.reduce((total, step) => total + step.fields.length, 0);
  }

  getStepContentHeight(step: WorkflowStep): number {
    if (!step.fields || step.fields.length === 0) return 0;
    const maxY = Math.max(...step.fields.map(f => (f.position?.y || 0) + (f.dimensions?.height || 90)));
    return Math.max(400, maxY + 100);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drop(event: CdkDragDrop<any>, step: WorkflowStep) {
    if (event.previousContainer === event.container) {
      // Reordering within the same step (not really used with absolute positioning but good to keep)
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else if (event.previousContainer.id === 'toolbox') {
      // Dragging from toolbox to a step
      const fieldTemplate = event.previousContainer.data[event.previousIndex] as unknown as DraggableField;
      
      // Calculate drop position relative to the step container
      const container = isPlatformBrowser(this.platformId) ? document.getElementById(step.id) : null;
      let x = 0;
      let y = 20;
      
      const availableWidth = (step.dimensions?.width || 360) - 48;
      let width = 100; // Default to full width
      let height = 90;

      if (fieldTemplate.type === 'button') width = 45;
      if (fieldTemplate.type === 'carousel') height = 180;
      if (fieldTemplate.type === 'drawing') height = 200;
      if (fieldTemplate.type === 'imageDropzone') height = 150;

      if (container) {
        const rect = container.getBoundingClientRect();
        // Account for zoom, padding (24px = p-6), and scroll
        const pxX = (event.dropPoint.x - rect.left) / this.zoom() - 24;
        const pxY = (event.dropPoint.y - rect.top) / this.zoom() - 24 + container.scrollTop;
        
        x = Math.max(0, Math.min(100 - width, (pxX / availableWidth) * 100));
        y = Math.max(0, pxY);
      }

      const newField: FormField = {
        id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: fieldTemplate.type,
        label: { en: `New ${fieldTemplate.label}`, es: `Nuevo ${fieldTemplate.label}` },
        required: false,
        options: (fieldTemplate.type === 'dropdown' || fieldTemplate.type === 'select') ? ['Option 1', 'Option 2'] : undefined,
        defaultValue: fieldTemplate.type === 'message' ? 'This is a message block.' : undefined,
        placeholder: fieldTemplate.type === 'ssoLogin' ? { en: 'Login with SSO', es: 'Iniciar sesión con SSO' } : undefined,
        position: { x, y },
        dimensions: { width, height }
      };
      
      if (!step.fields) {
        step.fields = [];
      }
      step.fields.push(newField);
    } else {
      // Moving between steps
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }

  saveWorkflow() {
    if (this.nameControl.invalid || this.steps.length === 0) return;

    const workflowData: Partial<WorkflowDefinition> = {
      name: this.workflowMetadata.name,
      description: this.workflowMetadata.description,
      category: this.categoryControl.value || '',
      customToolbox: this.customFields(),
      steps: this.steps.map(s => ({
        id: s.id,
        title: s.title,
        layout: s.fields,
        fields: s.fields,
        navigation: s.navigation,
        position: s.position,
        dimensions: s.dimensions,
        stateCode: s.stateCode,
        onLoadingCode: s.onLoadingCode,
        onInteractiveCode: s.onInteractiveCode,
        onCompleteCode: s.onCompleteCode,
        onDestroyCode: s.onDestroyCode,
        htmlCode: s.htmlCode,
        cssCode: s.cssCode
      }))
    };

    const id = this.workflowId();
    if (id && id !== 'new') {
      this.workflowService.updateWorkflow(id, workflowData as WorkflowDefinition).subscribe(() => {
        this.router.navigate(['/']);
      });
    } else {
      this.workflowService.createWorkflow(workflowData).subscribe(() => {
        this.router.navigate(['/']);
      });
    }
  }

  generateFromPrompt() {
    if (!this.naturalPrompt.trim()) return;

    const result = this.nlWorkflowService.generateFromText(this.naturalPrompt);
    const workflow = result.workflow;

    this.workflowMetadata.name = workflow.name || { en: '', es: '' };
    this.workflowMetadata.description = workflow.description || { en: '', es: '' };

    this.nameControl.setValue(this.getLocalized(this.workflowMetadata.name));
    this.descriptionControl.setValue(this.getLocalized(this.workflowMetadata.description));

    this.steps = (workflow.steps || []).map((s, i) => ({
      id: s.id,
      title: s.title,
      fields: [...(s.layout || s.fields || [])],
      navigation: s.navigation || {},
      position: s.position || { x: 50 + (i * 450), y: 50 },
      dimensions: s.dimensions || { width: 360, height: 650 },
      stateCode: s.stateCode || '',
      onLoadingCode: s.onLoadingCode || '',
      onInteractiveCode: s.onInteractiveCode || '',
      onCompleteCode: s.onCompleteCode || '',
      onDestroyCode: s.onDestroyCode || '',
      htmlCode: s.htmlCode || '',
      cssCode: s.cssCode || ''
    }));

    this.generationWarnings.set(result.intent.ambiguities.map(item => item.question));
  }
}
