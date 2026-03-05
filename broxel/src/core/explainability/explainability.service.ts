import { Injectable } from '@angular/core';
import { WorkflowStep } from '../../app/models/workflow.model';
import { TelemetryEvent } from '../telemetry/models';
import {
  DependencyNodeEvidence,
  ExplainabilityQuestion,
  ExplainabilityResult,
  LogicalConflict,
  RootCause
} from './models';

@Injectable({
  providedIn: 'root'
})
export class ExplainabilityService {
  explain(
    question: ExplainabilityQuestion,
    step: WorkflowStep,
    formSnapshot: Record<string, unknown>,
    telemetryEvents: TelemetryEvent[]
  ): ExplainabilityResult {
    const bindingExpression = step.bindings?.[`visible.${question.targetId}`]
      || step.bindings?.[`rule.${question.targetId}`]
      || this.findValidationExpression(question.targetId, step);

    const dependencies = this.extractDependencies(bindingExpression);
    const dependencyChain: DependencyNodeEvidence[] = dependencies.map((dep) => ({
      nodeId: dep,
      nodeType: 'field',
      observedValue: formSnapshot[dep],
      evaluation: this.evaluateTruthy(formSnapshot[dep]) ? 'true' : 'false',
      source: 'dag'
    }));

    let ruleEvaluation: 'true' | 'false' | 'not_executed' = 'not_executed';
    if (bindingExpression) {
      ruleEvaluation = this.evaluateExpression(bindingExpression, formSnapshot) ? 'true' : 'false';
      dependencyChain.push({
        nodeId: question.targetId,
        nodeType: 'rule',
        expression: bindingExpression,
        evaluation: ruleEvaluation,
        source: 'ast'
      });
    }

    const telemetryForTarget = telemetryEvents.filter((event) => event.fieldId === question.targetId);
    if (telemetryForTarget.length > 0) {
      dependencyChain.push({
        nodeId: `telemetry:${question.targetId}`,
        nodeType: 'derived',
        observedValue: telemetryForTarget[telemetryForTarget.length - 1].type,
        evaluation: 'true',
        source: 'telemetry'
      });
    }

    const rootCauses = this.buildRootCauses(question.targetId, bindingExpression, ruleEvaluation, dependencyChain);
    const conflicts = this.detectConflicts(step);

    return this.buildNarrative(question.targetId, rootCauses, dependencyChain, conflicts);
  }

  detectConflicts(step: WorkflowStep): LogicalConflict[] {
    const conflicts: LogicalConflict[] = [];
    const bindings = step.bindings || {};
    const perTarget = new Map<string, string[]>();

    Object.entries(bindings).forEach(([key, expression]) => {
      const target = key.split('.').slice(1).join('.');
      if (!target) return;
      perTarget.set(target, [...(perTarget.get(target) || []), expression]);
    });

    perTarget.forEach((expressions, targetId) => {
      const equalChecks = expressions.flatMap((expression) => this.extractEqualityChecks(expression));
      const byField = new Map<string, Set<string>>();

      equalChecks.forEach(({ fieldId, value }) => {
        const values = byField.get(fieldId) || new Set<string>();
        values.add(value);
        byField.set(fieldId, values);
      });

      byField.forEach((values, fieldId) => {
        if (values.size > 1) {
          conflicts.push({
            targetId,
            message: `La lógica de ${targetId} tiene condiciones incompatibles para ${fieldId} (${Array.from(values).join(' vs ')}).`,
            severity: 'high'
          });
        }
      });
    });

    return conflicts;
  }

  private findValidationExpression(targetId: string, step: WorkflowStep): string | undefined {
    return step.validationRules?.find((rule) => rule.fieldId === targetId)?.rule;
  }

  private buildRootCauses(
    targetId: string,
    expression: string | undefined,
    ruleEvaluation: 'true' | 'false' | 'not_executed',
    dependencyChain: DependencyNodeEvidence[]
  ): RootCause[] {
    const causes: RootCause[] = [];

    if (!expression) {
      causes.push({
        code: 'NO_RULE_FOUND',
        confidence: 0.55,
        plainText: `No encontré una regla explícita para ${targetId}.`,
        technicalDetail: 'No existe visible.<fieldId>, rule.<fieldId> ni regla de validación asociada en el step actual.',
        source: 'dag'
      });
      return causes;
    }

    if (ruleEvaluation === 'false') {
      const blockedDependencies = dependencyChain.filter((dep) => dep.nodeType === 'field' && dep.evaluation === 'false');
      if (blockedDependencies.length > 0) {
        causes.push({
          code: 'DEPENDENCY_BLOCKED',
          confidence: 0.9,
          plainText: `La regla no se cumple porque faltan o no coinciden datos en ${blockedDependencies.map((item) => item.nodeId).join(', ')}.`,
          technicalDetail: `Expresión evaluada: ${expression}. Dependencias en false: ${blockedDependencies.map((item) => `${item.nodeId}=${String(item.observedValue)}`).join(', ')}`,
          source: 'ast'
        });
      } else {
        causes.push({
          code: 'RULE_FALSE',
          confidence: 0.75,
          plainText: 'La condición principal evaluó en falso con los valores actuales.',
          technicalDetail: `Expresión evaluada: ${expression}`,
          source: 'ast'
        });
      }
    }

    if (ruleEvaluation === 'not_executed') {
      causes.push({
        code: 'RULE_NOT_EXECUTED',
        confidence: 0.7,
        plainText: 'No hay evidencia reciente de ejecución de esta regla.',
        technicalDetail: 'No se pudo evaluar la regla con el snapshot actual o no existe telemetría del objetivo.',
        source: 'telemetry'
      });
    }

    return causes;
  }

