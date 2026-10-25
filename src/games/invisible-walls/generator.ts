import { SeededRNG } from '../../core/rng';
import { Coordinate, InvisibleMaze, WallBoundary } from './types';

export class InvisibleMazeGenerator {
  private rng: SeededRNG;

  constructor(seed?: number) {
    this.rng = new SeededRNG(seed);
  }

  /**
   * Returns a canonical string key for a wall boundary between two adjacent cells.
   * Format: `${minR},${minC}-${maxR},${maxC}`
   */
  static getWallKey(r1: number, c1: number, r2: number, c2: number): string {
    if (r1 < r2 || (r1 === r2 && c1 <= c2)) {
      return `${r1},${c1}-${r2},${c2}`;
    }
    return `${r2},${c2}-${r1},${c1}`;
  }

  /**
   * Breadth-first search solver to verify path connectivity between cells.
   * Respects internal hidden walls and grid boundaries.
   */
  static isReachable(
    start: Coordinate,
    target: Coordinate,
    walls: Set<string>,
    size: number = 10
  ): boolean {
    if (start.row === target.row && start.col === target.col) {
      return true;
    }

    const queue: Coordinate[] = [start];
    const visited = new Set<string>();
    visited.add(`${start.row},${start.col}`);

    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.row === target.row && curr.col === target.col) {
        return true;
      }

      for (const d of directions) {
        const nr = curr.row + d.dr;
        const nc = curr.col + d.dc;

        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const wKey = InvisibleMazeGenerator.getWallKey(curr.row, curr.col, nr, nc);
          const nextKey = `${nr},${nc}`;

          if (!walls.has(wKey) && !visited.has(nextKey)) {
            visited.add(nextKey);
            queue.push({ row: nr, col: nc });
          }
        }
      }
    }

    return false;
  }

  /**
   * Validates that all keys and the exit are reachable from the start without crossing walls.
   */
  static validateSolvability(maze: InvisibleMaze): boolean {
    const { start, exit, keys, walls, size } = maze;

    // Check reachability from start to each key
    for (const key of keys) {
      if (!InvisibleMazeGenerator.isReachable(start, key, walls, size)) {
        return false;
      }
    }

    // Check reachability from start to exit
    if (!InvisibleMazeGenerator.isReachable(start, exit, walls, size)) {
      return false;
    }

    // Check reachability between keys and to exit
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        if (!InvisibleMazeGenerator.isReachable(keys[i], keys[j], walls, size)) {
          return false;
        }
      }
      if (!InvisibleMazeGenerator.isReachable(keys[i], exit, walls, size)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generates a guaranteed-solvable 10x10 maze for a given level (1 to 5).
   * Key count: Level 1-3 = 1 key, Level 4-5 = 2 keys.
   */
  generateMaze(level: number): InvisibleMaze {
    const size = 10;
    const start: Coordinate = { row: 0, col: 0 };
    const exit: Coordinate = { row: 9, col: 9 };
    const keysRequired = level <= 3 ? 1 : 2;

    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 1. Generate candidate key positions distinct from start and exit
      const keys = this.generateKeyPositions(keysRequired, size, start, exit);

      // 2. Generate all internal grid edges
      const internalEdges: WallBoundary[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (c + 1 < size) {
            internalEdges.push({ r1: r, c1: c, r2: r, c2: c + 1 });
          }
          if (r + 1 < size) {
            internalEdges.push({ r1: r, c1: c, r2: r + 1, c2: c });
          }
        }
      }

      // Shuffle edges
      this.rng.shuffle(internalEdges);

      // Target wall count scales with level (18 walls in L1 up to 52 walls in L5)
      const targetWallCount = Math.min(65, 16 + level * 8 + Math.floor(this.rng.next() * 5));
      const walls = new Set<string>();

      // Progressively add walls while ensuring connectivity is never severed
      for (const edge of internalEdges) {
        if (walls.size >= targetWallCount) break;

        const wKey = InvisibleMazeGenerator.getWallKey(edge.r1, edge.c1, edge.r2, edge.c2);
        walls.add(wKey);

        // Test if start can still reach all keys and exit
        let stillSolvable = true;
        for (const k of keys) {
          if (!InvisibleMazeGenerator.isReachable(start, k, walls, size)) {
            stillSolvable = false;
            break;
          }
        }
        if (stillSolvable && !InvisibleMazeGenerator.isReachable(start, exit, walls, size)) {
          stillSolvable = false;
        }

        if (!stillSolvable) {
          // Revert this wall addition to keep the path open
          walls.delete(wKey);
        }
      }

      const candidateMaze: InvisibleMaze = {
        size,
        start,
        exit,
        keys,
        walls,
      };

      if (InvisibleMazeGenerator.validateSolvability(candidateMaze)) {
        return candidateMaze;
      }
    }

    // Deterministic fallback if attempts are exhausted
    return this.getFallbackMaze(level, size, start, exit);
  }

  private generateKeyPositions(
    count: number,
    size: number,
    start: Coordinate,
    exit: Coordinate
  ): Coordinate[] {
    const keys: Coordinate[] = [];
    const used = new Set<string>();
    used.add(`${start.row},${start.col}`);
    used.add(`${exit.row},${exit.col}`);

    // Candidate regions to spread keys
    const regions = [
      { minR: 1, maxR: 4, minC: 5, maxC: 8 },
      { minR: 5, maxR: 8, minC: 1, maxC: 4 },
      { minR: 3, maxR: 6, minC: 3, maxC: 6 },
      { minR: 6, maxR: 8, minC: 5, maxC: 8 },
      { minR: 1, maxR: 3, minC: 1, maxC: 4 },
    ];
    this.rng.shuffle(regions);

    let regionIdx = 0;
    while (keys.length < count && regionIdx < regions.length) {
      const reg = regions[regionIdx++];
      const r = reg.minR + Math.floor(this.rng.next() * (reg.maxR - reg.minR + 1));
      const c = reg.minC + Math.floor(this.rng.next() * (reg.maxC - reg.minC + 1));
      const keyStr = `${r},${c}`;

      if (!used.has(keyStr) && r >= 0 && r < size && c >= 0 && c < size) {
        used.add(keyStr);
        keys.push({ row: r, col: c });
      }
    }

    // If still missing, fill with any valid cell
    while (keys.length < count) {
      const r = Math.floor(this.rng.next() * (size - 2)) + 1;
      const c = Math.floor(this.rng.next() * (size - 2)) + 1;
      const keyStr = `${r},${c}`;
      if (!used.has(keyStr)) {
        used.add(keyStr);
        keys.push({ row: r, col: c });
      }
    }

    return keys;
  }

  private getFallbackMaze(
    level: number,
    size: number,
    start: Coordinate,
    exit: Coordinate
  ): InvisibleMaze {
    const fallbackWalls = new Set<string>();

    // Structured labyrinth pattern with safe open passages
    for (let c = 0; c < 8; c++) {
      fallbackWalls.add(InvisibleMazeGenerator.getWallKey(2, c, 3, c));
    }
    for (let c = 2; c < 10; c++) {
      fallbackWalls.add(InvisibleMazeGenerator.getWallKey(5, c, 6, c));
    }
    for (let c = 0; c < 8; c++) {
      fallbackWalls.add(InvisibleMazeGenerator.getWallKey(8, c, 9, c));
    }

    const fallbackKeys =
      level <= 3
        ? [{ row: 4, col: 5 }]
        : [
            { row: 2, col: 8 },
            { row: 7, col: 2 },
          ];

    return {
      size,
      start,
      exit,
      keys: fallbackKeys,
      walls: fallbackWalls,
    };
  }
}
