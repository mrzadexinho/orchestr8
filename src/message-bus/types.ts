export interface Message {
  id: string;
  type: MessageType;
  from: string;
  to: string;
  payload: unknown;
  priority: MessagePriority;
  timestamp: number;
  correlationId?: string;
  ttlMs: number;
}

export type MessageType =
  | 'task_assign'
  | 'task_complete'
  | 'task_fail'
  | 'heartbeat'
  | 'status_update'
  | 'request'
  | 'response'
  | 'broadcast';

export type MessagePriority = 'urgent' | 'high' | 'normal' | 'low';

export const PRIORITY_ORDER: Record<MessagePriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export interface MessageInput {
  type: MessageType;
  from: string;
  to: string;
  payload: unknown;
  priority?: MessagePriority;
  correlationId?: string;
  ttlMs?: number;
}

export type MessageHandler = (message: Message) => void;

export function createMessage(input: MessageInput): Message {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    from: input.from,
    to: input.to,
    payload: input.payload,
    priority: input.priority ?? 'normal',
    timestamp: Date.now(),
    correlationId: input.correlationId,
    ttlMs: input.ttlMs ?? 60000,
  };
}
