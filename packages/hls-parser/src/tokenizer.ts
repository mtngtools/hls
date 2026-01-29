/**
 * M3U8 tokenizer - line-by-line parsing with quote/comment handling
 */

/**
 * Token types for M3U8 parsing
 */
export type TokenType = 'TAG' | 'URI' | 'COMMENT' | 'EMPTY';

/**
 * Token structure
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
}

/**
 * Tokenize M3U8 content into lines and tokens
 *
 * @param content - M3U8 manifest content
 * @returns Array of tokens
 */
export function tokenize(content: string): Token[] {
  const tokens: Token[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    const lineNumber = i + 1;

    // Empty line
    if (line.length === 0) {
      tokens.push({ type: 'EMPTY', value: '', line: lineNumber });
      continue;
    }

    // Tag (starts with #EXT) - check before comment to avoid misclassification
    if (line.startsWith('#EXT')) {
      tokens.push({ type: 'TAG', value: line, line: lineNumber });
      continue;
    }

    // Comment (starts with # but not #EXT)
    if (line.startsWith('#')) {
      tokens.push({ type: 'COMMENT', value: line, line: lineNumber });
      continue;
    }

    // URI (everything else)
    tokens.push({ type: 'URI', value: line, line: lineNumber });
  }

  return tokens;
}

/**
 * Extract tag name from a tag line
 *
 * @param tagLine - Full tag line (e.g., "#EXT-X-VERSION:3")
 * @returns Tag name (e.g., "EXT-X-VERSION")
 */
export function extractTagName(tagLine: string): string {
  const colonIndex = tagLine.indexOf(':');
  if (colonIndex === -1) {
    return tagLine.slice(1); // Remove #
  }
  return tagLine.slice(1, colonIndex);
}

/**
 * Extract tag value from a tag line
 *
 * @param tagLine - Full tag line (e.g., "#EXT-X-VERSION:3")
 * @returns Tag value (e.g., "3") or empty string if no value
 */
export function extractTagValue(tagLine: string): string {
  const colonIndex = tagLine.indexOf(':');
  if (colonIndex === -1) {
    return '';
  }
  return tagLine.slice(colonIndex + 1);
}

