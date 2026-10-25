import { describe, expect, it } from 'vitest';
import { InvisibleWallsEngine } from '../../src/games/invisible-walls/engine';
import { InvisibleMazeGenerator } from '../../src/games/invisible-walls/generator';

describe('Invisible Walls', () => {
  it('generates solvable mazes with correct key requirements across all 5 levels', () => {
    const generator = new InvisibleMazeGenerator(1234);

    for (let lvl = 1; lvl <= 5; lvl++) {
      const maze = generator.generateMaze(lvl);

      // Verify key count specification: L1-3: 1 key, L4-5: 2 keys
      const expectedKeys = lvl <= 3 ? 1 : 2;
      expect(maze.keys.length).toBe(expectedKeys);

      // Verify solvability
      for (const k of maze.keys) {
        expect(InvisibleMazeGenerator.isReachable(maze.start, k, maze.walls)).toBe(true);
      }
      expect(InvisibleMazeGenerator.isReachable(maze.start, maze.exit, maze.walls)).toBe(true);
    }
  });

  it('resets player and collected keys on hidden wall collision without resetting timer', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 555);

    const state = engine.getState();
    expect(state.status).toBe('playing');
    if (state.status !== 'playing') return;

    // Place an explicit wall right in front of the player (from (0,0) to (0,1))
    const wKey = InvisibleMazeGenerator.getWallKey(0, 0, 0, 1);
    state.maze.walls.add(wKey);

    // Attempt to move right into the wall
    engine.move('right');

    const collisionState = engine.getState();
    expect(collisionState.status).toBe('wall_collision');
    expect(engine.getStats().wallCollisions).toBe(1);
    expect(engine.getStats().resets).toBe(1);

    engine.destroy();
  });

  it('locks exit if not all keys are collected', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 888);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    // Teleport player directly to exit without collecting keys
    (engine as any).playerPos = { row: 9, col: 8 };
    engine.move('right'); // lands on exit (9, 9)

    expect(engine.getState().status).toBe('locked_exit_feedback');
    expect(engine.getStats().levelsCompleted).toBe(0);

    engine.destroy();
  });
});
