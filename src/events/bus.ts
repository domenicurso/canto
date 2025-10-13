export type Unsub = () => void;

export class EventBus<T> {
  private subs = new Set<(t: T) => void>();

  emit(v: T): void {
    for (const fn of this.subs) {
      fn(v);
    }
  }

  on(fn: (t: T) => void): Unsub {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }
}

// Async channel for for-await consumers
export class AsyncChannel<T> {
  private q: (T | null)[] = [];
  private resolvers: Array<(v: IteratorResult<T>) => void> = [];

  push(v: T): void {
    const r = this.resolvers.shift();
    if (r) {
      r({ value: v, done: false });
    } else {
      this.q.push(v);
    }
  }

  close(): void {
    const r = this.resolvers.shift();
    if (r) {
      r({ value: undefined as any, done: true });
    } else {
      this.q.push(null);
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () =>
        new Promise<IteratorResult<T>>((resolve) => {
          const v = this.q.shift();
          if (v === undefined) {
            this.resolvers.push(resolve);
          } else if (v === null) {
            resolve({ value: undefined as any, done: true });
          } else {
            resolve({ value: v, done: false });
          }
        }),
    };
  }
}
