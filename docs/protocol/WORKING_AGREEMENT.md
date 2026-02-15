# Working Agreement: User & Antigravity (AI)

This document codifies how we work together to ensure high-quality software through TDD and structured planning.

## 1. The Core Lifecycle
Every significant change follows this "Strict TDD" loop:

1.  **Distill Feedback**: USER provides raw feedback. Antigravity distills it into a **Synthetic Story** in `USER_STORIES.md` to identify the Target Axiom and Mechanical Friction.
2.  **Contract (AC ID)**: Map the story to a new Acceptance Criteria ID in `QA_CHECKLIST.md` (Status: `[PENDING]`). This is the primary "Truth Contract."
3.  **Implementation Plan**: Antigravity creates an `implementation_plan.md` artifact. **Work stops** until USER approves (with a "yay" or similar).
4.  **Red (Tests First)**: Antigravity writes a failing Unit or E2E test, referencing the AC ID and related `[[Concept Atlas]]` mechanics.
5.  **Green (Implementation)**: Antigravity writes code to pass the test. Follow the **Atomic Feedback Loop** from the Atlas Skill if mechanics change.
6.  **Blue (Verification)**: Antigravity runs the **full suite** to ensure no regressions.
7.  **Archive**: The story/spec is moved to `docs/archive/backlog/`.


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

### Redline: Unfeasibility & Escalation
- **The Stop-Work Rule**: If during **Execution** or **Verification** a requirement is discovered to be technically unfeasible or in direct conflict with core UX Governance/Atlas Laws, Antigravity MUST:
    1.  **Pause** current Task.
    2.  Update the `implementation_plan.md` with an **Impact Analysis** and alternative options.
    3.  Call `notify_user` to initiate a **Decision Session**. 
    - *Iteration is expected; "hacking around the truth" is forbidden.*


## 3. Communication Standards
- **Task Boundaries**: I will use the Task View whenever I start a backlog item so you can track granularity.
- **Walkthroughs**: Every completed item will have a `walkthrough.md` with proof of work (test results, diffs).
- **Timestamps**: All significant documentation updates and artifact captures MUST include a `yyyy-mm-dd hh:mm:ss` timestamp to ensure chronological traceability in case of conflicts.

## 4. Definition of Done (DoD)
An item is considered **Done** only when:
- [ ] Code follows project style (Svelte 5 runes, TypeScript).
- [ ] **Atlas Coherence**: If a new behavior was added, the `[[Concept Atlas]]` has been updated/referenced.
- [ ] At least one new test covers the specific fix/feature.
- [ ] Full `npm test` and `npm run e2e` suites are green.
- [ ] The backlog spec is moved to the archive.
- [ ] Changes are pushed to `main`.
