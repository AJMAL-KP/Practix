import { describe, expect, it } from 'vitest';
import { InvisibleWallsEngine } from '../../src/games/invisible-walls/engine';
import { InvisibleMazeGenerator } from '../../src/games/invisible-walls/generator';

describe('Invisible Walls — Timer and Lifecycle Rules', () => {
  it('initializes level with default duration of 240 seconds (or configured duration)', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1111);

    const state = engine.getState();
    expect(state.status).toBe('playing');
    if (state.status === 'playing') {
      expect(state.remainingMs).toBeGreaterThan(239000);
      expect(state.remainingMs).toBeLessThanOrEqual(240000);
    }

    engine.destroy();
  });

  it('timer continues running and does NOT reset upon wall collision', async () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1212);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    // Place wall right in front of player
    state.maze.walls.add(InvisibleMazeGenerator.getWallKey(0, 0, 0, 1));

    // Wait 100ms
    await new Promise((res) => setTimeout(res, 100));

    // Move into wall
    engine.move('right');
    expect(engine.getState().status).toBe('wall_collision');

    // Wait for reset to finish
    await new Promise((res) => setTimeout(res, 550));

    const afterResetState = engine.getState();
    expect(afterResetState.status).toBe('playing');
    if (afterResetState.status === 'playing') {
      // Remaining time must be less than 240,000ms (timer was NOT restored back to 240s)
      expect(afterResetState.remainingMs).toBeLessThan(240000);
    }

    engine.destroy();
  });

  it('starts fresh level timer when advancing to next level', async () => {
    const engine = new InvisibleWallsEngine();
    // 30 seconds level duration
    engine.startSession(30, 1313);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    // Collect key and step onto exit
    (engine as any).collectedKeyIndices = [0];
    (engine as any).playerPos = { row: 5, col: 4 };
    state.maze.walls.delete(InvisibleMazeGenerator.getWallKey(5, 4, 5, 5));

    engine.move('right');
    expect(engine.getState().status).toBe('level_complete');

    // Wait for level transition to Level 2
    await new Promise((res) => setTimeout(res, 1800));

    const l2State = engine.getState();
    expect(l2State.status).toBe('playing');
    if (l2State.status === 'playing') {
      expect(l2State.level).toBe(2);
      // New level receives fresh timer!
      expect(l2State.remainingMs).toBeGreaterThanOrEqual(28000);
    }

    engine.destroy();
  });

  it('handles timeout and terminates level safely ignoring subsequent inputs', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 1414);

    // Trigger timeout directly
    (engine as any).handleTimeout();

    const state = engine.getState();
    expect(state.status).toBe('final_results');

    // Subsequent movement attempts must be completely ignored
    const movesBefore = engine.getStats().totalMovesAttempted;
    engine.move('right');
    expect(engine.getStats().totalMovesAttempted).toBe(movesBefore);

    engine.destroy();
  });
});
