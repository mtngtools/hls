/**
 * Default pipeline executor
 * Merges plugin overrides with default implementations
 */

import { Readable } from 'node:stream';
import { resolveUrl } from '@mtngtools/hls-utils';
import type {
  PipelineExecutor,
  DefaultImplementations,
  TransferPlugins,
  TransferContext,
  FetchResponse,
  MainManifest,
  Variant,
  VariantManifest,
  Chunk,
  TransferStream,
} from '@mtngtools/hls-types';

/**
 * DefaultPipelineExecutor - Executes pipeline steps with plugin fallback
 */
export class DefaultPipelineExecutor implements PipelineExecutor {
  constructor(
    public readonly defaults: DefaultImplementations,
    private plugins?: TransferPlugins,
  ) { }

  async fetchMainManifest(url: string, context: TransferContext): Promise<FetchResponse> {
    return (
      this.plugins?.fetchMainManifest?.(url, context) ??
      this.defaults.fetcher.fetch(url, context)
    );
  }

  async parseMainManifest(content: string, context: TransferContext): Promise<MainManifest> {
    return (
      this.plugins?.parseMainManifest?.(content, context) ??
      this.defaults.parser.parseMainManifest(content, context)
    );
  }

  async filterVariants(context: TransferContext): Promise<Variant[]> {
    if (this.plugins?.filterVariants) {
      return this.plugins.filterVariants(context);
    }

    // Default: return all variants from main manifest
    if (!context.mainManifest) {
      return [];
    }
    return context.mainManifest.variants;
  }

