export class Timer {
  private interval_id: NodeJS.Timeout | null = null;

  public constructor(
    private callback: () => Promise<void> | void,
    private interval_ms: number
  ) {}

  public start(): void {
    if (this.interval_id !== null) return; // уже запущен
    this.interval_id = setInterval(this.callback, this.interval_ms);
  }

  public stop(): void {
    if (this.interval_id === null) return;
    clearInterval(this.interval_id);
    this.interval_id = null;
  }

  public isRunning(): boolean {
    return this.interval_id !== null;
  }
}
