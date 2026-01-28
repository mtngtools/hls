# HLS Types Specification

**Package**: `@mtngtools/hls-types`

## Overview

This package serves as the single source of truth for TypeScript interfaces and types used across the monorepo. It ensures consistency in data structures in all packages.

## Requirements

* Each package will have specifications for interfaces and types that need to be defined. 

* Each type and interfaces should reference the principal package with its specification.
    * Consider organizing into one .ts file per implementation package

## Alternatives Considered

- **Co-locating types with code**: Considered keeping types in their respective packages. Rejected to prevent circular dependencies and allow packages (like the CLI or Plugins) to depend solely on types without pulling in implementation code.
