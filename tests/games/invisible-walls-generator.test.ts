import { describe, expect, it } from 'vitest';
import { InvisibleMazeGenerator } from '../../src/games/invisible-walls/generator';

describe('Invisible Walls — Generator & Solvability Validation', () => {
  it('guarantees solvability across all 5 levels for multiple seeds', () => {
    for (const seed of [111, 222, 333, 444, 555]) {
      const generator = new InvisibleMazeGenerator(seed);
      for (let lvl = 1; lvl <= 5; lvl++) {
        const maze = generator.generateMaze(lvl);

        // Required keys
        const expectedKeys = lvl <= 3 ? 1 : 2;
        expect(maze.keys.length).toBe(expectedKeys);

        // Verify solvability using validator
        expect(InvisibleMazeGenerator.validateSolvability(maze)).toBe(true);

        // Start to each key is reachable
        for (const k of maze.keys) {
          expect(InvisibleMazeGenerator.isReachable(maze.start, k, maze.walls)).toBe(true);
        }

        // Start to exit is reachable
        expect(InvisibleMazeGenerator.isReachable(maze.start, maze.exit, maze.walls)).toBe(true);
      }
    }
  });

  it('generates non-overlapping keys distinct from start and exit', () => {
    const generator = new InvisibleMazeGenerator(777);
    for (let lvl = 1; lvl <= 5; lvl++) {
      const maze = generator.generateMaze(lvl);
      const usedCoords = new Set<string>();

      usedCoords.add(`${maze.start.row},${maze.start.col}`);
      usedCoords.add(`${maze.exit.row},${maze.exit.col}`);

      for (const key of maze.keys) {
        const kStr = `${key.row},${key.col}`;
        expect(usedCoords.has(kStr)).toBe(false);
        usedCoords.add(kStr);
      }
    }
  });

  it('produces reasonable wall density and variety across levels', () => {
    const generator = new InvisibleMazeGenerator(888);
    const mazeL1 = generator.generateMaze(1);
    const mazeL5 = generator.generateMaze(5);

    // Wall count should generally be higher in level 5 than in level 1
    expect(mazeL1.walls.size).toBeGreaterThanOrEqual(15);
    expect(mazeL5.walls.size).toBeGreaterThan(mazeL1.walls.size);
  });

  it('fallback generator produces a fully valid, solvable maze', () => {
    const generator = new InvisibleMazeGenerator(999);
    // Call fallback generator directly via fallback method
    const fallbackMaze = (generator as any).getFallbackMaze(
      4,
      10,
      { row: 0, col: 0 },
      { row: 9, col: 9 }
    );

    expect(fallbackMaze.size).toBe(10);
    expect(fallbackMaze.keys.length).toBe(2);
    expect(InvisibleMazeGenerator.validateSolvability(fallbackMaze)).toBe(true);
  });
});
