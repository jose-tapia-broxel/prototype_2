import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionStatus } from '../models/api.model';

/**
 * Submission Status Display Component
 * Phase 5: Frontend Core - Status display (pending, processing, completed, rejected)
 */
@Component({
  selector: 'app-submission-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border p-6" [class]="getContainerClass()">
      <!-- Status Icon and Title -->
      <div class="flex items-center gap-4 mb-4">
        <div [class]="getIconContainerClass()">
          @switch (status()) {
            @case ('pending') {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6 animate-pulse">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            @case ('processing') {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-6 h-6 animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"></circle>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" class="opacity-75"></path>
              </svg>
            }
            @case ('completed') {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            @case ('failed') {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            @case ('rejected') {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            }
          }
        </div>
        <div>
          <h3 class="text-lg font-semibold" [class]="getTitleClass()">{{ getStatusTitle() }}</h3>
          <p class="text-sm" [class]="getSubtitleClass()">{{ getStatusMessage() }}</p>
        </div>
      </div>

      <!-- Progress Bar for Processing -->
      @if (status() === 'processing') {
        <div class="mb-4">
          <div class="h-2 bg-blue-100 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500 rounded-full animate-progress" style="width: 60%"></div>
          </div>
        </div>
      }

      <!-- Submission Details -->
      @if (submissionId()) {
        <div class="text-sm text-slate-500 mb-4">
          <span class="font-mono bg-slate-100 px-2 py-1 rounded">ID: {{ submissionId() }}</span>
          @if (submittedAt()) {
            <span class="ml-2">{{ formatDate(submittedAt()!) }}</span>
          }
        </div>
      }

      <!-- Error Message -->
      @if (status() === 'failed' || status() === 'rejected') {
        @if (errorMessage()) {
          <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p class="text-sm text-red-800">{{ errorMessage() }}</p>
          </div>
        }
      }

      <!-- Action Buttons -->
      <div class="flex gap-3">
        @switch (status()) {
          @case ('completed') {
            <button (click)="onViewDetails.emit()" class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              {{ locale() === 'es' ? 'Ver Detalles' : 'View Details' }}
            </button>
            <button (click)="onStartNew.emit()" class="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors">
              {{ locale() === 'es' ? 'Nueva Solicitud' : 'Start New' }}
            </button>
          }
          @case ('failed') {
            <button (click)="onRetry.emit()" class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              {{ locale() === 'es' ? 'Reintentar' : 'Try Again' }}
            </button>
            <button (click)="onCancel.emit()" class="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors">
              {{ locale() === 'es' ? 'Cancelar' : 'Cancel' }}
            </button>
          }
          @case ('rejected') {
            <button (click)="onViewDetails.emit()" class="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors">
              {{ locale() === 'es' ? 'Ver Razón' : 'View Reason' }}
            </button>
            <button (click)="onStartNew.emit()" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              {{ locale() === 'es' ? 'Nueva Solicitud' : 'Start New' }}
            </button>
          }
          @case ('pending') {
            <button (click)="onCancel.emit()" class="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors">
              {{ locale() === 'es' ? 'Cancelar' : 'Cancel' }}
            </button>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    @keyframes progress {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .animate-progress {
      animation: progress 1.5s ease-in-out infinite;
    }
  `]
})
export class SubmissionStatusComponent {
  @Input() set statusValue(value: SubmissionStatus) {
    this.status.set(value);
  }
  @Input() set id(value: string | undefined) {
    this.submissionId.set(value || null);
  }
  @Input() set submitted(value: string | undefined) {
    this.submittedAt.set(value || null);
  }
  @Input() set error(value: string | undefined) {
    this.errorMessage.set(value || null);
  }
  @Input() set lang(value: string) {
    this.locale.set(value);
  }

  @Output() onRetry = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() onViewDetails = new EventEmitter<void>();
  @Output() onStartNew = new EventEmitter<void>();

  status = signal<SubmissionStatus>('pending');
  submissionId = signal<string | null>(null);
  submittedAt = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  locale = signal<string>('en');

  getContainerClass(): string {
    const base = 'transition-all duration-300';
    switch (this.status()) {
      case 'pending': return `${base} bg-yellow-50 border-yellow-200`;
      case 'processing': return `${base} bg-blue-50 border-blue-200`;
      case 'completed': return `${base} bg-green-50 border-green-200`;
      case 'failed': return `${base} bg-red-50 border-red-200`;
      case 'rejected': return `${base} bg-orange-50 border-orange-200`;
      default: return `${base} bg-slate-50 border-slate-200`;
    }
  }

  getIconContainerClass(): string {
    const base = 'w-12 h-12 rounded-full flex items-center justify-center';
    switch (this.status()) {
      case 'pending': return `${base} bg-yellow-100 text-yellow-600`;
      case 'processing': return `${base} bg-blue-100 text-blue-600`;
      case 'completed': return `${base} bg-green-100 text-green-600`;
      case 'failed': return `${base} bg-red-100 text-red-600`;
      case 'rejected': return `${base} bg-orange-100 text-orange-600`;
      default: return `${base} bg-slate-100 text-slate-600`;
    }
  }

  getTitleClass(): string {
    switch (this.status()) {
      case 'pending': return 'text-yellow-800';
      case 'processing': return 'text-blue-800';
      case 'completed': return 'text-green-800';
      case 'failed': return 'text-red-800';
      case 'rejected': return 'text-orange-800';
      default: return 'text-slate-800';
    }
  }

  getSubtitleClass(): string {
    switch (this.status()) {
      case 'pending': return 'text-yellow-600';
      case 'processing': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'rejected': return 'text-orange-600';
      default: return 'text-slate-600';
    }
  }

  getStatusTitle(): string {
    const isEs = this.locale() === 'es';
    switch (this.status()) {
      case 'pending': return isEs ? 'Pendiente' : 'Pending';
      case 'processing': return isEs ? 'Procesando' : 'Processing';
      case 'completed': return isEs ? 'Completado' : 'Completed';
      case 'failed': return isEs ? 'Error' : 'Failed';
      case 'rejected': return isEs ? 'Rechazado' : 'Rejected';
      default: return isEs ? 'Desconocido' : 'Unknown';
    }
  }

  getStatusMessage(): string {
    const isEs = this.locale() === 'es';
    switch (this.status()) {
      case 'pending': return isEs ? 'Tu solicitud está en cola para ser procesada.' : 'Your submission is queued for processing.';
      case 'processing': return isEs ? 'Tu solicitud está siendo procesada...' : 'Your submission is being processed...';
      case 'completed': return isEs ? 'Tu solicitud ha sido procesada exitosamente.' : 'Your submission has been processed successfully.';
      case 'failed': return isEs ? 'Hubo un error al procesar tu solicitud.' : 'There was an error processing your submission.';
      case 'rejected': return isEs ? 'Tu solicitud ha sido rechazada.' : 'Your submission has been rejected.';
      default: return '';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(this.locale() === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
