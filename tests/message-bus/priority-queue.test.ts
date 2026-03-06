import { describe, it, expect } from 'vitest';
import { Deque, PriorityQueue } from '../../src/message-bus/priority-queue.js';
import type { Message, MessagePriority } from '../../src/message-bus/types.js';

function makeMessage(priority: MessagePriority, id: string = 'test'): Message {
  return {
    id,
    type: 'request',
    from: 'a',
    to: 'b',
    payload: null,
    priority,
    timestamp: Date.now(),
    ttlMs: 60000,
  };
}

describe('Deque', () => {
  it('pushBack and popFront in FIFO order', () => {
    const d = new Deque<number>();
    d.pushBack(1);
    d.pushBack(2);
    d.pushBack(3);
    expect(d.popFront()).toBe(1);
    expect(d.popFront()).toBe(2);
    expect(d.popFront()).toBe(3);
  });

  it('returns undefined when empty', () => {
    const d = new Deque<number>();
    expect(d.popFront()).toBeUndefined();
  });

  it('tracks length correctly', () => {
    const d = new Deque<number>();
    expect(d.length).toBe(0);
    d.pushBack(1);
    expect(d.length).toBe(1);
    d.pushBack(2);
    expect(d.length).toBe(2);
    d.popFront();
    expect(d.length).toBe(1);
    d.popFront();
    expect(d.length).toBe(0);
  });

  it('grows when full', () => {
    const d = new Deque<number>(4);
    for (let i = 0; i < 10; i++) {
      d.pushBack(i);
    }
    expect(d.length).toBe(10);
    for (let i = 0; i < 10; i++) {
      expect(d.popFront()).toBe(i);
    }
  });

  it('handles wrap-around correctly', () => {
    const d = new Deque<number>(4);
    d.pushBack(1);
    d.pushBack(2);
    d.popFront(); // head moves forward
    d.popFront();
    d.pushBack(3);
    d.pushBack(4);
    d.pushBack(5);
    d.pushBack(6); // triggers wrap-around
    expect(d.popFront()).toBe(3);
    expect(d.popFront()).toBe(4);
    expect(d.popFront()).toBe(5);
    expect(d.popFront()).toBe(6);
  });
});

describe('PriorityQueue', () => {
  it('dequeues urgent before normal', () => {
    const pq = new PriorityQueue();
    pq.enqueue(makeMessage('normal', 'n1'));
    pq.enqueue(makeMessage('urgent', 'u1'));
    expect(pq.dequeue()!.id).toBe('u1');
    expect(pq.dequeue()!.id).toBe('n1');
  });

  it('respects all 4 priority levels in order', () => {
    const pq = new PriorityQueue();
    pq.enqueue(makeMessage('low', 'l1'));
    pq.enqueue(makeMessage('normal', 'n1'));
    pq.enqueue(makeMessage('urgent', 'u1'));
    pq.enqueue(makeMessage('high', 'h1'));

    expect(pq.dequeue()!.id).toBe('u1');
    expect(pq.dequeue()!.id).toBe('h1');
    expect(pq.dequeue()!.id).toBe('n1');
    expect(pq.dequeue()!.id).toBe('l1');
  });

  it('returns undefined when empty', () => {
    const pq = new PriorityQueue();
    expect(pq.dequeue()).toBeUndefined();
  });

  it('length sums all deques', () => {
    const pq = new PriorityQueue();
    expect(pq.length).toBe(0);
    pq.enqueue(makeMessage('urgent', 'u1'));
    pq.enqueue(makeMessage('normal', 'n1'));
    pq.enqueue(makeMessage('low', 'l1'));
    expect(pq.length).toBe(3);
    pq.dequeue();
    expect(pq.length).toBe(2);
  });

  it('clear empties all queues', () => {
    const pq = new PriorityQueue();
    pq.enqueue(makeMessage('urgent', 'u1'));
    pq.enqueue(makeMessage('high', 'h1'));
    pq.enqueue(makeMessage('normal', 'n1'));
    pq.enqueue(makeMessage('low', 'l1'));
    expect(pq.length).toBe(4);
    pq.clear();
    expect(pq.length).toBe(0);
    expect(pq.dequeue()).toBeUndefined();
  });
});
