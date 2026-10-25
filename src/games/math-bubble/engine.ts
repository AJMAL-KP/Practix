import { SoundController } from '../../core/audio';
import { StorageService } from '../../core/storage';
import { MonotonicTimer } from '../../core/timer';
import { getDifficultyConfig, MathQuestionGenerator } from './generator';
import {
  MathBubbleState,
  MathQuestion,
  MathSessionStats,
} from './types';

/**
 * Pure scoring function:
 * - 100 points per correctly completed question
 * - Subtract 10 points per incorrect tap
 * - 0 points for timed-out question
 * - Clamped at 0 (never negative)
 */
export function calculateMathBubbleScore(
  completedQuestions: number,
  incorrectTaps: number
): number {
  const base = Math.max(0, completedQuestions) * 100;
  const penalty = Math.max(0, incorrectTaps) * 10;
  return Math.max(0, base - penalty);
}

/**
 * Pure accuracy function:
 * (correctSelections / (correctSelections + incorrectTaps)) * 100%
 */
export function calculateMathBubbleAccuracy(
  correctSelections: number,
  incorrectTaps: number
): number {
  const total = correctSelections + incorrectTaps;
  return total > 0 ? Math.round((correctSelections / total) * 100) : 0;
}

export class MathBubbleEngine {
  private questions: MathQuestion[] = [];
  private currentQuestionIndex: number = 0;
  private state: MathBubbleState = { status: 'intro' };
  private timer: MonotonicTimer;
  private questionDurationMs: number = 15000;
  private currentDeadline: number | null = null;
  private questionStartTime: number = 0;
  private sessionCommitted: boolean = false;

  private lastTapBubbleId: string | null = null;
  private lastTapTimestamp: number = 0;

  private stats: MathSessionStats = {
    totalQuestions: 25,
    attemptedQuestions: 0,
    completedQuestions: 0,
    timedOutQuestions: 0,
    correctSelections: 0,
    incorrectTaps: 0,
    totalCountedTaps: 0,
    penaltyPoints: 0,
    totalTimeMs: 0,
    score: 0,
    accuracy: 100,
    highestDifficultyTier: 1,
  };

  private listeners: Array<(state: MathBubbleState) => void> = [];
  private transitionTimerId: number | null = null;

  constructor() {
    this.timer = new MonotonicTimer({
      onTick: (remainingMs) => {
        if (
          this.state.status === 'playing' ||
          this.state.status === 'selection_feedback' ||
          this.state.status === 'correct_feedback'
        ) {
          this.state = {
            ...this.state,
            remainingMs,
          };
          this.notify();
        }
      },
      onTimeout: () => {
        this.handleTimeout();
      },
    });
  }

