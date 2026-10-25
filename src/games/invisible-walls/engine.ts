import { SoundController } from '../../core/audio';
import { StorageService } from '../../core/storage';
import { MonotonicTimer } from '../../core/timer';
import { InvisibleMazeGenerator } from './generator';
import { Coordinate, InvisibleMaze, InvisibleWallsState, InvisibleWallsStats, MoveDirection } from './types';

export class InvisibleWallsEngine {
  private level: number = 1;
  private maze!: InvisibleMaze;
  private playerPos: Coordinate = { row: 0, col: 0 };
  private collectedKeyIndices: number[] = [];
  private state: InvisibleWallsState = { status: 'idle' };
  private timer: MonotonicTimer;
  private levelDurationMs: number = 240000;
  private levelStartTime: number = 0;
  private totalTimeSpentMs: number = 0;

  private stats: InvisibleWallsStats = {
    levelsCompleted: 0,
    keysCollected: 0,
    wallCollisions: 0,
    resets: 0,
    totalTimeMs: 0,
    score: 0,
  };

  private listeners: Array<(state: InvisibleWallsState) => void> = [];
  private generator: InvisibleMazeGenerator;
  private transitionTimerId: number | null = null;

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
    this.listeners.forEach((listener) => listener(this.state));
  }

  getState(): InvisibleWallsState {
    return this.state;
  }

  getStats(): InvisibleWallsStats {
    return { ...this.stats };
  }

  startSession(customDurationSec?: number, seed?: number): void {
    this.clearTransition();
    this.timer.stop();

    if (seed !== undefined) {
      this.generator = new InvisibleMazeGenerator(seed);
    }

    const settings = StorageService.getSettings();
    const durationSec = customDurationSec ?? settings.invisibleLevelDurationSec;
    this.levelDurationMs = Math.max(30, durationSec) * 1000;

    this.level = 1;
    this.totalTimeSpentMs = 0;
    this.stats = {
      levelsCompleted: 0,
      keysCollected: 0,
      wallCollisions: 0,
      resets: 0,
      totalTimeMs: 0,
      score: 0,
    };

    this.startLevel(1);
  }

  private startLevel(lvl: number): void {
    this.level = lvl;
    this.maze = this.generator.generateMaze(lvl);
    this.playerPos = { ...this.maze.start };
    this.collectedKeyIndices = [];
    this.levelStartTime = performance.now();

    const keysRequired = lvl <= 3 ? 1 : 2;

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
    };

    this.timer.start(this.levelDurationMs);
    this.notify();
  }

  move(direction: MoveDirection): void {
    if (this.state.status !== 'playing') {
      return; // Ignore movement during collision animation or locked feedback
    }

    let dr = 0;
    let dc = 0;
    switch (direction) {
      case 'up': dr = -1; break;
      case 'down': dr = 1; break;
      case 'left': dc = -1; break;
      case 'right': dc = 1; break;
    }

    const targetRow = this.playerPos.row + dr;
    const targetCol = this.playerPos.col + dc;

    // Check board boundary
    if (targetRow < 0 || targetRow >= 10 || targetCol < 0 || targetCol >= 10) {
      return; // Disallow moving off-board
    }

    // Check hidden wall
    const wallKey = InvisibleMazeGenerator.getWallKey(
      this.playerPos.row,
      this.playerPos.col,
      targetRow,
      targetCol
    );

    if (this.maze.walls.has(wallKey)) {
      // Hidden wall collision!
      this.stats.wallCollisions++;
      this.stats.resets++;
      SoundController.playWallHit();

      const hitWall = {
        r1: this.playerPos.row,
        c1: this.playerPos.col,
        r2: targetRow,
        c2: targetCol,
      };

      this.state = {
        status: 'wall_collision',
        level: this.level,
        maze: this.maze,
        playerPos: { ...this.playerPos },
        hitWall,
        remainingMs: this.timer.getRemainingMs(),
        collisions: this.stats.wallCollisions,
        resets: this.stats.resets,
      };
      this.notify();

      // Reset player back to start (0, 0) and respawn collected keys
      this.scheduleTransition(() => {
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
        };
        this.notify();
      }, 450);
      return;
    }

    // Valid move
    this.playerPos = { row: targetRow, col: targetCol };

    // Check key pickup
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

    // Check exit
    if (targetRow === this.maze.exit.row && targetCol === this.maze.exit.col) {
      const keysRequired = this.level <= 3 ? 1 : 2;
      if (this.collectedKeyIndices.length >= keysRequired) {
        // Level complete!
        this.handleLevelSuccess();
        return;
      } else {
        // Locked exit notice
        this.state = {
          status: 'locked_exit_feedback',
          level: this.level,
          maze: this.maze,
          playerPos: { ...this.playerPos },
          remainingMs: this.timer.getRemainingMs(),
        };
        this.notify();

        this.scheduleTransition(() => {
          if (this.state.status === 'locked_exit_feedback') {
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
            };
            this.notify();
          }
        }, 800);
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
    };
    this.notify();
  }

  private handleLevelSuccess(): void {
    this.timer.stop();
    const timeSpent = performance.now() - this.levelStartTime;
    this.totalTimeSpentMs += timeSpent;
    this.stats.levelsCompleted++;
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
      if (this.level < 5) {
        this.state = {
          status: 'level_transition',
          completedLevel: this.level,
          nextLevel: this.level + 1,
        };
        this.notify();

        this.scheduleTransition(() => {
          this.startLevel(this.level + 1);
        }, 1000);
      } else {
        this.finishSession(true);
      }
    }, 1200);
  }

  private handleTimeout(): void {
    this.timer.stop();
    this.clearTransition();
    this.totalTimeSpentMs += this.levelDurationMs;
    this.stats.totalTimeMs = this.totalTimeSpentMs;
    SoundController.playTimeout();

    this.finishSession(false);
  }

  private finishSession(completedAll: boolean): void {
    this.timer.stop();
    this.clearTransition();

    const levelScore = this.stats.levelsCompleted * 1000;
    const keysScore = this.stats.keysCollected * 150;
    const timeBonus = completedAll ? Math.max(0, Math.round((this.levelDurationMs - (performance.now() - this.levelStartTime)) / 1000) * 2) : 0;
    const collisionPenalty = this.stats.wallCollisions * 40;

    this.stats.score = Math.max(0, levelScore + keysScore + timeBonus - collisionPenalty);

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
    }, delayMs) as unknown as number;
  }

  private clearTransition(): void {
    if (this.transitionTimerId !== null) {
      clearTimeout(this.transitionTimerId);
      this.transitionTimerId = null;
    }
  }

  destroy(): void {
    this.timer.stop();
    this.clearTransition();
    this.listeners = [];
  }
}
