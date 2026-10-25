import { ExactDecimal } from '../../core/exact-math';

export interface MathBubble {
  id: string; // 'bubble_0', 'bubble_1', 'bubble_2'
  expression: string; // e.g. "4.5 + 3.5"
  value: ExactDecimal;
  displayValue?: string;
}

export interface MathQuestion {
  index: number; // 0 to 24 (Question 1 to 25)
  bubbles: MathBubble[]; // exactly 3 bubbles, in display order
  correctOrderIds: string[]; // bubble IDs sorted strictly ascending by value
}

export interface MathSessionStats {
  totalQuestions: number; // 25
  completedQuestions: number;
  correctSelections: number; // out of 75
  incorrectTaps: number;
  timedOutQuestions: number;
  totalTimeMs: number;
  score: number;
  accuracy: number;
  highestDifficultyTier: number;
}

export type MathBubbleState =
  | { status: 'idle' }
  | { status: 'ready'; countdown: number }
  | {
      status: 'playing';
      questionIndex: number;
      question: MathQuestion;
      selectedIds: string[]; // IDs of correctly tapped bubbles so far
      remainingMs: number;
      penaltyCount: number;
    }
  | {
      status: 'selection_feedback';
      questionIndex: number;
      question: MathQuestion;
      selectedIds: string[];
      feedbackId: string;
      feedbackType: 'correct' | 'incorrect';
      remainingMs: number;
      penaltyCount: number;
    }
  | {
      status: 'question_complete';
      questionIndex: number;
      question: MathQuestion;
      selectedIds: string[];
      timeSpentMs: number;
    }
  | {
      status: 'question_timeout';
      questionIndex: number;
      question: MathQuestion;
      selectedIds: string[];
    }
  | {
      status: 'session_complete';
      stats: MathSessionStats;
    };
