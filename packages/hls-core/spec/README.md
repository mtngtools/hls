# HLS Core Specification

**Package**: `@mtngtools/hls-core` (formerly `hls-transfer`)

## Overview

This package is the heart of the HLS utilities. It orchestrates the entire lifecycle of an HLS transfer or manipulation task. It is designed to be usable as a library in other applications (backends, scripts, etc.).

## Requirements

The core package must implement the following pipeline steps, each designed to be overridable via plugins/hooks:

1.  **Initial Manifest Fetching**:
    - Must use `ofetch` for robust HTTP requests.
    - Support custom headers (Auth, User-Agent).
2.  **Manifest Parsing**:
    - Parse Master and Variant playlists.
    - Extract variant streams and chunk lists.
3.  **Variant & Chunk Discovery**:
    - recursively discover all resources needed for the stream.
4.  **Content Transfer**:
    - Download chunks with configurable concurrency.
    - Support streaming downloads (memory efficient) where possible.
    - **Header Management**: Critical requirement to forward necessary tokens/cookies from manifest requests to chunk requests.
5.  **Storage**:
    - Abstraction for writing files to destination (Local schemes, mapped to generic "store" operations).

## Configuration

The transfer process must be configurable via a typed configuration object (`SourceConfig`, `TransferConfig`) that allows:
- **`fetch`**: Passing `ofetch` options or a custom `ofetch` instance.
- **Concurrency**: Limits for parallel downloads.
- **Plugins**: Overrides for any step in the pipeline.

## Alternatives Considered

- **Monolythic "Transfer" Function**: Considered a single giant function. Rejected in favor of a step-based pipeline to allow fine-grained plugin overrides (e.g., custom decryption during chunk download).
