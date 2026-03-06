export interface RoutingResult {
  agent: string;
  confidence: number;
  alternatives: RoutingAlternative[];
  reasoning: string;
  historicalPerformance?: HistoricalPerformance;
}

export interface RoutingAlternative {
  agent: string;
  confidence: number;
}

export interface HistoricalPerformance {
  successRate: number;
  avgQuality: number;
  taskCount: number;
}

export interface TaskOutcome {
  taskId: string;
  agent: string;
  taskType: string;
  success: boolean;
  quality: number;
  durationMs: number;
  timestamp: number;
}
