import { describe, expect, it } from 'vitest';
import { FlowValidator } from './flow-validator';
import { WorkflowDefinition } from '../models/definition';

describe('FlowValidator', () => {
  const createBaseDefinition = (): WorkflowDefinition => ({
    id: 'def_1',
    workflowKey: 'onboarding',
    version: 1,
    name: 'Onboarding',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    createdBy: 'tester',
    inputSchema: {
      type: 'object',
      properties: {
        country: { type: 'string' },
        usedField: { type: 'string' },
        staleField: { type: 'string' }
      }
    },
    nodes: [
      { id: 'start', type: 'START', name: 'Start' },
      { id: 'gateway', type: 'EXCLUSIVE_GATEWAY', name: 'Decision' },
      {
        id: 'service',
        type: 'SERVICE_TASK',
        name: 'Sync CRM',
        actionPayload: {
          integrationContract: {
            required: ['email', 'country']
          },
          integrationMapping: {
            country: 'context.country',
            email: 'context.missingField'
          },
          bodyTemplate: '{{context.usedField}}'
        }
      },
      { id: 'end', type: 'END', name: 'End' }
    ],
    flows: [
      { id: 'f1', sourceRef: 'start', targetRef: 'gateway' },
      {
        id: 'f2',
        sourceRef: 'gateway',
        targetRef: 'service',
        condition: {
          type: 'BinaryExpression',
          operator: '==',
          left: { type: 'Identifier', name: 'country' },
          right: { type: 'Literal', value: 'MX' }
        }
      },
      {
        id: 'f3',
        sourceRef: 'gateway',
        targetRef: 'end',
        condition: {
          type: 'BinaryExpression',
          operator: '!=',
          left: { type: 'Identifier', name: 'country' },
          right: { type: 'Literal', value: 'MX' }
        }
      },
      { id: 'f4', sourceRef: 'service', targetRef: 'end' }
    ]
  });

  it('flags contradictory gateway rules, unused inputs and risky mappings', () => {
    const validator = new FlowValidator();
    const diagnostics = validator.validate(createBaseDefinition());

    expect(diagnostics.find(d => d.code === 'CONTRADICTORY_RULES')).toBeTruthy();
    expect(diagnostics.find(d => d.code === 'UNUSED_INPUT_FIELD' && d.message.includes('staleField'))).toBeTruthy();
    expect(diagnostics.find(d => d.code === 'INTEGRATION_SOURCE_UNKNOWN')).toBeTruthy();
  });

  it('flags infinite cycles without exit to END', () => {
    const definition = createBaseDefinition();
    definition.nodes = [
      { id: 'start', type: 'START', name: 'Start' },
      { id: 'a', type: 'SCRIPT_TASK', name: 'A' },
      { id: 'b', type: 'SCRIPT_TASK', name: 'B' },
      { id: 'end', type: 'END', name: 'End' }
    ];
    definition.flows = [
      { id: 'f1', sourceRef: 'start', targetRef: 'a' },
      { id: 'f2', sourceRef: 'a', targetRef: 'b' },
      { id: 'f3', sourceRef: 'b', targetRef: 'a' }
    ];

    const validator = new FlowValidator();
    const diagnostics = validator.validate(definition);

    expect(diagnostics.find(d => d.code === 'INFINITE_LOOP_RISK')).toBeTruthy();
  });
});
