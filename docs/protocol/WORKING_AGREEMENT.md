# Working Agreement: User & Antigravity (AI)

This document codifies how we work together to ensure high-quality software through TDD and structured planning.

## 1. The Core Lifecycle
Every significant change follows this "Strict TDD" loop:

1.  **Backlog Item**: USER creates a spec in `docs/backlog/` using the [TEMPLATE](../backlog/TEMPLATE.md).
2.  **Implementation Plan**: Antigravity creates an `implementation_plan.md` artifact. **Work stops** until USER approves (with a "yay" or similar).
3.  **Red (Tests First)**: Antigravity writes a failing Unit or E2E test.
4.  **Green (Implementation)**: Antigravity writes the code to pass the test.
5.  **Blue (Verification)**: Antigravity runs the **full suite** (via the `pre-push` hook logic) to ensure no regressions.
6.  **Archive**: The spec is moved to `docs/archive/backlog/`.

## 2. Shared Expectations

### What USER Expects from Antigravity
- **No Invisible Code**: I will not make logic changes without a covering test.
- **Fail-Fast**: I will report if a requirement is technically unfeasible during the Planning phase.
- **Traceability**: Every commit should be linked to a Backlog ID (e.g., `feat(BUG-001): ...`).
- **Standardized UI**: I will maintain "Rich Aesthetics" as defined in my core instructions (vibrant colors, smooth transitions).

### What Antigravity Expects from USER
- **Clear "Expected Behavior"**: The most important part of the backlog spec. It tells me exactly when I'm allowed to stop coding.
- **The "Yay" Protocol**: Please provide explicit approval on implementation plans to avoid wasted work.
- **Contextual Feedback**: Use the `notify_user` or artifact comments to provide feedback during planning.

## 3. Communication Standards
- **Task Boundaries**: I will use the Task View whenever I start a backlog item so you can track granularity.
- **Walkthroughs**: Every completed item will have a `walkthrough.md` with proof of work (test results, diffs).

## 4. Definition of Done (DoD)
An item is considered **Done** only when:
- [ ] Code follows project style (Svelte 5 runes, TypeScript).
- [ ] **Atlas Coherence**: If a new behavior was added, the `[[Concept Atlas]]` has been updated/referenced.
- [ ] At least one new test covers the specific fix/feature.
- [ ] Full `npm test` and `npm run e2e` suites are green.
- [ ] The backlog spec is moved to the archive.
- [ ] Changes are pushed to `main`.
