import { describe, expect, it } from 'vitest';
import { ExactDecimal } from '../../src/core/exact-math';
import { getDifficultyConfig, MathQuestionGenerator } from '../../src/games/math-bubble/generator';

describe('Math Bubble Rush — Difficulty Progression Tests', () => {
  it('correctly maps boundary indices to deterministic difficulty tiers', () => {
    // Novice (Tier 1): Questions 0..4
    expect(getDifficultyConfig(0).tier).toBe(1);
    expect(getDifficultyConfig(4).tier).toBe(1);
    expect(getDifficultyConfig(0).name).toBe('Novice');
    expect(getDifficultyConfig(0).allowDecimals).toBe(false);
    expect(getDifficultyConfig(0).allowNegatives).toBe(false);

    // Intermediate (Tier 2): Questions 5..9
    expect(getDifficultyConfig(5).tier).toBe(2);
    expect(getDifficultyConfig(9).tier).toBe(2);
    expect(getDifficultyConfig(5).name).toBe('Intermediate');
    expect(getDifficultyConfig(5).operators).toContain('×');
    expect(getDifficultyConfig(5).allowDecimals).toBe(false);

    // Advanced (Tier 3): Questions 10..16
    expect(getDifficultyConfig(10).tier).toBe(3);
    expect(getDifficultyConfig(16).tier).toBe(3);
    expect(getDifficultyConfig(10).name).toBe('Advanced');
    expect(getDifficultyConfig(10).allowDecimals).toBe(true);

    // Master (Tier 4): Questions 17..24
    expect(getDifficultyConfig(17).tier).toBe(4);
    expect(getDifficultyConfig(24).tier).toBe(4);
    expect(getDifficultyConfig(17).name).toBe('Master');
    expect(getDifficultyConfig(17).allowNegatives).toBe(true);
  });

  it('rejects out of bounds question indices', () => {
    expect(() => getDifficultyConfig(-1)).toThrow();
    expect(() => getDifficultyConfig(25)).toThrow();
    expect(() => getDifficultyConfig(100)).toThrow();
  });

  it('generates tier 1 questions with simple positive integers without decimals', () => {
    const gen = new MathQuestionGenerator(101);
    for (let i = 0; i <= 4; i++) {
      const q = gen.generateQuestion(i);
      expect(q.difficultyTier).toBe(1);
      for (const b of q.bubbles) {
        expect(b.value.scale).toBe(0); // integer scale 0
        expect(b.value.greaterThan(exactDecimalZero())).toBe(true);
      }
    }
  });

  it('generates tier 3 and 4 questions with decimal operands or negative values', () => {
    const gen = new MathQuestionGenerator(202);
    let foundDecimal = false;
    let foundNegative = false;

    // Check tier 3 questions for decimals
    for (let i = 10; i <= 16; i++) {
      const q = gen.generateQuestion(i);
      for (const b of q.bubbles) {
        if (b.expression.includes('.')) {
          foundDecimal = true;
        }
      }
    }
    expect(foundDecimal).toBe(true);

    // Check tier 4 questions across seeds for negatives
    for (let seed = 300; seed < 310; seed++) {
      const g = new MathQuestionGenerator(seed);
      for (let i = 17; i <= 24; i++) {
        const q = g.generateQuestion(i);
        for (const b of q.bubbles) {
          if (b.value.lessThan(exactDecimalZero())) {
            foundNegative = true;
          }
        }
      }
    }
    expect(foundNegative).toBe(true);
  });
});

function exactDecimalZero() {
  return ExactDecimal.from(0);
}
