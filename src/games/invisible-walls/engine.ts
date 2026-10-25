import { SoundController } from '../../core/audio';
import { StorageService } from '../../core/storage';
import { MonotonicTimer } from '../../core/timer';
import { InvisibleMazeGenerator } from './generator';
import {
  Coordinate,
  InvisibleMaze,
  InvisibleWallsState,
  InvisibleWallsStats,
  MoveDirection,
} from './types';

export function calculateInvisibleWallsScore(
  levelsCompleted: number,
  keysCollected: number,
  remainingTimeSec: number,
  collisions: number
): number {
  const levelScore = levelsCompleted * 1000;
  const keysScore = keysCollected * 150;
  const timeBonus = levelsCompleted === 5 ? Math.max(0, remainingTimeSec * 2) : 0;
  const collisionPenalty = collisions * 40;
  return Math.max(0, levelScore + keysScore + timeBonus - collisionPenalty);
}

export class InvisibleWallsEngine {
  private level: number = 1;
  private maze!: InvisibleMaze;
  private playerPos: Coordinate = { row: 0, col: 0 };
  private collectedKeyIndices: number[] = [];
  private state: InvisibleWallsState = { status: 'idle' };
  private timer: MonotonicTimer;
  private levelDurationMs: number = 240000; // 4 minutes default
  private levelStartTime: number = 0;
  private totalTimeSpentMs: number = 0;
  private timeSpentPerLevelMs: number[] = [];

  private stats: InvisibleWallsStats = {
    levelsAttempted: 0,
    levelsCompleted: 0,
    currentLevel: 1,
    requiredKeys: 1,
    keysCollected: 0,
    successfulMoves: 0,
    totalMovesAttempted: 0,
    wallCollisions: 0,
    resets: 0,
    timeSpentPerLevelMs: [],
    totalTimeMs: 0,
    score: 0,
    highestDifficultyReached: 1,
    sessionCompleted: false,
  };

  private listeners: Array<(state: InvisibleWallsState) => void> = [];
  private generator: InvisibleMazeGenerator;
  private transitionTimerId: ReturnType<typeof setTimeout> | null = null;
  private levelToken: number = 0;
  private sessionResultCommitted: boolean = false;
  private isProcessingMove: boolean = false;

