import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * Layout configuration interfaces for screens
 */
export interface LayoutConfig {
  type: LayoutType;
  columns?: number;
  rows?: number;
  gap?: string;
  padding?: string;
  areas?: LayoutArea[];
  responsive?: ResponsiveBreakpoints;
}

export type LayoutType = 'grid' | 'flex' | 'stack' | 'columns' | 'tabs' | 'accordion' | 'card' | 'wizard';

export interface LayoutArea {
  id: string;
  name?: string;
  gridArea?: string;
  colspan?: number;
  rowspan?: number;
  componentIds?: string[];
  style?: Record<string, string | number>;
}

export interface ResponsiveBreakpoints {
  mobile?: LayoutConfig;
  tablet?: LayoutConfig;
  desktop?: LayoutConfig;
}

export interface ComponentPlacement {
  componentId: string;
  areaId?: string;
  order?: number;
  gridColumn?: string;
  gridRow?: string;
  flex?: string;
}

const SUPPORTED_LAYOUT_TYPES: LayoutType[] = [
  'grid',
  'flex',
  'stack',
  'columns',
  'tabs',
  'accordion',
  'card',
  'wizard',
];

@Injectable()
export class ScreenLayoutService {
  /**
   * Validates a complete layout configuration
   * @throws BadRequestException if validation fails
   */
  validateLayout(layoutJson: Record<string, unknown>): LayoutConfig {
    if (!layoutJson || typeof layoutJson !== 'object') {
      throw new BadRequestException('Layout configuration must be an object');
    }

    // Validate layout type
    const type = layoutJson.type as string;
    if (!type) {
      throw new BadRequestException('Layout must have a type');
    }

    if (!SUPPORTED_LAYOUT_TYPES.includes(type as LayoutType)) {
      throw new BadRequestException(
        `Unsupported layout type: "${type}". Supported types: ${SUPPORTED_LAYOUT_TYPES.join(', ')}`
      );
    }

    // Validate type-specific configurations
    switch (type) {
      case 'grid':
        this.validateGridLayout(layoutJson);
        break;
      case 'flex':
        this.validateFlexLayout(layoutJson);
        break;
      case 'columns':
        this.validateColumnsLayout(layoutJson);
        break;
      case 'tabs':
        this.validateTabsLayout(layoutJson);
        break;
      case 'wizard':
        this.validateWizardLayout(layoutJson);
        break;
    }

    // Validate areas if present
    if (layoutJson.areas) {
      this.validateAreas(layoutJson.areas as unknown[]);
    }

    // Validate responsive breakpoints if present
    if (layoutJson.responsive) {
      this.validateResponsiveConfig(layoutJson.responsive as Record<string, unknown>);
    }

    return layoutJson as unknown as LayoutConfig;
  }

  /**
   * Validates grid layout specific configuration
   */
  private validateGridLayout(layout: Record<string, unknown>): void {
    if (layout.columns !== undefined) {
      if (typeof layout.columns !== 'number' || layout.columns < 1 || layout.columns > 24) {
        throw new BadRequestException('Grid columns must be a number between 1 and 24');
      }
    }

    if (layout.rows !== undefined) {
      if (typeof layout.rows !== 'number' || layout.rows < 1) {
        throw new BadRequestException('Grid rows must be a positive number');
      }
    }

    if (layout.gap !== undefined && typeof layout.gap !== 'string') {
      throw new BadRequestException('Grid gap must be a string (e.g., "16px", "1rem")');
    }
  }

  /**
   * Validates flex layout specific configuration
   */
  private validateFlexLayout(layout: Record<string, unknown>): void {
    const validDirections = ['row', 'column', 'row-reverse', 'column-reverse'];
    if (layout.direction && !validDirections.includes(layout.direction as string)) {
      throw new BadRequestException(
        `Invalid flex direction: "${layout.direction}". Must be one of: ${validDirections.join(', ')}`
      );
    }

    const validJustify = ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'];
    if (layout.justifyContent && !validJustify.includes(layout.justifyContent as string)) {
      throw new BadRequestException(`Invalid justifyContent value: "${layout.justifyContent}"`);
    }

    const validAlign = ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'];
    if (layout.alignItems && !validAlign.includes(layout.alignItems as string)) {
      throw new BadRequestException(`Invalid alignItems value: "${layout.alignItems}"`);
    }
  }

  /**
   * Validates columns layout specific configuration
   */
  private validateColumnsLayout(layout: Record<string, unknown>): void {
    if (layout.columns !== undefined) {
      if (typeof layout.columns !== 'number' || layout.columns < 1 || layout.columns > 12) {
        throw new BadRequestException('Columns layout must have 1-12 columns');
      }
    }
  }

  /**
   * Validates tabs layout specific configuration
   */
  private validateTabsLayout(layout: Record<string, unknown>): void {
    if (!layout.tabs || !Array.isArray(layout.tabs)) {
      throw new BadRequestException('Tabs layout must have a tabs array');
    }

    const tabIds = new Set<string>();
    for (let i = 0; i < (layout.tabs as unknown[]).length; i++) {
      const tab = (layout.tabs as Record<string, unknown>[])[i];
      if (!tab || typeof tab !== 'object') {
        throw new BadRequestException(`Tab at index ${i} must be an object`);
      }
      if (!tab.id || typeof tab.id !== 'string') {
        throw new BadRequestException(`Tab at index ${i} must have a string id`);
      }
      if (tabIds.has(tab.id)) {
        throw new BadRequestException(`Duplicate tab id: "${tab.id}"`);
      }
      tabIds.add(tab.id);
      
      if (!tab.label || typeof tab.label !== 'string') {
        throw new BadRequestException(`Tab "${tab.id}" must have a label`);
      }
    }
  }

