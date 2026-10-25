import { describe, expect, it } from 'vitest';
import { RotatePathGenerator } from '../../src/games/rotate-path/generator';
import { PathValidator } from '../../src/games/rotate-path/validator';

describe('Rotate the Path — Random Puzzle Generator Tests', () => {
  it('generates 9x9 board with exactly 81 tiles for every level (1 to 5)', () => {
    const generator = new RotatePathGenerator(12345);
    for (let lvl = 1; lvl <= 5; lvl++) {
      const puzzle = generator.generateLevel(lvl);
      expect(puzzle.tiles.length).toBe(9);
      for (let r = 0; r < 9; r++) {
        expect(puzzle.tiles[r].length).toBe(9);
      }
      expect(puzzle.mouse.row).toBe(4);
      expect(puzzle.mouse.col).toBe(0);
      expect(puzzle.cheese.row).toBe(4);
      expect(puzzle.cheese.col).toBe(8);
    }
  });

  it('scrambles the board so it is not already solved at presentation', () => {
    const generator = new RotatePathGenerator(999);
    for (let lvl = 1; lvl <= 5; lvl++) {
      const puzzle = generator.generateLevel(lvl);
      const validation = PathValidator.validate(puzzle);
      // Puzzle must require player action to solve
      expect(validation.success).toBe(false);
    }
  });

  it('generates reproducible puzzles when given the same seed', () => {
    const genA = new RotatePathGenerator(777);
    const genB = new RotatePathGenerator(777);

    for (let lvl = 1; lvl <= 5; lvl++) {
      const puzA = genA.generateLevel(lvl);
      const puzB = genB.generateLevel(lvl);

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          expect(puzA.tiles[r][c].type).toBe(puzB.tiles[r][c].type);
          expect(puzA.tiles[r][c].arrow).toBe(puzB.tiles[r][c].arrow);
        }
      }
    }
  });

  it('bounded generator reliably generates puzzles across 50 different seeds without hanging', () => {
    for (let seed = 100; seed < 150; seed++) {
      const g = new RotatePathGenerator(seed);
      const lvl = (seed % 5) + 1;
      const puz = g.generateLevel(lvl);
      expect(puz.tiles.length).toBe(9);
    }
  });
});
