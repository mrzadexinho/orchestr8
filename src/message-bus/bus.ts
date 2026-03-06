import type { Message, MessageInput, MessageHandler } from './types.js';
import { createMessage } from './types.js';

export class MessageBus {
  private subscribers: Map<string, MessageHandler>;

  constructor() {
    this.subscribers = new Map();
  }

  subscribe(agentId: string, handler: MessageHandler): void {
    this.subscribers.set(agentId, handler);
  }

  unsubscribe(agentId: string): void {
    this.subscribers.delete(agentId);
  }

  publish(input: MessageInput): Message {
    const message = createMessage(input);

    if (message.to === 'broadcast') {
      for (const handler of this.subscribers.values()) {
        handler(message);
      }
    } else {
      const handler = this.subscribers.get(message.to);
      if (handler) {
        handler(message);
      }
    }

    return message;
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }
}
