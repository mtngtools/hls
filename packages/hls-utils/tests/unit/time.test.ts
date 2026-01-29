/**
 * Unit tests for time utilities
 */

import { describe, it, expect } from 'vitest';
import { parseDuration, formatTimestamp, calculateTotalDuration } from '../../src/time.js';
import { ValidationError } from '@mtngtools/hls-types';

describe('parseDuration', () => {
  it('should parse integer duration string', () => {
    expect(parseDuration('10')).toBe(10);
    expect(parseDuration('0')).toBe(0);
    expect(parseDuration('3600')).toBe(3600);
  });

  it('should parse float duration string', () => {
    expect(parseDuration('10.5')).toBe(10.5);
    expect(parseDuration('0.5')).toBe(0.5);
    expect(parseDuration('123.456')).toBe(123.456);
  });

  it('should return number as-is', () => {
    expect(parseDuration(10)).toBe(10);
    expect(parseDuration(10.5)).toBe(10.5);
    expect(parseDuration(0)).toBe(0);
  });

  it('should throw ValidationError for invalid string', () => {
    expect(() => parseDuration('invalid')).toThrow(ValidationError);
    expect(() => parseDuration('abc')).toThrow(ValidationError);
  });

  it('should throw ValidationError for negative values', () => {
    expect(() => parseDuration('-10')).toThrow(ValidationError);
    expect(() => parseDuration(-10)).toThrow(ValidationError);
  });

  it('should throw ValidationError for NaN', () => {
    expect(() => parseDuration('NaN')).toThrow(ValidationError);
  });
});

describe('formatTimestamp', () => {
  it('should format zero seconds', () => {
    expect(formatTimestamp(0)).toBe('00:00:00.000');
  });

  it('should format seconds only', () => {
    expect(formatTimestamp(5)).toBe('00:00:05.000');
    expect(formatTimestamp(59)).toBe('00:00:59.000');
  });

  it('should format minutes and seconds', () => {
    expect(formatTimestamp(60)).toBe('00:01:00.000');
    expect(formatTimestamp(125)).toBe('00:02:05.000');
    expect(formatTimestamp(3599)).toBe('00:59:59.000');
  });

  it('should format hours, minutes, and seconds', () => {
    expect(formatTimestamp(3600)).toBe('01:00:00.000');
    expect(formatTimestamp(3661)).toBe('01:01:01.000');
    expect(formatTimestamp(3661.5)).toBe('01:01:01.500');
  });

  it('should format fractional seconds', () => {
    expect(formatTimestamp(0.5)).toBe('00:00:00.500');
    expect(formatTimestamp(1.123)).toBe('00:00:01.123');
    expect(formatTimestamp(10.999)).toBe('00:00:10.999');
  });

  it('should format large durations', () => {
    expect(formatTimestamp(86400)).toBe('24:00:00.000'); // 24 hours
    expect(formatTimestamp(90000)).toBe('25:00:00.000'); // 25 hours
  });

  it('should throw ValidationError for negative values', () => {
    expect(() => formatTimestamp(-1)).toThrow(ValidationError);
  });

  it('should throw ValidationError for Infinity', () => {
    expect(() => formatTimestamp(Infinity)).toThrow(ValidationError);
    expect(() => formatTimestamp(-Infinity)).toThrow(ValidationError);
  });

  it('should throw ValidationError for NaN', () => {
    expect(() => formatTimestamp(NaN)).toThrow(ValidationError);
  });
});

describe('calculateTotalDuration', () => {
  it('should calculate total from empty array', () => {
    expect(calculateTotalDuration([])).toBe(0);
  });

  it('should calculate total from single duration', () => {
    expect(calculateTotalDuration([10])).toBe(10);
    expect(calculateTotalDuration([10.5])).toBe(10.5);
  });

  it('should calculate total from multiple durations', () => {
    expect(calculateTotalDuration([10, 20, 30])).toBe(60);
    expect(calculateTotalDuration([10.5, 20.5, 30.5])).toBe(61.5);
  });

  it('should handle zero durations', () => {
    expect(calculateTotalDuration([0, 10, 0])).toBe(10);
  });

  it('should handle fractional durations', () => {
    expect(calculateTotalDuration([1.1, 2.2, 3.3])).toBeCloseTo(6.6, 5);
  });
});
