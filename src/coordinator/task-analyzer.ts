import type { TaskDefinition, TaskAnalysis, SubTask, TaskType } from './types.js';

const TYPE_WEIGHTS: Record<TaskType, number> = {
  coordination: 0.2,
  consensus: 0.25 as number,
  coding: 0.15,
  testing: 0.1,
  research: 0.1,
  security: 0.2,
  review: 0.1,
} as Record<TaskType, number>;

const PRIORITY_MULTIPLIERS: Record<string, number> = {
  critical: 1.3,
  high: 1.15,
  normal: 1.0,
  low: 0.9,
};

const CAPABILITY_KEYWORDS: Record<string, string> = {
  security: 'security',
  auth: 'authentication',
  test: 'testing',
  perf: 'performance',
  performance: 'performance',
  database: 'database',
  db: 'database',
  api: 'api-design',
  ui: 'ui-design',
  frontend: 'frontend',
  backend: 'backend',
  deploy: 'deployment',
  deployment: 'deployment',
  cloud: 'cloud',
  devops: 'devops',
  ml: 'machine-learning',
  ai: 'machine-learning',
  data: 'data-analysis',
  network: 'networking',
  crypto: 'cryptography',
  scale: 'scalability',
  scalability: 'scalability',
};

export class TaskAnalyzer {
  analyze(task: TaskDefinition): TaskAnalysis {
    const subtasks = this.decomposeSubtasks(task);
    const complexity = this.calculateComplexity(task);
    const requiredCapabilities = this.extractCapabilities(task);
    const confidence = this.calculateConfidence(complexity, requiredCapabilities);
    const estimatedDurationMs = complexity * 60000;

    return {
      taskId: task.id,
      complexity,
      estimatedDurationMs,
      requiredCapabilities,
      subtasks,
      confidence,
    };
  }

  private calculateComplexity(task: TaskDefinition): number {
    let complexity = 0.3;

    const subtaskCount = task.subtasks?.length ?? 0;
    complexity += subtaskCount * 0.1;

    const depCount = task.dependencies?.length ?? 0;
    complexity += depCount * 0.05;

    const typeWeight = (TYPE_WEIGHTS as Record<string, number>)[task.type] ?? 0.1;
    complexity += typeWeight;

    const priorityMultiplier = PRIORITY_MULTIPLIERS[task.priority] ?? 1.0;
    complexity *= priorityMultiplier;

    return Math.min(complexity, 1.0);
  }

  private decomposeSubtasks(task: TaskDefinition): SubTask[] {
    if (task.subtasks && task.subtasks.length > 0) {
      return task.subtasks;
    }

    switch (task.type) {
      case 'coding':
        return this.codingSubtasks(task);
      case 'testing':
        return this.testingSubtasks(task);
      case 'research':
        return this.researchSubtasks(task);
      default:
        return [];
    }
  }

  private codingSubtasks(task: TaskDefinition): SubTask[] {
    const designId = `${task.id}-design`;
    const implementId = `${task.id}-implement`;
    const testId = `${task.id}-test`;

    return [
      {
        id: designId,
        name: 'design',
        description: `Design phase for ${task.description}`,
        type: 'coding',
        priority: task.priority,
        dependencies: [],
        estimatedDurationMs: 10000,
        requiredCapabilities: ['design'],
      },
      {
        id: implementId,
        name: 'implement',
        description: `Implementation phase for ${task.description}`,
        type: 'coding',
        priority: task.priority,
        dependencies: [designId],
        estimatedDurationMs: 30000,
        requiredCapabilities: ['coding'],
      },
      {
        id: testId,
        name: 'test',
        description: `Testing phase for ${task.description}`,
        type: 'testing',
        priority: task.priority,
        dependencies: [implementId],
        estimatedDurationMs: 20000,
        requiredCapabilities: ['testing'],
      },
    ];
  }

  private testingSubtasks(task: TaskDefinition): SubTask[] {
    return [
      {
        id: `${task.id}-analyze-requirements`,
        name: 'analyze-requirements',
        description: `Analyze requirements for ${task.description}`,
        type: 'testing',
        priority: task.priority,
        dependencies: [],
        estimatedDurationMs: 15000,
        requiredCapabilities: ['analysis'],
      },
      {
        id: `${task.id}-execute-tests`,
        name: 'execute-tests',
        description: `Execute tests for ${task.description}`,
        type: 'testing',
        priority: task.priority,
        dependencies: [],
        estimatedDurationMs: 25000,
        requiredCapabilities: ['testing'],
      },
    ];
  }

  private researchSubtasks(task: TaskDefinition): SubTask[] {
    return [
      {
        id: `${task.id}-gather-information`,
        name: 'gather-information',
        description: `Gather information for ${task.description}`,
        type: 'research',
        priority: task.priority,
        dependencies: [],
        estimatedDurationMs: 20000,
        requiredCapabilities: ['research'],
      },
      {
        id: `${task.id}-analyze`,
        name: 'analyze',
        description: `Analyze findings for ${task.description}`,
        type: 'research',
        priority: task.priority,
        dependencies: [],
        estimatedDurationMs: 15000,
        requiredCapabilities: ['analysis'],
      },
    ];
  }

  private extractCapabilities(task: TaskDefinition): string[] {
    const capabilities = new Set<string>();
    const words = task.description.toLowerCase().split(/\W+/);

    for (const word of words) {
      if (CAPABILITY_KEYWORDS[word]) {
        capabilities.add(CAPABILITY_KEYWORDS[word]);
      }
    }

    return Array.from(capabilities);
  }

  private calculateConfidence(complexity: number, capabilities: string[]): number {
    const confidence =
      0.5 + 0.2 * (1 - complexity) + Math.min(capabilities.length * 0.05, 0.15);
    return Math.min(confidence, 0.95);
  }
}
