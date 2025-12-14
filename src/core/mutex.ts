export class Mutex {
  private mutex = Promise.resolve();

  public async lock(): Promise<() => void> {
    let unlock_next: () => void;

    const will_lock = new Promise<void>((resolve) => {
      unlock_next = resolve;
    });

    const previous = this.mutex;
    this.mutex = previous.then(() => will_lock);

    await previous;
    return unlock_next!;
  }
}