import { describe, expect, it } from 'vitest';
import { InvisibleMazeGenerator } from '../../src/games/invisible-walls/generator';
import { InvisibleWallsEngine } from '../../src/games/invisible-walls/engine';

describe('Invisible Walls — Maze Model Specifications', () => {
  it('validates 10x10 board dimensions and cell coordinate bounds', () => {
    const generator = new InvisibleMazeGenerator(101);
    for (let lvl = 1; lvl <= 5; lvl++) {
      const maze = generator.generateMaze(lvl);
      expect(maze.size).toBe(10);
      expect(maze.start.row).toBe(0);
      expect(maze.start.col).toBe(0);
      expect(maze.exit.row).toBe(9);
      expect(maze.exit.col).toBe(9);

      // Verify all keys are strictly within (0..9, 0..9)
      for (const key of maze.keys) {
        expect(key.row).toBeGreaterThanOrEqual(0);
        expect(key.row).toBeLessThan(10);
        expect(key.col).toBeGreaterThanOrEqual(0);
        expect(key.col).toBeLessThan(10);

        // Keys must never overlap with start or exit
        expect(key.row === maze.start.row && key.col === maze.start.col).toBe(false);
        expect(key.row === maze.exit.row && key.col === maze.exit.col).toBe(false);
      }
    }
  });

  it('enforces exact key count per level: 1 key for L1-3, 2 keys for L4-5', () => {
    const generator = new InvisibleMazeGenerator(202);
    expect(generator.generateMaze(1).keys.length).toBe(1);
    expect(generator.generateMaze(2).keys.length).toBe(1);
    expect(generator.generateMaze(3).keys.length).toBe(1);
    expect(generator.generateMaze(4).keys.length).toBe(2);
    expect(generator.generateMaze(5).keys.length).toBe(2);
  });

  it('canonicalizes wall keys and guarantees bidirectional boundary blocking', () => {
    // getWallKey must produce identical string key regardless of coordinate order
    const keyForward = InvisibleMazeGenerator.getWallKey(3, 4, 3, 5);
    const keyBackward = InvisibleMazeGenerator.getWallKey(3, 5, 3, 4);
    expect(keyForward).toBe('3,4-3,5');
    expect(keyBackward).toBe('3,4-3,5');

    const keyVertical1 = InvisibleMazeGenerator.getWallKey(4, 2, 5, 2);
    const keyVertical2 = InvisibleMazeGenerator.getWallKey(5, 2, 4, 2);
    expect(keyVertical1).toBe('4,2-5,2');
    expect(keyVertical2).toBe('4,2-5,2');
  });

  it('outer boundaries prevent movement outside board without triggering internal wall collision', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 303);

    // Player starts at (0, 0)
    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 0 });

    // Moving up off-board must be rejected
    engine.move('up');
    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 0 });
    expect(engine.getStats().wallCollisions).toBe(0);
    expect(engine.getStats().totalMovesAttempted).toBe(0); // Off-board rejection is not an attempted internal action

    // Moving left off-board must be rejected
    engine.move('left');
    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 0 });
    expect(engine.getStats().wallCollisions).toBe(0);
    expect(engine.getStats().totalMovesAttempted).toBe(0);

    engine.destroy();
  });
});
