import { describe, expect, it } from 'vitest';
import { ExactDecimal } from '../../src/core/exact-math';

describe('ExactDecimal', () => {
  it('accurately adds decimals without IEEE-754 floating-point errors', () => {
    // In standard JS: 0.1 + 0.2 === 0.30000000000000004
    const a = ExactDecimal.from('0.1');
    const b = ExactDecimal.from('0.2');
    const sum = a.add(b);
    expect(sum.toString()).toBe('0.3');
    expect(sum.equals(ExactDecimal.from('0.3'))).toBe(true);
  });

  it('correctly handles subtraction and negative results', () => {
    const a = ExactDecimal.from('14');
    const b = ExactDecimal.from('30');
    const diff = a.subtract(b);
    expect(diff.toString()).toBe('-16');
    expect(diff.lessThan(ExactDecimal.from('0'))).toBe(true);
  });

  it('correctly handles exact decimal multiplication', () => {
    const a = ExactDecimal.from('1.5');
    const b = ExactDecimal.from('4');
    const product = a.multiply(b);
    expect(product.toString()).toBe('6');
    expect(product.toNumber()).toBe(6);
  });

  it('correctly compares decimals for strictly ascending sorting', () => {
    const d1 = ExactDecimal.from('-5.5');
    const d2 = ExactDecimal.from('2.1');
    const d3 = ExactDecimal.from('2.15');
    const d4 = ExactDecimal.from('10');

    const list = [d3, d1, d4, d2];
    const sorted = [...list].sort((a, b) => a.compareTo(b));

    expect(sorted.map((d) => d.toString())).toEqual(['-5.5', '2.1', '2.15', '10']);
  });

  it('throws on invalid decimal representations', () => {
    expect(() => ExactDecimal.from('abc')).toThrow();
    expect(() => ExactDecimal.from('12.34.56')).toThrow();
  });
});
