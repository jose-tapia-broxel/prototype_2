import { describe, it, expect, beforeEach } from 'vitest';
import { NaturalLanguageWorkflowService } from './nl-workflow.service';

describe('NaturalLanguageWorkflowService', () => {
  let service: NaturalLanguageWorkflowService;

  beforeEach(() => {
    service = new NaturalLanguageWorkflowService();
  });

  it('should generate an age-validation workflow with minor approval path', () => {
    const result = service.generateFromText('Necesito un formulario de registro con validación de edad y aprobación si es menor de 18');

    expect(result.intent.steps.map(step => step.id)).toEqual([
      'form_registro',
      'decision_edad',
      'aprobacion_menor',
      'fin'
    ]);

    const steps = result.workflow.steps ?? [];
    expect(steps.length).toBe(3);
    expect(steps[0].id).toBe('form_registro');
    expect(steps[1].id).toBe('aprobacion_menor');
    expect(steps[2].id).toBe('fin');

    const firstRules = steps[0].validationRules ?? [];
    expect(firstRules.some(rule => rule.rule === 'edad < 18')).toBe(true);
    expect(firstRules.some(rule => rule.rule === 'edad >= 18')).toBe(true);
  });

  it('should fallback to a basic form when no fields are detected', () => {
    const result = service.generateFromText('Crear flujo simple');
    const firstStep = result.workflow.steps?.[0];

    expect(firstStep?.id).toBe('form_registro');
    expect(firstStep?.fields?.[0].id).toBe('nombre');
  });
});
