import type { Message, MessagePriority } from './types.js';
import { PRIORITY_ORDER } from './types.js';

const INITIAL_CAPACITY = 16;

export class Deque<T> {
  private buffer: (T | undefined)[];
  private head: number;
  private tail: number;
  private count: number;
  private capacity: number;

  constructor(capacity: number = INITIAL_CAPACITY) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  get length(): number {
    return this.count;
  }

  pushBack(item: T): void {
    if (this.count === this.capacity) {
      this.grow();
    }
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    this.count++;
  }

  popFront(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }
    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined;
    this.head = (this.head + 1) % this.capacity;
    this.count--;
    return item;
  }

  private grow(): void {
    const newCapacity = this.capacity * 2;
    const newBuffer = new Array<T | undefined>(newCapacity);
    for (let i = 0; i < this.count; i++) {
      newBuffer[i] = this.buffer[(this.head + i) % this.capacity];
    }
    this.buffer = newBuffer;
    this.head = 0;
    this.tail = this.count;
    this.capacity = newCapacity;
  }
}

const PRIORITY_LEVELS: MessagePriority[] = ['urgent', 'high', 'normal', 'low'];

export class PriorityQueue {
  private queues: Map<MessagePriority, Deque<Message>>;

  constructor() {
    this.queues = new Map();
    for (const level of PRIORITY_LEVELS) {
      this.queues.set(level, new Deque<Message>());
    }
  }

  get length(): number {
    let total = 0;
    for (const deque of this.queues.values()) {
      total += deque.length;
    }
    return total;
  }

  enqueue(message: Message): void {
    const deque = this.queues.get(message.priority);
    if (deque) {
      deque.pushBack(message);
    }
  }

  dequeue(): Message | undefined {
    for (const level of PRIORITY_LEVELS) {
      const deque = this.queues.get(level)!;
      if (deque.length > 0) {
        return deque.popFront();
      }
    }
    return undefined;
  }

  clear(): void {
    for (const level of PRIORITY_LEVELS) {
      this.queues.set(level, new Deque<Message>());
    }
  }
}
