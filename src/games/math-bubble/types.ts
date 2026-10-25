import { ExactDecimal } from '../../core/exact-math';

export type MathOperator = '+' | '−' | '×';

export interface ArithmeticExpression {
  id: string;
  leftOperand: ExactDecimal;
  operator: MathOperator;
  rightOperand: ExactDecimal;
  value: ExactDecimal;
  displayString: string;
}

export interface MathBubble {
  id: string; // 'bubble_0', 'bubble_1', 'bubble_2'
  expression: string; // Formatted display string e.g. "14 ÷ 7", "12.5 − 10"
  arithmeticExpression: ArithmeticExpression;
  value: ExactDecimal;
  displayString: string;
}

export type DifficultyTier = 1 | 2 | 3 | 4;

export interface DifficultyConfig {
  tier: DifficultyTier;
  name: string;
  operators: MathOperator[];
  allowDecimals: boolean;
  allowNegatives: boolean;
  minOperand: number;
  maxOperand: number;
}

export interface MathQuestion {
  index: number; // 0 to 24 (Question 1 to 25)
  bubbles: MathBubble[]; // exactly 3 bubbles, in display order
  correctOrderIds: string[]; // bubble IDs sorted strictly ascending by value
  difficultyTier: DifficultyTier;
}

export interface MathSessionStats {
  totalQuestions: number; // 25
  attemptedQuestions: number;
  completedQuestions: number;
  timedOutQuestions: number;
  correctSelections: number; // out of 75
  incorrectTaps: number;
  totalCountedTaps: number;
  penaltyPoints: number;
  totalTimeMs: number;
  highestDifficultyTier: number;
  score: number;
  accuracy: number;
}

export type MathBubbleState =
  | { status: 'intro' }
  | { status: 'ready'; durationSec: number }
  | {
      status: 'playing';
      questionIndex: number;
      question: MathQuestion;
      selectedIds: string[]; // IDs of correctly tapped bubbles in current question
      remainingMs: number;
      penaltyCount: number;
      incorrectBubbleId: string | null;
    }
  | {
      status: 'correct_feedback';
      questionIndex: number;
      question: MathQuestion;
      selectedIds: string[];
      remainingMs: number;
      penaltyCount: number;
      lastCorrectId: string;
    }
  | {
      status: 'selection_feedback'; // backwards compatibility alias if needed
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
    }
  | {
      status: 'results';
      stats: MathSessionStats;
    };

export type MathBubbleEvent =
  | { type: 'START_SESSION'; customDurationSec?: number; seed?: number }
  | { type: 'START_QUESTION'; index: number }
  | { type: 'SELECT_BUBBLE'; bubbleId: string; timestamp?: number }
  | { type: 'FEEDBACK_TIMEOUT' }
  | { type: 'QUESTION_TIMEOUT' }
  | { type: 'ADVANCE_QUESTION' }
  | { type: 'REPLAY' }
  | { type: 'RETURN_TO_MENU' };
