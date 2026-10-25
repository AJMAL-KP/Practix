import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MathBubbleEngine } from '../../src/games/math-bubble/engine';

describe('Math Bubble Rush — Timer & Monotonic Deadline Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts each question with the configured duration and does not reset timer on taps', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 123);

    let state = engine.getState();
    expect(state.status).toBe('playing');
    if (state.status !== 'playing') return;

    // Advance 5 seconds
    vi.advanceTimersByTime(5000);

    const { correctOrderIds } = state.question;
    // Tap first correct bubble
    engine.tapBubble(correctOrderIds[0]);

    // Timer must NOT reset back to 15000ms!
    const remaining = (engine.getState() as any).remainingMs;
    expect(remaining).toBeLessThanOrEqual(10500);
    expect(remaining).toBeGreaterThan(0);

    engine.destroy();
  });

  it('correct completion cancels the timer and prevents later timeout execution', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 234);

    let state = engine.getState();
    if (state.status !== 'playing') return;

    const { correctOrderIds } = state.question;
    engine.tapBubble(correctOrderIds[0]);
    engine.tapBubble(correctOrderIds[1]);
    engine.tapBubble(correctOrderIds[2]);

    expect(engine.getState().status).toBe('question_complete');
    const timedOutBefore = engine.getStats().timedOutQuestions;

    // Advance 350ms (before next question transition at 400ms)
    vi.advanceTimersByTime(350);
    expect(engine.getStats().timedOutQuestions).toBe(timedOutBefore);

    // Cleanly destroy engine to cancel all transitions
    engine.destroy();

    // Advance past original deadline; destroyed engine must not trigger timeout
    vi.advanceTimersByTime(20000);
    expect(engine.getStats().timedOutQuestions).toBe(timedOutBefore);
  });

  it('resolves question as question_timeout exactly once when deadline expires', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 345);

    expect(engine.getState().status).toBe('playing');

    // Advance to deadline
    vi.advanceTimersByTime(15010);

    expect(engine.getState().status).toBe('question_timeout');
    expect(engine.getStats().timedOutQuestions).toBe(1);

    // After the 550ms transition delay, advances to question 1
    vi.advanceTimersByTime(600);
    expect(engine.getState().status).toBe('playing');
    expect(engine.getStats().timedOutQuestions).toBe(1);

    engine.destroy();
  });

  it('authoritatively rejects bubble taps once deadline has passed', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 456);

    const state = engine.getState();
    if (state.status !== 'playing') return;

    const { correctOrderIds } = state.question;

    // Force deadline expiry
    vi.advanceTimersByTime(16000);

    // Attempt late tap
    engine.tapBubble(correctOrderIds[0]);

    // Must not accept late correct tap
    expect(engine.getStats().correctSelections).toBe(0);

    engine.destroy();
  });

  it('starts next question with a fresh 15-second timer', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 567);

    let state = engine.getState();
    if (state.status !== 'playing') return;

    // Complete question 0
    const { correctOrderIds } = state.question;
    engine.tapBubble(correctOrderIds[0]);
    engine.tapBubble(correctOrderIds[1]);
    engine.tapBubble(correctOrderIds[2]);

    // Advance through the 400ms transition delay
    vi.advanceTimersByTime(500);

    // Question 1 should now be active
    const nextState = engine.getState();
    expect(nextState.status).toBe('playing');
    if (nextState.status === 'playing') {
      expect(nextState.questionIndex).toBe(1);
      expect(nextState.remainingMs).toBeLessThanOrEqual(15000);
      expect(nextState.remainingMs).toBeGreaterThan(14000);
    }

    engine.destroy();
  });
});
