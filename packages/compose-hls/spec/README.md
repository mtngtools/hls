# compose-hls

**Package**: `@mtngtools/compose-hls`

## Overview

This package composes `frame-hls-base` and extends it with built-in, out-of-the-box support for accepting an AWS S3 bucket as an HLS transfer destination. 

It bridges core capabilities of base utilities and AWS-specific logic without injecting AWS dependencies into the fundamental classes.

## Architecture

*   **Setup**: It will act as a drop-in replacement or wrapper for `frame-hls-base` functions.
*   **Composition Setup**: Leverages transfer orchestration, chunk filtering, and manifest parsing logic identically from `frame-hls-base`.
*   **Extended Capabilities**: Automatically provisions an `AwsS3Storage` (from `provide-hls-aws`) when detecting `s3://` specific destination configurations, or similarly explicitly requested S3 destinations.

## Usage

Allows developers composing transfer pipelines to seamlessly pass their S3 configuration requirements and execute a transfer job identically to how they would utilizing pure file system execution.
