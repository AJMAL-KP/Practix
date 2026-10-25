import { describe, expect, it } from 'vitest';
import { MathBubbleEngine } from '../../src/games/math-bubble/engine';

describe('Math Bubble Rush — Selection & State Transition Tests', () => {
  it('strictly advances selection index on correct ascending taps', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 555);

    const state = engine.getState();
    expect(state.status).toBe('playing');
    if (state.status !== 'playing') return;

    const { correctOrderIds } = state.question;

    // First tap: lowest bubble
    engine.tapBubble(correctOrderIds[0]);
    let curr = engine.getState() as any;
    expect(curr.selectedIds).toEqual([correctOrderIds[0]]);
    expect(engine.getStats().correctSelections).toBe(1);

    // Second tap: middle bubble
    engine.tapBubble(correctOrderIds[1]);
    curr = engine.getState() as any;
    expect(curr.selectedIds).toEqual([correctOrderIds[0], correctOrderIds[1]]);
    expect(engine.getStats().correctSelections).toBe(2);

    // Third tap: highest bubble -> completes question
    engine.tapBubble(correctOrderIds[2]);
    expect(engine.getState().status).toBe('question_complete');
    expect(engine.getStats().correctSelections).toBe(3);
    expect(engine.getStats().completedQuestions).toBe(1);

    engine.destroy();
  });

  it('incorrect tap increments penalty counter without advancing expected selection', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 666);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    const { correctOrderIds } = state.question;

    // Tap highest bubble first (wrong)
    engine.tapBubble(correctOrderIds[2]);

    expect(engine.getStats().incorrectTaps).toBe(1);
    expect(engine.getStats().penaltyPoints).toBe(1);
    expect(engine.getStats().correctSelections).toBe(0);

    // Question must still be solvable with the original lowest bubble
    engine.tapBubble(correctOrderIds[0]);
    const curr = engine.getState() as any;
    expect(curr.selectedIds).toEqual([correctOrderIds[0]]);
    expect(engine.getStats().correctSelections).toBe(1);

    engine.destroy();
  });

  it('repeated taps on already-selected bubbles are ignored without penalty', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 777);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    const { correctOrderIds } = state.question;

    // Correctly tap first bubble
    engine.tapBubble(correctOrderIds[0]);
    const incorrectBefore = engine.getStats().incorrectTaps;
    const actionsBefore = engine.getStats().totalCountedTaps;

    // Repeated taps on the same already-selected bubble
    engine.tapBubble(correctOrderIds[0]);
    engine.tapBubble(correctOrderIds[0]);

    // Ignored! No extra penalties, no extra counted actions
    expect(engine.getStats().incorrectTaps).toBe(incorrectBefore);
    expect(engine.getStats().totalCountedTaps).toBe(actionsBefore);

    engine.destroy();
  });

  it('ignores all taps once question is resolved (question_complete)', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 888);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    const { correctOrderIds } = state.question;
    engine.tapBubble(correctOrderIds[0]);
    engine.tapBubble(correctOrderIds[1]);
    engine.tapBubble(correctOrderIds[2]);

    expect(engine.getState().status).toBe('question_complete');
    const statsBefore = { ...engine.getStats() };

    // Attempt late taps
    engine.tapBubble(correctOrderIds[0]);
    engine.tapBubble(correctOrderIds[1]);
    engine.tapBubble('non_existent_bubble');

    expect(engine.getState().status).toBe('question_complete');
    expect(engine.getStats().totalCountedTaps).toBe(statsBefore.totalCountedTaps);
    expect(engine.getStats().incorrectTaps).toBe(statsBefore.incorrectTaps);

    engine.destroy();
  });

  it('ignores taps on invalid/non-existent bubble IDs', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 999);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    const countBefore = engine.getStats().totalCountedTaps;
    engine.tapBubble('bubble_ghost_404');
    expect(engine.getStats().totalCountedTaps).toBe(countBefore);

    engine.destroy();
  });
});
