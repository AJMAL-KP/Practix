import { describe, expect, it } from 'vitest';
import { MathBubbleEngine } from '../../src/games/math-bubble/engine';
import { RotatePathEngine } from '../../src/games/rotate-path/engine';
import { InvisibleWallsEngine } from '../../src/games/invisible-walls/engine';

describe('State Machine Transitions and Invariant Protections', () => {
  it('MathBubbleEngine ignores taps after question completion or timeout', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 111);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    const { correctOrderIds } = state.question;
    engine.tapBubble(correctOrderIds[0]);
    engine.tapBubble(correctOrderIds[1]);
    engine.tapBubble(correctOrderIds[2]);

    expect(engine.getState().status).toBe('evaluation_feedback');

    // Attempting further taps while question is completing should have no effect
    engine.tapBubble(correctOrderIds[0]);
    expect(engine.getState().status).toBe('evaluation_feedback');

    engine.destroy();
  });

  it('RotatePathEngine prevents transformations while path is being tested', () => {
    const engine = new RotatePathEngine();
    engine.startSession(240, 222);

    expect(engine.getState().status).toBe('playing');
    engine.testPath();

    // Now state is testing_path
    expect(engine.getState().status).toBe('testing_path');

    // Rotations should be ignored during testing
    const rotBefore = engine.getStats().rotations;
    engine.rotateSelected();
    expect(engine.getStats().rotations).toBe(rotBefore);

    engine.destroy();
  });

  it('InvisibleWallsEngine prevents moves while in wall collision feedback', () => {
    const engine = new InvisibleWallsEngine();
    engine.startSession(240, 333);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    // Force a wall
    state.maze.walls.add('0,0-0,1');
    engine.move('right');

    expect(engine.getState().status).toBe('wall_collision');

    // Subsequent rapid moves must be ignored while resetting
    const colBefore = engine.getStats().wallCollisions;
    engine.move('up');
    expect(engine.getStats().wallCollisions).toBe(colBefore);

    engine.destroy();
  });
});
