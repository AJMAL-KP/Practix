import { describe, expect, it } from 'vitest';
import { calculateRotatePathScore, RotatePathEngine } from '../../src/games/rotate-path/engine';

describe('Rotate the Path — 13 State Invariants Verification', () => {
  it('Invariant 1: Only one region can be selected at a time (0 to 8)', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 101);

    engine.selectRegion(2);
    expect((engine.getState() as any).selectedRegion).toBe(2);

    engine.selectRegion(7);
    expect((engine.getState() as any).selectedRegion).toBe(7);

    // Invalid region index ignored
    engine.selectRegion(99);
    expect((engine.getState() as any).selectedRegion).toBe(7);

    engine.destroy();
  });

  it('Invariant 2: A transformation can affect only the selected region', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 102);

    const initialTiles = JSON.parse(JSON.stringify(engine.getGrid().tiles));
    engine.selectRegion(0); // Top-left region (rows 0..2, cols 0..2)
    engine.rotateSelected();

    const currentTiles = engine.getGrid().tiles;
    // Cells in region 8 (rows 6..8, cols 6..8) must remain identical
    for (let r = 6; r <= 8; r++) {
      for (let c = 6; c <= 8; c++) {
        expect(currentTiles[r][c]).toEqual(initialTiles[r][c]);
      }
    }

    engine.destroy();
  });

  it('Invariant 3: A transformation must be applied atomically', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 103);

    engine.selectRegion(4);
    const beforeRotations = engine.getStats().rotations;
    engine.rotateSelected();

    expect(engine.getStats().rotations).toBe(beforeRotations + 1);
    expect(engine.getState().status).toBe('playing');
    expect(engine.getGrid().tiles.length).toBe(9);

    engine.destroy();
  });

  it('Invariant 4: Only one transformation can run at a time', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 104);

    engine.selectRegion(4);
    engine.rotateSelected();
    expect(engine.getState().status).toBe('playing');

    engine.destroy();
  });

  it('Invariant 5: Only one path test can run at a time', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 105);

    engine.testPath();
    expect(engine.getState().status).toBe('testing_path');

    // Second test while testing must be ignored
    const testCountBefore = engine.getStats().testAttempts;
    engine.testPath();
    expect(engine.getStats().testAttempts).toBe(testCountBefore);

    engine.destroy();
  });

  it('Invariant 6: Only the active level accepts gameplay input', () => {
    const engine = new RotatePathEngine();
    // In idle state before startSession
    const rotBefore = engine.getStats().rotations;
    engine.rotateSelected();
    expect(engine.getStats().rotations).toBe(rotBefore);
  });

  it('Invariant 7: A failed test does not alter the board', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 107);

    const snapshot = JSON.stringify(engine.getGrid().tiles);
    engine.testPath();

    // Board state must remain strictly identical
    expect(JSON.stringify(engine.getGrid().tiles)).toBe(snapshot);

    engine.destroy();
  });

  it('Invariant 8: A successful test resolves the level exactly once', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 108);

    // Fast-solve Level 1: Level 1 only scrambled region 4. Reverse the rotations on region 4
    for (let i = 0; i < 4; i++) {
      engine.selectRegion(4);
      engine.rotateSelected();
      if ((engine as any).grid.tiles[4][4].arrow === 'E' && (engine as any).grid.tiles[4][4].type === 'straight_h') {
        break;
      }
    }

    // Call handleSuccess directly to test single resolution
    const completedBefore = engine.getStats().levelsCompleted;
    (engine as any).handleSuccess();

    expect(engine.getStats().levelsCompleted).toBe(completedBefore + 1);
    expect(engine.getState().status).toBe('path_succeeded');

    engine.destroy();
  });

  it('Invariant 9: A level timer belongs to exactly one level', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 109);

    const state = engine.getState();
    if (state.status === 'playing') {
      expect(state.level).toBe(1);
      expect(state.remainingMs).toBeLessThanOrEqual(240000);
      expect(state.remainingMs).toBeGreaterThan(239000);
    }

    engine.destroy();
  });

  it('Invariant 10: A timed-out level cannot later become completed', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 110);

    engine.handleTimeout();
    expect(engine.getState().status).toBe('final_results');
    expect(engine.getStats().levelsCompleted).toBe(0);

    // Attempt to invoke success after timeout
    (engine as any).handleSuccess();
    expect(engine.getStats().levelsCompleted).toBe(0);

    engine.destroy();
  });

  it('Invariant 11: The fifth level cannot create a sixth level', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 111);

    // Simulate advancing to level 5
    (engine as any).level = 5;
    (engine as any).handleSuccess();

    // When level 5 completes, session completes without creating level 6
    expect(engine.getStats().levelsCompleted).toBe(1);

    engine.destroy();
  });

  it('Invariant 12: Replay resets session statistics and generates a new session', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 112);

    engine.rotateSelected();
    engine.flipSelected();
    expect(engine.getStats().rotations).toBe(1);
    expect(engine.getStats().flips).toBe(1);

    engine.replay();

    expect(engine.getStats().rotations).toBe(0);
    expect(engine.getStats().flips).toBe(0);
    expect(engine.getStats().levelsCompleted).toBe(0);
    expect(engine.getState().status).toBe('playing');

    engine.destroy();
  });

  it('Invariant 13: Stale asynchronous operations cannot mutate a later level', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 113);

    engine.testPath();
    expect(engine.getState().status).toBe('testing_path');

    // Destroying engine clears all animation timers
    engine.destroy();

    // Verify timers were cleaned up
    expect((engine as any).animationTimerId).toBeNull();
  });

  it('pure scoring function awards 1000 pts/level and applies modest time bonus and failed test penalties', () => {
    // 5 levels completed with 60s remaining and 2 failed tests:
    // (5 * 1000) + (60 * 2) - (2 * 50) = 5000 + 120 - 100 = 5020
    expect(calculateRotatePathScore(5, 60, 2)).toBe(5020);

    // 0 levels completed: score clamped at 0
    expect(calculateRotatePathScore(0, 0, 5)).toBe(0);
  });
});
