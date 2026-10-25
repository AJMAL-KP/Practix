import { describe, expect, it } from 'vitest';
import { InvisibleWallsEngine } from '../../src/games/invisible-walls/engine';
import { InvisibleMazeGenerator } from '../../src/games/invisible-walls/generator';

describe('Invisible Walls — Key Collection and Exit Rules', () => {
  it('collects keys when entering key cell and prevents duplicate pickup in the same attempt', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 707);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    // Set key at (0, 1) and ensure passage from (0, 0) to (0, 1) is clear
    state.maze.keys = [{ row: 0, col: 1 }];
    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(0, 0, 0, 1));
    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(0, 1, 0, 2));

    expect(engine.getStats().keysCollected).toBe(0);

    // Step into (0, 1)
    engine.move('right');
    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 1 });
    expect(engine.getStats().keysCollected).toBe(1);

    const playState = engine.getState();
    if (playState.status === 'playing') {
      expect(playState.collectedKeyIndices).toEqual([0]);
    }

    // Move to (0, 2) and back to (0, 1)
    engine.move('right');
    engine.move('left');
    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 1 });
    // Key count must still be 1 (cannot collect twice in same attempt)
    expect(engine.getStats().keysCollected).toBe(1);

    engine.destroy();
  });

  it('drops all collected keys upon wall collision and allows recollecting them', async () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 808);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    // Set key at (0, 1) and wall at (0, 1)-(0, 2)
    state.maze.keys = [{ row: 0, col: 1 }];
    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(0, 0, 0, 1));
    state.maze.walls.add(InvisibleMazeGenerator.getWallKey(0, 1, 0, 2));

    // Move right into (0, 1) - key collected
    engine.move('right');
    expect(engine.getStats().keysCollected).toBe(1);

    // Move right again into wall (0, 1)-(0, 2)
    engine.move('right');
    expect(engine.getState().status).toBe('wall_collision');

    // Wait for reset
    await new Promise((res) => setTimeout(res, 550));

    // Player is back at (0, 0)
    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 0 });

    const resetState = engine.getState();
    if (resetState.status === 'playing') {
      // Collected keys for this attempt are cleared!
      expect(resetState.collectedKeyIndices.length).toBe(0);
    }

    // Now moving right to (0, 1) collects the key again!
    engine.move('right');
    const reState = engine.getState();
    if (reState.status === 'playing') {
      expect(reState.collectedKeyIndices).toEqual([0]);
    }

    engine.destroy();
  });

  it('keeps exit locked and rejects level completion if required keys are missing', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 909);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    // Position player right next to exit (9, 8) with exit at (9, 9)
    // No keys collected yet
    (engine as any).playerPos = { row: 9, col: 8 };
    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(9, 8, 9, 9));

    // Move into exit
    engine.move('right');

    // Exit must be locked, level not completed
    expect(engine.getState().status).toBe('locked_exit_feedback');
    expect(engine.getStats().levelsCompleted).toBe(0);

    engine.destroy();
  });

  it('completes level and advances when exit is reached with all required keys', async () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1010);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    // Collect the key
    (engine as any).collectedKeyIndices = [0];

    // Position player at (9, 8) and clear passage to exit (9, 9)
    (engine as any).playerPos = { row: 9, col: 8 };
    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(9, 8, 9, 9));

    // Step into exit
    engine.move('right');

    // Level must complete!
    expect(engine.getState().status).toBe('level_complete');
    expect(engine.getStats().levelsCompleted).toBe(1);

    engine.destroy();
  });
});
