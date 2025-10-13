export interface Signal<T> {
  get(): T;
  set(value: T): void;
  subscribe(fn: (value: T) => void): () => void;
  flush(): void;
}

export interface ComputedSignal<T> extends Signal<T> {
  // Computed signals are read-only; set throws.
  set(): void;
}

export interface EffectHandle {
  dispose(): void;
}
