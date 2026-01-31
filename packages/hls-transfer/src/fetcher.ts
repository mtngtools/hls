/**
 * HTTP fetcher implementation using ofetch
 */

import { $fetch } from 'ofetch';
import type { Fetcher, FetchResponse, TransferContext } from '@mtngtools/hls-types';
import { FetchError } from '@mtngtools/hls-types';

/**
 * Get TextEncoder instance (available globally in Node.js 18+)
 */
function getTextEncoder(): { encode(input: string): Uint8Array } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (globalThis as any).TextEncoder();
}

/**
 * Get TextDecoder instance (available globally in Node.js 18+)
 */
function getTextDecoder(): { decode(input: ArrayBuffer | Uint8Array): string } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (globalThis as any).TextDecoder();
}

/**
 * OfetchFetcher - HTTP fetcher implementation using ofetch
 */
export class OfetchFetcher implements Fetcher {
  private encoder = getTextEncoder();
  private decoder = getTextDecoder();

  /**
   * Fetch a resource
   *
   * @param url - URL to fetch
   * @param context - Transfer context
   * @returns Promise resolving to response
   */
  async fetch(url: string, context: TransferContext): Promise<FetchResponse> {
    const sourceConfig = context.config.source.config;
    const headers = sourceConfig.headers || {};

    try {
      const response = await $fetch.raw(url, {
        headers,
        timeout: sourceConfig.timeout,
        retry: sourceConfig.retry?.maxRetries || 0,
        retryDelay: sourceConfig.retry?.retryDelay || 1000,
      });

      // Extract response properties (ofetch.raw returns response with _data property)
      const responseData = (response as { _data?: unknown })._data;
      const responseObj = response as {
        headers?: Headers | Record<string, string>;
        status?: number;
        statusText?: string;
      };

      const responseHeaders: FetchResponse['headers'] =
        (responseObj.headers as FetchResponse['headers']) || {};
      const status = responseObj.status || 200;
      const statusText = responseObj.statusText || 'OK';

      return {
        text: async () => {
          // Handle Blob objects (from MSW or fetch API)
          if (responseData && typeof responseData === 'object' && 'text' in responseData && typeof (responseData as { text?: () => Promise<string> }).text === 'function') {
            return await (responseData as { text: () => Promise<string> }).text();
          }
          if (typeof responseData === 'string') {
            return responseData;
          }
          if (responseData instanceof ArrayBuffer) {
            return this.decoder.decode(responseData);
          }
          if (responseData instanceof Uint8Array) {
            return this.decoder.decode(responseData);
          }
          // Handle Blob directly
          if (responseData && typeof responseData === 'object' && 'constructor' in responseData && (responseData as { constructor?: { name?: string } }).constructor?.name === 'Blob') {
            const blob = responseData as Blob;
            return await blob.text();
          }
          return String(responseData || '');
        },
        arrayBuffer: async (): Promise<ArrayBuffer> => {
          if (responseData instanceof ArrayBuffer) {
            return responseData;
          }
          if (responseData instanceof Uint8Array) {
            const buffer = new ArrayBuffer(responseData.byteLength);
            new Uint8Array(buffer).set(responseData);
            return buffer;
          }
          if (typeof responseData === 'string') {
            const encoded = this.encoder.encode(responseData);
            const buffer = new ArrayBuffer(encoded.byteLength);
            new Uint8Array(buffer).set(encoded);
            return buffer;
          }
          // Handle Blob directly
          if (responseData && typeof responseData === 'object' && 'constructor' in responseData && (responseData as { constructor?: { name?: string } }).constructor?.name === 'Blob') {
            const blob = responseData as Blob;
            return await blob.arrayBuffer();
          }
          return new ArrayBuffer(0);
        },
        headers: responseHeaders,
        status,
        statusText,
        ok: status >= 200 && status < 300,
      };
    } catch (error) {
      const cause = error instanceof Error ? error : new Error(String(error));
      const status = (error as { status?: number }).status;
      throw new FetchError(
        `Failed to fetch ${url}: ${cause.message}`,
        url,
        status,
        cause,
      );
    }
  }
}

