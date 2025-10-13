import type { ComputedSignal, EffectHandle, Signal } from "./types";

type Subscriber<T> = (value: T) => void;

export type MaybeSignal<T> = T | Signal<T>;

interface ReactiveObserver {
  invalidate(): void;
  stop(): void;
  readonly active: boolean;
  registerDependency(signal: SignalBase<any>): void;
}

const computationStack: ReactiveObserver[] = [];

export function withTracking<T>(observer: ReactiveObserver, fn: () => T): T {
  computationStack.push(observer);
  try {
    return fn();
  } finally {
    computationStack.pop();
  }
}

function currentObserver(): ReactiveObserver | null {
  return computationStack.length > 0
    ? (computationStack[computationStack.length - 1] ?? null)
    : null;
}

let idCounter = 0;

export abstract class SignalBase<T> {
  readonly id = idCounter++;
  protected subscribers = new Set<Subscriber<T>>();
  protected dependents = new Set<ReactiveObserver>();
  protected dirty = false;

  subscribe(fn: Subscriber<T>): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  trackDependency(): void {
    const observer = currentObserver();
    if (!observer || !observer.active) {
      return;
    }
    observer.registerDependency(this);
  }

  addDependent(observer: ReactiveObserver): void {
    this.dependents.add(observer);
  }

  removeDependent(observer: ReactiveObserver): void {
    this.dependents.delete(observer);
  }

  protected notifyDependents(): void {
    for (const dependent of Array.from(this.dependents)) {
      dependent.invalidate();
    }
  }

  protected notifySubscribers(value: T): void {
    for (const subscriber of Array.from(this.subscribers)) {
      subscriber(value);
    }
  }

  abstract get(): T;
  abstract flush(): void;
  abstract dispose(): void;
}

let batchDepth = 0;
const pendingSignals = new Set<SignalBase<any>>();
const pendingEffects = new Set<ReactiveEffect>();
const pendingComputeds = new Set<ComputedSignalImpl<any>>();

function scheduleSignal(signal: SignalBase<any>): void {
  pendingSignals.add(signal);
  flushIfNeeded();
}

export function scheduleComputed(signal: ComputedSignalImpl<any>): void {
  pendingComputeds.add(signal);
  flushIfNeeded();
}

export function scheduleEffect(effect: ReactiveEffect): void {
  pendingEffects.add(effect);
  flushIfNeeded();
}

function flushIfNeeded(): void {
  if (batchDepth === 0) {
    flushPending();
  }
}

export function startBatch(): void {
  batchDepth++;
}

export function endBatch(): void {
  batchDepth = Math.max(0, batchDepth - 1);
  if (batchDepth === 0) {
    flushPending();
  }
}

function flushPending(): void {
  if (batchDepth > 0) {
    return;
  }

  const computeds = Array.from(pendingComputeds);
  pendingComputeds.clear();
  for (const computed of computeds) {
    computed.flush();
  }

  const signals = Array.from(pendingSignals);
  pendingSignals.clear();
  for (const signal of signals) {
    signal.flush();
  }

  const effects = Array.from(pendingEffects);
  pendingEffects.clear();
  for (const effect of effects) {
    effect.flush();
  }
}

export class StateSignal<T> extends SignalBase<T> implements Signal<T> {
  #value: T;
  #disposed = false;

  constructor(initial: T) {
    super();
    this.#value = initial;
  }

  get(): T {
    this.trackDependency();
    return this.#value;
  }

