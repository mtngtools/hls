# compose-hls-cli

**Package**: `@mtngtools/compose-hls-cli`

## Overview

A command-line interface that extends `frame-hls-cli` functionality to support AWS S3 transfers.

## Features

*   **S3 Destinations**: Supports passing S3 buckets natively as transfer destinations (e.g., `s3://my-bucket/hls-output/`).
*   **Configuration Integration**: Parses AWS credentials and region from standard environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`) or shared credentials profiles implicitly via SDK patterns.
*   **Advanced S3 Flags**: Extends `frame-hls-cli` with custom arguments:
    *   `--m3u8-name <name>`: Overrides the generated master playlist filename.
    *   `--no-verify`: Disables the automatic AWS chunk verification step.
    *   `--acl <policy>`: Sets the S3 Object Access Control List natively (e.g. `--acl public-read`).
*   **Feature Parity**: Provides all the same core transfer options, progress tracking UI, and filtering behaviors existing in `frame-hls-cli`.

## Usage

```bash
# Transfer from a URL to an AWS S3 bucket directly utilizing fast native SDK implementation
pnpm compose-hls-cli transfer https://example.com/master.m3u8 s3://my-destination-bucket/hls-output/ --m3u8-name my-index --acl public-read
```
