import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RulesEngineService } from './rules-engine.service';
import { Rule } from '../entities/rule.entity';
import { DomainEventsService } from '../../events/services/domain-events.service';
import {
  RuleCondition,
  RuleDefinition,
  RuleEvaluationContext,
  RuleAction,
  FieldCondition,
  LogicalCondition,
} from '../interfaces/rule-types';

/**
 * Comprehensive Rule Evaluation Scenario Tests
 * 
 * Tests various rule evaluation scenarios including:
 * - All comparison operators
 * - Logical operators (AND, OR, NOT)
 * - Complex nested conditions
 * - Action execution
 * - Real-world business scenarios
 */
describe('RulesEngineService - Evaluation Scenarios', () => {
  let service: RulesEngineService;
  let rulesRepo: jest.Mocked<Repository<Rule>>;
  let eventsService: jest.Mocked<DomainEventsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesEngineService,
        {
          provide: getRepositoryToken(Rule),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: DomainEventsService,
          useValue: {
            emit: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<RulesEngineService>(RulesEngineService);
    rulesRepo = module.get(getRepositoryToken(Rule));
    eventsService = module.get(DomainEventsService);
  });

  // ─────────────────────────────────────────────────────────────
  // COMPARISON OPERATORS
  // ─────────────────────────────────────────────────────────────

  describe('Comparison Operators', () => {
    const context: RuleEvaluationContext = {
      submission: {
        name: 'John Doe',
        age: 30,
        salary: 50000,
        email: 'john.doe@example.com',
        status: 'active',
        tags: ['employee', 'manager'],
        department: 'Engineering',
        hireDate: '2020-05-15',
        score: 85.5,
        notes: '',
        middleName: null,
      },
    };

    describe('Equality operators', () => {
      it('eq: should match equal string values', () => {
        const condition: FieldCondition = { field: 'submission.name', operator: 'eq', value: 'John Doe' };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('eq: should NOT match different string values', () => {
        const condition: FieldCondition = { field: 'submission.name', operator: 'eq', value: 'Jane Doe' };
        expect(service.evaluate(condition, context)).toBe(false);
      });

      it('eq: should match equal number values', () => {
        const condition: FieldCondition = { field: 'submission.age', operator: 'eq', value: 30 };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('ne: should NOT match equal values', () => {
        const condition: FieldCondition = { field: 'submission.age', operator: 'ne', value: 30 };
        expect(service.evaluate(condition, context)).toBe(false);
      });

      it('ne: should match different values', () => {
        const condition: FieldCondition = { field: 'submission.age', operator: 'ne', value: 25 };
        expect(service.evaluate(condition, context)).toBe(true);
      });
    });

    describe('Comparison operators (numeric)', () => {
      it('gt: should match when field > value', () => {
        const condition: FieldCondition = { field: 'submission.age', operator: 'gt', value: 25 };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('gt: should NOT match when field equals value', () => {
        const condition: FieldCondition = { field: 'submission.age', operator: 'gt', value: 30 };
        expect(service.evaluate(condition, context)).toBe(false);
      });

      it('gte: should match when field >= value', () => {
        const condition: FieldCondition = { field: 'submission.age', operator: 'gte', value: 30 };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('lt: should match when field < value', () => {
        const condition: FieldCondition = { field: 'submission.salary', operator: 'lt', value: 60000 };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('lte: should match when field <= value', () => {
        const condition: FieldCondition = { field: 'submission.salary', operator: 'lte', value: 50000 };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('between: should match value in range', () => {
        const condition: FieldCondition = { field: 'submission.age', operator: 'between', value: [25, 35] };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('between: should NOT match value outside range', () => {
        const condition: FieldCondition = { field: 'submission.age', operator: 'between', value: [35, 50] };
        expect(service.evaluate(condition, context)).toBe(false);
      });
    });

    describe('String operators', () => {
      it('contains: should match substring', () => {
        const condition: FieldCondition = { field: 'submission.email', operator: 'contains', value: 'example.com' };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('contains: should NOT match missing substring', () => {
        const condition: FieldCondition = { field: 'submission.email', operator: 'contains', value: 'gmail.com' };
        expect(service.evaluate(condition, context)).toBe(false);
      });

      it('startsWith: should match prefix', () => {
        const condition: FieldCondition = { field: 'submission.email', operator: 'startsWith', value: 'john' };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('endsWith: should match suffix', () => {
        const condition: FieldCondition = { field: 'submission.email', operator: 'endsWith', value: '.com' };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('regex: should match pattern', () => {
        const condition: FieldCondition = { field: 'submission.email', operator: 'regex', value: '^[a-z.]+@example\\.com$' };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('regex: should NOT match invalid pattern', () => {
        const condition: FieldCondition = { field: 'submission.email', operator: 'regex', value: '^[A-Z]+$' };
        expect(service.evaluate(condition, context)).toBe(false);
      });
    });

    describe('Collection operators', () => {
      it('in: should match value in array', () => {
        const condition: FieldCondition = { field: 'submission.status', operator: 'in', value: ['active', 'pending'] };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('in: should NOT match value not in array', () => {
        const condition: FieldCondition = { field: 'submission.status', operator: 'in', value: ['inactive', 'deleted'] };
        expect(service.evaluate(condition, context)).toBe(false);
      });

      it('notIn: should match value not in array', () => {
        const condition: FieldCondition = { field: 'submission.status', operator: 'notIn', value: ['inactive', 'deleted'] };
        expect(service.evaluate(condition, context)).toBe(true);
      });
    });

    describe('Null/Empty operators', () => {
      it('isNull: should match null value', () => {
        const condition: FieldCondition = { field: 'submission.middleName', operator: 'isNull' };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('isNull: should NOT match non-null value', () => {
        const condition: FieldCondition = { field: 'submission.name', operator: 'isNull' };
        expect(service.evaluate(condition, context)).toBe(false);
      });

      it('isNotNull: should match non-null value', () => {
        const condition: FieldCondition = { field: 'submission.name', operator: 'isNotNull' };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('isEmpty: should match empty string', () => {
        const condition: FieldCondition = { field: 'submission.notes', operator: 'isEmpty' };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('isNotEmpty: should match non-empty string', () => {
        const condition: FieldCondition = { field: 'submission.name', operator: 'isNotEmpty' };
        expect(service.evaluate(condition, context)).toBe(true);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // LOGICAL OPERATORS
  // ─────────────────────────────────────────────────────────────

  describe('Logical Operators', () => {
    const context: RuleEvaluationContext = {
      submission: {
        age: 25,
        salary: 75000,
        department: 'Engineering',
        level: 'Senior',
        isManager: true,
      },
    };

    describe('AND operator', () => {
      it('should return true when all conditions are true', () => {
        const condition: LogicalCondition = {
          and: [
            { field: 'submission.age', operator: 'gte', value: 25 },
            { field: 'submission.salary', operator: 'gt', value: 50000 },
            { field: 'submission.department', operator: 'eq', value: 'Engineering' },
          ],
        };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('should return false when any condition is false', () => {
        const condition: LogicalCondition = {
          and: [
            { field: 'submission.age', operator: 'gte', value: 25 },
            { field: 'submission.salary', operator: 'gt', value: 100000 }, // False
            { field: 'submission.department', operator: 'eq', value: 'Engineering' },
          ],
        };
        expect(service.evaluate(condition, context)).toBe(false);
      });

      it('should short-circuit on first false condition', () => {
        // This tests efficiency - if first is false, others shouldn't be evaluated
        const condition: LogicalCondition = {
          and: [
            { field: 'submission.age', operator: 'lt', value: 20 }, // False first
            { field: 'submission.nonexistent', operator: 'eq', value: 'value' },
          ],
        };
        expect(service.evaluate(condition, context)).toBe(false);
      });
    });

    describe('OR operator', () => {
      it('should return true when any condition is true', () => {
        const condition: LogicalCondition = {
          or: [
            { field: 'submission.department', operator: 'eq', value: 'Marketing' },
            { field: 'submission.department', operator: 'eq', value: 'Engineering' }, // True
            { field: 'submission.department', operator: 'eq', value: 'Sales' },
          ],
        };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('should return false when all conditions are false', () => {
        const condition: LogicalCondition = {
          or: [
            { field: 'submission.department', operator: 'eq', value: 'Marketing' },
            { field: 'submission.department', operator: 'eq', value: 'Sales' },
            { field: 'submission.department', operator: 'eq', value: 'HR' },
          ],
        };
        expect(service.evaluate(condition, context)).toBe(false);
      });
    });

    describe('NOT operator', () => {
      it('should negate true to false', () => {
        const condition: LogicalCondition = {
          not: { field: 'submission.department', operator: 'eq', value: 'Engineering' },
        };
        expect(service.evaluate(condition, context)).toBe(false);
      });

      it('should negate false to true', () => {
        const condition: LogicalCondition = {
          not: { field: 'submission.department', operator: 'eq', value: 'Marketing' },
        };
        expect(service.evaluate(condition, context)).toBe(true);
      });
    });

    describe('Nested logical operations', () => {
      it('should evaluate complex nested conditions: (A AND B) OR C', () => {
        // (isManager AND salary > 70000) OR department = 'Executive'
        const condition: LogicalCondition = {
          or: [
            {
              and: [
                { field: 'submission.isManager', operator: 'eq', value: true },
                { field: 'submission.salary', operator: 'gt', value: 70000 },
              ],
            },
            { field: 'submission.department', operator: 'eq', value: 'Executive' },
          ],
        };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('should evaluate: NOT (A OR B)', () => {
        const condition: LogicalCondition = {
          not: {
            or: [
              { field: 'submission.department', operator: 'eq', value: 'Marketing' },
              { field: 'submission.department', operator: 'eq', value: 'Sales' },
            ],
          },
        };
        expect(service.evaluate(condition, context)).toBe(true);
      });

      it('should evaluate deeply nested: A AND (B OR (C AND D))', () => {
        const condition: LogicalCondition = {
          and: [
            { field: 'submission.age', operator: 'gte', value: 20 },
            {
              or: [
                { field: 'submission.level', operator: 'eq', value: 'Director' },
                {
                  and: [
                    { field: 'submission.level', operator: 'eq', value: 'Senior' },
                    { field: 'submission.isManager', operator: 'eq', value: true },
                  ],
                },
              ],
            },
          ],
        };
        expect(service.evaluate(condition, context)).toBe(true);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // RULE SET EVALUATION
  // ─────────────────────────────────────────────────────────────

  describe('Rule Set Evaluation', () => {
    it('should evaluate rules in priority order (highest first)', async () => {
      const evaluationOrder: string[] = [];
      const rules: RuleDefinition[] = [
        {
          id: 'rule-low',
          name: 'Low Priority',
          ruleType: 'condition',
          condition: { field: 'submission.age', operator: 'gte', value: 18 },
          actions: [],
          priority: 10,
          isActive: true,
        },
        {
          id: 'rule-high',
          name: 'High Priority',
          ruleType: 'condition',
          condition: { field: 'submission.age', operator: 'gte', value: 18 },
          actions: [],
          priority: 100,
          isActive: true,
        },
        {
          id: 'rule-medium',
          name: 'Medium Priority',
          ruleType: 'condition',
          condition: { field: 'submission.age', operator: 'gte', value: 18 },
          actions: [],
          priority: 50,
          isActive: true,
        },
      ];

      const context: RuleEvaluationContext = { submission: { age: 25 } };
      const result = await service.evaluateRuleSet(rules, context);

      // Results should be ordered by evaluation (high → medium → low)
      expect(result.results[0].ruleId).toBe('rule-high');
      expect(result.results[1].ruleId).toBe('rule-medium');
      expect(result.results[2].ruleId).toBe('rule-low');
    });

    it('should skip inactive rules', async () => {
      const rules: RuleDefinition[] = [
        {
          id: 'rule-active',
          name: 'Active Rule',
          ruleType: 'condition',
          condition: { field: 'submission.age', operator: 'gte', value: 18 },
          actions: [],
          priority: 100,
          isActive: true,
        },
        {
          id: 'rule-inactive',
          name: 'Inactive Rule',
          ruleType: 'condition',
          condition: { field: 'submission.age', operator: 'gte', value: 18 },
          actions: [],
          priority: 50,
          isActive: false,
        },
      ];

      const context: RuleEvaluationContext = { submission: { age: 25 } };
      const result = await service.evaluateRuleSet(rules, context);

      expect(result.totalRules).toBe(1);
      expect(result.results.find((r) => r.ruleId === 'rule-inactive')).toBeUndefined();
    });

    it('should stop evaluation when stopOnMatch is true', async () => {
      const rules: RuleDefinition[] = [
        {
          id: 'rule-first',
          name: 'First Rule (stops)',
          ruleType: 'condition',
          condition: { field: 'submission.age', operator: 'gte', value: 18 },
          actions: [{ type: 'route', params: { targetNodeId: 'node-a' } }],
          priority: 100,
          isActive: true,
          stopOnMatch: true,
        },
        {
          id: 'rule-second',
          name: 'Second Rule',
          ruleType: 'condition',
          condition: { field: 'submission.age', operator: 'gte', value: 18 },
          actions: [{ type: 'route', params: { targetNodeId: 'node-b' } }],
          priority: 50,
          isActive: true,
        },
      ];

      const context: RuleEvaluationContext = { submission: { age: 25 } };
      const result = await service.evaluateRuleSet(rules, context);

      expect(result.stoppedEarly).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].ruleId).toBe('rule-first');
    });

    it('should collect actions from all matched rules', async () => {
      const rules: RuleDefinition[] = [
        {
          id: 'rule-1',
          name: 'Rule 1',
          ruleType: 'condition',
          condition: { field: 'submission.age', operator: 'gte', value: 18 },
          actions: [
            { type: 'setVariable', params: { variableName: 'var1', value: 'value1' } },
          ],
          priority: 100,
          isActive: true,
        },
        {
          id: 'rule-2',
          name: 'Rule 2',
          ruleType: 'condition',
          condition: { field: 'submission.age', operator: 'gte', value: 21 },
          actions: [
            { type: 'setVariable', params: { variableName: 'var2', value: 'value2' } },
          ],
          priority: 50,
          isActive: true,
        },
      ];

      const context: RuleEvaluationContext = { submission: { age: 25 } };
      const result = await service.evaluateRuleSet(rules, context);

      expect(result.matchedRules).toBe(2);
      expect(result.actionsToExecute).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // BUSINESS SCENARIO TESTS
  // ─────────────────────────────────────────────────────────────

  describe('Business Scenarios', () => {
    describe('Loan Application Approval', () => {
      const createLoanContext = (data: Partial<any> = {}): RuleEvaluationContext => ({
        submission: {
          creditScore: 720,
          income: 75000,
          loanAmount: 200000,
          employmentYears: 5,
          existingDebt: 10000,
          hasCollateral: true,
          bankruptcyHistory: false,
          ...data,
        },
      });

      it('should approve loan with excellent credit and low debt', () => {
        const condition: RuleCondition = {
          and: [
            { field: 'submission.creditScore', operator: 'gte', value: 700 },
            { field: 'submission.income', operator: 'gte', value: 50000 },
            { field: 'submission.bankruptcyHistory', operator: 'eq', value: false },
          ],
        };

        expect(service.evaluate(condition, createLoanContext())).toBe(true);
      });

      it('should reject loan with low credit score', () => {
        const condition: RuleCondition = {
          and: [
            { field: 'submission.creditScore', operator: 'gte', value: 700 },
            { field: 'submission.income', operator: 'gte', value: 50000 },
          ],
        };

        expect(service.evaluate(condition, createLoanContext({ creditScore: 550 }))).toBe(false);
      });

      it('should require manual review for edge cases', () => {
        // Credit between 650-699 OR debt-to-income ratio > 40%
        const requiresReview: RuleCondition = {
          or: [
            {
              and: [
                { field: 'submission.creditScore', operator: 'gte', value: 650 },
                { field: 'submission.creditScore', operator: 'lt', value: 700 },
              ],
            },
            { field: 'submission.hasCollateral', operator: 'eq', value: false },
          ],
        };

        expect(service.evaluate(requiresReview, createLoanContext({ creditScore: 680 }))).toBe(true);
        expect(service.evaluate(requiresReview, createLoanContext({ hasCollateral: false }))).toBe(true);
        expect(service.evaluate(requiresReview, createLoanContext())).toBe(false);
      });
    });

    describe('Employee Expense Approval', () => {
      const expenseContext: RuleEvaluationContext = {
        submission: {
          amount: 500,
          category: 'travel',
          receiptsAttached: true,
          description: 'Client meeting - New York',
        },
        user: {
          id: 'user-1',
          role: 'manager',
          organizationId: 'org-1',
        },
      };

      it('should auto-approve expenses under $100', () => {
        const condition: RuleCondition = {
          and: [
            { field: 'submission.amount', operator: 'lt', value: 100 },
            { field: 'submission.receiptsAttached', operator: 'eq', value: true },
          ],
        };

        expect(service.evaluate(condition, { ...expenseContext, submission: { ...expenseContext.submission, amount: 50 } })).toBe(true);
      });

      it('should require manager approval for $100-$1000', () => {
        const condition: RuleCondition = {
          and: [
            { field: 'submission.amount', operator: 'gte', value: 100 },
            { field: 'submission.amount', operator: 'lt', value: 1000 },
          ],
        };

        expect(service.evaluate(condition, expenseContext)).toBe(true);
      });

      it('should require director approval for expenses over $1000', () => {
        const condition: RuleCondition = {
          field: 'submission.amount',
          operator: 'gte',
          value: 1000,
        };

        expect(service.evaluate(condition, { ...expenseContext, submission: { ...expenseContext.submission, amount: 1500 } })).toBe(true);
      });
    });

    describe('Support Ticket Routing', () => {
      it('should route high-priority tickets to senior support', async () => {
        const rules: RuleDefinition[] = [
          {
            id: 'route-urgent',
            name: 'Route Urgent',
            ruleType: 'routing',
            condition: {
              or: [
                { field: 'submission.priority', operator: 'eq', value: 'critical' },
                { field: 'submission.customerTier', operator: 'eq', value: 'enterprise' },
              ],
            },
            actions: [
              { type: 'route', params: { targetNodeId: 'senior-support-queue' } },
              { type: 'sendNotification', params: { recipients: ['support-lead'], channel: 'push' } },
            ],
            priority: 100,
            isActive: true,
            stopOnMatch: true,
          },
          {
            id: 'route-standard',
            name: 'Route Standard',
            ruleType: 'routing',
            condition: { field: 'submission.priority', operator: 'in', value: ['low', 'medium'] },
            actions: [{ type: 'route', params: { targetNodeId: 'standard-support-queue' } }],
            priority: 50,
            isActive: true,
          },
        ];

        const urgentContext: RuleEvaluationContext = {
          submission: { priority: 'critical', customerTier: 'business' },
        };

        const result = await service.evaluateRuleSet(rules, urgentContext);
        expect(result.matchedRules).toBe(1);
        expect(result.actionsToExecute).toHaveLength(2);
        expect(result.actionsToExecute[0].params).toEqual(
          expect.objectContaining({ targetNodeId: 'senior-support-queue' }),
        );
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // EDGE CASES
  // ─────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle missing field gracefully', () => {
      const context: RuleEvaluationContext = { submission: { name: 'John' } };
      const condition: FieldCondition = { field: 'submission.nonexistent', operator: 'eq', value: 'test' };

      // Should not throw, should return false
      expect(service.evaluate(condition, context)).toBe(false);
    });

    it('should handle deeply nested field access', () => {
      const context: RuleEvaluationContext = {
        submission: {
          address: {
            city: 'New York',
            country: {
              code: 'US',
              name: 'United States',
            },
          },
        },
      };

      const condition: FieldCondition = {
        field: 'submission.address.country.code',
        operator: 'eq',
        value: 'US',
      };

      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should handle empty rule set', async () => {
      const result = await service.evaluateRuleSet([], { submission: {} });

      expect(result.totalRules).toBe(0);
      expect(result.matchedRules).toBe(0);
      expect(result.actionsToExecute).toHaveLength(0);
    });

    it('should handle empty/undefined conditions array in AND', () => {
      const condition: LogicalCondition = { and: [] };
      // Empty AND should be true (vacuous truth)
      expect(service.evaluate(condition, { submission: {} })).toBe(true);
    });

    it('should handle empty/undefined conditions array in OR', () => {
      const condition: LogicalCondition = { or: [] };
      // Empty OR should be false (nothing matches)
      expect(service.evaluate(condition, { submission: {} })).toBe(false);
    });

    it('should handle type coercion for numeric comparisons', () => {
      const context: RuleEvaluationContext = {
        submission: { value: 100 }, // Numeric value
      };

      const condition: FieldCondition = { field: 'submission.value', operator: 'gt', value: 50 };
      // Both values must be numbers for numeric comparison
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should return false for string-to-number comparison without coercion', () => {
      const context: RuleEvaluationContext = {
        submission: { value: '100' }, // String number - NOT coerced
      };

      const condition: FieldCondition = { field: 'submission.value', operator: 'gt', value: 50 };
      // String values are not coerced for numeric operators
      expect(service.evaluate(condition, context)).toBe(false);
    });
  });
});
