import { describe, expect, it } from 'vitest';
import { InvisibleWallsEngine } from '../../src/games/invisible-walls/engine';
import { InvisibleMazeGenerator } from '../../src/games/invisible-walls/generator';

describe('Invisible Walls — Movement Rules and Collision Resets', () => {
  it('moves player exactly 1 cell in each permitted cardinal direction', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 404);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    // Clear walls around (0,0), (0,1), (1,1), (1,0) to permit free square motion
    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(0, 0, 0, 1));
    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(0, 1, 1, 1));
    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(1, 1, 1, 0));
    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(1, 0, 0, 0));

    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 0 });

    // Move Right: (0,0) -> (0,1)
    engine.move('right');
    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 1 });
    expect(engine.getStats().successfulMoves).toBe(1);

    // Move Down: (0,1) -> (1,1)
    engine.move('down');
    expect(engine.getPlayerPosition()).toEqual({ row: 1, col: 1 });
    expect(engine.getStats().successfulMoves).toBe(2);

    // Move Left: (1,1) -> (1,0)
    engine.move('left');
    expect(engine.getPlayerPosition()).toEqual({ row: 1, col: 0 });
    expect(engine.getStats().successfulMoves).toBe(3);

    // Move Up: (1,0) -> (0,0)
    engine.move('up');
    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 0 });
    expect(engine.getStats().successfulMoves).toBe(4);

    engine.destroy();
  });

  it('rejects moves outside the board without wrapping around', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 505);

    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 0 });

    engine.move('up');
    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 0 });

    engine.move('left');
    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 0 });

    engine.destroy();
  });

  it('hitting an invisible wall does not place player in forbidden cell and triggers collision reset', async () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 606);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    // Place an explicit wall between (0, 0) and (0, 1)
    const wall = InvisibleMazeGenerator.getWallKey(0, 0, 0, 1);
    state.maze.walls.add(wall);

    const wallCountBefore = state.maze.walls.size;
    const initialKeys = [...state.maze.keys];
    const initialExit = { ...state.maze.exit };

    // Move right into the hidden wall
    engine.move('right');

    // Player must NOT enter (0, 1)
    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 0 });

    // State becomes wall_collision
    expect(engine.getState().status).toBe('wall_collision');
    expect(engine.getStats().wallCollisions).toBe(1);
    expect(engine.getStats().resets).toBe(1);

    // Wait for reset transition to finish
    await new Promise((res) => setTimeout(res, 550));

    // After reset: player is at start (0, 0)
    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 0 });
    expect(engine.getState().status).toBe('playing');

    // Maze, walls, keys, and exit remain completely preserved
    const afterState = engine.getState();
    if (afterState.status === 'playing') {
      expect(afterState.maze.walls.size).toBe(wallCountBefore);
      expect(afterState.maze.walls.has(wall)).toBe(true);
      expect(afterState.maze.keys).toEqual(initialKeys);
      expect(afterState.maze.exit).toEqual(initialExit);
    }

    engine.destroy();
  });
});
