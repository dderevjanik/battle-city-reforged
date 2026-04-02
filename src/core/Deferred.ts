export class Deferred<T> {
  public promise: Promise<T>;
  public resolve: (value?: unknown) => void;
  public reject: (reason?: any) => void;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
