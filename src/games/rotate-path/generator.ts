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
    ports: Port[]
  ): void {
    grid[r][c] = {
      row: r,
      col: c,
      type,
      arrow,
      ports,
    };
  }

  /**
   * Generates a solvable 9x9 puzzle for a given level (1 to 5).
   */
  generateLevel(level: number): PathGrid {
    const tiles = this.createEmptyGrid();

    // Mouse enters at row 4, col 0 facing East
    const mouse = { row: 4, col: 0, entryDirection: 'W' as Port };
    // Cheese at row 4, col 8
    const cheese = { row: 4, col: 8 };

    // Build base solved paths depending on level
    if (level === 1) {
      // Level 1: Straightforward route through middle regions 3, 4, 5
      // Row 4 across cols 0..8
      for (let c = 0; c <= 8; c++) {
        this.setTile(tiles, 4, c, 'straight_h', 'E', ['W', 'E']);
      }
      // Add a couple distractor paths in other regions
      this.setTile(tiles, 1, 1, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 1, 2, 'corner_ws', 'SE', ['W', 'S']);
      this.setTile(tiles, 2, 2, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 7, 4, 'straight_h', 'W', ['W', 'E']);
    } else if (level === 2) {
      // Level 2: U-shaped detour through upper regions (3 -> 0 -> 1 -> 2 -> 5)
      // Path: (4,0) -> (4,1) -> (1,1) -> (1,7) -> (4,7) -> (4,8)
      this.setTile(tiles, 4, 0, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 4, 1, 'corner_wn', 'NE', ['W', 'N']);
      this.setTile(tiles, 3, 1, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 2, 1, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 1, 1, 'corner_es', 'NE', ['E', 'S']); // turning from S to E
      // Cols 2..6 along row 1
      for (let c = 2; c <= 6; c++) {
        this.setTile(tiles, 1, c, 'straight_h', 'E', ['W', 'E']);
      }
      this.setTile(tiles, 1, 7, 'corner_ws', 'SE', ['W', 'S']);
      this.setTile(tiles, 2, 7, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 3, 7, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 4, 7, 'corner_en', 'SE', ['E', 'N']); // turning from N to E
      this.setTile(tiles, 4, 8, 'straight_h', 'E', ['W', 'E']);
    } else if (level === 3) {
      // Level 3: Step wave through regions 3 -> 4 -> 7 -> 8 -> 5
      // (4,0) -> (4,4) -> (7,4) -> (7,7) -> (4,7) -> (4,8)
      for (let c = 0; c <= 3; c++) {
        this.setTile(tiles, 4, c, 'straight_h', 'E', ['W', 'E']);
      }
      this.setTile(tiles, 4, 4, 'corner_ws', 'SE', ['W', 'S']);
      this.setTile(tiles, 5, 4, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 6, 4, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 7, 4, 'corner_en', 'SE', ['E', 'N']); // In: N, Out: E
      this.setTile(tiles, 7, 5, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 7, 6, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 7, 7, 'corner_wn', 'NE', ['W', 'N']); // In: W, Out: N
      this.setTile(tiles, 6, 7, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 5, 7, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 4, 7, 'corner_es', 'NE', ['E', 'S']); // In: S, Out: E
      this.setTile(tiles, 4, 8, 'straight_h', 'E', ['W', 'E']);
    } else if (level === 4) {
      // Level 4: Double detour through Region 0 and Region 8
      // (4,0) -> (2,0) -> (2,4) -> (6,4) -> (6,8) -> (4,8)
      this.setTile(tiles, 4, 0, 'corner_wn', 'NE', ['W', 'N']); // entering W, turning N
      this.setTile(tiles, 3, 0, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 2, 0, 'corner_es', 'NE', ['E', 'S']); // In: S, Out: E
      this.setTile(tiles, 2, 1, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 2, 2, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 2, 3, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 2, 4, 'corner_ws', 'SE', ['W', 'S']); // In: W, Out: S
      this.setTile(tiles, 3, 4, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 4, 4, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 5, 4, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 6, 4, 'corner_en', 'SE', ['E', 'N']); // In: N, Out: E
      this.setTile(tiles, 6, 5, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 6, 6, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 6, 7, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 6, 8, 'corner_wn', 'NE', ['W', 'N']); // In: W, Out: N
      this.setTile(tiles, 5, 8, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 4, 8, 'straight_v', 'N', ['N', 'S']); // destination cell connected to incoming S
    } else {
      // Level 5: Serpentine through regions 3, 0, 1, 4, 7, 8, 5
      this.setTile(tiles, 4, 0, 'corner_wn', 'NE', ['W', 'N']); // In: W, Out: N
      this.setTile(tiles, 3, 0, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 2, 0, 'corner_es', 'NE', ['E', 'S']); // In: S, Out: E
      this.setTile(tiles, 2, 1, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 2, 2, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 2, 3, 'corner_ws', 'SE', ['W', 'S']); // In: W, Out: S
      this.setTile(tiles, 3, 3, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 4, 3, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 5, 3, 'corner_en', 'SE', ['E', 'N']); // In: N, Out: E
      this.setTile(tiles, 5, 4, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 5, 5, 'corner_ws', 'SE', ['W', 'S']); // In: W, Out: S
      this.setTile(tiles, 6, 5, 'straight_v', 'S', ['N', 'S']);
      this.setTile(tiles, 7, 5, 'corner_en', 'SE', ['E', 'N']); // In: N, Out: E
      this.setTile(tiles, 7, 6, 'straight_h', 'E', ['W', 'E']);
      this.setTile(tiles, 7, 7, 'corner_wn', 'NE', ['W', 'N']); // In: W, Out: N
      this.setTile(tiles, 6, 7, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 5, 7, 'straight_v', 'N', ['N', 'S']);
      this.setTile(tiles, 4, 7, 'corner_es', 'NE', ['E', 'S']); // In: S, Out: E
      this.setTile(tiles, 4, 8, 'straight_h', 'E', ['W', 'E']); // In: W
    }

    // Verify initial solved configuration
    const solvedGrid: PathGrid = { tiles, mouse, cheese };
    const solvedValidation = PathValidator.validate(solvedGrid);
    if (!solvedValidation.success) {
      console.warn(`Initial solved path for level ${level} validation failed:`, solvedValidation.reason);
    }

    // Now scramble regions according to level
    let scrambledTiles = tiles;
    const regionsToScramble =
      level === 1 ? [4] :
      level === 2 ? [1, 4] :
      level === 3 ? [3, 4, 7] :
      level === 4 ? [0, 4, 8] :
      [1, 3, 4, 7, 8];

    for (const rIdx of regionsToScramble) {
      const rotCount = this.rng.nextInt(1, 3);
      for (let i = 0; i < rotCount; i++) {
        scrambledTiles = RegionTransformations.rotateRegion(scrambledTiles, rIdx);
      }
      if (level >= 3 && this.rng.next() < 0.5) {
        scrambledTiles = RegionTransformations.invertRegionDirections(scrambledTiles, rIdx);
      }
    }

    // Verify it's not accidentally solved already
    const testGrid: PathGrid = { tiles: scrambledTiles, mouse, cheese };
    if (PathValidator.validate(testGrid).success) {
      // Rotate region 4 one more time to ensure it requires player action
      scrambledTiles = RegionTransformations.rotateRegion(scrambledTiles, 4);
    }

    return {
      tiles: scrambledTiles,
      mouse,
      cheese,
    };
  }
}