  /**
   * Validates wizard layout specific configuration
   */
  private validateWizardLayout(layout: Record<string, unknown>): void {
    if (!layout.steps || !Array.isArray(layout.steps)) {
      throw new BadRequestException('Wizard layout must have a steps array');
    }

    const stepIds = new Set<string>();
    for (let i = 0; i < (layout.steps as unknown[]).length; i++) {
      const step = (layout.steps as Record<string, unknown>[])[i];
      if (!step || typeof step !== 'object') {
        throw new BadRequestException(`Step at index ${i} must be an object`);
      }
      if (!step.id || typeof step.id !== 'string') {
        throw new BadRequestException(`Step at index ${i} must have a string id`);
      }
      if (stepIds.has(step.id)) {
        throw new BadRequestException(`Duplicate step id: "${step.id}"`);
      }
      stepIds.add(step.id);

      if (!step.title || typeof step.title !== 'string') {
        throw new BadRequestException(`Step "${step.id}" must have a title`);
      }
    }
  }

  /**
   * Validates layout areas
   */
  private validateAreas(areas: unknown[]): void {
    if (!Array.isArray(areas)) {
      throw new BadRequestException('Layout areas must be an array');
    }

    const areaIds = new Set<string>();
    for (let i = 0; i < areas.length; i++) {
      const area = areas[i] as Record<string, unknown>;
      if (!area || typeof area !== 'object') {
        throw new BadRequestException(`Area at index ${i} must be an object`);
      }
      if (!area.id || typeof area.id !== 'string') {
        throw new BadRequestException(`Area at index ${i} must have a string id`);
      }
      if (areaIds.has(area.id)) {
        throw new BadRequestException(`Duplicate area id: "${area.id}"`);
      }
      areaIds.add(area.id);

      // Validate colspan/rowspan
      if (area.colspan !== undefined) {
        if (typeof area.colspan !== 'number' || area.colspan < 1) {
          throw new BadRequestException(`Area "${area.id}" colspan must be a positive number`);
        }
      }
      if (area.rowspan !== undefined) {
        if (typeof area.rowspan !== 'number' || area.rowspan < 1) {
          throw new BadRequestException(`Area "${area.id}" rowspan must be a positive number`);
        }
      }

      // Validate componentIds
      if (area.componentIds !== undefined) {
        if (!Array.isArray(area.componentIds)) {
          throw new BadRequestException(`Area "${area.id}" componentIds must be an array`);
        }
        for (const compId of area.componentIds) {
          if (typeof compId !== 'string') {
            throw new BadRequestException(`Area "${area.id}" componentIds must contain only strings`);
          }
        }
      }
    }
  }

  /**
   * Validates responsive breakpoints configuration
   */
  private validateResponsiveConfig(responsive: Record<string, unknown>): void {
    const validBreakpoints = ['mobile', 'tablet', 'desktop'];
    
    for (const key of Object.keys(responsive)) {
      if (!validBreakpoints.includes(key)) {
        throw new BadRequestException(
          `Invalid responsive breakpoint: "${key}". Valid breakpoints: ${validBreakpoints.join(', ')}`
        );
      }
      
      // Recursively validate the breakpoint layout (but skip recursive responsive validation)
      const breakpointLayout = responsive[key] as Record<string, unknown>;
      if (breakpointLayout && typeof breakpointLayout === 'object') {
        const withoutResponsive = { ...breakpointLayout };
        delete withoutResponsive.responsive;
        this.validateLayout(withoutResponsive);
      }
    }
  }

  /**
   * Creates a default layout configuration
   */
  createDefaultLayout(type: LayoutType = 'stack'): LayoutConfig {
    const defaults: Record<LayoutType, LayoutConfig> = {
      grid: {
        type: 'grid',
        columns: 12,
        gap: '16px',
        areas: [],
      },
      flex: {
        type: 'flex',
        areas: [],
      },
      stack: {
        type: 'stack',
        gap: '16px',
        areas: [],
      },
      columns: {
        type: 'columns',
        columns: 2,
        gap: '24px',
        areas: [],
      },
      tabs: {
        type: 'tabs',
        areas: [],
      },
      accordion: {
        type: 'accordion',
        areas: [],
      },
      card: {
        type: 'card',
        padding: '24px',
        areas: [],
      },
      wizard: {
        type: 'wizard',
        areas: [],
      },
    };

    return defaults[type];
  }

  /**
   * Merges component placements into layout areas
   */
  mergeComponentPlacements(
    layout: LayoutConfig,
    placements: ComponentPlacement[],
  ): LayoutConfig {
    const updatedLayout = { ...layout };
    
    if (!updatedLayout.areas) {
      updatedLayout.areas = [];
    }

    for (const placement of placements) {
      if (placement.areaId) {
        const area = updatedLayout.areas.find(a => a.id === placement.areaId);
        if (area) {
          if (!area.componentIds) {
            area.componentIds = [];
          }
          if (!area.componentIds.includes(placement.componentId)) {
            area.componentIds.push(placement.componentId);
          }
        }
      }
    }

    return updatedLayout;
  }

  /**
   * Removes a component from all layout areas
   */
  removeComponentFromLayout(layout: LayoutConfig, componentId: string): LayoutConfig {
    const updatedLayout = { ...layout };
    
    if (updatedLayout.areas) {
      for (const area of updatedLayout.areas) {
        if (area.componentIds) {
          area.componentIds = area.componentIds.filter(id => id !== componentId);
        }
      }
    }

    return updatedLayout;
  }
}
