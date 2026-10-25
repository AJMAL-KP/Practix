import { ExactDecimal } from '../../core/exact-math';
import { SeededRNG } from '../../core/rng';
import { MathBubble, MathQuestion } from './types';

interface ExpressionResult {
  expr: string;
  value: ExactDecimal;
}

export class MathQuestionGenerator {
  private rng: SeededRNG;

  constructor(seed?: number) {
    this.rng = new SeededRNG(seed);
  }

  /**
   * Generates a single arithmetic expression for a given question index (0 to 24).
   */
  private generateExpression(questionIndex: number): ExpressionResult {
    // Determine tier (1 to 4) based on questionIndex
    const tier = questionIndex < 5 ? 1 : questionIndex < 10 ? 2 : questionIndex < 17 ? 3 : 4;

    if (tier === 1) {
      // Tier 1: Simple addition & subtraction with positive integers
      const op = this.rng.next() < 0.5 ? '+' : '-';
      if (op === '+') {
        const a = this.rng.nextInt(3, 25);
        const b = this.rng.nextInt(2, 25);
        const val = ExactDecimal.from(a).add(ExactDecimal.from(b));
        return { expr: `${a} + ${b}`, value: val };
      } else {
        const a = this.rng.nextInt(15, 50);
        const b = this.rng.nextInt(2, a - 1);
        const val = ExactDecimal.from(a).subtract(ExactDecimal.from(b));
        return { expr: `${a} - ${b}`, value: val };
      }
    }

    if (tier === 2) {
      // Tier 2: Addition, subtraction, single-digit multiplication
      const roll = this.rng.next();
      if (roll < 0.4) {
        // Multiplication
        const a = this.rng.nextInt(4, 12);
        const b = this.rng.nextInt(3, 9);
        const val = ExactDecimal.from(a).multiply(ExactDecimal.from(b));
        return { expr: `${a} × ${b}`, value: val };
      } else if (roll < 0.7) {
        // Larger addition
        const a = this.rng.nextInt(20, 75);
        const b = this.rng.nextInt(15, 60);
        const val = ExactDecimal.from(a).add(ExactDecimal.from(b));
        return { expr: `${a} + ${b}`, value: val };
      } else {
        // Larger subtraction
        const a = this.rng.nextInt(40, 100);
        const b = this.rng.nextInt(15, 38);
        const val = ExactDecimal.from(a).subtract(ExactDecimal.from(b));
        return { expr: `${a} - ${b}`, value: val };
      }
    }

    if (tier === 3) {
      // Tier 3: Decimal operands (+, -, x)
      const roll = this.rng.next();
      if (roll < 0.4) {
        // Decimal addition
        const aInt = this.rng.nextInt(1, 15);
        const aFrac = this.rng.pick([1, 2, 4, 5, 6, 8]);
        const bInt = this.rng.nextInt(1, 12);
        const bFrac = this.rng.pick([2, 5, 8]);
        const aStr = `${aInt}.${aFrac}`;
        const bStr = `${bInt}.${bFrac}`;
        const val = ExactDecimal.from(aStr).add(ExactDecimal.from(bStr));
        return { expr: `${aStr} + ${bStr}`, value: val };
      } else if (roll < 0.7) {
        // Decimal subtraction
        const aInt = this.rng.nextInt(8, 25);
        const aFrac = this.rng.pick([0, 5]);
        const bInt = this.rng.nextInt(1, aInt - 2);
        const bFrac = this.rng.pick([2, 4, 6, 8]);
        const aStr = `${aInt}.${aFrac}`;
        const bStr = `${bInt}.${bFrac}`;
        const val = ExactDecimal.from(aStr).subtract(ExactDecimal.from(bStr));
        return { expr: `${aStr} - ${bStr}`, value: val };
      } else {
        // Decimal multiplication
        const aStr = this.rng.pick(['1.5', '2.5', '3.5', '0.5', '4.5']);
        const b = this.rng.nextInt(2, 8);
        const val = ExactDecimal.from(aStr).multiply(ExactDecimal.from(b));
        return { expr: `${aStr} × ${b}`, value: val };
      }
    }

    // Tier 4: Negative results, mixed decimals, close margins
    const roll = this.rng.next();
    if (roll < 0.4) {
      // Subtraction producing negative result
      const a = this.rng.nextInt(5, 25);
      const diff = this.rng.nextInt(6, 25);
      const b = a + diff;
      const val = ExactDecimal.from(a).subtract(ExactDecimal.from(b));
      return { expr: `${a} - ${b}`, value: val };
    } else if (roll < 0.7) {
      // Negative decimal subtraction
      const aStr = `${this.rng.nextInt(2, 10)}.${this.rng.pick([2, 5, 8])}`;
      const bInt = this.rng.nextInt(12, 28);
      const val = ExactDecimal.from(aStr).subtract(ExactDecimal.from(bInt));
      return { expr: `${aStr} - ${bInt}`, value: val };
    } else {
      // Mixed multiplication
      const aStr = this.rng.pick(['2.4', '1.6', '3.2', '1.8']);
      const b = this.rng.nextInt(3, 7);
      const val = ExactDecimal.from(aStr).multiply(ExactDecimal.from(b));
      return { expr: `${aStr} × ${b}`, value: val };
    }
  }

  /**
   * Generates a complete MathQuestion with 3 distinct bubbles, guaranteed unique values.
   */
  generateQuestion(questionIndex: number): MathQuestion {
    const bubbles: MathBubble[] = [];
    const usedValues: ExactDecimal[] = [];

    let attempts = 0;
    while (bubbles.length < 3 && attempts < 100) {
      attempts++;
      const { expr, value } = this.generateExpression(questionIndex);

      // Verify uniqueness
      const isDuplicate = usedValues.some((v) => v.equals(value));
      if (!isDuplicate) {
        usedValues.push(value);
        bubbles.push({
          id: `bubble_${bubbles.length}`,
          expression: expr,
          value: value,
        });
      }
    }

    // Fallback if needed to guarantee 3 unique bubbles
    while (bubbles.length < 3) {
      const fallbackVal = ExactDecimal.from(100 + bubbles.length * 10);
      bubbles.push({
        id: `bubble_${bubbles.length}`,
        expression: `${50 + bubbles.length * 5} + ${50 + bubbles.length * 5}`,
        value: fallbackVal,
      });
    }

    // Determine correct order by sorting strictly ascending
    const sorted = [...bubbles].sort((a, b) => a.value.compareTo(b.value));
    const correctOrderIds = sorted.map((b) => b.id);

    // Shuffle the display array so order isn't predictably left-to-right
    const displayBubbles = this.rng.shuffle([...bubbles]);

    return {
      index: questionIndex,
      bubbles: displayBubbles,
      correctOrderIds,
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
