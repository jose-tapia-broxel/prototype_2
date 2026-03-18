import { TemplateEngine } from './template-engine';
import { ExecutionContext } from '../rule-engine/ast/types';

describe('TemplateEngine', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = {
      data: {
        user: {
          name: 'John Doe',
          age: 30
        },
        settings: {
          theme: 'dark'
        }
      }
    };
  });

  it('should render a simple string template', () => {
    const template = 'Hello {{context.user.name}}';
    const result = TemplateEngine.renderString(template, context);
    expect(result).toBe('Hello John Doe');
  });

  it('should render an object with nested templates', () => {
    const templateObj = {
      greeting: 'Hi {{context.user.name}}',
      details: {
        age: '{{context.user.age}}',
        theme: '{{context.settings.theme}}'
      }
    };

    const result = TemplateEngine.renderObject(templateObj, context);
    
    expect(result).toEqual({
      greeting: 'Hi John Doe',
      details: {
        age: '30',
        theme: 'dark'
      }
    });
  });

  it('should handle undefined paths gracefully', () => {
    const template = 'Hello {{context.user.unknown}}';
    const result = TemplateEngine.renderString(template, context);
    expect(result).toBe('Hello ');
  });
});
