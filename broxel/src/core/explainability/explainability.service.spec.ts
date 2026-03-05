import { ExplainabilityService } from './explainability.service';
import { WorkflowStep } from '../../app/models/workflow.model';

describe('ExplainabilityService', () => {
  let service: ExplainabilityService;

  beforeEach(() => {
    service = new ExplainabilityService();
  });

  it('should explain when a visibility condition is false', () => {
    const step: WorkflowStep = {
      id: 'step_1',
      title: 'Step',
      fields: [],
      bindings: {
        'visible.discountCode': 'age >= 18 && country == "MX"'
      }
    };

    const result = service.explain(
      { type: 'missing_field', targetId: 'discountCode' },
      step,
      { age: 16, country: 'MX' },
      []
    );

    expect(result.confidenceLabel).toBe('Alta');
    expect(result.why.join(' ')).toContain('La regla no se cumple');
    expect(result.dependencyChain.some((item) => item.nodeId === 'age' && item.evaluation === 'true')).toBeTrue();
  });

  it('should detect contradictory bindings for the same target', () => {
    const step: WorkflowStep = {
      id: 'step_2',
      title: 'Step',
      fields: [],
      bindings: {
        'visible.rfc': 'country == "MX"',
        'rule.rfc': 'country == "US"'
      }
    };

    const conflicts = service.detectConflicts(step);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].targetId).toBe('rfc');
  });
});
