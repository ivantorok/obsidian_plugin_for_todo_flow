# FEAT-016: Substack Hierarchy Prototype
**Capture Date**: `2026-03-09 14:55:00`

## Problem / Goal
The current system treats tasks as a flat list in the `StackView`. While "Drill Down" exists technically, there is no visual indication that a task contains subtasks (links), and the "Parent-Child" relationship is not visually reinforced in the primary UI.

## Expected Behavior
- Task cards in `ArchitectStack` and `FocusStack` should display a "Subtask Indicator" (e.g., a chevron or a count like `(3)`) if they contain unresolved subtasks.
- Clicking/Tapping the indicator or using the `Enter` key (Context) should navigate into that task's substack.
- The "Greedy Rollup" duration should accurately reflect the sum of all nested TODO subtasks.

## Proposed Test Case (TDD)
- [ ] Unit Test: `StackLoader` should correctly resolve children from nested wikilinks in a file body.
- [ ] Unit Test: `scheduler.ts` (getMinDurationWithAudit) should correctly sum durations across 3+ levels of nesting.
- [ ] E2E Test: `mobile_substack_navigation.spec.ts` should verify that tapping a nested link navigates the viewport and `h` returns to the parent.

## Reuse & Architectural Alignment
- **Utilities to Reuse**: `LinkParser`, `GraphBuilder`, `NavigationManager`, `StackLoader`.
- **Architectural Patterns**: **Infinite Drill-Down**, **Greedy Rollup**, **Sovereign Focus**.

## UX Governance Compliance
- **Rule Alignment**: 
    - **Focus Sovereignty**: Entering a substack must reset `focusedIndex` to 0.
    - **Selection Parity**: Selection must follow the task if it moves during scheduling.
    - **Hierarchy (h/Enter)**: Manual navigation keys must take precedence.

## Context / Constraints
- Must remain compatible with **Legacy 8GB Android** hardware (minimal DOM).
- Avoid "Import Gravity" - keep the prototype logic in the Sandbox first.