  set(value: T): void {
    if (this.#disposed) {
      throw new Error("Cannot set value on a disposed signal");
    }

    if (Object.is(value, this.#value)) {
      return;
    }

    this.#value = value;
    this.notifyDependents();
    scheduleSignal(this);
  }

  flush(): void {
    this.notifySubscribers(this.#value);
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    this.subscribers.clear();
    for (const dependent of Array.from(this.dependents)) {
      dependent.stop();
    }
    this.dependents.clear();
  }
}

export abstract class ReactiveObserverImpl
  implements ReactiveObserver, EffectHandle
{
  protected dependencies = new Set<SignalBase<any>>();
  scheduled = false;
  cleanupFn: (() => void) | undefined;
  active = true;

  constructor(protected readonly fn: () => any) {}

  registerDependency(signal: SignalBase<any>): void {
    if (!this.dependencies.has(signal)) {
      this.dependencies.add(signal);
      signal.addDependent(this);
    }
  }

  protected cleanupDependencies(): void {
    for (const signal of Array.from(this.dependencies)) {
      signal.removeDependent(this);
    }
    this.dependencies.clear();
  }

  stop(): void {
    if (!this.active) {
      return;
    }
    this.active = false;
    this.cleanup();
    this.cleanupDependencies();
  }

  dispose(): void {
    this.stop();
  }

  protected cleanup(): void {
    if (this.cleanupFn) {
      try {
        this.cleanupFn();
      } finally {
        this.cleanupFn = undefined;
      }
    }
  }

  abstract invalidate(): void;
  abstract flush(): void;
}

export class ReactiveEffect extends ReactiveObserverImpl {
  invalidate(): void {
    if (!this.active || this.scheduled) {
      return;
    }
    this.scheduled = true;
    scheduleEffect(this);
  }

  flush(): void {
    if (!this.active) {
      return;
    }
    this.scheduled = false;
    this.cleanup();
    this.cleanupDependencies();
    const result = withTracking(this, () => this.fn());
    if (typeof result === "function") {
      this.cleanupFn = result as () => void;
    } else {
      this.cleanupFn = undefined;
    }
  }
}

export class ComputedSignalImpl<T>
  extends SignalBase<T>
  implements ComputedSignal<T>
{
  private computation: ComputedObserver<T>;
  private value!: T;
  private hasValue = false;
  private scheduled = false;
  private disposed = false;

  constructor(fn: () => T) {
    super();
    this.computation = new ComputedObserver(fn, this);
  }

  get(): T {
    if (this.disposed) {
      throw new Error("Cannot read disposed computed signal");
    }
    if (!this.hasValue || this.computation.dirty) {
      this.evaluate();
    }
    this.trackDependency();
    return this.value;
  }

  override subscribe(fn: Subscriber<T>): () => void {
    if (!this.hasValue || this.computation.dirty) {
      this.evaluate();
    }
    return super.subscribe(fn);
  }

  set(): void {
    throw new Error("Cannot set value of computed signal");
  }

  onInvalidate(): void {
    if (this.disposed) {
      return;
    }
    if (!this.computation.dirty) {
      this.computation.dirty = true;
      this.notifyDependents();
      if (this.subscribers.size > 0 && !this.scheduled) {
        this.scheduled = true;
        scheduleComputed(this);
      }
    }
  }

  flush(): void {
    if (this.disposed) {
      return;
    }
    this.scheduled = false;
    if (!this.computation.dirty) {
      return;
    }
    const previous = this.hasValue ? this.value : undefined;
    const next = this.evaluate();
    if (!this.hasValue || !Object.is(previous, next)) {
      this.notifySubscribers(next);
    }
  }

  flushSubscribers(): void {
    if (!this.hasValue || this.computation.dirty) {
      const next = this.evaluate();
      this.notifySubscribers(next);
    } else {
      this.notifySubscribers(this.value);
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.subscribers.clear();
    this.computation.stop();
    this.dependents.clear();
  }

  protected evaluate(): T {
    this.value = this.computation.evaluate();
    this.hasValue = true;
    return this.value;
  }
}

class ComputedObserver<T> extends ReactiveObserverImpl {
  dirty = true;

  constructor(
    fn: () => T,
    private readonly signal: ComputedSignalImpl<T>,
  ) {
    super(fn);
  }

  evaluate(): T {
    this.cleanupDependencies();
    this.dirty = false;
    const value = withTracking(this, () => this.fn());
    return value;
  }

  invalidate(): void {
    if (!this.active) {
      return;
    }
    if (!this.dirty) {
      this.dirty = true;
      this.signal.onInvalidate();
    }
  }

  flush(): void {
    if (!this.active) {
      return;
    }
    this.signal.flush();
  }
}

export function isSignal<T>(value: unknown): value is Signal<T> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "get" in (value as any) &&
      typeof (value as any).get === "function" &&
      "subscribe" in (value as any) &&
      typeof (value as any).subscribe === "function",
  );
}

export function unwrapMaybeSignal<T>(value: MaybeSignal<T>): T {
  if (isSignal<T>(value)) {
    return value.get();
  }
  return value;
}

export interface BatchedSignal<T> extends SignalBase<T> {
  flush(): void;
}
