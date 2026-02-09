# UX-002: Mobile: Drill-down Back Navigation is non-obvious/broken

## Problem / Goal
Users cannot easily navigate back from a sub-stack (drill-down view) on mobile. The system back button is reported as greyed out.

## Current Behavior
When a user taps a task with sub-tasks, it navigates into that sub-stack. However, there is no obvious visual "Back" button in the plugin UI, and the Obsidian mobile back button doesn't seem to capture the navigation state correctly.

## Expected Behavior
Provide a clear, persistent "Go Back" action in the mobile UI (e.g., a "← Back" button in the header) and ensure it integrates with the navigation history such that the user can always return to the parent stack.

## Steps to Reproduce (for Bugs)
1. Open Daily Stack on mobile.
2. Drill down into a task with children.
3. Observe the lack of a prominent "Back" button.
4. Attempt to use native mobile back navigation (if applicable) and observe failure.

## Proposed Test Case (TDD)
- [ ] E2E Test: `tests/e2e/journeys/mobile_navigation_loop.spec.ts` - Drill down, verify sub-stack content, then trigger "Back" and verify return to parent stack.

## Resolution
- Enabled Obsidian's native navigation by setting `this.navigation = true` in `StackView.ts`.
- Implemented a premium Glassmorphism header in `StackView.svelte` with a persistent "Back" button.
- Verified with E2E test `tests/e2e/UX-002_mobile_navigation.spec.ts`.
- Shipped version: v1.2.25 (Pending)
- Date: 2026-02-09
