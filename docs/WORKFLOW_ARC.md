# Todo Flow: The Arc of Work

This document defines the process for transforming a User Story (synthetic or real) into a verified, deployed feature or fix. We use a combined **BDD (Behavior Driven Development)** and **TDD (Test Driven Development)** approach, governed by our [UX_GOVERNANCE.md](file:///home/ivan/obsidian_plugin_for_todo_flow/docs/UX_GOVERNANCE.md).

---

## 🌊 The Workflow Arc

### Phase 1: Ingestion & The "Rubbish" Filter
Every story must be evaluated before a single line of code is written.

1.  **Atlas Alignment**: Check the `[[Concept Atlas]]`. Does this story conflict with any `[[MECHANICS]]`? Does it belong to an existing `[[STAGE]]`?
2.  **Home Row Alignment**: Does this story serve the "Home Row First" philosophy?
3.  **Conflict Check**: Does it violate any Axioms in `UX_GOVERNANCE.md`?
4.  **Scope**: Is this trying to solve a problem that belongs to the Obsidian Editor rather than the Todo Flow Stack?
5.  **Decision**:
    *   **ACCEPT**: If it aligns with the Atlas and fixes a regression without breaking axioms.
    *   **REFINE**: If the intent is good but require an Atlas update (new Primitive).
    *   **REJECT**: If it is "rubbish" (contradictory, out-of-scope, or harmful to UX).

### Phase 2: BDD (The Journey)
Once accepted, define the behavior from the user's perspective.

1.  **Action**: Create or update an E2E Journey Spec in `tests/e2e/journeys/`.
2.  **State**: **RED**. The test must fail because the feature/fix doesn't exist yet.
3.  **Goal**: Validate that "The World" behaves as the story describes.

### Phase 3: TDD (The Implementation)
Break the journey down into technical components.

1.  **Action**: Identify the logic (e.g., `StackController`, `GestureManager`).
2.  **Action**: Write failing unit tests for the specific logic changes.
3.  **State**: **RED**.
4.  **Action**: Write the minimum code required to make the unit tests pass (**GREEN**).

### Phase 4: Verification (The Golden Suite)
Closing the loop.

1.  **Local Green**: The new E2E Journey Spec passes.
2.  **Global Green (The Golden Suite)**: Run ALL journey tests to ensure no regressions in focus sovereignty or gesture shadowing.
3.  **Manual Check**: Perform the "Focus Regression" check defined in `UX_GOVERNANCE.md`.

### Phase 5: Shipping
1.  **Action**: Run `./ship.sh "feat/fix: story description"`.
2.  **Archive**: Move any related backlog items to the archive.

---

## 📥 Story Processing Template

Use this template when a new story (or half-sentence bug report) is provided.

```markdown
### [STORY TITLE]

**1. The Story (Real or Synthetic)**:
> [Paste Input Here]

**2. Governance & Alignment Check**:
- [ ] **Focus Sovereignty**: Does this break the `StackView` focus rule?
- [ ] **Gesture Hierarchy**: Does this interfere with Obsidian system gestures?
- [ ] **Input Neutrality**: Does it respect the typing vs. commands exception?
- [ ] **Philosophy**: Is it "Home Row First" compatible?

**3. Decision**:
- [ ] **Accept**: Proceed to BDD (E2E Journey).
- [ ] **Refine**: Needs adjustment because [Reason].
- [ ] **Reject**: Rubbish/Conflict because [Reason].

**4. Technical Path**:
- E2E Spec: `tests/e2e/journeys/...`
- Unit Test: `src/__tests__/...`
```
