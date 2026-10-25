import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RotatePathEngine } from '../../src/games/rotate-path/engine';

describe('Rotate the Path — Timer & Lifecycle Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts each level with 240 seconds default duration', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 111);

    const state = engine.getState();
    expect(state.status).toBe('playing');
    if (state.status === 'playing') {
      expect(state.remainingMs).toBe(240000);
      expect(state.level).toBe(1);
    }

    engine.destroy();
  });

  it('timer does not reset after a failed path test attempt', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 222);

    // Advance 30 seconds
    vi.advanceTimersByTime(30000);

    // Run test path (which fails on scrambled board)
    engine.testPath();

    // Advance through the test path animation steps
    vi.advanceTimersByTime(500);

    // State is path_failed or playing
    const state = engine.getState();
    expect(state.status).toBe('path_failed');
    if (state.status === 'path_failed') {
      // Remaining time must NOT reset to 240,000ms!
      expect(state.remainingMs).toBeLessThanOrEqual(210500);
      expect(state.remainingMs).toBeGreaterThan(180000);
    }

    engine.destroy();
  });

  it('timeout resolves session and transitions to final_results', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 333);

    // Advance 241 seconds
    vi.advanceTimersByTime(241000);

    expect(engine.getState().status).toBe('final_results');
    expect(engine.getStats().levelsCompleted).toBe(0);

    engine.destroy();
  });

  it('rejects transformations and path tests after timeout', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 444);

    // Force timeout
    vi.advanceTimersByTime(241000);
    expect(engine.getState().status).toBe('final_results');

    const rotBefore = engine.getStats().rotations;
    engine.rotateSelected();
    expect(engine.getStats().rotations).toBe(rotBefore);

    const testBefore = engine.getStats().testAttempts;
    engine.testPath();
    expect(engine.getStats().testAttempts).toBe(testBefore);

    engine.destroy();
  });
});
