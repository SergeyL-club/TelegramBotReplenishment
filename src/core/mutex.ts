export class Mutex {
  private mutex = Promise.resolve();

  public async lock(): Promise<() => void> {
    let unlock_next: () => void;

    const willLock = new Promise<void>((resolve) => {
      unlock_next = resolve;
    });

    const previous = this.mutex;
    this.mutex = previous.then(() => willLock);

    await previous;
    return unlock_next!;
  }
}
