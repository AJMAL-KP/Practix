import { describe, expect, it } from 'vitest';
import { ExactDecimal } from '../../src/core/exact-math';
import {
  createArithmeticExpression,
  evaluateExpression,
  formatExpression,
  MathQuestionGenerator,
} from '../../src/games/math-bubble/generator';

describe('Math Bubble Rush — Expression Generator Tests', () => {
  it('pure evaluation matches exact decimal arithmetic for all operators', () => {
    // Addition
    const addRes = evaluateExpression(ExactDecimal.from('3.5'), '+', ExactDecimal.from('4.2'));
    expect(addRes.toString()).toBe('7.7');

    // Subtraction
    const subRes = evaluateExpression(ExactDecimal.from('12.5'), '−', ExactDecimal.from('10'));
    expect(subRes.toString()).toBe('2.5');

    // Negative subtraction
    const negSub = evaluateExpression(ExactDecimal.from(5), '−', ExactDecimal.from(18));
    expect(negSub.toString()).toBe('-13');

    // Multiplication
    const mulRes = evaluateExpression(ExactDecimal.from('2.5'), '×', ExactDecimal.from(4));
    expect(mulRes.toString()).toBe('10');
  });

  it('display string strictly derives from the same underlying expression representation', () => {
    const left = ExactDecimal.from('12.5');
    const right = ExactDecimal.from('10');
    const expr = createArithmeticExpression('test_1', left, '−', right);

    expect(expr.displayString).toBe('12.5 − 10');
    expect(expr.value.toString()).toBe('2.5');
    expect(formatExpression(left, '−', right)).toBe(expr.displayString);
  });

  it('generates questions with exactly 3 expressions and strict ascending values', () => {
    const generator = new MathQuestionGenerator(777);
    const question = generator.generateQuestion(0);

    expect(question.bubbles.length).toBe(3);
    expect(question.correctOrderIds.length).toBe(3);

    const b0 = question.bubbles.find((b) => b.id === question.correctOrderIds[0])!;
    const b1 = question.bubbles.find((b) => b.id === question.correctOrderIds[1])!;
    const b2 = question.bubbles.find((b) => b.id === question.correctOrderIds[2])!;

    expect(b0.value.lessThan(b1.value)).toBe(true);
    expect(b1.value.lessThan(b2.value)).toBe(true);
    expect(b0.value.lessThan(b2.value)).toBe(true);
  });

  it('strictly rejects duplicate values and duplicate expressions within each question', () => {
    const generator = new MathQuestionGenerator(999);
    for (let i = 0; i < 25; i++) {
      const q = generator.generateQuestion(i);
      const v0 = q.bubbles[0].value;
      const v1 = q.bubbles[1].value;
      const v2 = q.bubbles[2].value;

      expect(v0.equals(v1)).toBe(false);
      expect(v0.equals(v2)).toBe(false);
      expect(v1.equals(v2)).toBe(false);

      const str0 = q.bubbles[0].expression;
      const str1 = q.bubbles[1].expression;
      const str2 = q.bubbles[2].expression;

      expect(str0).not.toBe(str1);
      expect(str0).not.toBe(str2);
      expect(str1).not.toBe(str2);
    }
  });

  it('reproducibly generates identical output when supplied with the same seed', () => {
    const genA = new MathQuestionGenerator(4242);
    const genB = new MathQuestionGenerator(4242);

    const sessionA = genA.generateSession();
    const sessionB = genB.generateSession();

    expect(sessionA.length).toBe(25);
    expect(sessionB.length).toBe(25);

    for (let i = 0; i < 25; i++) {
      expect(sessionA[i].correctOrderIds).toEqual(sessionB[i].correctOrderIds);
      for (let j = 0; j < 3; j++) {
        expect(sessionA[i].bubbles[j].expression).toBe(sessionB[i].bubbles[j].expression);
        expect(sessionA[i].bubbles[j].value.toString()).toBe(
          sessionB[i].bubbles[j].value.toString()
        );
      }
    }
  });

  it('never hangs in an infinite loop and safely generates questions even on stress test', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const gen = new MathQuestionGenerator(seed * 111);
      const q = gen.generateQuestion(seed % 25);
      expect(q.bubbles.length).toBe(3);
      expect(q.correctOrderIds.length).toBe(3);
    }
  });
});
