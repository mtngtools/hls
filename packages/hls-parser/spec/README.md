# HLS Parser Specification

**Package**: `@mtngtools/hls-parser`

## Overview

A lightweight, zero-dependency parser for HLS M3U8 manifests. It is designed to be compatible with parsing both Master and Variant playlists.

## Requirements

1.  **Zero Dependencies**: Must validly parse M3U8 without external libraries like `m3u8-parser`.
2.  **Web Standards Compatible**: Usable in Node.js, Cloudflare Workers, and Browsers.
3.  **Parsing Capabilities**:
    - **Master Playlist**: Extract Variants, Audio groups, Subtitles.
    - **Media Playlist**: Extract Segments (Chunks), Duration, Sequence numbers, Discontinuity tags.
    - **Tags Support**: Support common standard tags (EXT-X-STREAM-INF, EXTINF, EXT-X-KEY, etc.).
4.  **Output**: Return structured, typed objects (defined in `@mtngtools/hls-types`).

## Alternatives Considered

- **Using `m3u8-parser`**: Rejected due to unnecessary polyfills and size.
- **Regex-based Parsing**: Rejected in favor of a robust line-by-line tokenizer to handle edge cases (quoted strings, comments) more reliably.
