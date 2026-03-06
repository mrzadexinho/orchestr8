export interface TaskDefinition {
  id: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  subtasks?: SubTask[];
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export type TaskType = 'coding' | 'testing' | 'research' | 'coordination' | 'security' | 'review';
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

export interface TaskAnalysis {
  taskId: string;
  complexity: number;
  estimatedDurationMs: number;
  requiredCapabilities: string[];
  subtasks: SubTask[];
  confidence: number;
}

export interface SubTask {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  dependencies: string[];
  estimatedDurationMs: number;
  requiredCapabilities: string[];
}

export interface AgentState {
  id: string;
  type: string;
  capabilities: string[];
  status: 'idle' | 'busy' | 'error' | 'offline';
  workload: number;
  successRate: number;
  health: number;
}

export interface AgentScore {
  agentId: string;
  totalScore: number;
  capabilityScore: number;
  loadScore: number;
  performanceScore: number;
  healthScore: number;
  availabilityScore: number;
}

export type ExecutionStrategy =
  | 'sequential'
  | 'parallel'
  | 'pipeline'
  | 'fan-out-fan-in'
  | 'hybrid';

export interface AgentAssignment {
  agentId: string;
  taskId: string;
  score: number;
  assignedAt: number;
}

export interface ParallelAssignment {
  subtaskId: string;
  agentId: string;
  dependencies: string[];
}

export interface DelegationPlan {
  planId: string;
  taskId: string;
  primaryAgent: AgentAssignment;
  backupAgents: AgentAssignment[];
  parallelAssignments: ParallelAssignment[];
  strategy: ExecutionStrategy;
  estimatedCompletionMs: number;
  timestamp: number;
}
