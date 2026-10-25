/**
 * Exact decimal arithmetic representation to prevent IEEE-754 floating point inaccuracies.
 * Supports exact addition, subtraction, multiplication, and comparisons.
 */
export class ExactDecimal {
  /** Internal scaled integer value (value * 10^scale) */
  readonly scaledValue: bigint;
  readonly scale: number;

  constructor(scaledValue: bigint, scale: number) {
    this.scale = Math.max(0, scale);
    this.scaledValue = scaledValue;
  }

  /**
   * Create an ExactDecimal from a number or string representation (e.g. "3.5", -12, "0.05")
   */
  static from(value: number | string | bigint): ExactDecimal {
    if (typeof value === 'bigint') {
      return new ExactDecimal(value, 0);
    }

    const str = String(value).trim();
    if (!/^-?\d+(\.\d+)?$/.test(str)) {
      throw new Error(`Invalid decimal representation: "${str}"`);
    }

    const isNegative = str.startsWith('-');
    const cleanStr = isNegative ? str.slice(1) : str;

    const parts = cleanStr.split('.');
    const integerPart = parts[0];
    const fractionalPart = parts[1] || '';

    const scale = fractionalPart.length;
    const combinedStr = (isNegative ? '-' : '') + integerPart + fractionalPart;
    const scaledBigInt = BigInt(combinedStr || '0');

    return new ExactDecimal(scaledBigInt, scale).normalize();
  }

  /**
   * Align two decimals to the maximum of their scales.
   */
  private static align(a: ExactDecimal, b: ExactDecimal): [bigint, bigint, number] {
    const maxScale = Math.max(a.scale, b.scale);
    const aFactor = 10n ** BigInt(maxScale - a.scale);
    const bFactor = 10n ** BigInt(maxScale - b.scale);

    return [a.scaledValue * aFactor, b.scaledValue * bFactor, maxScale];
  }

  /**
   * Normalize by removing redundant trailing zeroes in fraction while keeping scale >= 0.
   */
  normalize(): ExactDecimal {
    if (this.scaledValue === 0n) {
      return new ExactDecimal(0n, 0);
    }

    let val = this.scaledValue;
    let s = this.scale;

    while (s > 0 && val % 10n === 0n) {
      val /= 10n;
      s -= 1;
    }

    return new ExactDecimal(val, s);
  }

  add(other: ExactDecimal): ExactDecimal {
    const [aVal, bVal, commonScale] = ExactDecimal.align(this, other);
    return new ExactDecimal(aVal + bVal, commonScale).normalize();
  }

  subtract(other: ExactDecimal): ExactDecimal {
    const [aVal, bVal, commonScale] = ExactDecimal.align(this, other);
    return new ExactDecimal(aVal - bVal, commonScale).normalize();
  }

  multiply(other: ExactDecimal): ExactDecimal {
    const newScale = this.scale + other.scale;
    const newVal = this.scaledValue * other.scaledValue;
    return new ExactDecimal(newVal, newScale).normalize();
  }

  equals(other: ExactDecimal): boolean {
    const [aVal, bVal] = ExactDecimal.align(this, other);
    return aVal === bVal;
  }

  lessThan(other: ExactDecimal): boolean {
    const [aVal, bVal] = ExactDecimal.align(this, other);
    return aVal < bVal;
  }

  greaterThan(other: ExactDecimal): boolean {
    const [aVal, bVal] = ExactDecimal.align(this, other);
    return aVal > bVal;
  }

  compareTo(other: ExactDecimal): number {
    const [aVal, bVal] = ExactDecimal.align(this, other);
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  }

  toNumber(): number {
    return Number(this.toString());
  }

  toString(): string {
    if (this.scale === 0) {
      return this.scaledValue.toString();
    }

    const isNegative = this.scaledValue < 0n;
    const absVal = isNegative ? -this.scaledValue : this.scaledValue;
    let s = absVal.toString();

    if (s.length <= this.scale) {
      s = s.padStart(this.scale + 1, '0');
    }

    const splitPos = s.length - this.scale;
    const intPart = s.slice(0, splitPos);
    const fracPart = s.slice(splitPos);

    return `${isNegative ? '-' : ''}${intPart}.${fracPart}`;
  }
}
