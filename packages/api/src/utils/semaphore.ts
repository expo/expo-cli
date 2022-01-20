export class Semaphore {
  private queue: ((v: boolean) => void)[] = [];
  private available = 1;

  public async acquire(): Promise<boolean> {
    if (this.available > 0) {
      this.available -= 1;
      return true;
    }

    // If there is no permit available, we return a promise that resolves once the semaphore gets
    // signaled enough times that "available" is equal to one.
    return new Promise(resolver => this.queue.push(resolver));
  }

  public release() {
    this.available += 1;

    if (this.available > 1 && this.queue.length > 0) {
      throw new Error('this.available should never be > 0 when there is someone waiting.');
    } else if (this.available === 1 && this.queue.length > 0) {
      // If there is someone else waiting, immediately consume the permit that was released
      // at the beginning of this function and let the waiting function resume.
      this.available -= 1;

      const nextResolver = this.queue.shift();
      if (nextResolver) {
        nextResolver(true);
      }
    }
  }
}
