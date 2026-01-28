# HLS Parser Specification

**Package**: `@mtngtools/hls-parser`

## Overview

A lightweight, zero-dependency parser for HLS M3U8 manifests. It is designed to be compatible with parsing both Master and Variant playlists.

## Requirements

1.  **Zero Dependencies**: Validly parse M3U8 without external libraries like `m3u8-parser`.
2.  **Web Standards Compatible**: Usable in Node.js, Cloudflare Workers, and Browsers.
3.  **Parsing Capabilities**:
    *   **Master Playlist (`MasterManifest`)**:
        *   Extract `version` and `independentSegments`.
        *   Parse specific start time offset (`start: { timeOffset, precise }`).
        *   Extract `variants` list (see below).
        *   Extract session data (`sessionData`) and keys (`sessionKeys`).
    *   **Variant (`Variant`)**:
        *   Capture `uri`, `bandwidth`, `averageBandwidth`.
        *   Parse `codecs`, `resolution`, `frameRate`, `hdcpLevel`.
        *   Identify associated `audio`, `video`, `subtitles`, `closedCaptions` groups.
    *   **Media Playlist (`VariantManifest`)**:
        *   Extract `version`, `targetDuration`, `mediaSequence`, `discontinuitySequence`.
        *   Identify `playlistType` ('VOD' or 'EVENT') and `endList` status.
        *   Extract list of `chunks` (see below).
    *   **Chunk (`Chunk`)**:
        *   Capture `uri`, `duration`, `title`.
        *   Support `byteRange` (length, offset).
        *   Identify `discontinuity` flags.
        *   Parse `key` (method, uri, iv) and `map` (uri, byteRange) information.
    *   **Tags Support**: Support common standard tags (EXT-X-STREAM-INF, EXTINF, EXT-X-KEY, etc.).
4.  **Output**: Return structured, typed objects (defined in [`@mtngtools/hls-types`](../../hls-types/spec/README.md)).

## Alternatives Considered

- **Using `m3u8-parser`**: Rejected due to unnecessary polyfills and size.
- **Regex-based Parsing**: Rejected in favor of a robust line-by-line tokenizer to handle edge cases (quoted strings, comments) more reliably.
