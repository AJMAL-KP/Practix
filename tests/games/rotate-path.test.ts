import { describe, expect, it } from 'vitest';
import { RotatePathGenerator } from '../../src/games/rotate-path/generator';
import { RegionTransformations } from '../../src/games/rotate-path/transformations';
import { PathGrid, PathTile } from '../../src/games/rotate-path/types';
import { PathValidator } from '../../src/games/rotate-path/validator';

describe('Rotate the Path', () => {
  it('correctly rotates a 3x3 region 90 degrees clockwise (c, 2 - r)', () => {
    // Construct a dummy 9x9 grid
    const tiles: PathTile[][] = [];
    for (let r = 0; r < 9; r++) {
      tiles[r] = [];
      for (let c = 0; c < 9; c++) {
        tiles[r][c] = { row: r, col: c, type: 'empty', arrow: null, ports: [] };
      }
    }

    // Put a tile in Region 4 (rows 3..5, cols 3..5) at local (0, 0) => grid (3, 3)
    tiles[3][3] = {
      row: 3,
      col: 3,
      type: 'straight_h',
      arrow: 'E',
      ports: ['W', 'E'],
    };

    // Rotate Region 4 clockwise
    const rotated = RegionTransformations.rotateRegion(tiles, 4);

    // Local (0, 0) maps to local (c, 2 - r) = (0, 2 - 0) = (0, 2) => grid (3, 5)
    expect(rotated[3][3].type).toBe('empty');
    expect(rotated[3][5].type).toBe('straight_v');
    expect(rotated[3][5].arrow).toBe('S');
    expect(rotated[3][5].ports).toContain('N');
    expect(rotated[3][5].ports).toContain('S');
  });

  it('correctly inverts arrow directions 180 degrees (Direction Effect)', () => {
    const tiles: PathTile[][] = [];
    for (let r = 0; r < 9; r++) {
      tiles[r] = [];
      for (let c = 0; c < 9; c++) {
        tiles[r][c] = { row: r, col: c, type: 'empty', arrow: null, ports: [] };
      }
    }

    // As shown in reference screenshot Image 2:
    // [→, ↘, ↓]
    tiles[3][3] = { row: 3, col: 3, type: 'straight_h', arrow: 'E', ports: ['W', 'E'] };
    tiles[3][4] = { row: 3, col: 4, type: 'corner_ws', arrow: 'SE', ports: ['W', 'S'] };
    tiles[4][4] = { row: 4, col: 4, type: 'straight_v', arrow: 'S', ports: ['N', 'S'] };

    const inverted = RegionTransformations.invertRegionDirections(tiles, 4);

    // Expect: [←, ↖, ↑]
    expect(inverted[3][3].arrow).toBe('W');
    expect(inverted[3][4].arrow).toBe('NW');
    expect(inverted[4][4].arrow).toBe('N');
  });

  it('validates a complete path and catches loops or blocks', () => {
    const tiles: PathTile[][] = [];
    for (let r = 0; r < 9; r++) {
      tiles[r] = [];
      for (let c = 0; c < 9; c++) {
        tiles[r][c] = { row: r, col: c, type: 'empty', arrow: null, ports: [] };
      }
    }

    // Straight line from (4,0) to (4,8)
    for (let c = 0; c <= 8; c++) {
      tiles[4][c] = {
        row: 4,
        col: c,
        type: 'straight_h',
        arrow: 'E',
        ports: ['W', 'E'],
      };
    }

    const grid: PathGrid = {
      tiles,
      mouse: { row: 4, col: 0, entryDirection: 'W' },
      cheese: { row: 4, col: 8 },
    };

    const result = PathValidator.validate(grid);
    expect(result.success).toBe(true);

    // Reverse one arrow in the middle
    tiles[4][4].arrow = 'W';
    const blockedResult = PathValidator.validate(grid);
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.reason).toContain('Arrow points in opposite direction');
  });

  it('generates solvable puzzles across all 5 levels', () => {
    const generator = new RotatePathGenerator(777);
    for (let lvl = 1; lvl <= 5; lvl++) {
      const puzzle = generator.generateLevel(lvl);
      expect(puzzle.tiles.length).toBe(9);
      expect(puzzle.tiles[0].length).toBe(9);
    }
  });
});