  async fetchVariantManifest(
    variant: Variant,
    context: TransferContext,
  ): Promise<FetchResponse> {
    if (this.plugins?.fetchVariantManifest) {
      return this.plugins.fetchVariantManifest(variant, context);
    }

    // Check if variant URI is absolute
    if (variant.uri.match(/^https?:\/\//)) {
      return this.defaults.fetcher.fetch(variant.uri, context);
    }

    // Resolve variant URI relative to main manifest URL
    const mainUrl = this.getMainManifestUrl(context);
    const variantUrl = resolveUrl(mainUrl, variant.uri);
    return this.defaults.fetcher.fetch(variantUrl, context);
  }

  /**
   * Get main manifest URL from context
   */
  private getMainManifestUrl(context: TransferContext): string {
    const sourceConfig = context.config.source;
    if (sourceConfig.mode === 'fetch' && 'url' in sourceConfig.config) {
      return sourceConfig.config.url;
    }
    throw new Error('Unsupported source mode or missing URL');
  }

  async parseVariantManifest(
    content: string,
    variant: Variant,
    context: TransferContext,
  ): Promise<VariantManifest> {
    return (
      this.plugins?.parseVariantManifest?.(content, variant, context) ??
      this.defaults.parser.parseVariantManifest(content, variant, context)
    );
  }

  async discoverChunks(
    manifest: VariantManifest,
    variant: Variant,
    context: TransferContext,
  ): Promise<Chunk[]> {
    if (this.plugins?.discoverChunks) {
      return this.plugins.discoverChunks(manifest, variant, context);
    }

    // Default: return all chunks from variant manifest
    return manifest.chunks;
  }

  async filterChunks(
    manifest: VariantManifest,
    variant: Variant,
    chunks: Chunk[],
    context: TransferContext,
  ): Promise<Chunk[]> {
    if (this.plugins?.filterChunks) {
      return this.plugins.filterChunks(manifest, variant, chunks, context);
    }

    // Default: return all chunks (no filtering)
    return chunks;
  }

  async createDestinationMainManifest(context: TransferContext): Promise<string> {
    if (this.plugins?.createDestinationMainManifest) {
      return this.plugins.createDestinationMainManifest(context);
    }

    // Default: serialize main manifest to M3U8 format
    if (!context.mainManifest) {
      throw new Error('Main manifest not available in context');
    }

    return this.serializeMainManifest(this.rewriteMainManifest(context.mainManifest));
  }

  async generateMainManifestPath(
    sourcePath: string,
    manifest: MainManifest,
    context: TransferContext,
  ): Promise<string> {
    if (this.plugins?.generateMainManifestPath) {
      return this.plugins.generateMainManifestPath(sourcePath, manifest, context);
    }

    // Default: use standardized 'main.m3u8' as the main manifest name
    // The user explicitly requested to avoid using the original source filename
    const fileName = 'main.m3u8';
    const destConfig = context.config.destination.config;
    if ('path' in destConfig) {
      // FileConfig
      return `${destConfig.path}/${fileName}`;
    }
    // For other config types, preserve source path
    return sourcePath;
  }

  async storeManifest(
    manifest: MainManifest | VariantManifest,
    path: string,
    context: TransferContext,
  ): Promise<void> {
    if (this.plugins?.storeManifest) {
      return this.plugins.storeManifest(manifest, path, context);
    }

    // Default: serialize manifest to string and store as stream
    const content =
      'variants' in manifest
        ? this.serializeMainManifest(this.rewriteMainManifest(manifest as MainManifest))
        : this.serializeVariantManifest(this.rewriteVariantManifest(manifest as VariantManifest));

    // Convert string to stream
    // Create a readable stream from the content string
    const stream = new Readable({
      read() {
        this.push(Buffer.from(content, 'utf-8'));
        this.push(null); // End stream
      },
    }) as TransferStream;
    await this.defaults.storage.store(stream, path, context);

    // Store source manifest copy at {path}.source.txt when available
    const sourceContent =
      'sourceContent' in manifest ? (manifest as { sourceContent?: string }).sourceContent : undefined;
    if (sourceContent) {
      const sourceStream = new Readable({
        read() {
          this.push(Buffer.from(sourceContent, 'utf-8'));
          this.push(null);
        },
      }) as TransferStream;
      await this.defaults.storage.store(sourceStream, `${path}.source.txt`, context);
    }
  }

  async createDestinationVariantManifest(
    chunks: Chunk[],
    variant: Variant,
    context: TransferContext,
  ): Promise<string> {
    if (this.plugins?.createDestinationVariantManifest) {
      return this.plugins.createDestinationVariantManifest(chunks, variant, context);
    }

    // Default: create variant manifest from chunks
    // Use the variant manifest from context if available, otherwise create new one
    const variantManifest: VariantManifest = {
      targetDuration: 10, // Default, should be calculated from chunks
      chunks,
      endList: true, // Assume VOD
    };

    // Rewrite chunk URIs to be simple filenames
    // Since chunks are in the same folder as variant manifest, we just need the filename
    const rewrittenManifest = this.rewriteVariantManifest(variantManifest);

    return this.serializeVariantManifest(rewrittenManifest);
  }

  async generateVariantManifestPath(
    sourcePath: string,
    variant: Variant,
    context: TransferContext,
  ): Promise<string> {
    if (this.plugins?.generateVariantManifestPath) {
      return this.plugins.generateVariantManifestPath(sourcePath, variant, context);
    }

    // Default: use subfolder structure for absolute URLs or if requested
    // If variant.uri is absolute, we MUST use a subfolder to avoid collisions
    const isAbsolute = variant.uri.match(/^https?:\/\//);

    if (isAbsolute) {
      const subfolder = this.getVariantPath(variant);
      const destConfig = context.config.destination.config;
      if ('path' in destConfig) {
        return `${destConfig.path}/${subfolder}index.m3u8`;
      }
      return `${subfolder}index.m3u8`;
    }

    const fileName = this.getFileName(sourcePath) || 'variant.m3u8';
    const destConfig = context.config.destination.config;
    if ('path' in destConfig) {
      // FileConfig
      return `${destConfig.path}/${fileName}`;
    }
    return sourcePath;
  }

  async downloadChunk(chunk: Chunk, context: TransferContext): Promise<TransferStream> {
    if (this.plugins?.downloadChunk) {
      return this.plugins.downloadChunk(chunk, context);
    }

    // Check for absolute URI
    if (chunk.uri.match(/^https?:\/\//)) {
      const response = await this.defaults.fetcher.fetch(chunk.uri, context);
      const arrayBuffer = await response.arrayBuffer();
      const { Readable } = await import('node:stream');
      return Readable.from([new Uint8Array(arrayBuffer)]) as TransferStream;
    }

    // Resolve chunk URI relative to variant manifest URL
    // The variant URL should be stored in context.metadata when fetching the variant
    const variantUrl = (context.metadata.variantUrl as string) || this.getVariantUrlFromContext(context);
    const chunkUrl = variantUrl ? resolveUrl(variantUrl, chunk.uri) : chunk.uri;

    // Default: fetch chunk using fetcher
    const response = await this.defaults.fetcher.fetch(chunkUrl, context);
    const arrayBuffer = await response.arrayBuffer();
    const { Readable } = await import('node:stream');
    return Readable.from([new Uint8Array(arrayBuffer)]) as TransferStream;
  }

  /**
   * Get variant URL from context
   * Tries to reconstruct it from main manifest and variant URI
   */
  private getVariantUrlFromContext(context: TransferContext): string | undefined {
    if (!context.mainManifest || !context.filteredVariants || context.filteredVariants.length === 0) {
      return undefined;
    }
    // Use the first filtered variant (in practice, we'd need the specific variant)
    // This is a fallback - ideally the variant URL should be stored in metadata
    const mainUrl = this.getMainManifestUrl(context);
    const variant = context.filteredVariants[0];
    if (variant) {
      return resolveUrl(mainUrl, variant.uri);
    }
    return undefined;
  }

  /**
   * Get variant path for subfolder structure (e.g., "1200000/")
   */
  private getVariantPath(variant: Variant): string {
    return `${variant.bandwidth}/`;
  }

  /**
   * Rewrite main manifest URIs for storage
   */
  private rewriteMainManifest(manifest: MainManifest): MainManifest {
    // Clone manifest to avoid mutating original
    const newManifest = { ...manifest };

    // Rewrite variant URIs to match destination structure
    newManifest.variants = newManifest.variants.map(variant => {
      // Use getVariantPath logic to determine destination URI relative to main manifest
      // If original was absolute, we forced a subfolder
      const isAbsolute = variant.uri.match(/^https?:\/\//);
      if (isAbsolute) {
        return {
          ...variant,
          uri: `${this.getVariantPath(variant)}index.m3u8`,
        };
      }
      return variant;
    });

    return newManifest;
  }

  /**
   * Rewrite variant manifest URIs for storage
   */
  private rewriteVariantManifest(manifest: VariantManifest): VariantManifest {
    // Clone manifest to avoid mutating original
    const newManifest = { ...manifest };

    // Rewrite chunk URIs to be simple filenames
    newManifest.chunks = newManifest.chunks.map(chunk => ({
      ...chunk,
      uri: this.getChunkFileName(chunk, manifest),
    }));

    return newManifest;
  }

  /**
   * Extracts the filename from a given path.
   * @param path The full path or URL.
   * @returns The filename, or an empty string if not found.
   */
  private getFileName(path: string): string {
    return path.split('/').pop() || '';
  }

  async generateChunkPath(
    sourcePath: string,
    variant: Variant,
    manifest: VariantManifest,
    chunk: Chunk,
    context: TransferContext,
  ): Promise<string> {
    if (this.plugins?.generateChunkPath) {
      return this.plugins.generateChunkPath(sourcePath, variant, manifest, chunk, context);
    }

    // Default: Generate clean filename
    const fileName = this.getChunkFileName(chunk, manifest);

    // 3. Determine parent folder based on variant
    // If variant.uri is absolute, we used a subfolder for it, so chunks go there too
    const isVariantAbsolute = variant.uri.match(/^https?:\/\//);
    const subfolder = isVariantAbsolute ? this.getVariantPath(variant) : '';

    const destConfig = context.config.destination.config;
    if ('path' in destConfig) {
      // FileConfig
      return `${destConfig.path}/${subfolder}${fileName}`;
    }
    return `${subfolder}${fileName}`;
  }

  /**
   * Generate simpler chunk filename
   */
  private getChunkFileName(chunk: Chunk, manifest: VariantManifest): string {
    // 1. Strip query params
    const cleanUri = chunk.uri.split(/[?#]/)[0] ?? '';

    // 2. Check for number pattern in filename
    const basename = cleanUri.split('/').pop() || '';
    const numberMatch = basename.match(/(\d+)\.ts$/);

    if (numberMatch) {
      // Use the number found in the original filename
      return numberMatch[0];
    }

    // Fallback: use index in manifest chunks list
    const index = manifest.chunks.indexOf(chunk);
    return `${index}.ts`;
  }

  async storeChunk(
    stream: TransferStream,
    path: string,
    chunk: Chunk,
    context: TransferContext,
  ): Promise<void> {
    return (
      this.plugins?.storeChunk?.(stream, path, chunk, context) ??
      this.defaults.storage.store(stream, path, context)
    );
  }

  async finalize(context: TransferContext): Promise<void> {
    if (this.plugins?.finalize) {
      return this.plugins.finalize(context);
    }

    // Default: no-op
    return Promise.resolve();
  }

  /**
   * Serialize main manifest to M3U8 format
   */
  private serializeMainManifest(manifest: MainManifest): string {
    const lines: string[] = ['#EXTM3U'];

    if (manifest.version !== undefined) {
      lines.push(`#EXT-X-VERSION:${manifest.version}`);
    }

    if (manifest.independentSegments) {
      lines.push('#EXT-X-INDEPENDENT-SEGMENTS');
    }

    if (manifest.start) {
      const startLine = `#EXT-X-START:TIME-OFFSET=${manifest.start.timeOffset}`;
      if (manifest.start.precise) {
        lines.push(`${startLine},PRECISE=YES`);
      } else {
        lines.push(startLine);
      }
    }

    if (manifest.sessionData) {
      for (const sessionData of manifest.sessionData) {
        const attrs: string[] = [`DATA-ID="${sessionData.dataId}"`];
        if (sessionData.value) {
          attrs.push(`VALUE="${sessionData.value}"`);
        }
        if (sessionData.uri) {
          attrs.push(`URI="${sessionData.uri}"`);
        }
        if (sessionData.language) {
          attrs.push(`LANGUAGE="${sessionData.language}"`);
        }
        lines.push(`#EXT-X-SESSION-DATA:${attrs.join(',')}`);
      }
    }

    if (manifest.sessionKeys) {
      for (const sessionKey of manifest.sessionKeys) {
        const attrs: string[] = [`METHOD=${sessionKey.method}`];
        if (sessionKey.uri) {
          attrs.push(`URI="${sessionKey.uri}"`);
        }
        if (sessionKey.iv) {
          attrs.push(`IV=${sessionKey.iv}`);
        }
        if (sessionKey.keyFormat) {
          attrs.push(`KEYFORMAT="${sessionKey.keyFormat}"`);
        }
        if (sessionKey.keyFormatVersions) {
          attrs.push(`KEYFORMATVERSIONS="${sessionKey.keyFormatVersions}"`);
        }
        lines.push(`#EXT-X-SESSION-KEY:${attrs.join(',')}`);
      }
    }

    for (const variant of manifest.variants) {
      const attrs: string[] = [`BANDWIDTH=${variant.bandwidth}`];
      if (variant.averageBandwidth) {
        attrs.push(`AVERAGE-BANDWIDTH=${variant.averageBandwidth}`);
      }
      if (variant.codecs) {
        attrs.push(`CODECS="${variant.codecs}"`);
      }
      if (variant.resolution) {
        attrs.push(`RESOLUTION=${variant.resolution.width}x${variant.resolution.height}`);
      }
      if (variant.frameRate) {
        attrs.push(`FRAME-RATE=${variant.frameRate}`);
      }
      if (variant.hdcpLevel) {
        attrs.push(`HDCP-LEVEL=${variant.hdcpLevel}`);
      }
      if (variant.audio) {
        attrs.push(`AUDIO="${variant.audio}"`);
      }
      if (variant.video) {
        attrs.push(`VIDEO="${variant.video}"`);
      }
      if (variant.subtitles) {
        attrs.push(`SUBTITLES="${variant.subtitles}"`);
      }
      if (variant.closedCaptions) {
        attrs.push(`CLOSED-CAPTIONS="${variant.closedCaptions}"`);
      }
      lines.push(`#EXT-X-STREAM-INF:${attrs.join(',')}`);
      lines.push(variant.uri);
    }

    return lines.join('\n');
  }

  /**
   * Serialize variant manifest to M3U8 format
   */
  private serializeVariantManifest(manifest: VariantManifest): string {
    const lines: string[] = ['#EXTM3U'];

    if (manifest.version !== undefined) {
      lines.push(`#EXT-X-VERSION:${manifest.version}`);
    }

    lines.push(`#EXT-X-TARGETDURATION:${manifest.targetDuration}`);

    if (manifest.mediaSequence !== undefined) {
      lines.push(`#EXT-X-MEDIA-SEQUENCE:${manifest.mediaSequence}`);
    }

    if (manifest.discontinuitySequence !== undefined) {
      lines.push(`#EXT-X-DISCONTINUITY-SEQUENCE:${manifest.discontinuitySequence}`);
    }

    if (manifest.playlistType) {
      lines.push(`#EXT-X-PLAYLIST-TYPE:${manifest.playlistType}`);
    }

    let currentKey: Chunk['key'] | null = null;
    let currentMap: Chunk['map'] | null = null;

    for (const chunk of manifest.chunks) {
      // Output key if changed
      if (chunk.key && chunk.key !== currentKey) {
        currentKey = chunk.key;
        const keyAttrs: string[] = [`METHOD=${chunk.key.method}`];
        if (chunk.key.uri) {
          keyAttrs.push(`URI="${chunk.key.uri}"`);
        }
        if (chunk.key.iv) {
          keyAttrs.push(`IV=${chunk.key.iv}`);
        }
        lines.push(`#EXT-X-KEY:${keyAttrs.join(',')}`);
      }

      // Output map if changed
      if (chunk.map && chunk.map !== currentMap) {
        currentMap = chunk.map;
        const mapAttrs: string[] = [`URI="${chunk.map.uri}"`];
        if (chunk.map.byteRange) {
          mapAttrs.push(
            `BYTERANGE="${chunk.map.byteRange.length}@${chunk.map.byteRange.offset}"`,
          );
        }
        lines.push(`#EXT-X-MAP:${mapAttrs.join(',')}`);
      }

      // Output discontinuity if present
      if (chunk.discontinuity) {
        lines.push('#EXT-X-DISCONTINUITY');
      }

      // Output program date time if present
      if (chunk.programDateTime) {
        const isoString = chunk.programDateTime.toISOString();
        lines.push(`#EXT-X-PROGRAM-DATE-TIME:${isoString}`);
      }

      // Output chunk info
      const duration = chunk.duration.toFixed(3);
      const chunkLine = chunk.title
        ? `#EXTINF:${duration},"${chunk.title}"`
        : `#EXTINF:${duration}`;

      if (chunk.byteRange) {
        lines.push(
          `#EXT-X-BYTERANGE:${chunk.byteRange.length}@${chunk.byteRange.offset}`,
        );
      }

      lines.push(chunkLine);
      lines.push(chunk.uri);
    }

    if (manifest.endList) {
      lines.push('#EXT-X-ENDLIST');
    }

    return lines.join('\n');
  }
}

