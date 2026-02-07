/**
 * Unit tests for attribute parsing utilities
 */

import { describe, it, expect } from 'vitest';
import { parseAttributes, parseResolution, parseByteRange } from '../../src/attributes.js';

describe('parseAttributes', () => {
  it('should parse simple key-value pairs', () => {
    const result = parseAttributes('BANDWIDTH=1280000,RESOLUTION=640x360');
    expect(result).toEqual({
      BANDWIDTH: '1280000',
      RESOLUTION: '640x360',
    });
  });

  it('should handle single attribute', () => {
    const result = parseAttributes('BANDWIDTH=1280000');
    expect(result).toEqual({
      BANDWIDTH: '1280000',
    });
  });

  it('should handle quoted values', () => {
    const result = parseAttributes('URI="key.php",METHOD=AES-128');
    expect(result).toEqual({
      URI: 'key.php',
      METHOD: 'AES-128',
    });
  });

  it('should handle escaped characters in quoted values', () => {
    const result = parseAttributes('URI="key\\"with\\"quotes.php"');
    expect(result).toEqual({
      URI: 'key"with"quotes.php',
    });
  });

  it('should handle whitespace around commas', () => {
    const result = parseAttributes('BANDWIDTH=1280000, RESOLUTION=640x360');
    expect(result).toEqual({
      BANDWIDTH: '1280000',
      RESOLUTION: '640x360',
    });
  });

  it('should handle whitespace around equals', () => {
    const result = parseAttributes('BANDWIDTH = 1280000, RESOLUTION = 640x360');
    expect(result).toEqual({
      BANDWIDTH: '1280000',
      RESOLUTION: '640x360',
    });
  });

  it('should handle empty string', () => {
    const result = parseAttributes('');
    expect(result).toEqual({});
  });

  it('should skip attributes without values', () => {
    const result = parseAttributes('BANDWIDTH=1280000,NO_VALUE,RESOLUTION=640x360');
    expect(result).toEqual({
      BANDWIDTH: '1280000',
      RESOLUTION: '640x360',
    });
  });

  it('should handle complex real-world example', () => {
    const result = parseAttributes(
      'BANDWIDTH=1280000,AVERAGE-BANDWIDTH=1000000,CODECS="avc1.42e01e,mp4a.40.2",RESOLUTION=640x360,FRAME-RATE=30.0',
    );
    expect(result).toEqual({
      BANDWIDTH: '1280000',
      'AVERAGE-BANDWIDTH': '1000000',
      CODECS: 'avc1.42e01e,mp4a.40.2',
      RESOLUTION: '640x360',
      'FRAME-RATE': '30.0',
    });
  });
});

describe('parseResolution', () => {
  it('should parse valid resolution', () => {
    const result = parseResolution('640x360');
    expect(result).toEqual({ width: 640, height: 360 });
  });

  it('should parse large resolutions', () => {
    const result = parseResolution('1920x1080');
    expect(result).toEqual({ width: 1920, height: 1080 });
  });

  it('should parse small resolutions', () => {
    const result = parseResolution('320x240');
    expect(result).toEqual({ width: 320, height: 240 });
  });

  it('should return null for invalid format', () => {
    expect(parseResolution('640x')).toBeNull();
    expect(parseResolution('x360')).toBeNull();
    expect(parseResolution('640 360')).toBeNull();
    expect(parseResolution('640-360')).toBeNull();
  });

  it('should return null for non-numeric values', () => {
    expect(parseResolution('abcxdef')).toBeNull();
    expect(parseResolution('640xabc')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseResolution('')).toBeNull();
  });
});

describe('parseByteRange', () => {
  it('should parse byte range with length and offset', () => {
    const result = parseByteRange('123@456');
    expect(result).toEqual({ length: 123, offset: 456 });
  });

  it('should parse byte range with length only', () => {
    const result = parseByteRange('123');
    expect(result).toEqual({ length: 123 });
  });

  it('should parse large byte ranges', () => {
    const result = parseByteRange('1048576@2097152');
    expect(result).toEqual({ length: 1048576, offset: 2097152 });
  });

  it('should parse zero values', () => {
    const result = parseByteRange('0@0');
    expect(result).toEqual({ length: 0, offset: 0 });
  });

  it('should return null for invalid format', () => {
    expect(parseByteRange('123@')).toBeNull();
    expect(parseByteRange('@456')).toBeNull();
    expect(parseByteRange('123 456')).toBeNull();
    expect(parseByteRange('123-456')).toBeNull();
  });

  it('should return null for non-numeric values', () => {
    expect(parseByteRange('abc@def')).toBeNull();
    expect(parseByteRange('123@abc')).toBeNull();
    expect(parseByteRange('abc')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseByteRange('')).toBeNull();
  });
});
