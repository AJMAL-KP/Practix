import { SoundController } from '../../core/audio';
import { StorageService } from '../../core/storage';
import { MonotonicTimer } from '../../core/timer';
import { RotatePathGenerator } from './generator';
import { RegionTransformations } from './transformations';
import { PathGrid, RotatePathState, RotatePathStats } from './types';
import { PathValidator } from './validator';

/**
 * Pure scoring function:
 * - 1,000 points per completed level (up to 5,000)
 * - Modest remaining time bonus (2 points per unused second if all 5 completed)
 * - Modest 50 points penalty per failed path test
 * - Clamped at 0 (never negative)
 */
export function calculateRotatePathScore(
  levelsCompleted: number,
  remainingTimeSec: number,
  failedTests: number
): number {
  const levelScore = Math.max(0, levelsCompleted) * 1000;
  const timeBonus = levelsCompleted === 5 ? Math.max(0, Math.round(remainingTimeSec * 2)) : 0;
  const penalty = Math.max(0, failedTests) * 50;
  return Math.max(0, levelScore + timeBonus - penalty);
}

export class RotatePathEngine {
  private level: number = 1;
  private grid!: PathGrid;
  private state: RotatePathState = { status: 'idle' };
  private timer: MonotonicTimer;
  private levelDurationMs: number = 240000;
  private currentDeadline: number | null = null;
  private levelStartTime: number = 0;
  private totalTimeSpentMs: number = 0;
  private sessionCommitted: boolean = false;

  private stats: RotatePathStats = {
    levelsAttempted: 0,
    levelsCompleted: 0,
    rotations: 0,
    flips: 0,
    testAttempts: 0,
    failedTests: 0,
    totalTimeMs: 0,
    score: 0,
  };

  private listeners: Array<(state: RotatePathState) => void> = [];
  private generator: RotatePathGenerator;
  private animationTimerId: number | null = null;

  constructor() {
    this.generator = new RotatePathGenerator();
    this.timer = new MonotonicTimer({
      onTick: (remainingMs) => {
        if (this.state.status === 'playing' || this.state.status === 'path_failed') {
          this.state = {
            ...this.state,
            remainingMs,
          };
          this.notify();
        }
      },
      onTimeout: () => {
        this.handleTimeout();
      },
    });
  }

