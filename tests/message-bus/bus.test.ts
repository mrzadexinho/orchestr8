import { describe, it, expect, vi } from 'vitest';
import { MessageBus } from '../../src/message-bus/bus.js';
import type { Message } from '../../src/message-bus/types.js';

describe('MessageBus', () => {
  it('subscribe + publish delivers to handler', () => {
    const bus = new MessageBus();
    const received: Message[] = [];
    bus.subscribe('agent-1', (msg) => received.push(msg));

    bus.publish({
      type: 'request',
      from: 'orchestrator',
      to: 'agent-1',
      payload: { task: 'do stuff' },
    });

    expect(received).toHaveLength(1);
    expect(received[0].payload).toEqual({ task: 'do stuff' });
  });

  it('broadcast reaches all subscribers', () => {
    const bus = new MessageBus();
    const r1: Message[] = [];
    const r2: Message[] = [];
    bus.subscribe('agent-1', (msg) => r1.push(msg));
    bus.subscribe('agent-2', (msg) => r2.push(msg));

    bus.publish({
      type: 'broadcast',
      from: 'orchestrator',
      to: 'broadcast',
      payload: 'hello all',
    });

    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
  });

  it('direct message only reaches target', () => {
    const bus = new MessageBus();
    const r1: Message[] = [];
    const r2: Message[] = [];
    bus.subscribe('agent-1', (msg) => r1.push(msg));
    bus.subscribe('agent-2', (msg) => r2.push(msg));

    bus.publish({
      type: 'request',
      from: 'orchestrator',
      to: 'agent-1',
      payload: 'private',
    });

    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(0);
  });

  it('unsubscribe stops delivery', () => {
    const bus = new MessageBus();
    const received: Message[] = [];
    bus.subscribe('agent-1', (msg) => received.push(msg));
    bus.unsubscribe('agent-1');

    bus.publish({
      type: 'request',
      from: 'orchestrator',
      to: 'agent-1',
      payload: 'ignored',
    });

    expect(received).toHaveLength(0);
  });

  it('subscriber count tracks correctly', () => {
    const bus = new MessageBus();
    expect(bus.getSubscriberCount()).toBe(0);
    bus.subscribe('agent-1', () => {});
    expect(bus.getSubscriberCount()).toBe(1);
    bus.subscribe('agent-2', () => {});
    expect(bus.getSubscriberCount()).toBe(2);
    bus.unsubscribe('agent-1');
    expect(bus.getSubscriberCount()).toBe(1);
  });

  it('message has correct fields', () => {
    const bus = new MessageBus();
    let captured: Message | undefined;
    bus.subscribe('agent-1', (msg) => { captured = msg; });

    const before = Date.now();
    const returned = bus.publish({
      type: 'task_assign',
      from: 'orchestrator',
      to: 'agent-1',
      payload: { x: 1 },
      priority: 'high',
      correlationId: 'corr-123',
      ttlMs: 5000,
    });
    const after = Date.now();

    expect(captured).toBeDefined();
    expect(captured!.id).toMatch(/^msg_/);
    expect(captured!.type).toBe('task_assign');
    expect(captured!.from).toBe('orchestrator');
    expect(captured!.to).toBe('agent-1');
    expect(captured!.payload).toEqual({ x: 1 });
    expect(captured!.priority).toBe('high');
    expect(captured!.correlationId).toBe('corr-123');
    expect(captured!.ttlMs).toBe(5000);
    expect(captured!.timestamp).toBeGreaterThanOrEqual(before);
    expect(captured!.timestamp).toBeLessThanOrEqual(after);
    // publish returns the same message
    expect(returned).toBe(captured);
  });
});
