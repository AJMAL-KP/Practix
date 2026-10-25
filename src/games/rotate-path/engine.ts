import { SoundController } from '../../core/audio';
import { StorageService } from '../../core/storage';
import { MonotonicTimer } from '../../core/timer';
import { RotatePathGenerator } from './generator';
import { RegionTransformations } from './transformations';
import { PathGrid, RotatePathState, RotatePathStats } from './types';
import { PathValidator } from './validator';

export class RotatePathEngine {
  private level: number = 1;
  private grid!: PathGrid;
  private state: RotatePathState = { status: 'idle' };
  private timer: MonotonicTimer;
  private levelDurationMs: number = 240000;
  private levelStartTime: number = 0;
  private totalTimeSpentMs: number = 0;

  private stats: RotatePathStats = {
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
        if (this.state.status === 'playing') {
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

  startSession(customDurationSec?: number, seed?: number): void {
    this.clearAnimation();
    this.timer.stop();

    if (seed !== undefined) {
      this.generator = new RotatePathGenerator(seed);
    }

    const settings = StorageService.getSettings();
    const durationSec = customDurationSec ?? settings.rotateLevelDurationSec;
    this.levelDurationMs = Math.max(30, durationSec) * 1000;

    this.level = 1;
    this.totalTimeSpentMs = 0;
    this.stats = {
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
    this.level = lvl;
    this.grid = this.generator.generateLevel(lvl);
    this.levelStartTime = performance.now();

    this.state = {
      status: 'playing',
      level: lvl,
      grid: this.grid,
      selectedRegion: 4, // Center region pre-selected
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
    if (this.state.status !== 'playing') return;
    if (regionIndex < 0 || regionIndex > 8) return;

    this.state = {
      ...this.state,
      selectedRegion: regionIndex,
    };
    this.notify();
  }

  rotateSelected(): void {
    if (this.state.status !== 'playing' || this.state.selectedRegion === null) return;

    const newTiles = RegionTransformations.rotateRegion(this.grid.tiles, this.state.selectedRegion);
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
    if (this.state.status !== 'playing' || this.state.selectedRegion === null) return;

    // Flip / Direction toggle reverses directions
    const newTiles = RegionTransformations.invertRegionDirections(this.grid.tiles, this.state.selectedRegion);
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
    if (this.state.status !== 'playing') return;

    this.stats.testAttempts++;
    const validation = PathValidator.validate(this.grid);

    // Enter testing_path state for step-by-step visual feedback
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

    const stepInterval = 40; // 40ms per step
    const advanceStep = () => {
      stepIndex++;
      if (stepIndex < coords.length) {
        this.state = {
          status: 'testing_path',
          level: this.level,
          grid: this.grid,
          selectedRegion: this.state.status === 'testing_path' ? this.state.selectedRegion : null,
          activeCoord: coords[stepIndex],
          visitedCoordinates: coords.slice(0, stepIndex),
        };
        this.notify();
        this.animationTimerId = setTimeout(advanceStep, stepInterval) as unknown as number;
      } else {
        // Animation completed; resolve validation outcome
        if (validation.success) {
          this.handleSuccess();
        } else {
          this.handleFailure(validation.failurePoint || coords[coords.length - 1] || { row: 4, col: 0 }, validation.reason || 'Path blocked');
        }
      }
    };

    this.animationTimerId = setTimeout(advanceStep, stepInterval) as unknown as number;
  }

  private handleSuccess(): void {
    this.timer.stop();
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
        }, 1000) as unknown as number;
      } else {
        this.finishSession(true);
      }
    }, 1200) as unknown as number;
  }

  private handleFailure(failurePoint: { row: number; col: number }, reason: string): void {
    this.stats.failedTests++;
    SoundController.playPathFail();

    this.state = {
      status: 'path_failed',
      level: this.level,
      grid: this.grid,
      selectedRegion: this.state.status === 'testing_path' ? this.state.selectedRegion : null,
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

  private handleTimeout(): void {
    this.timer.stop();
    this.clearAnimation();
    this.totalTimeSpentMs += this.levelDurationMs;
    this.stats.totalTimeMs = this.totalTimeSpentMs;
    SoundController.playTimeout();

    this.finishSession(false);
  }

  private finishSession(completedAll: boolean): void {
    this.timer.stop();
    this.clearAnimation();

    // Calculate score
    const levelScore = this.stats.levelsCompleted * 1000;
    const remainingTimeBonus = completedAll ? Math.max(0, Math.round((this.levelDurationMs - (performance.now() - this.levelStartTime)) / 1000) * 2) : 0;
    const penalty = this.stats.failedTests * 50;
    this.stats.score = Math.max(0, levelScore + remainingTimeBonus - penalty);

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

  destroy(): void {
    this.timer.stop();
    this.clearAnimation();
    this.listeners = [];
  }
}
