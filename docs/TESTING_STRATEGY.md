# Testing Strategy & Quality Assurance

This document defines the **"Vertical Oversight"** of our quality assurance process. It bridges the gap between our Architectural Principles (`ARCHITECTURE.md`) and our specific testing implementation guides (`E2E_TESTING.md`).

## 1. The Hierarchy of Truth

When tests disagree, we need a hierarchy to determine which result "wins."

### Level 1: E2E (The User's Finger) 🥇
*   **Scope**: Full browser automation via WebdriverIO.
*   **Authority**: **Highest**. If an E2E test fails, the feature is broken for the user.
*   **What it proves**: "The feature works in the real world."

### Level 2: Integration (The Data Flow) 🥈
*   **Scope**: Svelte component mounting + Mocked Services.
*   **Authority**: **High**. Verifies that components talk to each other correctly.
*   **What it proves**: "The components are wired correctly."

### Level 3: Unit (The Mechanics) 🥉
*   **Scope**: Individual functions, classes, or isolated components.
*   **Authority**: **Medium**. These are the most likely to be "wrong" if they conflict with Architecture.
*   **What it proves**: "The logic is internally consistent."

---

## 2. Test Sovereignty & Architectural Alignment

Our tests must respect the same architectural rules as our production code. A test that violates architectural principles is a **buggy test**.

### Key Principle: Interaction Sovereignty
Just as `StackView` only responds to keys when focused, **tests must explicitly focus elements before interacting**.

*   ❌ **Bad Test**: Dispatching a global window event to test a component.
*   ✅ **Good Test**: `container.focus()`, then dispatch event to `container`.

### Key Principle: The Projection Principle
The UI is a projection of the Disk. Tests should verify that **Disk Writes** happened, not just that the UI updated.

*   ❌ **Bad Test**: Checking if a variable `isAnchored` changed in memory.
*   ✅ **Good Test**: Checking if the `onTaskUpdate` callback was fired with `isAnchored: true`, which implies a disk write.

---

## 3. Resolving Inconsistencies

What do you do when test levels disagree?

### Scenario A: Unit FAIL, E2E PASS
*   **Diagnosis**: The Unit Test is likely brittle or violates an architectural principle (e.g., it bypasses the `Focus` check that E2E naturally handles).
*   **Action**: **Fix the Test**. Make the unit test accurately simulate the architectural constraint.

### Scenario B: Unit PASS, E2E FAIL
*   **Diagnosis**: The component works in isolation, but fails in reality. Likely a CSS issue (`z-index`, `visibility`), a race condition, or a DOM event bubbling issue.
*   **Action**: **Fix the Code**. The feature is broken.

### Scenario C: Local PASS, CI FAIL
*   **Diagnosis**: Environment drift (OS differences, faster/slower CPU).
*   **Action**: **Harden the Test**. Add explicit waits (`await tick()`, `waitForExist`). Do not decrease timeout; increase stability.

---

## 4. The "Green" Definition

A feature is only "Done" when:
1.  **Usage flows** (E2E) are Green.
2.  **Logic flows** (Unit) are Green.
3.  **Architecture** is respected (no hacks to make tests pass).
