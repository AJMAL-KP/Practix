import { SoundController } from '../../core/audio';
import { StorageService } from '../../core/storage';
import { MonotonicTimer } from '../../core/timer';
import { MathQuestionGenerator } from './generator';
import { MathBubbleState, MathQuestion, MathSessionStats } from './types';

export class MathBubbleEngine {
  private questions: MathQuestion[] = [];
  private currentQuestionIndex: number = 0;
  private state: MathBubbleState = { status: 'idle' };
  private timer: MonotonicTimer;
  private questionDurationMs: number = 15000;
  private questionStartTime: number = 0;
  private questionTimeSpentList: number[] = [];

  private stats: MathSessionStats = {
    totalQuestions: 25,
    completedQuestions: 0,
    correctSelections: 0,
    incorrectTaps: 0,
    timedOutQuestions: 0,
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
    return { ...this.stats };
  }

  startSession(customDurationSec?: number, generatorSeed?: number): void {
    this.clearTransition();
    this.timer.stop();

    const settings = StorageService.getSettings();
    const durationSec = customDurationSec ?? settings.mathQuestionDurationSec;
    this.questionDurationMs = Math.max(5, durationSec) * 1000;

    const generator = new MathQuestionGenerator(generatorSeed);
    this.questions = generator.generateSession();
    this.currentQuestionIndex = 0;
    this.questionTimeSpentList = [];

    this.stats = {
      totalQuestions: 25,
      completedQuestions: 0,
      correctSelections: 0,
      incorrectTaps: 0,
      timedOutQuestions: 0,
      totalTimeMs: 0,
      score: 0,
      accuracy: 100,
      highestDifficultyTier: 1,
    };

    this.startQuestion(0);
  }

  private startQuestion(index: number): void {
    this.currentQuestionIndex = index;
    const question = this.questions[index];
    this.questionStartTime = performance.now();

    // Track highest difficulty tier reached
    const tier = index < 5 ? 1 : index < 10 ? 2 : index < 17 ? 3 : 4;
    this.stats.highestDifficultyTier = Math.max(this.stats.highestDifficultyTier, tier);

    this.state = {
      status: 'playing',
      questionIndex: index,
      question,
      selectedIds: [],
      remainingMs: this.questionDurationMs,
      penaltyCount: 0,
    };

    this.timer.start(this.questionDurationMs);
    this.notify();
  }

  tapBubble(bubbleId: string): void {
    if (this.state.status !== 'playing') {
      return; // Ignore taps during feedback or transitions
    }

    const { question, selectedIds, penaltyCount } = this.state;

    // Reject already selected bubbles
    if (selectedIds.includes(bubbleId)) {
      return;
    }

    // Determine the expected next bubble
    const nextExpectedId = question.correctOrderIds[selectedIds.length];

    if (bubbleId === nextExpectedId) {
      // Correct selection
      const newSelected = [...selectedIds, bubbleId];
      this.stats.correctSelections++;
      SoundController.playTapCorrect(newSelected.length);

      if (newSelected.length === 3) {
        // Question completed successfully
        this.timer.stop();
        const timeSpent = performance.now() - this.questionStartTime;
        this.questionTimeSpentList.push(timeSpent);
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
        }, 450);
      } else {
        // Valid step towards completion
        this.state = {
          ...this.state,
          selectedIds: newSelected,
        };
        this.notify();
      }
    } else {
      // Incorrect tap
      this.stats.incorrectTaps++;
      SoundController.playTapIncorrect();

      this.state = {
        status: 'selection_feedback',
        questionIndex: this.currentQuestionIndex,
        question,
        selectedIds,
        feedbackId: bubbleId,
        feedbackType: 'incorrect',
        remainingMs: this.timer.getRemainingMs(),
        penaltyCount: penaltyCount + 1,
      };
      this.notify();

      this.scheduleTransition(() => {
        if (this.state.status === 'selection_feedback') {
          this.state = {
            status: 'playing',
            questionIndex: this.currentQuestionIndex,
            question,
            selectedIds,
            remainingMs: this.timer.getRemainingMs(),
            penaltyCount: penaltyCount + 1,
          };
          this.notify();
        }
      }, 400);
    }
  }

  private handleTimeout(): void {
    if (this.state.status !== 'playing' && this.state.status !== 'selection_feedback') {
      return;
    }

    this.timer.stop();
    this.stats.timedOutQuestions++;
    this.stats.totalTimeMs += this.questionDurationMs;
    SoundController.playTimeout();

    const question = this.questions[this.currentQuestionIndex];
    const selectedIds = this.state.status === 'playing' || this.state.status === 'selection_feedback' ? this.state.selectedIds : [];

    this.state = {
      status: 'question_timeout',
      questionIndex: this.currentQuestionIndex,
      question,
      selectedIds,
    };
    this.notify();

    this.scheduleTransition(() => {
      this.advanceNextQuestion();
    }, 600);
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
    this.clearTransition();

    const totalTaps = this.stats.correctSelections + this.stats.incorrectTaps;
    this.stats.accuracy = totalTaps > 0 ? Math.round((this.stats.correctSelections / totalTaps) * 100) : 0;

    // Calculate score
    const baseScore = this.stats.completedQuestions * 100 + this.stats.correctSelections * 20;
    const penalty = this.stats.incorrectTaps * 15;
    // Speed bonus for quick answers
    const avgTimeSec = this.stats.completedQuestions > 0 ? (this.stats.totalTimeMs / 1000) / this.stats.completedQuestions : 15;
    const speedBonus = Math.max(0, Math.round((15 - avgTimeSec) * 20 * this.stats.completedQuestions));

    this.stats.score = Math.max(0, baseScore - penalty + speedBonus);

    // Save record to local storage
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

  destroy(): void {
    this.timer.stop();
    this.clearTransition();
    this.listeners = [];
  }
}
