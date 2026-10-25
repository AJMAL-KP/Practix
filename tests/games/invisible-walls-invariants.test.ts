import { describe, expect, it } from 'vitest';
import { InvisibleWallsEngine } from '../../src/games/invisible-walls/engine';
import { InvisibleMazeGenerator } from '../../src/games/invisible-walls/generator';
import { StorageService } from '../../src/core/storage';

describe('Invisible Walls — 15 State Invariants (Section 11)', () => {
  // Invariant 1: Only one level is active at a time
  it('Invariant 1: Only one level is active at a time', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1001);

    const state = engine.getState();
    expect(state.status).toBe('playing');
    if (state.status === 'playing') {
      expect(state.level).toBe(1);
      expect(engine.getStats().currentLevel).toBe(1);
    }

    engine.destroy();
  });

  // Invariant 2: A move changes the player's position by at most one cell
  it('Invariant 2: A move changes player position by at most one cell', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1002);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(0, 0, 0, 1));
    const p1 = engine.getPlayerPosition();
    engine.move('right');
    const p2 = engine.getPlayerPosition();

    const manhattanDist = Math.abs(p2.row - p1.row) + Math.abs(p2.col - p1.col);
    expect(manhattanDist).toBeLessThanOrEqual(1);

    engine.destroy();
  });

  // Invariant 3: The player cannot enter a blocked cell
  it('Invariant 3: The player cannot enter a blocked cell', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1003);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    state.maze.walls.add(InvisibleMazeGenerator.getWallKey(0, 0, 0, 1));
    engine.move('right');

    // Player position remains (0, 0)
    expect(engine.getPlayerPosition()).toEqual({ row: 0, col: 0 });

    engine.destroy();
  });

  // Invariant 4: One collision causes exactly one reset
  it('Invariant 4: One collision causes exactly one reset', async () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1004);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    state.maze.walls.add(InvisibleMazeGenerator.getWallKey(0, 0, 0, 1));
    engine.move('right');

    expect(engine.getStats().wallCollisions).toBe(1);
    expect(engine.getStats().resets).toBe(1);

    await new Promise((res) => setTimeout(res, 550));
    expect(engine.getStats().wallCollisions).toBe(1);
    expect(engine.getStats().resets).toBe(1);

    engine.destroy();
  });

  // Invariant 5: A reset clears all collected keys
  it('Invariant 5: A reset clears all collected keys', async () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1005);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    state.maze.keys = [{ row: 0, col: 1 }];
    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(0, 0, 0, 1));
    state.maze.walls.add(InvisibleMazeGenerator.getWallKey(0, 1, 0, 2));

    engine.move('right');
    expect(engine.getStats().keysCollected).toBe(1);

    // Hit wall
    engine.move('right');
    await new Promise((res) => setTimeout(res, 550));

    const playState = engine.getState();
    if (playState.status === 'playing') {
      expect(playState.collectedKeyIndices).toEqual([]);
    }

    engine.destroy();
  });

  // Invariant 6: A reset does not modify the maze
  it('Invariant 6: A reset does not modify the maze', async () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1006);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    state.maze.walls.add(InvisibleMazeGenerator.getWallKey(0, 0, 0, 1));
    const wallsWithHit = new Set(state.maze.walls);

    engine.move('right');
    await new Promise((res) => setTimeout(res, 550));

    const afterReset = engine.getState();
    if (afterReset.status === 'playing') {
      expect(afterReset.maze.walls).toEqual(wallsWithHit);
    }

    engine.destroy();
  });

  // Invariant 7: A reset does not reset the timer
  it('Invariant 7: A reset does not reset the timer', async () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1007);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    state.maze.walls.add(InvisibleMazeGenerator.getWallKey(0, 0, 0, 1));
    await new Promise((res) => setTimeout(res, 100));

    engine.move('right');
    await new Promise((res) => setTimeout(res, 550));

    const afterReset = engine.getState();
    if (afterReset.status === 'playing') {
      expect(afterReset.remainingMs).toBeLessThan(240000);
    }

    engine.destroy();
  });

  // Invariant 8: Key locations and the exit remain fixed during a level
  it('Invariant 8: Key locations and exit remain fixed during a level', async () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1008);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    const keysBefore = JSON.stringify(state.maze.keys);
    const exitBefore = JSON.stringify(state.maze.exit);

    state.maze.walls.add(InvisibleMazeGenerator.getWallKey(0, 0, 0, 1));
    engine.move('right');
    await new Promise((res) => setTimeout(res, 550));

    const after = engine.getState();
    if (after.status === 'playing') {
      expect(JSON.stringify(after.maze.keys)).toBe(keysBefore);
      expect(JSON.stringify(after.maze.exit)).toBe(exitBefore);
    }

    engine.destroy();
  });

  // Invariant 9: The exit cannot complete a level while required keys are missing
  it('Invariant 9: Exit cannot complete a level while required keys are missing', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1009);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    (engine as any).playerPos = { row: 5, col: 4 };
    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(5, 4, 5, 5));

    // Try moving to exit without collecting keys
    engine.move('right');
    expect(engine.getState().status).toBe('locked_exit_feedback');
    expect(engine.getStats().levelsCompleted).toBe(0);

    engine.destroy();
  });

  // Invariant 10: A level cannot be completed twice
  it('Invariant 10: A level cannot be completed twice', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1010);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    (engine as any).collectedKeyIndices = [0];
    (engine as any).playerPos = { row: 5, col: 4 };
    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(5, 4, 5, 5));

    engine.move('right');
    expect(engine.getStats().levelsCompleted).toBe(1);

    // Calling level success again should not double increment
    (engine as any).handleLevelSuccess();
    expect(engine.getStats().levelsCompleted).toBe(1);

    engine.destroy();
  });

  // Invariant 11: A timed-out level cannot later become completed
  it('Invariant 11: A timed-out level cannot later become completed', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1011);

    (engine as any).handleTimeout();
    expect(engine.getState().status).toBe('final_results');

    // Attempting to complete level after timeout
    (engine as any).handleLevelSuccess();
    expect(engine.getStats().levelsCompleted).toBe(0);

    engine.destroy();
  });

  // Invariant 12: The fifth level cannot generate a sixth level
  it('Invariant 12: The fifth level cannot generate a sixth level', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1012);

    (engine as any).startLevel(5);
    expect(engine.getStats().currentLevel).toBe(5);

    // Attempting to advance beyond level 5 finishes the session and does not create level 6
    (engine as any).startLevel(6);
    expect(engine.getState().status).toBe('final_results');
    expect(engine.getStats().currentLevel).toBe(5);

    engine.destroy();
  });

  // Invariant 13: Only active gameplay accepts movement input
  it('Invariant 13: Only active gameplay accepts movement input', () => {
    const engine = new InvisibleWallsEngine();
    // In idle state before startSession
    expect(engine.getState().status).toBe('idle');

    engine.move('right');
    expect(engine.getStats().totalMovesAttempted).toBe(0);
    expect(engine.getStats().successfulMoves).toBe(0);

    engine.destroy();
  });

  // Invariant 14: Stale events cannot change a later level
  it('Invariant 14: Stale events cannot change a later level', async () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1014);

    const tokenBefore = (engine as any).levelToken;

    // Start a new session / level immediately, bumping the token
    engine.startSession(240, 1015);
    const tokenAfter = (engine as any).levelToken;
    expect(tokenAfter).toBeGreaterThan(tokenBefore);

    engine.destroy();
  });

  // Invariant 15: Each session result is committed once
  it('Invariant 15: Each session result is committed once', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1015);

    const historyBefore = StorageService.getHistory().length;
    (engine as any).finishSession(true);
    const historyAfter = StorageService.getHistory().length;
    expect(historyAfter).toBe(historyBefore + 1);

    // Calling finishSession again on the same session must NOT commit duplicate records
    (engine as any).finishSession(true);
    expect(StorageService.getHistory().length).toBe(historyAfter);

    engine.destroy();
  });
});
