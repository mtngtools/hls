/**
 * Time and duration parsing utilities for HLS operations
 */

import { ValidationError } from '@mtngtools/hls-types';

/**
 * Parse an HLS duration value
 * HLS durations can be integers (seconds) or floats (fractional seconds)
 *
 * @param value - Duration value (string or number)
 * @returns Duration in seconds as a number
 *
 * @example
 * ```ts
 * parseDuration('10.5') // => 10.5
 * parseDuration('10')   // => 10
 * parseDuration(10.5)   // => 10.5
 * ```
 */
export function parseDuration(value: string | number): number {
  if (typeof value === 'number') {
    if (value < 0 || Number.isNaN(value) || !Number.isFinite(value)) {
      throw new ValidationError(`Invalid duration value: ${value}`, 'duration');
    }
    return value;
  }
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new ValidationError(`Invalid duration value: ${value}`, 'duration');
  }
  return parsed;
}

/**
 * Format a timestamp in seconds to HH:MM:SS.mmm format
 *
 * @param seconds - Time in seconds
 * @returns Formatted time string
 *
 * @example
 * ```ts
 * formatTimestamp(3661.5) // => '01:01:01.500'
 * ```
 */
export function formatTimestamp(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) {
    throw new ValidationError(`Invalid timestamp: ${seconds}`, 'timestamp');
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  const s = secs.toString().padStart(2, '0');
  const ms = milliseconds.toString().padStart(3, '0');

  return `${h}:${m}:${s}.${ms}`;
}

/**
 * Calculate total duration from a list of chunk durations
 *
 * @param durations - Array of chunk durations in seconds
 * @returns Total duration in seconds
 */
export function calculateTotalDuration(durations: number[]): number {
  return durations.reduce((sum, duration) => sum + duration, 0);
}

