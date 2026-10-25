import { ExactDecimal } from '../../core/exact-math';
import { SeededRNG } from '../../core/rng';
import {
  ArithmeticExpression,
  DifficultyConfig,
  MathBubble,
  MathOperator,
  MathQuestion,
} from './types';

/**
 * Pure evaluation function using ExactDecimal
 */
export function evaluateExpression(
  left: ExactDecimal,
  operator: MathOperator,
  right: ExactDecimal
): ExactDecimal {
  switch (operator) {
    case '+':
      return left.add(right);
    case '−':
      return left.subtract(right);
    case '×':
      return left.multiply(right);
  }
}

/**
 * Formatted display string strictly derived from the same operands and operator
 */
export function formatExpression(
  left: ExactDecimal,
  operator: MathOperator,
  right: ExactDecimal
): string {
  return `${left.toString()} ${operator} ${right.toString()}`;
}

/**
 * Creates an immutable ArithmeticExpression where value and displayString
 * derive strictly from the same underlying operands and operator.
 */
export function createArithmeticExpression(
  id: string,
  left: ExactDecimal,
  operator: MathOperator,
  right: ExactDecimal
): ArithmeticExpression {
  const value = evaluateExpression(left, operator, right);
  const displayString = formatExpression(left, operator, right);
  return {
    id,
    leftOperand: left,
    operator,
    rightOperand: right,
    value,
    displayString,
  };
}

/**
 * Pure function mapping question index (0 to 24) to its DifficultyConfig.
 */
export function getDifficultyConfig(questionIndex: number): DifficultyConfig {
  if (questionIndex < 0 || questionIndex >= 25) {
    throw new Error(`Invalid question index: ${questionIndex}. Must be between 0 and 24.`);
  }

  if (questionIndex <= 4) {
    return {
      tier: 1,
      name: 'Novice',
      operators: ['+', '−'],
      allowDecimals: false,
      allowNegatives: false,
      minOperand: 2,
      maxOperand: 25,
    };
  }

  if (questionIndex <= 9) {
    return {
      tier: 2,
      name: 'Intermediate',
      operators: ['+', '−', '×'],
      allowDecimals: false,
      allowNegatives: false,
      minOperand: 3,
      maxOperand: 75,
    };
  }

  if (questionIndex <= 16) {
    return {
      tier: 3,
      name: 'Advanced',
      operators: ['+', '−', '×'],
      allowDecimals: true,
      allowNegatives: false,
      minOperand: 1,
      maxOperand: 35,
    };
  }

  return {
    tier: 4,
    name: 'Master',
    operators: ['+', '−', '×'],
    allowDecimals: true,
    allowNegatives: true,
    minOperand: 1,
    maxOperand: 50,
  };
}

export class MathQuestionGenerator {
  private rng: SeededRNG;

  constructor(seed?: number) {
    this.rng = new SeededRNG(seed);
  }

