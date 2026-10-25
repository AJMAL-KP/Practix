export type Direction = 'N' | 'E' | 'S' | 'W' | 'NE' | 'SE' | 'SW' | 'NW';
export type Port = 'N' | 'E' | 'S' | 'W';

export type TileType =
  | 'empty'
  | 'blocked'
  | 'straight_h'
  | 'straight_v'
  | 'corner_ws'
  | 'corner_wn'
  | 'corner_es'
  | 'corner_en'
  | 'tee'
  | 'cross';

export interface PathTile {
  row: number; // 0 to 8
  col: number; // 0 to 8
  type: TileType;
  arrow: Direction | null;
  ports: Port[]; // Connection openings ('N', 'E', 'S', 'W')
  isPath?: boolean;
}

export interface PathGrid {
  tiles: PathTile[][]; // 9x9 matrix of typed tile states
  mouse: { row: number; col: number; entryDirection: Port };
  cheese: { row: number; col: number };
}

export interface PathValidationResult {
  success: boolean;
  visitedCoordinates: Array<{ row: number; col: number }>;
  failurePoint: { row: number; col: number } | null;
  reason?: string;
}

export interface RotatePathStats {
  levelsAttempted: number;
  levelsCompleted: number; // 0 to 5
  rotations: number;
  flips: number;
  testAttempts: number;
  failedTests: number;
  totalTimeMs: number;
  score: number;
}

export type RotatePathState =
  | { status: 'idle' }
  | { status: 'intro' }
  | { status: 'ready'; level: number }
  | {
      status: 'playing';
      level: number; // 1 to 5
      grid: PathGrid;
      selectedRegion: number | null; // 0 to 8 (null if none selected)
      remainingMs: number;
      rotations: number;
      flips: number;
      testAttempts: number;
      failedTests: number;
    }
  | {
      status: 'transforming';
      level: number;
      grid: PathGrid;
      selectedRegion: number;
      transformationType: 'rotate' | 'flip';
    }
  | {
      status: 'testing_path';
      level: number;
      grid: PathGrid;
      selectedRegion: number | null;
      activeCoord: { row: number; col: number };
      visitedCoordinates: Array<{ row: number; col: number }>;
    }
  | {
      status: 'path_failed';
      level: number;
      grid: PathGrid;
      selectedRegion: number | null;
      failurePoint: { row: number; col: number };
      reason: string;
      remainingMs: number;
    }
  | {
      status: 'path_succeeded';
      level: number;
      grid: PathGrid;
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
      stats: RotatePathStats;
    }
  | {
      status: 'session_complete';
      stats: RotatePathStats;
    }
  | {
      status: 'final_results';
      stats: RotatePathStats;
    };

export type RotatePathEvent =
  | { type: 'START_SESSION'; customDurationSec?: number; seed?: number }
  | { type: 'SELECT_REGION'; regionIndex: number }
  | { type: 'ROTATE_SELECTED' }
  | { type: 'FLIP_SELECTED' }
  | { type: 'TEST_PATH' }
  | { type: 'DISMISS_FAILURE' }
  | { type: 'TIMEOUT' }
  | { type: 'REPLAY' }
  | { type: 'RETURN_TO_MENU' };
