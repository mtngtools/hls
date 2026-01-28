# HLS Transfer Specification

**Package**: `@mtngtools/hls-transfer`

## Overview

This package handles the actual data movement for HLS operations. It is responsible for fetching content via HTTP and writing content to storage (local filesystem, etc.). It provides concrete implementations of the abstract interfaces defined in [`@mtngtools/hls-core`](../../hls-core/spec/README.md).

## Transfer Modes

1.  **HTTP Fetching**:
    *   mode = `fetch`
    *   Must use `ofetch` for HTTP requests.
    *   Support custom headers and configuration.

2.  **File Storage**:
    *   mode = `file`
    *   Support file system writing operations.
    *   Stream data to disk where possible to minimize memory usage.

3.  **Custom Storage**:
    *   mode = `custom`
    *   For example, writing to S3 bucket with AWS SDK. 
    *   Won't necessarily be implemented in this package, but including here for specification only.

### Source Modes

    * `fetch` with GET 

### Destination Modes

    * `fetch` with POST or PUT
    * `file`
    * `custom`

## API Surface

*   `OfetchFetcher`: Implementation of `Fetcher` interface using `ofetch`.
*   `FsStorage`: Implementation of `Storage` interface using Node.js `fs`.