  /**
   * Generates a single arithmetic expression matching the difficulty configuration.
   */
  private generateExpressionCandidate(
    config: DifficultyConfig,
    indexInQuestion: number
  ): ArithmeticExpression {
    const exprId = `expr_${indexInQuestion}_${this.rng.nextInt(1000, 9999)}`;

    if (config.tier === 1) {
      // Tier 1: Small integer operands, addition and subtraction, positive results
      const op = this.rng.next() < 0.5 ? '+' : '−';
      if (op === '+') {
        const a = this.rng.nextInt(config.minOperand, config.maxOperand);
        const b = this.rng.nextInt(config.minOperand, config.maxOperand);
        return createArithmeticExpression(exprId, ExactDecimal.from(a), '+', ExactDecimal.from(b));
      } else {
        const a = this.rng.nextInt(15, 45);
        const b = this.rng.nextInt(config.minOperand, a - 1);
        return createArithmeticExpression(exprId, ExactDecimal.from(a), '−', ExactDecimal.from(b));
      }
    }

    if (config.tier === 2) {
      // Tier 2: Larger operands, multiplication, mixed operators
      const roll = this.rng.next();
      if (roll < 0.4) {
        // Multiplication
        const a = this.rng.nextInt(3, 12);
        const b = this.rng.nextInt(3, 9);
        return createArithmeticExpression(exprId, ExactDecimal.from(a), '×', ExactDecimal.from(b));
      } else if (roll < 0.7) {
        // Larger addition
        const a = this.rng.nextInt(20, 65);
        const b = this.rng.nextInt(15, 50);
        return createArithmeticExpression(exprId, ExactDecimal.from(a), '+', ExactDecimal.from(b));
      } else {
        // Larger subtraction
        const a = this.rng.nextInt(40, 95);
        const b = this.rng.nextInt(10, 38);
        return createArithmeticExpression(exprId, ExactDecimal.from(a), '−', ExactDecimal.from(b));
      }
    }

    if (config.tier === 3) {
      // Tier 3: Decimal operands (+, -, x)
      const roll = this.rng.next();
      if (roll < 0.4) {
        // Decimal addition
        const aInt = this.rng.nextInt(1, 14);
        const aFrac = this.rng.pick([2, 5, 8]);
        const bInt = this.rng.nextInt(1, 12);
        const bFrac = this.rng.pick([2, 5]);
        const aStr = `${aInt}.${aFrac}`;
        const bStr = `${bInt}.${bFrac}`;
        return createArithmeticExpression(
          exprId,
          ExactDecimal.from(aStr),
          '+',
          ExactDecimal.from(bStr)
        );
      } else if (roll < 0.7) {
        // Decimal subtraction
        const aInt = this.rng.nextInt(8, 25);
        const aFrac = this.rng.pick([0, 5]);
        const bInt = this.rng.nextInt(1, aInt - 2);
        const bFrac = this.rng.pick([2, 4, 6, 8]);
        const aStr = aFrac === 0 ? `${aInt}` : `${aInt}.${aFrac}`;
        const bStr = `${bInt}.${bFrac}`;
        return createArithmeticExpression(
          exprId,
          ExactDecimal.from(aStr),
          '−',
          ExactDecimal.from(bStr)
        );
      } else {
        // Decimal multiplication
        const aStr = this.rng.pick(['1.5', '2.5', '3.5', '0.5', '4.5']);
        const b = this.rng.nextInt(2, 8);
        return createArithmeticExpression(
          exprId,
          ExactDecimal.from(aStr),
          '×',
          ExactDecimal.from(b)
        );
      }
    }

    // Tier 4: Master: Negative results, mixed decimals, close comparisons
    const roll = this.rng.next();
    if (roll < 0.35) {
      // Negative integer subtraction
      const a = this.rng.nextInt(5, 20);
      const diff = this.rng.nextInt(6, 20);
      const b = a + diff;
      return createArithmeticExpression(exprId, ExactDecimal.from(a), '−', ExactDecimal.from(b));
    } else if (roll < 0.65) {
      // Negative decimal subtraction
      const aInt = this.rng.nextInt(2, 9);
      const aFrac = this.rng.pick([2, 5]);
      const aStr = `${aInt}.${aFrac}`;
      const bInt = this.rng.nextInt(10, 24);
      return createArithmeticExpression(
        exprId,
        ExactDecimal.from(aStr),
        '−',
        ExactDecimal.from(bInt)
      );
    } else {
      // Decimal multiplication or addition
      const aStr = this.rng.pick(['1.6', '2.4', '3.2', '1.8']);
      const b = this.rng.nextInt(3, 7);
      return createArithmeticExpression(
        exprId,
        ExactDecimal.from(aStr),
        '×',
        ExactDecimal.from(b)
      );
    }
  }

  /**
   * Generates a complete MathQuestion with exactly 3 bubbles,
   * guaranteed strictly unique numerical values and display expressions.
   */
  generateQuestion(questionIndex: number): MathQuestion {
    const config = getDifficultyConfig(questionIndex);
    const expressions: ArithmeticExpression[] = [];

    let attempts = 0;
    const maxAttempts = 120;

    while (expressions.length < 3 && attempts < maxAttempts) {
      attempts++;
      const candidate = this.generateExpressionCandidate(config, expressions.length);

      // Verify no duplicate value
      const hasDuplicateValue = expressions.some((e) => e.value.equals(candidate.value));
      // Verify no duplicate expression display string
      const hasDuplicateExpr = expressions.some(
        (e) => e.displayString === candidate.displayString
      );

      if (!hasDuplicateValue && !hasDuplicateExpr) {
        expressions.push(candidate);
      }
    }

    // Safe deterministic fallback if bounded attempts could not produce 3 unique expressions
    while (expressions.length < 3) {
      const idx = expressions.length;
      const fallbackA = 100 + idx * 30;
      const fallbackB = 5 + idx * 5;
      const fallbackExpr = createArithmeticExpression(
        `fallback_${idx}`,
        ExactDecimal.from(fallbackA),
        '+',
        ExactDecimal.from(fallbackB)
      );
      // Double check uniqueness
      if (!expressions.some((e) => e.value.equals(fallbackExpr.value))) {
        expressions.push(fallbackExpr);
      } else {
        const offsetFallback = createArithmeticExpression(
          `fallback_offset_${idx}`,
          ExactDecimal.from(fallbackA + 500),
          '+',
          ExactDecimal.from(fallbackB)
        );
        expressions.push(offsetFallback);
      }
    }

    // Wrap into MathBubble structures
    const bubbles: MathBubble[] = expressions.map((expr, i) => ({
      id: `bubble_${i}`,
      expression: expr.displayString,
      arithmeticExpression: expr,
      value: expr.value,
      displayString: expr.displayString,
    }));

    // Determine correct order by sorting strictly ascending by value
    const sorted = [...bubbles].sort((a, b) => a.value.compareTo(b.value));
    const correctOrderIds = sorted.map((b) => b.id);

    // Shuffle the display array so ascending order isn't predictable by DOM position
    const displayBubbles = this.rng.shuffle([...bubbles]);

    return {
      index: questionIndex,
      bubbles: displayBubbles,
      correctOrderIds,
      difficultyTier: config.tier,
    };
  }

  /**
   * Generates a full 25-question session.
   */
  generateSession(): MathQuestion[] {
    const session: MathQuestion[] = [];
    for (let i = 0; i < 25; i++) {
      session.push(this.generateQuestion(i));
    }
    return session;
  }
}
