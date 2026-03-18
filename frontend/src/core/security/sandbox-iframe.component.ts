import { Component, input, output, effect, ElementRef, ViewChild, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-sandbox-iframe',
  standalone: true,
  imports: [CommonModule],
  template: `
    <iframe
      #sandboxFrame
      [src]="iframeSrc"
      sandbox="allow-scripts"
      class="w-full h-full border-0 bg-transparent"
      title="Custom Component Sandbox"
    ></iframe>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 100px;
    }
  `]
})
export class SandboxIframeComponent implements OnDestroy {
  @ViewChild('sandboxFrame') iframeRef!: ElementRef<HTMLIFrameElement>;

  htmlCode = input<string>('');
  cssCode = input<string>('');
  jsCode = input<string>('');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contextData = input<any>({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valueChange = output<any>();
  statusChange = output<'VALID' | 'INVALID' | 'PENDING'>();

  iframeSrc!: SafeResourceUrl;
  private messageListener: (event: MessageEvent) => void;

  private sanitizer = inject(DomSanitizer);

  constructor() {
    // Generate the sandboxed content whenever code inputs change
    effect(() => {
      const html = this.htmlCode() || '';
      const css = this.cssCode() || '';
      const js = this.jsCode() || '';
      
      this.iframeSrc = this.generateSandboxContent(html, css, js);
    });

    // Send context updates to the iframe when contextData changes
    effect(() => {
      const data = this.contextData();
      if (this.iframeRef?.nativeElement?.contentWindow) {
        this.iframeRef.nativeElement.contentWindow.postMessage({
          type: 'CONTEXT_UPDATE',
          payload: data
        }, '*'); // '*' is required because sandboxed iframes have a 'null' origin
      }
    });

    // Listen for messages FROM the sandboxed iframe
    this.messageListener = (event: MessageEvent) => {
      // Security Check: Ensure the message comes from our iframe
      if (this.iframeRef?.nativeElement?.contentWindow !== event.source) {
        return;
      }

      const { type, payload } = event.data;

      switch (type) {
        case 'VALUE_CHANGE':
          this.valueChange.emit(payload);
          break;
        case 'STATUS_CHANGE':
          this.statusChange.emit(payload);
          break;
        case 'READY':
          // Iframe is ready, send initial context
          this.iframeRef.nativeElement.contentWindow?.postMessage({
            type: 'CONTEXT_UPDATE',
            payload: this.contextData()
          }, '*');
          break;
      }
    };

    window.addEventListener('message', this.messageListener);
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.messageListener);
  }

  private generateSandboxContent(html: string, css: string, js: string): SafeResourceUrl {
    // The wrapper HTML injects a communication bridge so the custom JS can talk to Angular
    const wrapperHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          /* Reset basic styles to match parent */
          body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
          ${css}
        </style>
      </head>
      <body>
        ${html}
        <script>
          // --- Communication Bridge ---
          const WorkflowAPI = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setValue: function(value) {
              window.parent.postMessage({ type: 'VALUE_CHANGE', payload: value }, '*');
            },
            setStatus: function(status) {
              window.parent.postMessage({ type: 'STATUS_CHANGE', payload: status }, '*');
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onContextUpdate: function(callback) {
              window.addEventListener('message', function(event) {
                if (event.data && event.data.type === 'CONTEXT_UPDATE') {
                  callback(event.data.payload);
                }
              });
            }
          };

          // Notify parent we are ready
          window.parent.postMessage({ type: 'READY' }, '*');

          // --- User Custom JS ---
          try {
            ${js}
          } catch (e) {
            console.error('Error in custom component script:', e);
          }
        </script>
      </body>
      </html>
    `;

    // Create a Blob URL. This is safer than data URIs for complex HTML
    const blob = new Blob([wrapperHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // We must bypass security trust here because we dynamically generated the URL.
    // The security relies entirely on the 'sandbox="allow-scripts"' attribute on the iframe.
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
