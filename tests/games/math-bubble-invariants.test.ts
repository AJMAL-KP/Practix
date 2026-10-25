import { describe, expect, it } from 'vitest';
import { StorageService } from '../../src/core/storage';
import { MathBubbleEngine } from '../../src/games/math-bubble/engine';

describe('Math Bubble Rush — 12 State Invariants Verification', () => {
  it('Invariant 1: A session contains exactly 25 question slots', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 1001);
    expect(engine.getQuestions().length).toBe(25);
    expect(engine.getStats().totalQuestions).toBe(25);
    engine.destroy();
  });

  it('Invariant 2: A question has exactly three bubbles', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 1002);
    for (const q of engine.getQuestions()) {
      expect(q.bubbles.length).toBe(3);
      expect(q.correctOrderIds.length).toBe(3);
    }
    engine.destroy();
  });

  it('Invariant 3: Only one question is active at a time', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 1003);
    const state = engine.getState();
    expect(state.status).toBe('playing');
    if (state.status === 'playing') {
      expect(state.questionIndex).toBe(0);
      expect(state.question.index).toBe(0);
    }
    engine.destroy();
  });

  it('Invariant 4: A bubble can be correctly selected at most once per question', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 1004);
    const state = engine.getState();
    if (state.status !== 'playing') return;

    const { correctOrderIds } = state.question;
    engine.tapBubble(correctOrderIds[0]);
    const correctBefore = engine.getStats().correctSelections;

    // Tap again
    engine.tapBubble(correctOrderIds[0]);
    expect(engine.getStats().correctSelections).toBe(correctBefore);
    engine.destroy();
  });

  it('Invariant 5: The expected next value is always the smallest unselected value', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 1005);
    const state = engine.getState();
    if (state.status !== 'playing') return;

    const { correctOrderIds, bubbles } = state.question;
    const b0 = bubbles.find((b) => b.id === correctOrderIds[0])!;
    const b1 = bubbles.find((b) => b.id === correctOrderIds[1])!;
    const b2 = bubbles.find((b) => b.id === correctOrderIds[2])!;

    expect(b0.value.lessThan(b1.value)).toBe(true);
    expect(b1.value.lessThan(b2.value)).toBe(true);

    engine.destroy();
  });

  it('Invariant 6: Incorrect selections never advance the expected value', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 1006);
    const state = engine.getState();
    if (state.status !== 'playing') return;

    const { correctOrderIds } = state.question;
    // Tap 3 bubbles in incorrect order
    engine.tapBubble(correctOrderIds[1]);
    engine.tapBubble(correctOrderIds[0]);
    engine.tapBubble(correctOrderIds[2]);

    expect(engine.getStats().completedQuestions).toBe(0);
    expect(engine.getStats().incorrectTaps).toBe(1);
    expect(engine.getStats().wrongQuestions?.length).toBe(1);

    engine.destroy();
  });

  it('Invariant 7: A resolved question cannot be resolved again', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 1007);
    const state = engine.getState();
    if (state.status !== 'playing') return;

    const { correctOrderIds } = state.question;
    engine.tapBubble(correctOrderIds[0]);
    engine.tapBubble(correctOrderIds[1]);
    engine.tapBubble(correctOrderIds[2]);

    expect(engine.getState().status).toBe('evaluation_feedback');
    const compBefore = engine.getStats().completedQuestions;

    // Late taps must not resolve again
    engine.tapBubble(correctOrderIds[2]);
    expect(engine.getStats().completedQuestions).toBe(compBefore);

    engine.destroy();
  });

  it('Invariant 8: Only an active question accepts bubble input', () => {
    const engine = new MathBubbleEngine();
    // In idle / intro state before startSession
    const countBefore = engine.getStats().totalCountedTaps;
    engine.tapBubble('bubble_0');
    expect(engine.getStats().totalCountedTaps).toBe(countBefore);
  });

  it('Invariant 9: A timed-out question cannot accept a late correct answer', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 1009);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    const { correctOrderIds } = state.question;
    engine.handleTimeout();

    // Now timed out
    expect(engine.getState().status).toBe('question_timeout');
    engine.tapBubble(correctOrderIds[0]);
    expect(engine.getStats().correctSelections).toBe(0);

    engine.destroy();
  });

  it('Invariant 10: No question is generated after question 25', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 1010);

    for (let i = 0; i < 25; i++) {
      const s = engine.getState();
      if (s.status === 'playing') {
        const { correctOrderIds } = s.question;
        engine.tapBubble(correctOrderIds[0]);
        engine.tapBubble(correctOrderIds[1]);
        engine.tapBubble(correctOrderIds[2]);
      }
      (engine as any).advanceNextQuestion();
    }

    expect(engine.getState().status).toBe('session_complete');
    // Cannot advance past 25
    (engine as any).advanceNextQuestion();
    expect(engine.getState().status).toBe('session_complete');

    engine.destroy();
  });

  it('Invariant 11: Only one session result is committed per run', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 1011);

    const countBefore = StorageService.getHistory().length;
    (engine as any).finishSession();
    expect(StorageService.getHistory().length).toBe(countBefore + 1);

    // Redundant call must not commit duplicate record
    (engine as any).finishSession();
    expect(StorageService.getHistory().length).toBe(countBefore + 1);

    engine.destroy();
  });

  it('Invariant 12: Replay resets all session counters and creates fresh challenges', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 1012);

    const s = engine.getState();
    if (s.status === 'playing') {
      engine.tapBubble(s.question.correctOrderIds[0]);
      engine.tapBubble(s.question.correctOrderIds[2]); // incorrect
      engine.tapBubble(s.question.correctOrderIds[1]); // complete 3 bubbles
    }

    expect(engine.getStats().incorrectTaps).toBe(1);

    engine.replay();

    expect(engine.getStats().correctSelections).toBe(0);
    expect(engine.getStats().incorrectTaps).toBe(0);
    expect(engine.getStats().completedQuestions).toBe(0);
    expect(engine.getStats().score).toBe(0);
    expect(engine.getState().status).toBe('playing');

    engine.destroy();
  });
});
