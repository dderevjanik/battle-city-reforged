import Phaser from 'phaser';

const EVENT_KEY = 'e';

export class Subject<T> {
  private emitter = new Phaser.Events.EventEmitter();

  public addListener(listener: (event: T) => any): () => void {
    this.emitter.on(EVENT_KEY, listener);
    return () => this.emitter.off(EVENT_KEY, listener);
  }

  public addListenerOnce(listener: (event: T) => any): () => void {
    this.emitter.once(EVENT_KEY, listener);
    return () => this.emitter.off(EVENT_KEY, listener);
  }

  public removeListener(listener: (event: T) => any): this {
    this.emitter.off(EVENT_KEY, listener);
    return this;
  }

  public notify = (event: T): this => {
    this.emitter.emit(EVENT_KEY, event);
    return this;
  };
}
