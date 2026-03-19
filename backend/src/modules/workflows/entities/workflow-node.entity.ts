import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { jsonColumnType, timestampColumnType, uuidColumnType } from '../../../infrastructure/database/column-types';

@Entity('workflow_nodes')
export class WorkflowNode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workflow_id', type: uuidColumnType() })
  workflowId!: string;

  @Column({ name: 'organization_id', type: uuidColumnType() })
  organizationId!: string;

  @Column({ name: 'node_type', type: 'varchar', length: 50 })
  nodeType!: 
    | 'start' 
    | 'end' 
    | 'form' 
    | 'screen' 
    | 'decision' 
    | 'action' 
    | 'wait' 
    | 'parallel' 
    | 'sub_workflow'
    // Integration node types
    | 'api_call'
    | 'webhook_listener'
    | 'cache_operation'
    | 'cdn_upload'
    | 'firebase_action'
    | 'browser_action'
    | 'custom_route'
    | 'transformation'
    | 'sdk_function';

  @Column({ type: 'varchar', length: 200 })
  label!: string;

  @Column({ name: 'config_json', type: jsonColumnType(), default: {} })
  configJson!: Record<string, unknown>;

  @Column({ name: 'position_x', type: 'int', default: 0 })
  positionX!: number;

  @Column({ name: 'position_y', type: 'int', default: 0 })
  positionY!: number;

  @Column({ name: 'is_start_node', type: 'boolean', default: false })
  isStartNode!: boolean;

  @Column({ name: 'is_end_node', type: 'boolean', default: false })
  isEndNode!: boolean;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType() })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType() })
  updatedAt!: Date;
}