  subscribe(listener: (state: MathBubbleState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  getState(): MathBubbleState {
    return this.state;
  }

  getStats(): MathSessionStats {
    return { ...this.stats };
  }

  getQuestions(): MathQuestion[] {
    return [...this.questions];
  }

  startSession(customDurationSec?: number, generatorSeed?: number): void {
    this.clearTransition();
    this.timer.stop();
    this.sessionCommitted = false;

    const settings = StorageService.getSettings();
    const durationSec = customDurationSec ?? settings.mathQuestionDurationSec ?? 15;
    this.questionDurationMs = Math.max(5, durationSec) * 1000;

    const generator = new MathQuestionGenerator(generatorSeed);
    this.questions = generator.generateSession();
    this.currentQuestionIndex = 0;

    this.stats = {
      totalQuestions: 25,
      attemptedQuestions: 0,
      completedQuestions: 0,
      timedOutQuestions: 0,
      correctSelections: 0,
      incorrectTaps: 0,
      totalCountedTaps: 0,
      penaltyPoints: 0,
      totalTimeMs: 0,
      score: 0,
      accuracy: 100,
      highestDifficultyTier: 1,
    };

    this.startQuestion(0);
  }

  private startQuestion(index: number): void {
    if (index >= 25) {
      this.finishSession();
      return;
    }

    this.currentQuestionIndex = index;
    const question = this.questions[index];
    this.questionStartTime = performance.now();
    this.currentDeadline = this.questionStartTime + this.questionDurationMs;
    this.stats.attemptedQuestions = index + 1;

    // Track highest difficulty tier reached
    const diff = getDifficultyConfig(index);
    this.stats.highestDifficultyTier = Math.max(this.stats.highestDifficultyTier, diff.tier);

    // Reset rapid tap tracker for new question
    this.lastTapBubbleId = null;
    this.lastTapTimestamp = 0;

    this.state = {
      status: 'playing',
      questionIndex: index,
      question,
      selectedIds: [],
      remainingMs: this.questionDurationMs,
      penaltyCount: 0,
      incorrectBubbleId: null,
    };

    this.timer.start(this.questionDurationMs);
    this.notify();
  }

  tapBubble(bubbleId: string): void {
    // 1. Confirm game is in an active playable state
    if (
      this.state.status !== 'playing' &&
      this.state.status !== 'selection_feedback' &&
      this.state.status !== 'correct_feedback'
    ) {
      return; // Ignore taps during complete, timeout, or result screens
    }

    // 2. Authoritative deadline check: reject tap if deadline has expired
    const now = performance.now();
    if (this.currentDeadline !== null && now >= this.currentDeadline) {
      this.handleTimeout();
      return;
    }

    const { question, selectedIds, penaltyCount } = this.state;

    // 3. Confirm bubble belongs to current question
    const bubble = question.bubbles.find((b) => b.id === bubbleId);
    if (!bubble) {
      return;
    }

    // 4. Repeated taps on already-selected bubbles are ignored
    if (selectedIds.includes(bubbleId)) {
      return;
    }

    // Prevent duplicate event delivery charging multiple penalties from single rapid click
    if (this.lastTapBubbleId === bubbleId && now - this.lastTapTimestamp < 60) {
      return;
    }
    this.lastTapBubbleId = bubbleId;
    this.lastTapTimestamp = now;

    // 5. Compare with smallest value remaining unselected
    const nextExpectedId = question.correctOrderIds[selectedIds.length];

    if (bubbleId === nextExpectedId) {
      // Correct selection
      const newSelected = [...selectedIds, bubbleId];
      this.stats.correctSelections++;
      this.stats.totalCountedTaps++;
      SoundController.playTapCorrect(newSelected.length);

      if (newSelected.length === 3) {
        // All 3 bubbles correctly selected -> Question resolved successfully
        this.timer.stop();
        this.currentDeadline = null;
        const timeSpent = performance.now() - this.questionStartTime;
        this.stats.completedQuestions++;
        this.stats.totalTimeMs += timeSpent;
        SoundController.playQuestionClear();

        this.state = {
          status: 'question_complete',
          questionIndex: this.currentQuestionIndex,
          question,
          selectedIds: newSelected,
          timeSpentMs: timeSpent,
        };
        this.notify();

        this.scheduleTransition(() => {
          this.advanceNextQuestion();
        }, 400);
      } else {
        // Step 1 or 2 correct -> Visual feedback, question remains interactive
        this.state = {
          status: 'playing',
          questionIndex: this.currentQuestionIndex,
          question,
          selectedIds: newSelected,
          remainingMs: this.timer.getRemainingMs(),
          penaltyCount,
          incorrectBubbleId: null,
        };
        this.notify();
      }
    } else {
      // Incorrect tap
      this.stats.incorrectTaps++;
      this.stats.totalCountedTaps++;
      this.stats.penaltyPoints++;
      SoundController.playTapIncorrect();

      const newPenaltyCount = penaltyCount + 1;

      // Transition to selection_feedback (with incorrect type)
      this.state = {
        status: 'selection_feedback',
        questionIndex: this.currentQuestionIndex,
        question,
        selectedIds,
        feedbackId: bubbleId,
        feedbackType: 'incorrect',
        remainingMs: this.timer.getRemainingMs(),
        penaltyCount: newPenaltyCount,
      };
      this.notify();

      // Automatically clear incorrect shake feedback after 350ms, returning to playing
      this.scheduleTransition(() => {
        if (this.state.status === 'selection_feedback') {
          this.state = {
            status: 'playing',
            questionIndex: this.currentQuestionIndex,
            question,
            selectedIds,
            remainingMs: this.timer.getRemainingMs(),
            penaltyCount: newPenaltyCount,
            incorrectBubbleId: null,
          };
          this.notify();
        }
      }, 350);
    }
  }

  handleTimeout(): void {
    if (
      this.state.status !== 'playing' &&
      this.state.status !== 'selection_feedback' &&
      this.state.status !== 'correct_feedback'
    ) {
      return;
    }

    this.timer.stop();
    this.currentDeadline = null;
    this.clearTransition();

    this.stats.timedOutQuestions++;
    this.stats.totalTimeMs += this.questionDurationMs;
    SoundController.playTimeout();

    const question = this.questions[this.currentQuestionIndex];
    const selectedIds = this.state.selectedIds || [];

    this.state = {
      status: 'question_timeout',
      questionIndex: this.currentQuestionIndex,
      question,
      selectedIds,
    };
    this.notify();

    this.scheduleTransition(() => {
      this.advanceNextQuestion();
    }, 550);
  }

  private advanceNextQuestion(): void {
    if (this.currentQuestionIndex + 1 < 25) {
      this.startQuestion(this.currentQuestionIndex + 1);
    } else {
      this.finishSession();
    }
  }

  private finishSession(): void {
    this.timer.stop();
    this.currentDeadline = null;
    this.clearTransition();

    if (this.sessionCommitted) {
      return;
    }
    this.sessionCommitted = true;

    this.stats.accuracy = calculateMathBubbleAccuracy(
      this.stats.correctSelections,
      this.stats.incorrectTaps
    );

    this.stats.score = calculateMathBubbleScore(
      this.stats.completedQuestions,
      this.stats.incorrectTaps
    );

    // Save history record and update high score
    StorageService.addHistoryRecord({
      gameId: 'math-bubble',
      score: this.stats.score,
      completed: this.stats.completedQuestions === 25,
      timeUsedSec: Math.round(this.stats.totalTimeMs / 1000),
      details: {
        completedQuestions: `${this.stats.completedQuestions}/25`,
        accuracy: `${this.stats.accuracy}%`,
        penalties: this.stats.incorrectTaps,
        timeouts: this.stats.timedOutQuestions,
      },
    });

    this.state = {
      status: 'session_complete',
      stats: { ...this.stats },
    };
    this.notify();
  }

  private scheduleTransition(callback: () => void, delayMs: number): void {
    this.clearTransition();
    this.transitionTimerId = setTimeout(() => {
      this.transitionTimerId = null;
      callback();
    }, delayMs) as unknown as number;
  }

  private clearTransition(): void {
    if (this.transitionTimerId !== null) {
      clearTimeout(this.transitionTimerId);
      this.transitionTimerId = null;
    }
  }

  replay(): void {
    this.startSession(this.questionDurationMs / 1000);
  }

  destroy(): void {
    this.timer.stop();
    this.clearTransition();
    this.currentDeadline = null;
    this.listeners = [];
  }
}