  subscribe(listener: (state: RotatePathState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  getState(): RotatePathState {
    return this.state;
  }

  getStats(): RotatePathStats {
    return { ...this.stats };
  }

  getGrid(): PathGrid {
    return this.grid;
  }

  startSession(customDurationSec?: number, seed?: number): void {
    this.clearAnimation();
    this.timer.stop();
    this.sessionCommitted = false;

    this.generator = new RotatePathGenerator(seed);

    const settings = StorageService.getSettings();
    const durationSec = customDurationSec ?? settings.rotateLevelDurationSec ?? 240;
    this.levelDurationMs = Math.max(30, durationSec) * 1000;

    this.level = 1;
    this.totalTimeSpentMs = 0;
    this.stats = {
      levelsAttempted: 0,
      levelsCompleted: 0,
      rotations: 0,
      flips: 0,
      testAttempts: 0,
      failedTests: 0,
      totalTimeMs: 0,
      score: 0,
    };

    this.startLevel(1);
  }

  private startLevel(lvl: number): void {
    if (lvl > 5) {
      this.finishSession(true);
      return;
    }

    this.level = lvl;
    this.grid = this.generator.generateLevel(lvl);
    this.levelStartTime = performance.now();
    this.currentDeadline = this.levelStartTime + this.levelDurationMs;
    this.stats.levelsAttempted = lvl;

    this.state = {
      status: 'playing',
      level: lvl,
      grid: this.grid,
      selectedRegion: 4, // Center region 4 pre-selected
      remainingMs: this.levelDurationMs,
      rotations: this.stats.rotations,
      flips: this.stats.flips,
      testAttempts: this.stats.testAttempts,
      failedTests: this.stats.failedTests,
    };

    this.timer.start(this.levelDurationMs);
    this.notify();
  }

  selectRegion(regionIndex: number): void {
    // Only accept selection in active playing or path_failed states
    if (this.state.status !== 'playing' && this.state.status !== 'path_failed') {
      return;
    }
    if (regionIndex < 0 || regionIndex > 8) {
      return;
    }

    // Dismiss failure if in path_failed
    if (this.state.status === 'path_failed') {
      this.dismissFailure();
    }

    this.state = {
      ...this.state,
      selectedRegion: regionIndex,
    };
    this.notify();
  }

  rotateSelected(): void {
    if (this.state.status !== 'playing' || this.state.selectedRegion === null) {
      return;
    }

    // Authoritative deadline check
    if (this.currentDeadline !== null && performance.now() >= this.currentDeadline) {
      this.handleTimeout();
      return;
    }

    const regionIdx = this.state.selectedRegion;
    const newTiles = RegionTransformations.rotateRegion(this.grid.tiles, regionIdx);

    this.grid = {
      ...this.grid,
      tiles: newTiles,
    };
    this.stats.rotations++;
    SoundController.playRotate();

    this.state = {
      ...this.state,
      grid: this.grid,
      rotations: this.stats.rotations,
    };
    this.notify();
  }

  flipSelected(): void {
    if (this.state.status !== 'playing' || this.state.selectedRegion === null) {
      return;
    }

    // Authoritative deadline check
    if (this.currentDeadline !== null && performance.now() >= this.currentDeadline) {
      this.handleTimeout();
      return;
    }

    const regionIdx = this.state.selectedRegion;
    const newTiles = RegionTransformations.invertRegionDirections(this.grid.tiles, regionIdx);

    this.grid = {
      ...this.grid,
      tiles: newTiles,
    };
    this.stats.flips++;
    SoundController.playFlip();

    this.state = {
      ...this.state,
      grid: this.grid,
      flips: this.stats.flips,
    };
    this.notify();
  }

  testPath(): void {
    if (this.state.status !== 'playing') {
      return;
    }

    // Authoritative deadline check
    if (this.currentDeadline !== null && performance.now() >= this.currentDeadline) {
      this.handleTimeout();
      return;
    }

    this.stats.testAttempts++;
    const validation = PathValidator.validate(this.grid);

    // Enter testing_path state
    const coords = validation.visitedCoordinates;
    let stepIndex = 0;

    this.state = {
      status: 'testing_path',
      level: this.level,
      grid: this.grid,
      selectedRegion: this.state.selectedRegion,
      activeCoord: coords[0] || { row: this.grid.mouse.row, col: this.grid.mouse.col },
      visitedCoordinates: [],
    };
    this.notify();

    const stepInterval = 35; // 35ms per step for smooth traversal
    const advanceStep = () => {
      stepIndex++;
      if (stepIndex < coords.length) {
        this.state = {
          status: 'testing_path',
          level: this.level,
          grid: this.grid,
          selectedRegion:
            this.state.status === 'testing_path' ? this.state.selectedRegion : null,
          activeCoord: coords[stepIndex],
          visitedCoordinates: coords.slice(0, stepIndex),
        };
        this.notify();
        this.animationTimerId = setTimeout(advanceStep, stepInterval) as unknown as number;
      } else {
        // Validation outcome
        if (validation.success) {
          this.handleSuccess();
        } else {
          this.handleFailure(
            validation.failurePoint ||
              coords[coords.length - 1] || { row: 4, col: 0 },
            validation.reason || 'Path blocked'
          );
        }
      }
    };

    this.animationTimerId = setTimeout(advanceStep, stepInterval) as unknown as number;
  }

  private handleSuccess(): void {
    if (this.state.status !== 'playing' && this.state.status !== 'testing_path') {
      return;
    }

    this.timer.stop();
    this.currentDeadline = null;
    const timeSpent = performance.now() - this.levelStartTime;
    this.totalTimeSpentMs += timeSpent;
    this.stats.levelsCompleted++;
    this.stats.totalTimeMs = this.totalTimeSpentMs;
    SoundController.playPathSuccess();

    this.state = {
      status: 'path_succeeded',
      level: this.level,
      grid: this.grid,
      timeSpentMs: timeSpent,
    };
    this.notify();

    this.animationTimerId = setTimeout(() => {
      if (this.level < 5) {
        this.state = {
          status: 'level_transition',
          completedLevel: this.level,
          nextLevel: this.level + 1,
        };
        this.notify();

        this.animationTimerId = setTimeout(() => {
          this.startLevel(this.level + 1);
        }, 900) as unknown as number;
      } else {
        this.finishSession(true);
      }
    }, 1100) as unknown as number;
  }

  private handleFailure(
    failurePoint: { row: number; col: number },
    reason: string
  ): void {
    this.stats.failedTests++;
    SoundController.playPathFail();

    this.state = {
      status: 'path_failed',
      level: this.level,
      grid: this.grid,
      selectedRegion:
        this.state.status === 'testing_path' ? this.state.selectedRegion : 4,
      failurePoint,
      reason,
      remainingMs: this.timer.getRemainingMs(),
    };
    this.notify();
  }

  dismissFailure(): void {
    if (this.state.status !== 'path_failed') return;

    this.state = {
      status: 'playing',
      level: this.level,
      grid: this.grid,
      selectedRegion: this.state.selectedRegion ?? 4,
      remainingMs: this.timer.getRemainingMs(),
      rotations: this.stats.rotations,
      flips: this.stats.flips,
      testAttempts: this.stats.testAttempts,
      failedTests: this.stats.failedTests,
    };
    this.notify();
  }

  handleTimeout(): void {
    if (
      this.state.status !== 'playing' &&
      this.state.status !== 'path_failed' &&
      this.state.status !== 'testing_path'
    ) {
      return;
    }

    this.timer.stop();
    this.currentDeadline = null;
    this.clearAnimation();
    this.totalTimeSpentMs += this.levelDurationMs;
    this.stats.totalTimeMs = this.totalTimeSpentMs;
    SoundController.playTimeout();

    this.finishSession(false);
  }

  private finishSession(completedAll: boolean): void {
    this.timer.stop();
    this.currentDeadline = null;
    this.clearAnimation();

    if (this.sessionCommitted) {
      return;
    }
    this.sessionCommitted = true;

    const remainingSec = completedAll
      ? Math.max(0, Math.round((this.levelDurationMs - (performance.now() - this.levelStartTime)) / 1000))
      : 0;

    this.stats.score = calculateRotatePathScore(
      this.stats.levelsCompleted,
      remainingSec,
      this.stats.failedTests
    );

    StorageService.addHistoryRecord({
      gameId: 'rotate-path',
      score: this.stats.score,
      completed: completedAll,
      timeUsedSec: Math.round(this.stats.totalTimeMs / 1000),
      details: {
        levelsCompleted: `${this.stats.levelsCompleted}/5`,
        rotations: this.stats.rotations,
        flips: this.stats.flips,
        failedTests: this.stats.failedTests,
      },
    });

    this.state = {
      status: 'final_results',
      stats: { ...this.stats },
    };
    this.notify();
  }

  private clearAnimation(): void {
    if (this.animationTimerId !== null) {
      clearTimeout(this.animationTimerId);
      this.animationTimerId = null;
    }
  }

  replay(): void {
    this.startSession(this.levelDurationMs / 1000);
  }

  destroy(): void {
    this.timer.stop();
    this.clearAnimation();
    this.currentDeadline = null;
    this.listeners = [];
  }
}
