# Flaky Test Protocol

This protocol defines how to manage, verify, and bypass tests that exhibit non-deterministic behavior ("flakiness") in the Todo Flow plugin.

## Identified Flaky Tests
The following tests are currently identified as flaky due to environment instabilities (e.g., Obsidian startup time, file system sync, or keyboard event propagation):

1.  **`tests/e2e/drill-down.spec.ts`**: Fails when keyboard events (`Shift+Enter`) are missed by Obsidian. Mitigated by using direct API calls (`openLinkText`).
2.  **`tests/e2e/bug_007_verify.spec.ts`**: Fails when external file system modifications aren't indexed fast enough by Obsidian.
3.  **`tests/e2e/selective_flush.spec.ts`**: Stress tests the archive/reload race condition. Highly sensitive to timing and environment load.

## Working Procedure

### 1. Main E2E Suite (Pre-Push Hook)
The main E2E suite (`npm run e2e`) excludes flaky tests and should pass reliably during the pre-push hook.

### 2. Flaky Test Verification (Manual)
Before any release, developers SHOULD run the isolated flaky test suite to verify these tests still pass:

```bash
npm run test:flaky
```

**Note**: These tests are excluded from the pre-push hook because they are sensitive to environmental conditions (Obsidian startup time, file system sync, keyboard event timing).

### 3. Continuous Improvement
Tests should NOT remain in the flaky category indefinitely. Every developer is encouraged to:
- Use `browser.waitUntil` instead of fixed pauses.
- Use direct application API calls (`browser.execute`) for verification when the UI layer is the source of flakiness.
- Document and investigate the root cause of new flakiness immediately.
