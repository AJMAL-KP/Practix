import { describe, expect, it } from 'vitest';
import { InvisibleMazeGenerator } from '../../src/games/invisible-walls/generator';
import { MathQuestionGenerator } from '../../src/games/math-bubble/generator';
import { RotatePathGenerator } from '../../src/games/rotate-path/generator';

describe('Multi-seed Solvability & Boundary Stress Tests', () => {
  it('MathQuestionGenerator produces 100% valid, unambiguous questions across 50 different seeds', () => {
    for (let seed = 100; seed < 150; seed++) {
      const generator = new MathQuestionGenerator(seed);
      const question = generator.generateQuestion(seed % 25);

      expect(question.bubbles.length).toBe(3);
      expect(question.correctOrderIds.length).toBe(3);

      const v0 = question.bubbles[0].value;
      const v1 = question.bubbles[1].value;
      const v2 = question.bubbles[2].value;

      expect(v0.equals(v1)).toBe(false);
      expect(v0.equals(v2)).toBe(false);
      expect(v1.equals(v2)).toBe(false);
    }
  });

  it('InvisibleMazeGenerator produces 100% solvable mazes with correct keys across 50 seeds', () => {
    for (let seed = 200; seed < 250; seed++) {
      const level = (seed % 5) + 1;
      const generator = new InvisibleMazeGenerator(seed);
      const maze = generator.generateMaze(level);

      const expectedKeyCount = level <= 3 ? 1 : 2;
      expect(maze.keys.length).toBe(expectedKeyCount);

      for (const key of maze.keys) {
        expect(InvisibleMazeGenerator.isReachable(maze.start, key, maze.walls)).toBe(true);
      }
      expect(InvisibleMazeGenerator.isReachable(maze.start, maze.exit, maze.walls)).toBe(true);
    }
  });

  it('RotatePathGenerator consistently constructs valid 9x9 level grids across all levels', () => {
    for (let seed = 300; seed < 350; seed++) {
      const level = (seed % 5) + 1;
      const generator = new RotatePathGenerator(seed);
      const grid = generator.generateLevel(level);

      expect(grid.tiles.length).toBe(9);
      expect(grid.tiles[0].length).toBe(9);
      expect(grid.mouse.row).toBe(4);
      expect(grid.cheese.row).toBe(4);
    }
  });
});
