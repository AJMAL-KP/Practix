import { describe, expect, it } from 'vitest';
import { StorageService } from '../../src/core/storage';
import {
  calculateMathBubbleAccuracy,
  calculateMathBubbleScore,
  MathBubbleEngine,
} from '../../src/games/math-bubble/engine';

describe('Math Bubble Rush — Session & Scoring Tests', () => {
  it('pure scoring formula accurately calculates score and never falls below zero', () => {
    // 25 completed, 0 incorrect = 2500
    expect(calculateMathBubbleScore(25, 0)).toBe(2500);

    // 10 completed, 2 incorrect = 1000 - 20 = 980
    expect(calculateMathBubbleScore(10, 2)).toBe(980);

    // 0 completed, 5 incorrect = 0 (never negative)
    expect(calculateMathBubbleScore(0, 5)).toBe(0);

    // 1 completed, 20 incorrect = 100 - 200 = -100 -> clamped to 0
    expect(calculateMathBubbleScore(1, 20)).toBe(0);

    // Negative parameters handled safely
    expect(calculateMathBubbleScore(-5, -2)).toBe(0);
  });

  it('pure accuracy calculation correctly computes percentage', () => {
    expect(calculateMathBubbleAccuracy(75, 0)).toBe(100);
    expect(calculateMathBubbleAccuracy(60, 20)).toBe(75);
    expect(calculateMathBubbleAccuracy(0, 0)).toBe(0);
  });

  it('session contains exactly 25 question slots and ends after question 25', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 8888);

    const questions = engine.getQuestions();
    expect(questions.length).toBe(25);

    // Fast-complete all 25 questions
    for (let q = 0; q < 25; q++) {
      const state = engine.getState();
      if (state.status !== 'playing') break;

      const { correctOrderIds } = state.question;
      engine.tapBubble(correctOrderIds[0]);
      engine.tapBubble(correctOrderIds[1]);
      engine.tapBubble(correctOrderIds[2]);

      // Manually trigger immediate timeout of transition timer to fast-forward in test
      (engine as any).advanceNextQuestion();
    }

    expect(engine.getState().status).toBe('session_complete');
    expect(engine.getStats().completedQuestions).toBe(25);
    expect(engine.getStats().totalQuestions).toBe(25);
    expect(engine.getStats().score).toBe(2500);

    engine.destroy();
  });

  it('timed out questions award zero completion points', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 9999);

    // Question 0 times out
    engine.handleTimeout();
    (engine as any).advanceNextQuestion();

    // Question 1 completed correctly
    const state = engine.getState();
    if (state.status === 'playing') {
      const { correctOrderIds } = state.question;
      engine.tapBubble(correctOrderIds[0]);
      engine.tapBubble(correctOrderIds[1]);
      engine.tapBubble(correctOrderIds[2]);
    }

    expect(engine.getStats().completedQuestions).toBe(1);
    expect(engine.getStats().timedOutQuestions).toBe(1);

    engine.destroy();
  });

  it('replay completely resets session counters and generates fresh challenge', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 1111);

    const state = engine.getState();
    if (state.status === 'playing') {
      // Tap incorrect once
      engine.tapBubble(state.question.correctOrderIds[2]);
    }
    expect(engine.getStats().incorrectTaps).toBe(1);

    // Trigger replay
    engine.replay();

    expect(engine.getState().status).toBe('playing');
    expect(engine.getStats().incorrectTaps).toBe(0);
    expect(engine.getStats().completedQuestions).toBe(0);
    expect(engine.getStats().score).toBe(0);

    engine.destroy();
  });

  it('session results are stored in local storage and persist', () => {
    const engine = new MathBubbleEngine();
    engine.startSession(15, 1212);

    // Finish session directly
    (engine as any).finishSession();

    expect(engine.getState().status).toBe('session_complete');
    const history = StorageService.getHistory();
    const latest = history[history.length - 1];

    expect(latest).toBeDefined();
    expect(latest.gameId).toBe('math-bubble');

    engine.destroy();
  });
});
