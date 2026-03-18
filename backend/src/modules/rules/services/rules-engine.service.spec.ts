import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RulesEngineService } from './rules-engine.service';
import { Rule } from '../entities/rule.entity';
import { DomainEventsService } from '../../events/services/domain-events.service';
import { 
  RuleCondition, 
  RuleDefinition, 
  RuleEvaluationContext 
} from '../interfaces/rule-types';

describe('RulesEngineService', () => {
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
            find: jest.fn(),
          },
        },
        {
          provide: DomainEventsService,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RulesEngineService>(RulesEngineService);
    rulesRepo = module.get(getRepositoryToken(Rule));
    eventsService = module.get(DomainEventsService);
  });

  describe('evaluate - Basic Conditions', () => {
    const context: RuleEvaluationContext = {
      submission: {
        name: 'John Doe',
        age: 25,
        email: 'john@example.com',
        status: 'active',
      },
    };

    it('should return true for empty condition', () => {
      const result = service.evaluate({} as RuleCondition, context);
      expect(result).toBe(true);
    });

    it('should evaluate eq operator correctly', () => {
      const condition: RuleCondition = {
        field: 'submission.name',
        operator: 'eq',
        value: 'John Doe',
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should evaluate ne operator correctly', () => {
      const condition: RuleCondition = {
        field: 'submission.name',
        operator: 'ne',
        value: 'Jane Doe',
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should evaluate gt operator correctly', () => {
      const condition: RuleCondition = {
        field: 'submission.age',
        operator: 'gt',
        value: 20,
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should evaluate gte operator correctly', () => {
      const condition: RuleCondition = {
        field: 'submission.age',
        operator: 'gte',
        value: 25,
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should evaluate lt operator correctly', () => {
      const condition: RuleCondition = {
        field: 'submission.age',
        operator: 'lt',
        value: 30,
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should evaluate in operator correctly', () => {
      const condition: RuleCondition = {
        field: 'submission.status',
        operator: 'in',
        value: ['active', 'pending'],
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should evaluate contains operator correctly', () => {
      const condition: RuleCondition = {
        field: 'submission.email',
        operator: 'contains',
        value: '@example',
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should evaluate startsWith operator correctly', () => {
      const condition: RuleCondition = {
        field: 'submission.email',
        operator: 'startsWith',
        value: 'john',
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should evaluate regex operator correctly', () => {
      const condition: RuleCondition = {
        field: 'submission.email',
        operator: 'regex',
        value: '^[a-z]+@.*\\.com$',
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should evaluate between operator correctly', () => {
      const condition: RuleCondition = {
        field: 'submission.age',
        operator: 'between',
        value: [20, 30],
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });
  });

  describe('evaluate - Logical Operators', () => {
    const context: RuleEvaluationContext = {
      submission: {
        name: 'John',
        age: 25,
        isVip: true,
      },
    };

    it('should evaluate AND condition correctly', () => {
      const condition: RuleCondition = {
        and: [
          { field: 'submission.name', operator: 'eq', value: 'John' },
          { field: 'submission.age', operator: 'gte', value: 18 },
        ],
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should evaluate OR condition correctly', () => {
      const condition: RuleCondition = {
        or: [
          { field: 'submission.name', operator: 'eq', value: 'Jane' },
          { field: 'submission.age', operator: 'gte', value: 18 },
        ],
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should evaluate NOT condition correctly', () => {
      const condition: RuleCondition = {
        not: { field: 'submission.name', operator: 'eq', value: 'Jane' },
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });

    it('should evaluate nested conditions correctly', () => {
      const condition: RuleCondition = {
        and: [
          {
            or: [
              { field: 'submission.isVip', operator: 'eq', value: true },
              { field: 'submission.age', operator: 'gte', value: 30 },
            ],
          },
          { field: 'submission.name', operator: 'eq', value: 'John' },
        ],
      };
      expect(service.evaluate(condition, context)).toBe(true);
    });
  });

  describe('evaluateRuleSet', () => {
    const context: RuleEvaluationContext = {
      submission: { amount: 1000 },
      system: { 
        currentDate: '2024-01-01',
        currentTimestamp: Date.now(),
        applicationId: 'app-1',
      },
      user: { id: 'user-1', organizationId: 'org-1' },
    };

    const rules: RuleDefinition[] = [
      {
        id: 'rule-1',
        name: 'High Value Rule',
        ruleType: 'condition',
        condition: { field: 'submission.amount', operator: 'gt', value: 500 },
        actions: [{ type: 'setVariable', params: { variableName: 'tier', value: 'high' } }],
        priority: 10,
        isActive: true,
      },
      {
        id: 'rule-2',
        name: 'Low Value Rule',
        ruleType: 'condition',
        condition: { field: 'submission.amount', operator: 'lte', value: 500 },
        actions: [{ type: 'setVariable', params: { variableName: 'tier', value: 'low' } }],
        priority: 5,
        isActive: true,
      },
    ];

    it('should evaluate rules in priority order', async () => {
      const result = await service.evaluateRuleSet(rules, context);
      
      expect(result.totalRules).toBe(2);
      expect(result.matchedRules).toBe(1);
      expect(result.results[0].ruleId).toBe('rule-1'); // Higher priority first
      expect(result.results[0].matched).toBe(true);
    });

    it('should skip inactive rules', async () => {
      const rulesWithInactive = [
        ...rules.map(r => ({ ...r })),
      ];
      rulesWithInactive[0].isActive = false;

      const result = await service.evaluateRuleSet(rulesWithInactive, context);
      expect(result.totalRules).toBe(1); // Only active rules counted
    });

    it('should stop evaluation on stopOnMatch', async () => {
      const rulesWithStop = [
        { ...rules[0], stopOnMatch: true },
        { ...rules[1] },
      ];

      const result = await service.evaluateRuleSet(rulesWithStop, context);
      expect(result.stoppedEarly).toBe(true);
      expect(result.results.length).toBe(1);
    });
  });

  describe('evaluateAndExecute', () => {
    const context: RuleEvaluationContext = {
      submission: { approved: true },
      variables: {},
    };

    it('should execute setVariable action', async () => {
      const rules: RuleDefinition[] = [
        {
          id: 'rule-1',
          name: 'Set Status Rule',
          ruleType: 'condition',
          condition: { field: 'submission.approved', operator: 'eq', value: true },
          actions: [
            { type: 'setVariable', params: { variableName: 'status', value: 'approved' } },
          ],
          priority: 10,
          isActive: true,
        },
      ];

      const result = await service.evaluateAndExecute(rules, context);
      
      expect(result.contextUpdates['status']).toBe('approved');
      expect(result.actionResults[0].success).toBe(true);
    });

    it('should handle route action', async () => {
      const rules: RuleDefinition[] = [
        {
          id: 'rule-1',
          name: 'Routing Rule',
          ruleType: 'routing',
          condition: { field: 'submission.approved', operator: 'eq', value: true },
          actions: [
            { type: 'route', params: { targetNodeId: 'node-123' } },
          ],
          priority: 10,
          isActive: true,
        },
      ];

      const result = await service.evaluateAndExecute(rules, context);
      
      expect(result.routingDecision).toBe('node-123');
    });

    it('should handle reject action', async () => {
      const rules: RuleDefinition[] = [
        {
          id: 'rule-1',
          name: 'Rejection Rule',
          ruleType: 'validation',
          condition: { field: 'submission.approved', operator: 'eq', value: true },
          actions: [
            { type: 'reject', params: { reason: 'Test rejection', errorCode: 'ERR001' } },
          ],
          priority: 10,
          isActive: true,
        },
      ];

      const result = await service.evaluateAndExecute(rules, context);
      
      expect(result.rejected).toEqual({
        reason: 'Test rejection',
        errorCode: 'ERR001',
      });
    });
  });
});
