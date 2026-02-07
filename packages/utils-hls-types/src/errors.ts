/**
 * Error types for HLS operations
 * Used across all packages for consistent error handling
 */

/**
 * Base error class for all HLS-related errors
 */
export class HlsError extends Error {
  /**
   * Error code for programmatic error handling
   */
  public readonly code: string;

  /**
   * Additional context about the error
   */
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((Error as any).captureStackTrace) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when manifest parsing fails
 */
export class ManifestParseError extends HlsError {
  /**
   * Line number where parsing failed (if available)
   */
  public readonly line?: number;

  constructor(message: string, line?: number, cause?: Error) {
    super(
      message,
      'MANIFEST_PARSE_ERROR',
      { line },
      { cause },
    );
    this.line = line;
  }
}

/**
 * Error thrown when HTTP fetching fails
 */
export class FetchError extends HlsError {
  /**
   * URL that failed to fetch
   */
  public readonly url: string;

  /**
   * HTTP status code (if available)
   */
  public readonly status?: number;

  constructor(
    message: string,
    url: string,
    status?: number,
    cause?: Error,
  ) {
    super(
      message,
      'FETCH_ERROR',
      { url, status },
      { cause },
    );
    this.url = url;
    this.status = status;
  }

  /**
   * Whether this error is retryable
   * 5xx errors and network errors are retryable
   */
  get isRetryable(): boolean {
    // No status means network error (retryable)
    if (!this.status) {
      return true;
    }
    // 5xx errors are retryable
    if (this.status >= 500 && this.status < 600) {
      return true;
    }
    // 429 (Too Many Requests) is retryable
    if (this.status === 429) {
      return true;
    }
    // 408 (Request Timeout) is retryable
    if (this.status === 408) {
      return true;
    }
    return false;
  }
}

/**
 * Error thrown when storage operations fail
 */
export class StorageError extends HlsError {
  /**
   * Path where storage operation failed
   */
  public readonly path: string;

  constructor(message: string, path: string, cause?: Error) {
    super(
      message,
      'STORAGE_ERROR',
      { path },
      { cause },
    );
    this.path = path;
  }
}

/**
 * Error thrown when transfer orchestration fails
 */
export class TransferError extends HlsError {
  /**
   * Pipeline step where error occurred
   */
  public readonly step?: string;

  constructor(
    message: string,
    step?: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(
      message,
      'TRANSFER_ERROR',
      { step, ...context },
      { cause },
    );
    this.step = step;
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends HlsError {
  /**
   * Field that failed validation
   */
  public readonly field?: string;

  constructor(
    message: string,
    field?: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      { field, ...context },
      { cause },
    );
    this.field = field;
  }
}