  private buildNarrative(
    targetId: string,
    rootCauses: RootCause[],
    dependencyChain: DependencyNodeEvidence[],
    conflicts: LogicalConflict[]
  ): ExplainabilityResult {
    const strongestCause = rootCauses[0];
    const confidenceLabel: 'Alta' | 'Media' | 'Baja' = strongestCause
      ? strongestCause.confidence >= 0.85
        ? 'Alta'
        : strongestCause.confidence >= 0.65
          ? 'Media'
          : 'Baja'
      : 'Baja';

    const summary = strongestCause
      ? `El comportamiento de "${targetId}" parece estar bloqueado por una condición de la lógica.`
      : `No encontré una causa única para "${targetId}" con la información disponible.`;

    const why = rootCauses.length > 0
      ? rootCauses.map((cause) => cause.plainText)
      : ['No hay evidencia suficiente para dar una explicación concluyente.'];

    const blocked = dependencyChain.filter((dep) => dep.nodeType === 'field' && dep.evaluation === 'false');
    const nextActions = [
      blocked.length > 0
        ? `Completa o corrige estos datos primero: ${blocked.map((item) => item.nodeId).join(', ')}.`
        : 'Revisa los valores capturados en este paso y vuelve a intentar.',
      'Si el problema persiste, abre el modo diagnóstico para revisar la cadena de dependencias.',
      conflicts.length > 0
        ? 'Hay posibles conflictos lógicos en reglas del paso; revisa condiciones duplicadas o contradictorias.'
        : 'No se detectaron conflictos lógicos evidentes en este paso.'
    ];

    return {
      summary,
      why,
      nextActions,
      confidenceLabel,
      dependencyChain,
      rootCauses,
      conflicts
    };
  }

  private evaluateExpression(expression: string, formSnapshot: Record<string, unknown>): boolean {
    const normalized = expression.trim();
    if (!normalized) return false;

    if (normalized.includes('&&')) {
      return normalized.split('&&').every((part) => this.evaluateExpression(part.trim(), formSnapshot));
    }

    if (normalized.includes('||')) {
      return normalized.split('||').some((part) => this.evaluateExpression(part.trim(), formSnapshot));
    }

    const comparisonMatch = normalized.match(/^([a-zA-Z0-9_$.]+)\s*(===|==|!==|!=|>=|<=|>|<)\s*(.+)$/);
    if (comparisonMatch) {
      const [, rawField, operator, rawValue] = comparisonMatch;
      const fieldId = rawField.replace(/^data\./, '');
      const left = formSnapshot[fieldId];
      const right = this.parseValue(rawValue);
      return this.compare(left, right, operator);
    }

    const fieldOnlyMatch = normalized.match(/^!?([a-zA-Z0-9_$.]+)$/);
    if (fieldOnlyMatch) {
      const isNegated = normalized.startsWith('!');
      const fieldId = fieldOnlyMatch[1].replace(/^data\./, '');
      const value = this.evaluateTruthy(formSnapshot[fieldId]);
      return isNegated ? !value : value;
    }

    return false;
  }

  private compare(left: unknown, right: unknown, operator: string): boolean {
    switch (operator) {
      case '===':
      case '==':
        return left == right;
      case '!==':
      case '!=':
        return left != right;
      case '>':
        return Number(left) > Number(right);
      case '<':
        return Number(left) < Number(right);
      case '>=':
        return Number(left) >= Number(right);
      case '<=':
        return Number(left) <= Number(right);
      default:
        return false;
    }
  }

  private parseValue(rawValue: string): unknown {
    const trimmed = rawValue.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (!Number.isNaN(Number(trimmed))) return Number(trimmed);
    return trimmed;
  }

  private extractDependencies(expression?: string): string[] {
    if (!expression) return [];
    const matches = expression.match(/[a-zA-Z_][a-zA-Z0-9_.]*/g) || [];
    const blacklist = new Set(['true', 'false', 'null', 'undefined', 'data']);

    return Array.from(
      new Set(
        matches
          .map((item) => item.replace(/^data\./, ''))
          .filter((item) => !blacklist.has(item) && !item.includes('.'))
      )
    );
  }

  private evaluateTruthy(value: unknown): boolean {
    if (typeof value === 'string') return value.trim().length > 0;
    return Boolean(value);
  }

  private extractEqualityChecks(expression: string): { fieldId: string; value: string }[] {
    const checks: { fieldId: string; value: string }[] = [];
    const regex = /([a-zA-Z0-9_$.]+)\s*(===|==)\s*(['"]?[^&|\s]+['"]?)/g;
    let match = regex.exec(expression);

    while (match) {
      checks.push({
        fieldId: match[1].replace(/^data\./, ''),
        value: match[3].replace(/^['"]|['"]$/g, '')
      });
      match = regex.exec(expression);
    }

    return checks;
  }
}
