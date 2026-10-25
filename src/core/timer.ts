/**
 * Monotonic deadline timer using performance.now()
 * Guarantees accurate timing independent of frame rate or background tab throttling.
 */
export interface TimerCallbacks {
  onTick?: (remainingMs: number, progressRatio: number) => void;
  onTimeout?: () => void;
}

export class MonotonicTimer {
  private durationMs: number = 0;
  private deadline: number = 0;
  private remainingWhenPaused: number | null = null;
  private timerId: number | null = null;
  private isRunning: boolean = false;
  private hasTimedOut: boolean = false;
  private callbacks: TimerCallbacks = {};

  constructor(callbacks?: TimerCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
    this.setupVisibilityListener();
  }

  setCallbacks(callbacks: TimerCallbacks): void {
    this.callbacks = callbacks;
  }

  private setupVisibilityListener(): void {
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.isRunning && !this.hasTimedOut) {
          this.checkDeadline();
        }
      });
    }
  }

  start(durationMs: number): void {
    this.stop();
    this.durationMs = Math.max(0, durationMs);
    this.deadline = performance.now() + this.durationMs;
    this.remainingWhenPaused = null;
    this.isRunning = true;
    this.hasTimedOut = false;

    // Immediately trigger initial tick
    this.emitTick();

    this.scheduleNextTick();
  }

  private scheduleNextTick(): void {
    if (!this.isRunning || this.hasTimedOut) return;

    const setTimer = typeof window !== 'undefined' ? window.setTimeout : setTimeout;
    this.timerId = setTimer(() => {
      if (!this.isRunning || this.hasTimedOut) return;
      this.checkDeadline();
      if (this.isRunning && !this.hasTimedOut) {
        this.scheduleNextTick();
      }
    }, 50) as unknown as number;
  }

  private checkDeadline(): void {
    const now = performance.now();
    const remaining = Math.max(0, this.deadline - now);

    this.emitTick();

    if (remaining <= 0 && !this.hasTimedOut) {
      this.hasTimedOut = true;
      this.isRunning = false;
      if (this.timerId !== null) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
      this.callbacks.onTimeout?.();
    }
  }

  private emitTick(): void {
    if (!this.callbacks.onTick) return;
    const now = performance.now();
    const remaining = Math.max(0, this.deadline - now);
    const ratio = this.durationMs > 0 ? Math.min(1, Math.max(0, remaining / this.durationMs)) : 0;
    this.callbacks.onTick(remaining, ratio);
  }

  pause(): void {
    if (!this.isRunning || this.remainingWhenPaused !== null) return;
    const now = performance.now();
    this.remainingWhenPaused = Math.max(0, this.deadline - now);
    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  resume(): void {
    if (this.isRunning || this.remainingWhenPaused === null || this.hasTimedOut) return;
    this.deadline = performance.now() + this.remainingWhenPaused;
    this.remainingWhenPaused = null;
    this.isRunning = true;
    this.scheduleNextTick();
  }

  stop(): void {
    this.isRunning = false;
    this.hasTimedOut = false;
    this.remainingWhenPaused = null;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  getRemainingMs(): number {
    if (this.remainingWhenPaused !== null) {
      return this.remainingWhenPaused;
    }
    if (!this.isRunning) return 0;
    return Math.max(0, this.deadline - performance.now());
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
