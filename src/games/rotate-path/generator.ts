import { SeededRNG } from '../../core/rng';
import { RegionTransformations } from './transformations';
import { PathGrid, PathTile, Port, TileType } from './types';
import { PathValidator } from './validator';

export class RotatePathGenerator {
  private rng: SeededRNG;

  constructor(seed?: number) {
    this.rng = new SeededRNG(seed);
  }

  /**
   * Create an empty 9x9 grid.
   */
  private createEmptyGrid(): PathTile[][] {
    const tiles: PathTile[][] = [];
    for (let r = 0; r < 9; r++) {
      tiles[r] = [];
      for (let c = 0; c < 9; c++) {
        tiles[r][c] = {
          row: r,
          col: c,
          type: 'empty',
          arrow: null,
          ports: [],
          isPath: false,
        };
      }
    }
    return tiles;
  }

  private setTile(
    grid: PathTile[][],
    r: number,
    c: number,
    type: TileType,
    arrow: any,
    ports: Port[],
    isPath: boolean = true
  ): void {
    grid[r][c] = {
      row: r,
      col: c,
      type,
      arrow,
      ports,
      isPath,
    };
  }

  /**
   * Generates a 100% solvable 9x9 puzzle for a given level (1 to 5).
   * Feature: Sparse arrows — only a subset of path cells have arrows,
   * while others are plain road corridors (matching the authentic assessment design).
   */
  generateLevel(level: number): PathGrid {
    const safeLevel = Math.max(1, Math.min(5, level));
    const tiles = this.createEmptyGrid();

    // Mouse / Rocket entry: row 4, col 0 facing East (entering from West port)
    const mouse = { row: 4, col: 0, entryDirection: 'W' as Port };
    // Cheese / Planet destination: row 4, col 8
    const cheese = { row: 4, col: 8 };

    // Build base solved paths with sparse arrows depending on level
    if (safeLevel === 1) {
      // Level 1: Route through middle row 4 with alternating arrows and plain corridors
      this.setTile(tiles, 4, 0, 'straight_h', null, ['W', 'E']); // Plain entrance corridor
      this.setTile(tiles, 4, 1, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 4, 2, 'straight_h', null, ['W', 'E']); // Plain corridor
      this.setTile(tiles, 4, 3, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 4, 4, 'straight_h', null, ['W', 'E']); // Plain corridor
      this.setTile(tiles, 4, 5, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 4, 6, 'straight_h', null, ['W', 'E']); // Plain corridor
      this.setTile(tiles, 4, 7, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 4, 8, 'straight_h', null, ['W', 'E']); // Plain exit corridor

      // Distractor corridors & dead-ends (matching the screenshot)
      this.setTile(tiles, 1, 1, 'straight_v', 'N', ['N', 'S'], false);
      this.setTile(tiles, 2, 1, 'corner_es', 'SE', ['E', 'S'], false);
      this.setTile(tiles, 2, 2, 'straight_h', null, ['W', 'E'], false);
      this.setTile(tiles, 7, 4, 'straight_h', 'W', ['W', 'E'], false);
      this.setTile(tiles, 7, 5, 'straight_h', null, ['W', 'E'], false);
    } else if (safeLevel === 2) {
      // Level 2: U-shaped detour through upper regions (3 -> 0 -> 1 -> 2 -> 5)
      // Sparse arrows: ~45% of path tiles have arrows, rest are plain corridors
      this.setTile(tiles, 4, 0, 'straight_h', null, ['W', 'E']); // Plain corridor
      this.setTile(tiles, 4, 1, 'corner_wn', 'NE', ['W', 'N']);
      this.setTile(tiles, 3, 1, 'straight_v', null, ['N', 'S']); // Plain corridor
      this.setTile(tiles, 2, 1, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 1, 1, 'corner_es', null, ['E', 'S']); // Plain corner
      this.setTile(tiles, 1, 2, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 1, 3, 'straight_h', null, ['W', 'E']); // Plain corridor
      this.setTile(tiles, 1, 4, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 1, 5, 'straight_h', null, ['W', 'E']); // Plain corridor
      this.setTile(tiles, 1, 6, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 1, 7, 'corner_ws', 'SE', ['W', 'S']);
      this.setTile(tiles, 2, 7, 'straight_v', null, ['N', 'S']); // Plain corridor
      this.setTile(tiles, 3, 7, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 4, 7, 'corner_en', null, ['E', 'N']); // Plain corner
      this.setTile(tiles, 4, 8, 'straight_h', 'E', ['W', 'E']);

      // Distractor branch corridors
      this.setTile(tiles, 6, 2, 'straight_h', 'E', ['W', 'E'], false);
      this.setTile(tiles, 6, 3, 'straight_h', null, ['W', 'E'], false);
      this.setTile(tiles, 7, 4, 'corner_ws', 'SE', ['W', 'S'], false);
    } else if (safeLevel === 3) {
      // Level 3: Step wave through regions 3 -> 4 -> 7 -> 8 -> 5 with sparse arrows
      this.setTile(tiles, 4, 0, 'straight_h', null, ['W', 'E']);
      this.setTile(tiles, 4, 1, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 4, 2, 'straight_h', null, ['W', 'E']);
      this.setTile(tiles, 4, 3, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 4, 4, 'corner_ws', 'SE', ['W', 'S']);
      this.setTile(tiles, 5, 4, 'straight_v', null, ['N', 'S']);
      this.setTile(tiles, 6, 4, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 7, 4, 'corner_en', null, ['E', 'N']);
      this.setTile(tiles, 7, 5, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 7, 6, 'straight_h', null, ['W', 'E']);
      this.setTile(tiles, 7, 7, 'corner_wn', 'NE', ['W', 'N']);
      this.setTile(tiles, 6, 7, 'straight_v', null, ['N', 'S']);
      this.setTile(tiles, 5, 7, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 4, 7, 'corner_es', null, ['E', 'S']);
      this.setTile(tiles, 4, 8, 'straight_h', 'E', ['W', 'E']);

      // Distractors
      this.setTile(tiles, 1, 4, 'straight_h', 'E', ['W', 'E'], false);
      this.setTile(tiles, 2, 4, 'straight_v', null, ['N', 'S'], false);
    } else if (safeLevel === 4) {
      // Level 4: Double detour through Region 0 and Region 8 with sparse arrows
      this.setTile(tiles, 4, 0, 'corner_wn', null, ['W', 'N']);
      this.setTile(tiles, 3, 0, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 2, 0, 'corner_es', null, ['E', 'S']);
      this.setTile(tiles, 2, 1, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 2, 2, 'straight_h', null, ['W', 'E']);
      this.setTile(tiles, 2, 3, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 2, 4, 'corner_ws', 'SE', ['W', 'S']);
      this.setTile(tiles, 3, 4, 'straight_v', null, ['N', 'S']);
      this.setTile(tiles, 4, 4, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 5, 4, 'straight_v', null, ['N', 'S']);
      this.setTile(tiles, 6, 4, 'corner_en', 'SE', ['E', 'N']);
      this.setTile(tiles, 6, 5, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 6, 6, 'straight_h', null, ['W', 'E']);
      this.setTile(tiles, 6, 7, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 6, 8, 'corner_wn', null, ['W', 'N']);
      this.setTile(tiles, 5, 8, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 4, 8, 'straight_v', null, ['N', 'S']);
    } else {
      // Level 5: Serpentine through regions 3, 0, 1, 4, 7, 8, 5 with sparse arrows
      this.setTile(tiles, 4, 0, 'corner_wn', 'NE', ['W', 'N']);
      this.setTile(tiles, 3, 0, 'straight_v', null, ['N', 'S']);
      this.setTile(tiles, 2, 0, 'corner_es', null, ['E', 'S']);
      this.setTile(tiles, 2, 1, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 2, 2, 'straight_h', null, ['W', 'E']);
      this.setTile(tiles, 2, 3, 'corner_ws', 'SE', ['W', 'S']);
      this.setTile(tiles, 3, 3, 'straight_v', null, ['N', 'S']);
      this.setTile(tiles, 4, 3, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 5, 3, 'corner_en', null, ['E', 'N']);
      this.setTile(tiles, 5, 4, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 5, 5, 'corner_ws', 'SE', ['W', 'S']);
      this.setTile(tiles, 6, 5, 'straight_v', null, ['N', 'S']);
      this.setTile(tiles, 7, 5, 'corner_en', null, ['E', 'N']);
      this.setTile(tiles, 7, 6, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 7, 7, 'corner_wn', 'NE', ['W', 'N']);
      this.setTile(tiles, 6, 7, 'straight_v', null, ['N', 'S']);
      this.setTile(tiles, 5, 7, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 4, 7, 'corner_es', null, ['E', 'S']);
      this.setTile(tiles, 4, 8, 'straight_h', 'E', ['W', 'E']);
    }

    // Verify initial solved configuration
    const solvedGrid: PathGrid = { tiles, mouse, cheese };
    const solvedValidation = PathValidator.validate(solvedGrid);
    if (!solvedValidation.success) {
      console.warn(
        `Solved base path for level ${safeLevel} validation warning:`,
        solvedValidation.reason
      );
    }

    // Controlled reversible scrambling according to level
    let scrambledTiles = tiles;
    const regionsToScramble =
      safeLevel === 1
        ? [4]
        : safeLevel === 2
        ? [1, 4]
        : safeLevel === 3
        ? [3, 4, 7]
        : safeLevel === 4
        ? [0, 4, 8]
        : [1, 3, 4, 7, 8];

    for (const rIdx of regionsToScramble) {
      const rotCount = this.rng.nextInt(1, 3);
      for (let i = 0; i < rotCount; i++) {
        scrambledTiles = RegionTransformations.rotateRegion(scrambledTiles, rIdx);
      }
      if (safeLevel >= 3 && this.rng.next() < 0.5) {
        scrambledTiles = RegionTransformations.invertRegionDirections(scrambledTiles, rIdx);
      }
    }

    // Verify the scrambled board is not already solved
    const testGrid: PathGrid = { tiles: scrambledTiles, mouse, cheese };
    if (PathValidator.validate(testGrid).success) {
      // Scramble center region once more to ensure player interaction is required
      scrambledTiles = RegionTransformations.rotateRegion(scrambledTiles, 4);
    }

    return {
      tiles: scrambledTiles,
      mouse,
      cheese,
    };
  }
}
