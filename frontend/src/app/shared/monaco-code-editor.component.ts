import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, PLATFORM_ID, SimpleChanges, ViewChild } from '@angular/core';

type MonacoEditor = {
  getValue(): string;
  dispose(): void;
  onDidChangeModelContent(listener: () => void): void;
};

type MonacoModel = {
  getValue(): string;
  setValue(value: string): void;
  dispose(): void;
};

type MonacoApi = {
  editor: {
    defineTheme(name: string, data: unknown): void;
    setTheme(theme: string): void;
    createModel(value: string, language: string): MonacoModel;
    create(container: HTMLElement, options: Record<string, unknown>): MonacoEditor;
    setModelLanguage(model: MonacoModel, language: string): void;
  };
};

type RequireFn = ((deps: string[], callback: (...modules: any[]) => void) => void) & { config: (opts: unknown) => void };

@Component({
  selector: 'app-monaco-code-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #editorHost class="w-full h-full"></div>
  `
})
export class MonacoCodeEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  private static readonly monacoBaseUrl = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';

  private platformId = inject(PLATFORM_ID);

  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  @Input() language: 'html' | 'css' | 'javascript' | 'typescript' = 'javascript';
  @Input() theme = 'vs-dark';

  private monaco: MonacoApi | null = null;
  private editor: MonacoEditor | null = null;
  private model: MonacoModel | null = null;
  private suppressEmit = false;
  private static themesRegistered = false;
  private static loaderPromise: Promise<MonacoApi> | null = null;

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const monaco = await this.loadMonacoFromCdn();
    this.monaco = monaco;

    if (!MonacoCodeEditorComponent.themesRegistered) {
      monaco.editor.defineTheme('app-monokai', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: '', foreground: 'F8F8F2', background: '272822' },
          { token: 'comment', foreground: '75715E' },
          { token: 'keyword', foreground: 'F92672' },
          { token: 'string', foreground: 'E6DB74' },
          { token: 'number', foreground: 'AE81FF' }
        ],
        colors: {
          'editor.background': '#272822',
          'editorLineNumber.foreground': '#6b7280',
          'editorCursor.foreground': '#f8f8f0'
        }
      });

      monaco.editor.defineTheme('app-intelligence', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: '', foreground: 'C7D2FE', background: '0B1220' },
          { token: 'comment', foreground: '64748B' },
          { token: 'keyword', foreground: '38BDF8' },
          { token: 'string', foreground: '67E8F9' },
          { token: 'number', foreground: 'A78BFA' }
        ],
        colors: {
          'editor.background': '#0B1220',
          'editorLineNumber.foreground': '#475569',
          'editorCursor.foreground': '#22D3EE'
        }
      });

      MonacoCodeEditorComponent.themesRegistered = true;
    }

    this.model = monaco.editor.createModel(this.value ?? '', this.language);
    this.editor = monaco.editor.create(this.editorHost.nativeElement, {
      model: this.model,
      theme: this.theme,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      suggestOnTriggerCharacters: true,
      quickSuggestions: { comments: true, other: true, strings: true },
      parameterHints: { enabled: true },
      tabSize: 2
    });

    this.editor.onDidChangeModelContent(() => {
      if (this.suppressEmit || !this.editor) return;
      this.valueChange.emit(this.editor.getValue());
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editor || !this.model || !this.monaco) return;

    if (changes['language'] && !changes['language'].firstChange) {
      this.monaco.editor.setModelLanguage(this.model, this.language);
    }

    if (changes['theme'] && !changes['theme'].firstChange) {
      this.monaco.editor.setTheme(this.theme);
    }

    if (changes['value'] && !changes['value'].firstChange) {
      const incoming = this.value ?? '';
      const current = this.model.getValue();
      if (incoming !== current) {
        this.suppressEmit = true;
        this.model.setValue(incoming);
        this.suppressEmit = false;
      }
    }
  }

  ngOnDestroy(): void {
    this.editor?.dispose();
    this.model?.dispose();
  }

  private loadMonacoFromCdn(): Promise<MonacoApi> {
    if (MonacoCodeEditorComponent.loaderPromise) return MonacoCodeEditorComponent.loaderPromise;

    MonacoCodeEditorComponent.loaderPromise = new Promise((resolve, reject) => {
      const globalWithMonaco = window as typeof window & { monaco?: MonacoApi };
      if (globalWithMonaco.monaco) {
        resolve(globalWithMonaco.monaco);
        return;
      }

      const onLoaderReady = () => {
        const requireJs = (window as unknown as { require?: RequireFn }).require;
        if (!requireJs) {
          reject(new Error('Monaco loader was not initialized.'));
          return;
        }

        requireJs.config({ paths: { vs: MonacoCodeEditorComponent.monacoBaseUrl } });
        requireJs(['vs/editor/editor.main'], () => {
          if (!globalWithMonaco.monaco) {
            reject(new Error('Monaco did not load correctly.'));
            return;
          }
          resolve(globalWithMonaco.monaco);
        });
      };

      const existingLoader = document.querySelector<HTMLScriptElement>('script[data-monaco-loader=\"true\"]');
      if (existingLoader) {
        if ((window as unknown as { require?: RequireFn }).require) {
          onLoaderReady();
        } else {
          existingLoader.addEventListener('load', onLoaderReady, { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.src = `${MonacoCodeEditorComponent.monacoBaseUrl}/loader.js`;
      script.async = true;
      script.dataset['monacoLoader'] = 'true';
      script.addEventListener('load', onLoaderReady, { once: true });
      script.addEventListener('error', () => reject(new Error('Unable to load Monaco loader script.')), { once: true });
      document.body.appendChild(script);
    });

    return MonacoCodeEditorComponent.loaderPromise;
  }
}
