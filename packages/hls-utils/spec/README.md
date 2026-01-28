# HLS Utils Specification

**Package**: `@mtngtools/hls-utils`

## Overview

A collection of stateless, shared utility functions used across the HLS monorepo. This package aims to reduce code duplication and provide robust implementations for common tasks.

## Requirements

1.  **URL Manipulation**:
    - Resolve relative URLs against a base URL (essential for variant/chunk paths).
    - Parse and validate standard HLS URLs.
2.  **Time/Duration Parsing**:
    - Convert HLS duration strings/numbers to standardized formats.
    - Helper functions for timestamp calculations.
3.  **Attributes Parsing**:
    - Utilities to handle attribute lists in HLS tags (key=value pairs), handling quotes and escaping correctly.

## Alternatives Considered

- **Inline Utilities**: Considered repeating these small functions in each package. Rejected to prevent bugs from inconsistent implementations (especially URL resolving).
