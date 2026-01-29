# Test Structure

This package uses Vitest for testing with the following structure:

## Directory Structure

```
tests/
├── unit/          # Unit tests for individual functions/modules
├── integration/   # Integration tests for component interactions
├── e2e/           # End-to-end tests (only run with E2E_ENABLED=true)
└── fixtures/      # Test fixtures (sample M3U8 files, etc.)
```

## Running Tests

```bash
# Run unit and integration tests (default)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run all tests including e2e
E2E_ENABLED=true pnpm test

# Or use the shortcut
pnpm test:e2e
```

## Test Organization

- **Unit tests**: Test individual functions in isolation
- **Integration tests**: Test interactions between components
- **E2E tests**: Test full workflows (may require external services)

## Fixtures

Test fixtures are stored in `tests/fixtures/` and include sample M3U8 files for testing parser functionality.
