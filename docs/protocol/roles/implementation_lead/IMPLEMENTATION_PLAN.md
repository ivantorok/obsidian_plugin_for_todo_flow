# Implementation Plan: Watcher Silencing (Sovereign Handoff)

**Context**: Empty Stack Regression after Triage (Desktop)
**Role**: Implementation Lead (IL)
**Strategy**: "Watcher Silencing" to prevent race conditions between memory handoff and disk updates.

## Technical Design

### 1. NavigationManager: Watcher Controls
- Add `isSilenced` flag.
- Add `silence()` method: sets `isSilenced = true`.
- Add `resume()` method: sets `isSilenced = false`.
- Update `registerWatcher()`: if `this.isSilenced` is true, ignore the `changed` event.

### 2. StackView: Remote Control
- Add `silenceWatcher()`: calls `this.navManager.silence()`.
- Add `resumeWatcher()`: calls `this.navManager.resume()`.

### 3. main.ts: Orchestration
- In `activateTriage` completion:
    - Locate active `StackView`.
    - Call `view.silenceWatcher()`.
    - Perform `saveStack` and `activateStack` (Direct Injection).
    - Call `view.resumeWatcher()`.

## Verification Strategy
1.  **Unit Test**: Extend `src/__tests__/handoff_regression.test.ts` to mock a `changed` event firing immediately after handoff and verify `refresh()` is NOT called.
2.  **E2E Test**: Run `npm run test:quick` to ensure no side effects on standard transitions.
