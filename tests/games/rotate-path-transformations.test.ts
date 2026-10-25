import { describe, expect, it } from 'vitest';
import { RegionTransformations } from '../../src/games/rotate-path/transformations';
import { PathTile } from '../../src/games/rotate-path/types';

describe('Rotate the Path — Transformations (Rotate & Flip)', () => {
  function createBlankGrid(): PathTile[][] {
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

  it('rotates local coordinates clockwise: (r, c) -> (c, 2 - r)', () => {
    const grid = createBlankGrid();
    // Region 4 spans rows 3..5, cols 3..5
    // Place a tile at local (0, 1) -> grid (3, 4)
    grid[3][4] = {
      row: 3,
      col: 4,
      type: 'straight_h',
      arrow: 'E',
      ports: ['W', 'E'],
    };

    const rotated = RegionTransformations.rotateRegion(grid, 4);

    // Local (0, 1) maps to (c, 2 - r) = (1, 2 - 0) = (1, 2) -> grid (4, 5)
    expect(rotated[3][4].type).toBe('empty');
    expect(rotated[4][5].type).toBe('straight_v');
    expect(rotated[4][5].arrow).toBe('S');
    expect(rotated[4][5].ports).toContain('N');
    expect(rotated[4][5].ports).toContain('S');
  });

  it('leaves all cells outside the selected region completely unchanged', () => {
    const grid = createBlankGrid();
    grid[0][0] = { row: 0, col: 0, type: 'straight_h', arrow: 'E', ports: ['W', 'E'] };
    grid[8][8] = { row: 8, col: 8, type: 'corner_ws', arrow: 'SE', ports: ['W', 'S'] };

    // Rotate Region 4 (center)
    const rotated = RegionTransformations.rotateRegion(grid, 4);

    expect(rotated[0][0]).toEqual(grid[0][0]);
    expect(rotated[8][8]).toEqual(grid[8][8]);
  });

  it('four consecutive clockwise rotations restore the exact original region (identity)', () => {
    const grid = createBlankGrid();
    // Populate an asymmetric pattern in Region 0 (rows 0..2, cols 0..2)
    grid[0][0] = { row: 0, col: 0, type: 'straight_h', arrow: 'E', ports: ['W', 'E'] };
    grid[0][1] = { row: 0, col: 1, type: 'corner_ws', arrow: 'SE', ports: ['W', 'S'] };
    grid[1][1] = { row: 1, col: 1, type: 'straight_v', arrow: 'S', ports: ['N', 'S'] };

    let current = grid;
    for (let i = 0; i < 4; i++) {
      current = RegionTransformations.rotateRegion(current, 0);
    }

    expect(current[0][0].type).toBe(grid[0][0].type);
    expect(current[0][0].arrow).toBe(grid[0][0].arrow);
    expect(current[0][1].type).toBe(grid[0][1].type);
    expect(current[0][1].arrow).toBe(grid[0][1].arrow);
    expect(current[1][1].type).toBe(grid[1][1].type);
    expect(current[1][1].arrow).toBe(grid[1][1].arrow);
  });

  it('flip inverts arrow directions 180 degrees (Direction Effect: [→, ↘, ↓] -> [←, ↖, ↑])', () => {
    const grid = createBlankGrid();
    // Reference screenshot transformation example in Region 4:
    grid[3][3] = { row: 3, col: 3, type: 'straight_h', arrow: 'E', ports: ['W', 'E'] };
    grid[3][4] = { row: 3, col: 4, type: 'corner_ws', arrow: 'SE', ports: ['W', 'S'] };
    grid[4][4] = { row: 4, col: 4, type: 'straight_v', arrow: 'S', ports: ['N', 'S'] };

    const flipped = RegionTransformations.invertRegionDirections(grid, 4);

    expect(flipped[3][3].arrow).toBe('W');
    expect(flipped[3][4].arrow).toBe('NW');
    expect(flipped[4][4].arrow).toBe('N');

    // Second flip restores original arrow directions
    const doubleFlipped = RegionTransformations.invertRegionDirections(flipped, 4);
    expect(doubleFlipped[3][3].arrow).toBe('E');
    expect(doubleFlipped[3][4].arrow).toBe('SE');
    expect(doubleFlipped[4][4].arrow).toBe('S');
  });

  it('preserves empty and blocked tiles across rotations and flips', () => {
    const grid = createBlankGrid();
    grid[3][3] = { row: 3, col: 3, type: 'blocked', arrow: null, ports: [] };
    grid[3][4] = { row: 3, col: 4, type: 'empty', arrow: null, ports: [] };

    const rotated = RegionTransformations.rotateRegion(grid, 4);
    // (0,0) -> (0,2) => grid (3,5)
    expect(rotated[3][5].type).toBe('blocked');
    expect(rotated[3][5].arrow).toBeNull();

    const flipped = RegionTransformations.invertRegionDirections(grid, 4);
    expect(flipped[3][3].type).toBe('blocked');
    expect(flipped[3][4].type).toBe('empty');
  });
});
