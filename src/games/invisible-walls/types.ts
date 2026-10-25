export interface Coordinate {
  row: number; // 0 to 5
  col: number; // 0 to 5
}

export type MoveDirection = 'up' | 'down' | 'left' | 'right';

export interface WallBoundary {
  // Identifies a wall between (r1, c1) and (r2, c2)
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

export interface InvisibleMaze {
  size: number; // 6
  start: Coordinate;
  exit: Coordinate;
  keys: Coordinate[];
  // Set of wall keys formatted as `${minR},${minC}-${maxR},${maxC}`
  walls: Set<string>;
}

export interface InvisibleWallsStats {
  levelsAttempted: number;
  levelsCompleted: number; // 0 to 5
  currentLevel: number;
  requiredKeys: number;
  keysCollected: number;
  successfulMoves: number;
  totalMovesAttempted: number;
  wallCollisions: number;
  resets: number;
  timeSpentPerLevelMs: number[];
  totalTimeMs: number;
  score: number;
  highestDifficultyReached: number;
  sessionCompleted: boolean;
}

export type InvisibleWallsState =
  | { status: 'idle' }
  | { status: 'ready'; level: number }
  | {
      status: 'playing';
      level: number;
      maze: InvisibleMaze;
      playerPos: Coordinate;
      keysRequired: number;
      collectedKeyIndices: number[]; // indices into maze.keys
      remainingMs: number;
      collisions: number;
      resets: number;
      successfulMoves: number;
      totalMovesAttempted: number;
    }
  | {
      status: 'wall_collision';
      level: number;
      maze: InvisibleMaze;
      playerPos: Coordinate;
      remainingMs: number;
      collisions: number;
      resets: number;
      successfulMoves: number;
      totalMovesAttempted: number;
    }
  | {
      status: 'resetting';
      level: number;
      maze: InvisibleMaze;
      playerPos: Coordinate;
      remainingMs: number;
      collisions: number;
      resets: number;
    }
  | {
      status: 'locked_exit_feedback';
      level: number;
      maze: InvisibleMaze;
      playerPos: Coordinate;
      remainingMs: number;
      keysRequired: number;
      collectedKeyIndices: number[];
    }
  | {
      status: 'level_complete';
      level: number;
      maze: InvisibleMaze;
      timeSpentMs: number;
    }
  | {
      status: 'level_transition';
      completedLevel: number;
      nextLevel: number;
    }
  | {
      status: 'timeout';
      level: number;
      stats: InvisibleWallsStats;
    }
  | {
      status: 'final_results';
      stats: InvisibleWallsStats;
    };
