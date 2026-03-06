import { RoutingResult, TaskOutcome } from './types.js';
import { PatternMatcher } from './pattern-matcher.js';
import { HistoryTracker } from './history-tracker.js';

export class Router {
  private matcher: PatternMatcher;
  private tracker: HistoryTracker;

  constructor() {
    this.matcher = new PatternMatcher();
    this.tracker = new HistoryTracker();
  }

  route(description: string, taskType?: string): RoutingResult {
    const result = this.matcher.match(description);
    const performance = this.tracker.getPerformance(result.agent, taskType);

    if (performance.taskCount > 0) {
      const boost = performance.successRate * 0.10;
      result.confidence = Math.min(1.0, result.confidence + boost);
      result.historicalPerformance = performance;
    }

    return result;
  }

  recordOutcome(outcome: TaskOutcome): void {
    this.tracker.recordOutcome(outcome);
  }
}

export { PatternMatcher } from './pattern-matcher.js';
export { HistoryTracker } from './history-tracker.js';
export * from './types.js';
