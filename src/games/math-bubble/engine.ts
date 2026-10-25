import { SoundController } from '../../core/audio';
import { StorageService } from '../../core/storage';
import { MonotonicTimer } from '../../core/timer';
import { getDifficultyConfig, MathQuestionGenerator } from './generator';
import {
  MathBubbleState,
  MathQuestion,
  MathQuestionReview,
  MathSessionStats,
} from './types';

/**
 * Pure scoring function:
 * - 100 points per correctly completed question
 * - Subtract 10 points per incorrect tap / question penalty
 * - Clamped at 0 (never negative)
 */
export function calculateMathBubbleScore(
  completedQuestions: number,
  incorrectTaps: number = 0
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
  private wrongQuestions: MathQuestionReview[] = [];

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
    wrongQuestions: [],
  };

  private listeners: Array<(state: MathBubbleState) => void> = [];
  private transitionTimerId: number | null = null;

  constructor() {
    this.timer = new MonotonicTimer({
      onTick: (remainingMs) => {
        if (this.state.status === 'playing') {
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
    return {
      ...this.stats,
      wrongQuestions: [...this.wrongQuestions],
    };
  }

  getQuestions(): MathQuestion[] {
    return [...this.questions];
  }

  startSession(customDurationSec?: number, generatorSeed?: number): void {
    this.clearTransition();
    this.timer.stop();
    this.sessionCommitted = false;
    this.wrongQuestions = [];

    const settings = StorageService.getSettings();
    const durationSec = customDurationSec ?? settings.mathQuestionDurationSec ?? 15;
    this.questionDurationMs = Math.max(5, durationSec) * 1000;

    // Use fresh randomized seed each session if none specified
    const seed = generatorSeed ?? Math.floor(Math.random() * 1000000) + 1;
    const generator = new MathQuestionGenerator(seed);
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
      wrongQuestions: [],
    };

    this.startQuestion(0);
  }

  replay(): void {
    this.startSession();
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

  advanceNextQuestion(): void {
    this.clearTransition();
    this.startQuestion(this.currentQuestionIndex + 1);
  }

  tapBubble(bubbleId: string): void {
    // 1. Confirm game is in an active playing state
    if (this.state.status !== 'playing') {
      return;
    }

    // 2. Authoritative deadline check: reject tap if deadline has expired
    const now = performance.now();
    if (this.currentDeadline !== null && now >= this.currentDeadline) {
      this.handleTimeout();
      return;
    }

    const { question, selectedIds } = this.state;

    // 3. Confirm bubble belongs to current question
    const bubble = question.bubbles.find((b) => b.id === bubbleId);
    if (!bubble) {
      return;
    }

    // 4. Repeated taps on already-selected bubbles are ignored
    if (selectedIds.includes(bubbleId)) {
      return;
    }

    // Prevent duplicate event delivery
    if (this.lastTapBubbleId === bubbleId && now - this.lastTapTimestamp < 60) {
      return;
    }
    this.lastTapBubbleId = bubbleId;
    this.lastTapTimestamp = now;

    this.stats.totalCountedTaps++;

    // Check if this tap was the next expected ascending bubble
    const nextExpectedId = question.correctOrderIds[selectedIds.length];
    if (bubbleId === nextExpectedId) {
      this.stats.correctSelections++;
    }

    // Add bubble to selected list
    const updatedSelectedIds = [...selectedIds, bubbleId];

    // Play selection sound
    SoundController.playTap();

    if (updatedSelectedIds.length < 3) {
      // 1st or 2nd bubble selected
      this.state = {
        ...this.state,
        selectedIds: updatedSelectedIds,
      };
      this.notify();
      return;
    }

    // 3rd bubble tapped! Authoritative evaluation of the 3-bubble order
    this.timer.stop();

    const isCorrect =
      updatedSelectedIds[0] === question.correctOrderIds[0] &&
      updatedSelectedIds[1] === question.correctOrderIds[1] &&
      updatedSelectedIds[2] === question.correctOrderIds[2];

    if (isCorrect) {
      // Correct order! (Green light)
      this.stats.completedQuestions++;
      SoundController.playQuestionClear();

      this.state = {
        status: 'evaluation_feedback',
        questionIndex: this.currentQuestionIndex,
        question,
        selectedIds: updatedSelectedIds,
        isCorrect: true,
        remainingMs: this.timer.getRemainingMs(),
      };
      this.notify();
    } else {
      // Incorrect order! (Red light)
      this.stats.incorrectTaps++;
      SoundController.playTapIncorrect();

      // Record in wrong questions for final review
      this.wrongQuestions.push({
        questionIndex: this.currentQuestionIndex,
        bubbles: [...question.bubbles],
        userOrderIds: [...updatedSelectedIds],
        correctOrderIds: [...question.correctOrderIds],
        isCorrect: false,
        isTimedOut: false,
      });

      this.state = {
        status: 'evaluation_feedback',
        questionIndex: this.currentQuestionIndex,
        question,
        selectedIds: updatedSelectedIds,
        isCorrect: false,
        remainingMs: this.timer.getRemainingMs(),
      };
      this.notify();
    }

    // After 480ms, advance to next question
    this.scheduleTransition(() => {
      this.startQuestion(this.currentQuestionIndex + 1);
    }, 480);
  }

  handleTimeout(): void {
    if (this.state.status !== 'playing') {
      return;
    }

    this.timer.stop();
    this.clearTransition();
    this.stats.timedOutQuestions++;
    SoundController.playTimeout();

    const { question, selectedIds } = this.state;

    // Record timed-out question in review list
    this.wrongQuestions.push({
      questionIndex: this.currentQuestionIndex,
      bubbles: [...question.bubbles],
      userOrderIds: [...selectedIds],
      correctOrderIds: [...question.correctOrderIds],
      isCorrect: false,
      isTimedOut: true,
    });

    this.state = {
      status: 'question_timeout',
      questionIndex: this.currentQuestionIndex,
      question,
      selectedIds,
    };
    this.notify();

    this.scheduleTransition(() => {
      this.startQuestion(this.currentQuestionIndex + 1);
    }, 480);
  }

  finishSession(): void {
    this.timer.stop();
    this.clearTransition();

    if (this.sessionCommitted) {
      return;
    }
    this.sessionCommitted = true;

    this.stats.totalTimeMs = Math.round(performance.now() - (this.questionStartTime || 0));
    this.stats.score = calculateMathBubbleScore(this.stats.completedQuestions, this.stats.incorrectTaps);
    this.stats.accuracy = calculateMathBubbleAccuracy(
      this.stats.correctSelections,
      this.stats.incorrectTaps
    );
    this.stats.wrongQuestions = [...this.wrongQuestions];

    // Commit to persistent history
    StorageService.addHistoryRecord({
      gameId: 'math-bubble',
      score: this.stats.score,
      completed: this.stats.completedQuestions === 25,
      timeUsedSec: Math.round(this.stats.totalTimeMs / 1000),
      details: {
        completedQuestions: `${this.stats.completedQuestions}/25`,
        accuracy: `${this.stats.accuracy}%`,
        wrongCount: this.wrongQuestions.length,
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

  destroy(): void {
    this.timer.stop();
    this.clearTransition();
    this.listeners = [];
  }
}
