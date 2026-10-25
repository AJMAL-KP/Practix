import { SeededRNG } from '../../core/rng';
import { Coordinate, InvisibleMaze, WallBoundary } from './types';

export class InvisibleMazeGenerator {
  private rng: SeededRNG;

  constructor(seed?: number) {
    this.rng = new SeededRNG(seed);
  }

  static getWallKey(r1: number, c1: number, r2: number, c2: number): string {
    if (r1 < r2 || (r1 === r2 && c1 <= c2)) {
      return `${r1},${c1}-${r2},${c2}`;
    }
    return `${r2},${c2}-${r1},${c1}`;
  }

  /**
   * Breadth-first search solver to verify path connectivity between cells.
   */
  static isReachable(
    start: Coordinate,
    target: Coordinate,
    walls: Set<string>,
    size: number = 10
  ): boolean {
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
          const wKey = this.getWallKey(curr.row, curr.col, nr, nc);
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
   * Generates a guaranteed-solvable 10x10 maze for a given level (1 to 5).
   */
  generateMaze(level: number): InvisibleMaze {
    const size = 10;
    const start: Coordinate = { row: 0, col: 0 };
    const exit: Coordinate = { row: 9, col: 9 };

    // Key counts per specifications:
    // Level 1: 1, Level 2: 1, Level 3: 1, Level 4: 2, Level 5: 2

    for (let attempt = 0; attempt < 25; attempt++) {
      const walls = new Set<string>();

      // Generate a grid with randomized spanning tree walls
      // We start with all internal borders as candidates
      const allInternalEdges: WallBoundary[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (c + 1 < size) allInternalEdges.push({ r1: r, c1: c, r2: r, c2: c + 1 });
          if (r + 1 < size) allInternalEdges.push({ r1: r, c1: c, r2: r + 1, c2: c });
        }
      }

      // Add random walls (density increases with level: ~25% to 45% of internal walls)
      const wallDensity = 0.22 + level * 0.04;
      for (const edge of allInternalEdges) {
        if (this.rng.next() < wallDensity) {
          walls.add(InvisibleMazeGenerator.getWallKey(edge.r1, edge.c1, edge.r2, edge.c2));
        }
      }

      // Candidate key locations depending on level
      let keys: Coordinate[] = [];
      if (level === 1) {
        keys = [{ row: 4, col: 5 }];
      } else if (level === 2) {
        keys = [{ row: 2, col: 7 }];
      } else if (level === 3) {
        keys = [{ row: 7, col: 2 }];
      } else if (level === 4) {
        keys = [
          { row: 2, col: 7 },
          { row: 7, col: 3 },
        ];
      } else {
        keys = [
          { row: 1, col: 8 },
          { row: 8, col: 1 },
        ];
      }

      // Ensure start, exit, and keys have at least one passage open
      const ensureReachable = (from: Coordinate, to: Coordinate): boolean => {
        return InvisibleMazeGenerator.isReachable(from, to, walls, size);
      };

      let solvable = true;
      for (const k of keys) {
        if (!ensureReachable(start, k)) {
          solvable = false;
          break;
        }
      }

      if (solvable) {
        // Check if exit is reachable from all keys (or start)
        const lastKey = keys[keys.length - 1];
        if (ensureReachable(lastKey, exit)) {
          return {
            size,
            start,
            exit,
            keys,
            walls,
          };
        }
      }
    }

    // Deterministic fallback fallback with verified open routes
    const fallbackWalls = new Set<string>();
    // Add horizontal barriers with gaps
    for (let c = 0; c < 8; c++) fallbackWalls.add(InvisibleMazeGenerator.getWallKey(2, c, 3, c));
    for (let c = 2; c < 10; c++) fallbackWalls.add(InvisibleMazeGenerator.getWallKey(5, c, 6, c));
    for (let c = 0; c < 8; c++) fallbackWalls.add(InvisibleMazeGenerator.getWallKey(8, c, 9, c));

    const fallbackKeys = level <= 3 ? [{ row: 4, col: 5 }] : [{ row: 2, col: 8 }, { row: 7, col: 2 }];

    return {
      size,
      start,
      exit,
      keys: fallbackKeys,
      walls: fallbackWalls,
    };
  }
}
