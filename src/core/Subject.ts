type Listener<T> = (event: T) => void;

export class Subject<T> {
  private listeners: Listener<T>[] = [];
  private onceSet = new Set<Listener<T>>();

  public addListener(listener: Listener<T>): () => void {
    this.listeners.push(listener);
    return () => this.removeListener(listener);
  }

  public addListenerOnce(listener: Listener<T>): () => void {
    this.onceSet.add(listener);
    this.listeners.push(listener);
    return () => this.removeListener(listener);
  }

  public removeListener(listener: Listener<T>): this {
    const idx = this.listeners.indexOf(listener);
    if (idx !== -1) this.listeners.splice(idx, 1);
    this.onceSet.delete(listener);
    return this;
  }

  public notify = (event: T): this => {
    // Snapshot to allow listener removal during iteration
    const snapshot = this.listeners.slice();
    for (const fn of snapshot) {
      fn(event);
      if (this.onceSet.has(fn)) {
        this.removeListener(fn);
      }
    }
    return this;
  };
}
