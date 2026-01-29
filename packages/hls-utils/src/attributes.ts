/**
 * Attribute parsing utilities for HLS tags
 * Handles key=value pairs with proper quote and escape handling
 */

/**
 * Parse an attribute list from an HLS tag
 * Handles quoted strings, escaped characters, and unquoted values
 *
 * @param attributeList - Attribute list string (e.g., 'BANDWIDTH=1280000,RESOLUTION=640x360')
 * @returns Map of attribute names to values
 *
 * @example
 * ```ts
 * parseAttributes('BANDWIDTH=1280000,RESOLUTION=640x360')
 * // => { BANDWIDTH: '1280000', RESOLUTION: '640x360' }
 *
 * parseAttributes('URI="key.php",METHOD=AES-128')
 * // => { URI: 'key.php', METHOD: 'AES-128' }
 * ```
 */
export function parseAttributes(attributeList: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  let i = 0;
  const len = attributeList.length;

  while (i < len) {
    // Skip whitespace and commas
    while (i < len && (attributeList[i] === ' ' || attributeList[i] === ',')) {
      i++;
    }
    if (i >= len) break;

    // Find the key (stop at '=' or ',', but allow whitespace before '=')
    const keyStart = i;
    while (i < len && attributeList[i] !== '=' && attributeList[i] !== ',') {
      i++;
    }
    const key = attributeList.slice(keyStart, i).trim();

    if (i >= len || attributeList[i] !== '=') {
      // No value, skip
      continue;
    }
    i++; // Skip '='

    // Skip whitespace
    while (i < len && attributeList[i] === ' ') {
      i++;
    }

    // Parse the value
    let value: string;
    if (i < len && attributeList[i] === '"') {
      // Quoted value
      i++; // Skip opening quote
      const valueStart = i;
      let escaped = false;
      while (i < len) {
        if (escaped) {
          escaped = false;
          i++;
          continue;
        }
        if (attributeList[i] === '\\') {
          escaped = true;
          i++;
          continue;
        }
        if (attributeList[i] === '"') {
          break;
        }
        i++;
      }
      value = attributeList.slice(valueStart, i);
      // Unescape the value
      value = value.replace(/\\(.)/g, '$1');
      i++; // Skip closing quote
    } else {
      // Unquoted value
      const valueStart = i;
      while (i < len && attributeList[i] !== ',' && attributeList[i] !== ' ') {
        i++;
      }
      value = attributeList.slice(valueStart, i).trim();
    }

    if (key) {
      attributes[key] = value;
    }
  }

  return attributes;
}

/**
 * Parse a resolution string (e.g., "640x360")
 *
 * @param resolution - Resolution string
 * @returns Object with width and height, or null if invalid
 *
 * @example
 * ```ts
 * parseResolution('640x360') // => { width: 640, height: 360 }
 * ```
 */
export function parseResolution(resolution: string): { width: number; height: number } | null {
  const match = resolution.match(/^(\d+)x(\d+)$/);
  if (!match) {
    return null;
  }
  const width = Number.parseInt(match[1]!, 10);
  const height = Number.parseInt(match[2]!, 10);
  if (Number.isNaN(width) || Number.isNaN(height)) {
    return null;
  }
  return { width, height };
}

/**
 * Parse a byte range string (e.g., "123@456" or "123")
 *
 * @param byteRange - Byte range string
 * @returns Object with length and optional offset, or null if invalid
 *
 * @example
 * ```ts
 * parseByteRange('123@456') // => { length: 123, offset: 456 }
 * parseByteRange('123')      // => { length: 123 }
 * ```
 */
export function parseByteRange(byteRange: string): { length: number; offset?: number } | null {
  const match = byteRange.match(/^(\d+)(?:@(\d+))?$/);
  if (!match) {
    return null;
  }
  const length = Number.parseInt(match[1]!, 10);
  if (Number.isNaN(length)) {
    return null;
  }
  const offsetStr = match[2];
  if (offsetStr) {
    const offset = Number.parseInt(offsetStr, 10);
    if (Number.isNaN(offset)) {
      return null;
    }
    return { length, offset };
  }
  return { length };
}

