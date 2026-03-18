import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ASTNode, BinaryOperator, LogicalOperator } from '../../core/rule-engine/ast/types';

export interface FieldReference {
  id: string;
  label: string;
  type: string;
}

export interface ConditionRow {
  logicalOp: LogicalOperator; // AND/OR (applies to previous condition)
  fieldId: string;
  operator: BinaryOperator;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

@Component({
  selector: 'app-natural-rule-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 font-sans">
      
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-slate-700">Mostrar este campo cuando:</h4>
        <button 
          (click)="addCondition()"
          class="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md transition-colors">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Añadir condición
        </button>
      </div>

      <!-- Conditions List -->
      <div class="space-y-3">
        @for (condition of conditions(); track $index) {
          <div class="flex items-center gap-2 group">
            
            <!-- Logical Operator (AND/OR) - Only show for 2nd condition onwards -->
            @if ($index > 0) {
              <select 
                [ngModel]="condition.logicalOp"
                (ngModelChange)="updateCondition($index, 'logicalOp', $event)"
                class="text-xs font-medium text-slate-500 bg-transparent border-none focus:ring-0 cursor-pointer hover:text-slate-700 uppercase">
                <option value="AND">Y</option>
                <option value="OR">O</option>
              </select>
            } @else {
              <div class="w-8"></div> <!-- Spacer for alignment -->
            }

            <!-- Field Selector -->
            <div class="relative flex-1">
              <select 
                [ngModel]="condition.fieldId"
                (ngModelChange)="updateCondition($index, 'fieldId', $event)"
                class="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow cursor-pointer">
                <option value="" disabled>Seleccionar campo...</option>
                @for (field of availableFields; track field.id) {
                  <option [value]="field.id">{{ field.label }}</option>
                }
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>

            <!-- Operator Selector -->
            <div class="relative w-40">
              <select 
                [ngModel]="condition.operator"
                (ngModelChange)="updateCondition($index, 'operator', $event)"
                class="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow cursor-pointer">
                <option value="==">es igual a</option>
                <option value="!=">no es igual a</option>
                <option value=">">es mayor que</option>
                <option value="<">es menor que</option>
                <option value=">=">es mayor o igual a</option>
                <option value="<=">es menor o igual a</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>

            <!-- Value Input -->
            <div class="flex-1">
              <input 
                type="text" 
                [ngModel]="condition.value"
                (ngModelChange)="updateCondition($index, 'value', $event)"
                placeholder="Valor..."
                class="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow placeholder:text-slate-400"
              />
            </div>

            <!-- Remove Button -->
            <button 
              (click)="removeCondition($index)"
              class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Eliminar condición">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        }

        @if (conditions().length === 0) {
          <div class="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
            <p class="text-sm text-slate-500">Este campo siempre será visible.</p>
            <button 
              (click)="addCondition()"
              class="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Añadir una regla específica
            </button>
          </div>
        }
      </div>
    </div>
  `
})
export class NaturalRuleBuilderComponent {
  @Input() availableFields: FieldReference[] = [];
  
  // We accept an AST node and convert it to our UI model
  @Input() set initialAst(ast: ASTNode | undefined) {
    if (ast) {
      this.parseAstToConditions(ast);
    }
  }

  // We emit a valid AST node that the engine understands
  @Output() astChange = new EventEmitter<ASTNode | undefined>();

  // UI Model for conditions
  conditions = signal<ConditionRow[]>([]);

  addCondition() {
    this.conditions.update(c => [...c, {
      logicalOp: 'AND',
      fieldId: '',
      operator: '==',
      value: ''
    }]);
    this.emitAst();
  }

  removeCondition(index: number) {
    this.conditions.update(c => c.filter((_, i) => i !== index));
    this.emitAst();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateCondition(index: number, key: keyof ConditionRow, value: any) {
    this.conditions.update(c => {
      const newConditions = [...c];
      newConditions[index] = { ...newConditions[index], [key]: value };
      return newConditions;
    });
    this.emitAst();
  }

  /**
   * Translates the UI model back into a valid AST for the engine
   */
  private emitAst() {
    const currentConditions = this.conditions();
    
    if (currentConditions.length === 0 || currentConditions.some(c => !c.fieldId)) {
      this.astChange.emit(undefined);
      return;
    }

    // Build AST from right to left (or sequentially)
    // For simplicity in this demo, we assume all conditions are chained with the same logical operator
    // A robust implementation would build a proper tree handling operator precedence
    
    let rootNode: ASTNode | null = null;

    for (const c of currentConditions) {
      // Try to infer type for literal
      let literalValue = c.value;
      let dataType: 'string' | 'number' | 'boolean' = 'string';
      
      if (!isNaN(Number(c.value)) && c.value !== '') {
        literalValue = Number(c.value);
        dataType = 'number';
      } else if (c.value === 'true' || c.value === 'false') {
        literalValue = c.value === 'true';
        dataType = 'boolean';
      }

      const binaryNode: ASTNode = {
        type: 'BinaryExpression',
        operator: c.operator,
        left: { type: 'Identifier', name: c.fieldId },
        right: { type: 'Literal', value: literalValue, dataType }
      };

      if (!rootNode) {
        rootNode = binaryNode;
      } else {
        rootNode = {
          type: 'LogicalExpression',
          operator: c.logicalOp,
          left: rootNode,
          right: binaryNode
        };
      }
    }

    this.astChange.emit(rootNode!);
  }

  /**
   * Translates an existing AST back into the UI model
   * (Simplified version: assumes a flat structure of LogicalExpressions)
   */
  private parseAstToConditions(ast: ASTNode) {
    const rows: ConditionRow[] = [];
    
    const traverse = (node: ASTNode, logicalOp: LogicalOperator = 'AND') => {
      if (node.type === 'LogicalExpression') {
        traverse(node.left, logicalOp);
        traverse(node.right, node.operator);
      } else if (node.type === 'BinaryExpression') {
        if (node.left.type === 'Identifier' && node.right.type === 'Literal') {
          rows.push({
            logicalOp,
            fieldId: node.left.name,
            operator: node.operator,
            value: String(node.right.value)
          });
        }
      }
    };

    traverse(ast);
    this.conditions.set(rows);
  }
}
