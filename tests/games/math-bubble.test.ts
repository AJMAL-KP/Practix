import { describe, expect, it } from 'vitest';
import { MathBubbleEngine } from '../../src/games/math-bubble/engine';
import { MathQuestionGenerator } from '../../src/games/math-bubble/generator';

describe('Math Bubble Rush', () => {
  it('generates 25 questions with 3 unique bubbles per question', () => {
    const generator = new MathQuestionGenerator(42);
    const session = generator.generateSession();

    expect(session.length).toBe(25);

    for (const q of session) {
      expect(q.bubbles.length).toBe(3);
      expect(q.correctOrderIds.length).toBe(3);

      // Verify no duplicates
      const v0 = q.bubbles[0].value;
      const v1 = q.bubbles[1].value;
      const v2 = q.bubbles[2].value;

      expect(v0.equals(v1)).toBe(false);
      expect(v0.equals(v2)).toBe(false);
      expect(v1.equals(v2)).toBe(false);

      // Verify correct order matches ascending values
      const b0 = q.bubbles.find((b) => b.id === q.correctOrderIds[0])!;
      const b1 = q.bubbles.find((b) => b.id === q.correctOrderIds[1])!;
      const b2 = q.bubbles.find((b) => b.id === q.correctOrderIds[2])!;

      expect(b0.value.lessThan(b1.value)).toBe(true);
      expect(b1.value.lessThan(b2.value)).toBe(true);
    }
  });

  it('correctly processes ascending bubble taps and advances question', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 12345);

    const state = engine.getState();
    expect(state.status).toBe('playing');
    if (state.status !== 'playing') return;

    const { correctOrderIds } = state.question;

    // Tap first correct bubble
    engine.tapBubble(correctOrderIds[0]);
    expect(engine.getState().status).toBe('playing');
    if (engine.getState().status === 'playing') {
      expect((engine.getState() as any).selectedIds).toEqual([correctOrderIds[0]]);
    }

    // Tap second correct bubble
    engine.tapBubble(correctOrderIds[1]);
    if (engine.getState().status === 'playing') {
      expect((engine.getState() as any).selectedIds).toEqual([correctOrderIds[0], correctOrderIds[1]]);
    }

    // Tap third correct bubble
    engine.tapBubble(correctOrderIds[2]);
    const completedState = engine.getState();
    expect(completedState.status).toBe('question_complete');
    expect(engine.getStats().completedQuestions).toBe(1);

    engine.destroy();
  });

  it('rejects incorrect taps, increments penalty, and keeps question active', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 999);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    const { correctOrderIds } = state.question;

    // Tapping the highest bubble first is incorrect (it should be lowest first)
    engine.tapBubble(correctOrderIds[2]);

    expect(engine.getStats().incorrectTaps).toBe(1);
    expect(engine.getState().status).toBe('selection_feedback');

    engine.destroy();
  });
});
