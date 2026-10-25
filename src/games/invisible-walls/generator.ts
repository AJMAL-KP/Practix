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
    size: number = 6
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
   * Generates a guaranteed-solvable 6x6 maze with exactly 9 wall blocks.
   * Strategically places walls to prevent straight forward row/column movements.
   * Key count: Level 1-3 = 1 key, Level 4-5 = 2 keys.
   */
  generateMaze(level: number): InvisibleMaze {
    const size = 6;
    const start: Coordinate = { row: 0, col: 0 };
    const exit: Coordinate = { row: 5, col: 5 };
    const keysRequired = level <= 3 ? 1 : 2;
    const targetWallCount = 9; // Exactly 9 wall blocks per grid specification

    const maxAttempts = 35;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 1. Generate candidate key positions distinct from start and exit
      const keys = this.generateKeyPositions(keysRequired, size, start, exit);

      // 2. Generate internal grid edges (prioritizing edges that break straight-line dashes)
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

      const walls = new Set<string>();

      // Progressively place walls until exactly 9 walls are added while maintaining full solvability
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

      if (walls.size === targetWallCount) {
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
    }

    // Deterministic fallback with exactly 9 wall blocks preventing straight-line dashes
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

    // Candidate regions to spread keys in 6x6
    const regions = [
      { minR: 1, maxR: 2, minC: 3, maxC: 4 },
      { minR: 3, maxR: 4, minC: 1, maxC: 2 },
      { minR: 2, maxR: 3, minC: 2, maxC: 3 },
      { minR: 1, maxR: 2, minC: 1, maxC: 2 },
      { minR: 3, maxR: 4, minC: 3, maxC: 4 },
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

    // Exactly 9 strategic wall blocks preventing straight row/column lines
    fallbackWalls.add(InvisibleMazeGenerator.getWallKey(0, 2, 0, 3)); // blocks row 0 straight dash
    fallbackWalls.add(InvisibleMazeGenerator.getWallKey(1, 0, 2, 0)); // blocks col 0 straight drop
    fallbackWalls.add(InvisibleMazeGenerator.getWallKey(1, 3, 1, 4)); // blocks row 1 straight dash
    fallbackWalls.add(InvisibleMazeGenerator.getWallKey(2, 1, 3, 1)); // blocks col 1 straight drop
    fallbackWalls.add(InvisibleMazeGenerator.getWallKey(2, 4, 3, 4)); // blocks col 4 straight drop
    fallbackWalls.add(InvisibleMazeGenerator.getWallKey(3, 2, 3, 3)); // blocks row 3 straight dash
    fallbackWalls.add(InvisibleMazeGenerator.getWallKey(3, 5, 4, 5)); // blocks col 5 drop
    fallbackWalls.add(InvisibleMazeGenerator.getWallKey(4, 1, 4, 2)); // blocks row 4 straight dash
    fallbackWalls.add(InvisibleMazeGenerator.getWallKey(4, 4, 5, 4)); // blocks exit direct approach

    const fallbackKeys =
      level <= 3
        ? [{ row: 2, col: 3 }]
        : [
            { row: 1, col: 4 },
            { row: 4, col: 1 },
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
