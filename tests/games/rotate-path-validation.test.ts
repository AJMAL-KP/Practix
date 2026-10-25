import { describe, expect, it } from 'vitest';
import { PathGrid, PathTile } from '../../src/games/rotate-path/types';
import { PathValidator } from '../../src/games/rotate-path/validator';

describe('Rotate the Path — Directed Path Validation Tests', () => {
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

  it('validates a continuous legal path from mouse to cheese', () => {
    const tiles = createBlankGrid();
    // Straight horizontal line from (4, 0) to (4, 8)
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

    const res = PathValidator.validate(grid);
    expect(res.success).toBe(true);
    expect(res.failurePoint).toBeNull();
    expect(res.visitedCoordinates.length).toBe(9);
  });

  it('rejects traversal when an arrow points in the opposite direction', () => {
    const tiles = createBlankGrid();
    for (let c = 0; c <= 8; c++) {
      tiles[4][c] = {
        row: 4,
        col: c,
        type: 'straight_h',
        arrow: 'E',
        ports: ['W', 'E'],
      };
    }

    // Set arrow at (4, 4) to point West (against incoming flow from West to East)
    tiles[4][4].arrow = 'W';

    const grid: PathGrid = {
      tiles,
      mouse: { row: 4, col: 0, entryDirection: 'W' },
      cheese: { row: 4, col: 8 },
    };

    const res = PathValidator.validate(grid);
    expect(res.success).toBe(false);
    expect(res.failurePoint).toEqual({ row: 4, col: 4 });
    expect(res.reason).toContain('Arrow points in opposite direction');
  });

  it('rejects traversal when path leads into an empty tile', () => {
    const tiles = createBlankGrid();
    tiles[4][0] = { row: 4, col: 0, type: 'straight_h', arrow: 'E', ports: ['W', 'E'] };
    // (4, 1) is empty

    const grid: PathGrid = {
      tiles,
      mouse: { row: 4, col: 0, entryDirection: 'W' },
      cheese: { row: 4, col: 8 },
    };

    const res = PathValidator.validate(grid);
    expect(res.success).toBe(false);
    expect(res.failurePoint).toEqual({ row: 4, col: 1 });
    expect(res.reason).toContain('Path blocked by empty tile');
  });

  it('rejects traversal when path leads into a blocked wall tile', () => {
    const tiles = createBlankGrid();
    tiles[4][0] = { row: 4, col: 0, type: 'straight_h', arrow: 'E', ports: ['W', 'E'] };
    tiles[4][1] = { row: 4, col: 1, type: 'blocked', arrow: null, ports: [] };

    const grid: PathGrid = {
      tiles,
      mouse: { row: 4, col: 0, entryDirection: 'W' },
      cheese: { row: 4, col: 8 },
    };

    const res = PathValidator.validate(grid);
    expect(res.success).toBe(false);
    expect(res.failurePoint).toEqual({ row: 4, col: 1 });
    expect(res.reason).toContain('blocked');
  });

  it('detects infinite loops and terminates deterministically without hanging', () => {
    const tiles = createBlankGrid();
    // Construct a continuous 4-tile clockwise loop:
    // (4, 1) [S->E, NE] -> (4, 2) [W->S, SE] -> (5, 2) [N->W, SW] -> (5, 1) [E->N, NW] -> (4, 1)
    tiles[4][1] = { row: 4, col: 1, type: 'corner_es', arrow: 'NE', ports: ['S', 'E'] };
    tiles[4][2] = { row: 4, col: 2, type: 'corner_ws', arrow: 'SE', ports: ['W', 'S'] };
    tiles[5][2] = { row: 5, col: 2, type: 'corner_wn', arrow: 'SW', ports: ['N', 'W'] };
    tiles[5][1] = { row: 5, col: 1, type: 'corner_en', arrow: 'NW', ports: ['E', 'N'] };

    const grid: PathGrid = {
      tiles,
      mouse: { row: 4, col: 1, entryDirection: 'S' },
      cheese: { row: 4, col: 8 },
    };

    const res = PathValidator.validate(grid);
    expect(res.success).toBe(false);
    expect(res.reason).toContain('Infinite loop detected');
  });

  it('path validation is pure and does not mutate any tile in the grid', () => {
    const tiles = createBlankGrid();
    tiles[4][0] = { row: 4, col: 0, type: 'straight_h', arrow: 'E', ports: ['W', 'E'] };
    const grid: PathGrid = {
      tiles,
      mouse: { row: 4, col: 0, entryDirection: 'W' },
      cheese: { row: 4, col: 8 },
    };

    const snapshot = JSON.stringify(grid);
    PathValidator.validate(grid);
    expect(JSON.stringify(grid)).toBe(snapshot);
  });
});