  constructor() {
    this.generator = new InvisibleMazeGenerator();
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

  subscribe(listener: (state: InvisibleWallsState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const currentState = this.state;
    this.listeners.forEach((listener) => listener(currentState));
  }

  getState(): InvisibleWallsState {
    return this.state;
  }

  getStats(): InvisibleWallsStats {
    return {
      ...this.stats,
      timeSpentPerLevelMs: [...this.stats.timeSpentPerLevelMs],
    };
  }

  getMaze(): InvisibleMaze | undefined {
    return this.maze;
  }

  getPlayerPosition(): Coordinate {
    return { ...this.playerPos };
  }

  startSession(customDurationSec?: number, seed?: number): void {
    this.levelToken++;
    this.clearTransition();
    this.timer.stop();
    this.sessionResultCommitted = false;
    this.isProcessingMove = false;

    const finalSeed = seed ?? Math.floor(Math.random() * 1000000) + 1;
    this.generator = new InvisibleMazeGenerator(finalSeed);

    const settings = StorageService.getSettings();
    const durationSec = customDurationSec ?? settings.invisibleLevelDurationSec;
    this.levelDurationMs = Math.max(10, durationSec) * 1000;

    this.level = 1;
    this.totalTimeSpentMs = 0;
    this.timeSpentPerLevelMs = [];
    this.stats = {
      levelsAttempted: 1,
      levelsCompleted: 0,
      currentLevel: 1,
      requiredKeys: 1,
      keysCollected: 0,
      successfulMoves: 0,
      totalMovesAttempted: 0,
      wallCollisions: 0,
      resets: 0,
      timeSpentPerLevelMs: [],
      totalTimeMs: 0,
      score: 0,
      highestDifficultyReached: 1,
      sessionCompleted: false,
    };

    this.startLevel(1);
  }

  replay(): void {
    this.startSession();
  }

  private startLevel(lvl: number): void {
    if (lvl > 5) {
      this.finishSession(true);
      return;
    }

    this.levelToken++;

    this.level = lvl;
    this.stats.currentLevel = lvl;
    this.stats.levelsAttempted = Math.max(this.stats.levelsAttempted, lvl);
    this.stats.highestDifficultyReached = Math.max(this.stats.highestDifficultyReached, lvl);

    this.maze = this.generator.generateMaze(lvl);
    this.playerPos = { ...this.maze.start };
    this.collectedKeyIndices = [];
    this.levelStartTime = performance.now();

    const keysRequired = lvl <= 3 ? 1 : 2;
    this.stats.requiredKeys = keysRequired;

    this.state = {
      status: 'playing',
      level: lvl,
      maze: this.maze,
      playerPos: { ...this.playerPos },
      keysRequired,
      collectedKeyIndices: [],
      remainingMs: this.levelDurationMs,
      collisions: this.stats.wallCollisions,
      resets: this.stats.resets,
      successfulMoves: this.stats.successfulMoves,
      totalMovesAttempted: this.stats.totalMovesAttempted,
    };

    this.timer.start(this.levelDurationMs);
    this.notify();
  }

  move(direction: MoveDirection): void {
    // 1. Verify that the level is active and not already processing or transitioning
    if (this.state.status !== 'playing' || this.isProcessingMove) {
      return;
    }

    this.isProcessingMove = true;
    try {
      let dr = 0;
      let dc = 0;
      switch (direction) {
        case 'up':
          dr = -1;
          break;
        case 'down':
          dr = 1;
          break;
        case 'left':
          dc = -1;
          break;
        case 'right':
          dc = 1;
          break;
      }

      const targetRow = this.playerPos.row + dr;
      const targetCol = this.playerPos.col + dc;

      // 4. Reject movement outside the board (does NOT count as wall collision)
      const size = this.maze.size;
      if (targetRow < 0 || targetRow >= size || targetCol < 0 || targetCol >= size) {
        return;
      }

      // Accepted directional movement attempt
      this.stats.totalMovesAttempted++;

      // 5. Check whether the shared boundary is blocked by a hidden wall
      const wallKey = InvisibleMazeGenerator.getWallKey(
        this.playerPos.row,
        this.playerPos.col,
        targetRow,
        targetCol
      );

      if (this.maze.walls.has(wallKey)) {
        // Invisible wall collision!
        this.stats.wallCollisions++;
        this.stats.resets++;
        SoundController.playWallHit();

        const token = this.levelToken;

        // Transition to wall_collision state
        this.state = {
          status: 'wall_collision',
          level: this.level,
          maze: this.maze,
          playerPos: { ...this.playerPos },
          remainingMs: this.timer.getRemainingMs(),
          collisions: this.stats.wallCollisions,
          resets: this.stats.resets,
          successfulMoves: this.stats.successfulMoves,
          totalMovesAttempted: this.stats.totalMovesAttempted,
        };
        this.notify();

        // Transition to resetting state
        this.scheduleTransition(() => {
          if (token !== this.levelToken) return;

          this.state = {
            status: 'resetting',
            level: this.level,
            maze: this.maze,
            playerPos: { ...this.playerPos },
            remainingMs: this.timer.getRemainingMs(),
            collisions: this.stats.wallCollisions,
            resets: this.stats.resets,
          };
          this.notify();

          // Reset player back to starting cell and clear all collected keys
          this.scheduleTransition(() => {
            if (token !== this.levelToken) return;

            this.playerPos = { ...this.maze.start };
            this.collectedKeyIndices = [];

            this.state = {
              status: 'playing',
              level: this.level,
              maze: this.maze,
              playerPos: { ...this.playerPos },
              keysRequired: this.level <= 3 ? 1 : 2,
              collectedKeyIndices: [],
              remainingMs: this.timer.getRemainingMs(),
              collisions: this.stats.wallCollisions,
              resets: this.stats.resets,
              successfulMoves: this.stats.successfulMoves,
              totalMovesAttempted: this.stats.totalMovesAttempted,
            };
            this.notify();
          }, 200);
        }, 250);

        return;
      }

      // Valid move into ordinary cell
      this.playerPos = { row: targetRow, col: targetCol };
      this.stats.successfulMoves++;
      SoundController.playTap();

      // Check key collection
      this.maze.keys.forEach((keyPos, index) => {
        if (
          !this.collectedKeyIndices.includes(index) &&
          keyPos.row === targetRow &&
          keyPos.col === targetCol
        ) {
          this.collectedKeyIndices.push(index);
          this.stats.keysCollected++;
          SoundController.playKeyCollect();
        }
      });

      // Check exit condition
      if (targetRow === this.maze.exit.row && targetCol === this.maze.exit.col) {
        const keysRequired = this.level <= 3 ? 1 : 2;
        if (this.collectedKeyIndices.length >= keysRequired) {
          // Reached exit with all required keys -> Level complete!
          this.handleLevelSuccess();
          return;
        } else {
          // Reached exit without all required keys -> Exit locked
          const token = this.levelToken;
          SoundController.playWallHit();

          this.state = {
            status: 'locked_exit_feedback',
            level: this.level,
            maze: this.maze,
            playerPos: { ...this.playerPos },
            remainingMs: this.timer.getRemainingMs(),
            keysRequired,
            collectedKeyIndices: [...this.collectedKeyIndices],
          };
          this.notify();

          this.scheduleTransition(() => {
            if (token !== this.levelToken) return;
            if (this.state.status === 'locked_exit_feedback') {
              this.state = {
                status: 'playing',
                level: this.level,
                maze: this.maze,
                playerPos: { ...this.playerPos },
                keysRequired,
                collectedKeyIndices: [...this.collectedKeyIndices],
                remainingMs: this.timer.getRemainingMs(),
                collisions: this.stats.wallCollisions,
                resets: this.stats.resets,
                successfulMoves: this.stats.successfulMoves,
                totalMovesAttempted: this.stats.totalMovesAttempted,
              };
              this.notify();
            }
          }, 500);
          return;
        }
      }

      // Normal move update
      this.state = {
        status: 'playing',
        level: this.level,
        maze: this.maze,
        playerPos: { ...this.playerPos },
        keysRequired: this.level <= 3 ? 1 : 2,
        collectedKeyIndices: [...this.collectedKeyIndices],
        remainingMs: this.timer.getRemainingMs(),
        collisions: this.stats.wallCollisions,
        resets: this.stats.resets,
        successfulMoves: this.stats.successfulMoves,
        totalMovesAttempted: this.stats.totalMovesAttempted,
      };
      this.notify();
    } finally {
      this.isProcessingMove = false;
    }
  }

  private handleLevelSuccess(): void {
    if (this.state.status !== 'playing' && this.state.status !== 'locked_exit_feedback') {
      return;
    }

    this.timer.stop();
    const token = this.levelToken;
    const timeSpent = performance.now() - this.levelStartTime;
    this.totalTimeSpentMs += timeSpent;
    this.timeSpentPerLevelMs.push(timeSpent);
    this.stats.levelsCompleted++;
    this.stats.timeSpentPerLevelMs = [...this.timeSpentPerLevelMs];
    this.stats.totalTimeMs = this.totalTimeSpentMs;
    SoundController.playLevelClear();

    this.state = {
      status: 'level_complete',
      level: this.level,
      maze: this.maze,
      timeSpentMs: timeSpent,
    };
    this.notify();

    this.scheduleTransition(() => {
      if (token !== this.levelToken) return;

      if (this.level < 5) {
        this.state = {
          status: 'level_transition',
          completedLevel: this.level,
          nextLevel: this.level + 1,
        };
        this.notify();

        this.scheduleTransition(() => {
          if (token !== this.levelToken) return;
          this.startLevel(this.level + 1);
        }, 800);
      } else {
        this.finishSession(true);
      }
    }, 900);
  }

  private handleTimeout(): void {
    if (this.state.status === 'final_results') return;

    this.levelToken++;
    this.timer.stop();
    this.clearTransition();
    this.totalTimeSpentMs += this.levelDurationMs;
    this.stats.totalTimeMs = this.totalTimeSpentMs;
    SoundController.playTimeout();

    this.state = {
      status: 'timeout',
      level: this.level,
      stats: { ...this.stats },
    };
    this.notify();

    this.finishSession(false);
  }

  private finishSession(completedAll: boolean): void {
    this.levelToken++;
    this.timer.stop();
    this.clearTransition();

    if (this.sessionResultCommitted) {
      return;
    }
    this.sessionResultCommitted = true;

    this.stats.sessionCompleted = completedAll;
    const remainingTimeSec = Math.max(
      0,
      Math.round((this.levelDurationMs - (performance.now() - this.levelStartTime)) / 1000)
    );

    this.stats.score = calculateInvisibleWallsScore(
      this.stats.levelsCompleted,
      this.stats.keysCollected,
      remainingTimeSec,
      this.stats.wallCollisions
    );

    StorageService.addHistoryRecord({
      gameId: 'invisible-walls',
      score: this.stats.score,
      completed: completedAll,
      timeUsedSec: Math.round(this.stats.totalTimeMs / 1000),
      details: {
        levelsCompleted: `${this.stats.levelsCompleted}/5`,
        keysCollected: this.stats.keysCollected,
        wallCollisions: this.stats.wallCollisions,
        resets: this.stats.resets,
        successfulMoves: this.stats.successfulMoves,
      },
    });

    this.state = {
      status: 'final_results',
      stats: { ...this.stats },
    };
    this.notify();
  }

  private scheduleTransition(callback: () => void, delayMs: number): void {
    this.clearTransition();
    this.transitionTimerId = setTimeout(() => {
      this.transitionTimerId = null;
      callback();
    }, delayMs);
  }

  private clearTransition(): void {
    if (this.transitionTimerId !== null) {
      clearTimeout(this.transitionTimerId);
      this.transitionTimerId = null;
    }
  }

  destroy(): void {
    this.levelToken++;
    this.timer.stop();
    this.clearTransition();
    this.listeners = [];
  }
}
